#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token::TokenClient,
    Address, Env, Vec,
};

const DAY_IN_LEDGERS: u32 = 17280;
const BUMP_THRESHOLD: u32 = 30 * DAY_IN_LEDGERS;
const BUMP_TO: u32 = 120 * DAY_IN_LEDGERS;
const BPS_DENOMINATOR: i128 = 10_000;
const ANTI_SNIPING_WINDOW: u64 = 300;
const ANTI_SNIPING_EXTENSION: u64 = 300;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Auction {
    pub id: u32,
    pub artist: Address,
    pub venue: Address,
    pub artist_bps: u32,
    pub min_price: i128,
    pub min_increment: i128,
    pub end_time: u64,
    pub highest_bidder: Option<Address>,
    pub highest_bid: i128,
    pub settled: bool,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    NextId,
    Auction(u32),
    PendingRefund(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AuctionNotFound = 1,
    AuctionEnded = 2,
    AuctionNotEnded = 3,
    BidTooLow = 4,
    AlreadySettled = 5,
    InvalidSplit = 6,
    InvalidAmount = 7,
    InvalidEndTime = 8,
    NothingToClaim = 9,
}

#[contractevent(topics = ["bid"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Bid {
    #[topic]
    pub auction_id: u32,
    #[topic]
    pub bidder: Address,
    pub amount: i128,
}

#[contractevent(topics = ["refund"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Refund {
    #[topic]
    pub auction_id: u32,
    #[topic]
    pub bidder: Address,
    pub amount: i128,
    pub pending: bool,
}

#[contractevent(topics = ["settled"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Settled {
    #[topic]
    pub auction_id: u32,
    pub winner: Option<Address>,
    pub amount: i128,
    pub artist_amount: i128,
    pub venue_amount: i128,
}

#[contract]
pub struct AuctionContract;

#[contractimpl]
impl AuctionContract {
    pub fn __constructor(env: Env, admin: Address, token: Address) {
        env.storage().instance().extend_ttl(BUMP_THRESHOLD, BUMP_TO);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::NextId, &0u32);
    }

    pub fn create_auction(
        env: Env,
        artist: Address,
        venue: Address,
        artist_bps: u32,
        min_price: i128,
        min_increment: i128,
        end_time: u64,
    ) -> Result<u32, Error> {
        env.storage().instance().extend_ttl(BUMP_THRESHOLD, BUMP_TO);

        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("admin not initialized");
        admin.require_auth();

        if artist_bps > 10_000 {
            return Err(Error::InvalidSplit);
        }
        if min_price <= 0 || min_increment <= 0 {
            return Err(Error::InvalidAmount);
        }
        if end_time <= env.ledger().timestamp() {
            return Err(Error::InvalidEndTime);
        }

        let id: u32 = env.storage().instance().get(&DataKey::NextId).unwrap_or(0);
        let next_id = id.checked_add(1).ok_or(Error::InvalidAmount)?;

        let auction = Auction {
            id,
            artist,
            venue,
            artist_bps,
            min_price,
            min_increment,
            end_time,
            highest_bidder: None,
            highest_bid: 0,
            settled: false,
        };
        let key = DataKey::Auction(id);
        env.storage().persistent().set(&key, &auction);
        env.storage()
            .persistent()
            .extend_ttl(&key, BUMP_THRESHOLD, BUMP_TO);
        env.storage().instance().set(&DataKey::NextId, &next_id);

        Ok(id)
    }

    pub fn bid(env: Env, auction_id: u32, bidder: Address, amount: i128) -> Result<(), Error> {
        env.storage().instance().extend_ttl(BUMP_THRESHOLD, BUMP_TO);

        bidder.require_auth();

        let key = DataKey::Auction(auction_id);
        let mut auction: Auction = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::AuctionNotFound)?;

        if auction.settled {
            return Err(Error::AlreadySettled);
        }
        let now = env.ledger().timestamp();
        if now >= auction.end_time {
            return Err(Error::AuctionEnded);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let min_valid = if auction.highest_bid == 0 {
            auction.min_price
        } else {
            auction
                .highest_bid
                .checked_add(auction.min_increment)
                .ok_or(Error::InvalidAmount)?
        };
        if amount < min_valid {
            return Err(Error::BidTooLow);
        }

        if auction.end_time - now < ANTI_SNIPING_WINDOW {
            let extended_end_time = now
                .checked_add(ANTI_SNIPING_EXTENSION)
                .ok_or(Error::InvalidAmount)?;
            if extended_end_time > auction.end_time {
                auction.end_time = extended_end_time;
            }
        }

        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .expect("token not initialized");
        let token = TokenClient::new(&env, &token_address);
        let contract_address = env.current_contract_address();

        token.transfer(&bidder, &contract_address, &amount);

        if let Some(previous_bidder) = auction.highest_bidder.clone() {
            let previous_amount = auction.highest_bid;
            let refund_result =
                token.try_transfer(&contract_address, &previous_bidder, &previous_amount);
            let refund_sent = matches!(refund_result, Ok(Ok(())));

            if refund_sent {
                Refund {
                    auction_id,
                    bidder: previous_bidder,
                    amount: previous_amount,
                    pending: false,
                }
                .publish(&env);
            } else {
                let pending_key = DataKey::PendingRefund(previous_bidder.clone());
                let current_pending: i128 =
                    env.storage().persistent().get(&pending_key).unwrap_or(0);
                let new_pending = current_pending
                    .checked_add(previous_amount)
                    .ok_or(Error::InvalidAmount)?;
                env.storage().persistent().set(&pending_key, &new_pending);
                env.storage()
                    .persistent()
                    .extend_ttl(&pending_key, BUMP_THRESHOLD, BUMP_TO);

                Refund {
                    auction_id,
                    bidder: previous_bidder,
                    amount: previous_amount,
                    pending: true,
                }
                .publish(&env);
            }
        }

        auction.highest_bidder = Some(bidder.clone());
        auction.highest_bid = amount;
        env.storage().persistent().set(&key, &auction);
        env.storage()
            .persistent()
            .extend_ttl(&key, BUMP_THRESHOLD, BUMP_TO);

        Bid {
            auction_id,
            bidder,
            amount,
        }
        .publish(&env);

        Ok(())
    }

    pub fn settle(env: Env, auction_id: u32) -> Result<(), Error> {
        env.storage().instance().extend_ttl(BUMP_THRESHOLD, BUMP_TO);

        let key = DataKey::Auction(auction_id);
        let mut auction: Auction = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::AuctionNotFound)?;

        if auction.settled {
            return Err(Error::AlreadySettled);
        }
        if env.ledger().timestamp() < auction.end_time {
            return Err(Error::AuctionNotEnded);
        }

        let mut winner = None;
        let mut amount = 0i128;
        let mut artist_amount = 0i128;
        let mut venue_amount = 0i128;

        if let Some(highest_bidder) = auction.highest_bidder.clone() {
            amount = auction.highest_bid;
            let venue_bps = 10_000u32
                .checked_sub(auction.artist_bps)
                .ok_or(Error::InvalidSplit)?;
            venue_amount = amount
                .checked_mul(i128::from(venue_bps))
                .ok_or(Error::InvalidAmount)?
                .checked_div(BPS_DENOMINATOR)
                .ok_or(Error::InvalidAmount)?;
            artist_amount = amount
                .checked_sub(venue_amount)
                .ok_or(Error::InvalidAmount)?;

            let token_address: Address = env
                .storage()
                .instance()
                .get(&DataKey::Token)
                .expect("token not initialized");
            let token = TokenClient::new(&env, &token_address);
            let contract_address = env.current_contract_address();

            if artist_amount > 0 {
                token.transfer(&contract_address, &auction.artist, &artist_amount);
            }
            if venue_amount > 0 {
                token.transfer(&contract_address, &auction.venue, &venue_amount);
            }

            winner = Some(highest_bidder);
        }

        auction.settled = true;
        env.storage().persistent().set(&key, &auction);
        env.storage()
            .persistent()
            .extend_ttl(&key, BUMP_THRESHOLD, BUMP_TO);

        Settled {
            auction_id,
            winner,
            amount,
            artist_amount,
            venue_amount,
        }
        .publish(&env);

        Ok(())
    }

    pub fn claim_refund(env: Env, bidder: Address) -> Result<i128, Error> {
        env.storage().instance().extend_ttl(BUMP_THRESHOLD, BUMP_TO);

        bidder.require_auth();

        let key = DataKey::PendingRefund(bidder.clone());
        let amount: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if amount <= 0 {
            return Err(Error::NothingToClaim);
        }

        env.storage().persistent().remove(&key);

        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .expect("token not initialized");
        let token = TokenClient::new(&env, &token_address);
        token.transfer(&env.current_contract_address(), &bidder, &amount);

        Ok(amount)
    }

    pub fn get_auction(env: Env, auction_id: u32) -> Result<Auction, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Auction(auction_id))
            .ok_or(Error::AuctionNotFound)
    }

    pub fn list_auctions(env: Env) -> Vec<Auction> {
        let next_id: u32 = env.storage().instance().get(&DataKey::NextId).unwrap_or(0);
        let mut auctions = Vec::new(&env);

        for id in 0..next_id {
            if let Some(auction) = env.storage().persistent().get(&DataKey::Auction(id)) {
                auctions.push_back(auction);
            }
        }

        auctions
    }

    pub fn pending_refund(env: Env, bidder: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::PendingRefund(bidder))
            .unwrap_or(0)
    }

    pub fn token(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Token)
            .expect("token not initialized")
    }
}

#[cfg(test)]
mod test;
