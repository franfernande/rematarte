#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{
        Address as _, AuthorizedFunction, AuthorizedInvocation, Events as _, IssuerFlags,
        Ledger as _, StellarAssetContract,
    },
    token::{StellarAssetClient, TokenClient},
    xdr::{ContractEvent, ContractEventBody, ScVal},
    Address, Env, Event as _, Symbol,
};

const NOW: u64 = 1_000_000;
const END_TIME: u64 = NOW + 3_600;
const ARTIST_BPS: u32 = 8_000;
const MIN_PRICE: i128 = 50 * 10_000_000;
const MIN_INCREMENT: i128 = 5 * 10_000_000;
const MINT_AMOUNT: i128 = 1_000 * 10_000_000;
const ANTI_SNIPING_WINDOW_SECS: u64 = 300;
const ANTI_SNIPING_EXTENSION_SECS: u64 = 300;

struct Fixture {
    env: Env,
    contract_id: Address,
    token_id: Address,
    asset: StellarAssetContract,
    admin: Address,
    artist: Address,
    venue: Address,
    bidder1: Address,
    bidder2: Address,
}

impl Fixture {
    fn new() -> Self {
        let env = Env::default();
        env.ledger().set_timestamp(NOW);

        let admin = Address::generate(&env);
        let artist = Address::generate(&env);
        let venue = Address::generate(&env);
        let bidder1 = Address::generate(&env);
        let bidder2 = Address::generate(&env);
        let issuer_admin = Address::generate(&env);

        let asset = env.register_stellar_asset_contract_v2(issuer_admin);
        let token_id = asset.address();
        let sac = StellarAssetClient::new(&env, &token_id);
        sac.mock_all_auths().mint(&bidder1, &MINT_AMOUNT);
        sac.mock_all_auths().mint(&bidder2, &MINT_AMOUNT);

        let contract_id = env.register(AuctionContract, (admin.clone(), token_id.clone()));

        Self {
            env,
            contract_id,
            token_id,
            asset,
            admin,
            artist,
            venue,
            bidder1,
            bidder2,
        }
    }

    fn client(&self) -> AuctionContractClient<'_> {
        AuctionContractClient::new(&self.env, &self.contract_id)
    }

    fn token(&self) -> TokenClient<'_> {
        TokenClient::new(&self.env, &self.token_id)
    }

    fn sac(&self) -> StellarAssetClient<'_> {
        StellarAssetClient::new(&self.env, &self.token_id)
    }

    fn create_auction(
        &self,
        artist_bps: u32,
        min_price: i128,
        min_increment: i128,
        end_time: u64,
    ) -> u32 {
        self.client().mock_all_auths().create_auction(
            &self.artist,
            &self.venue,
            &artist_bps,
            &min_price,
            &min_increment,
            &end_time,
        )
    }

    fn create_default_auction(&self) -> u32 {
        self.create_auction(ARTIST_BPS, MIN_PRICE, MIN_INCREMENT, END_TIME)
    }

    fn bid(&self, auction_id: u32, bidder: &Address, amount: i128) {
        self.client()
            .mock_all_auths()
            .bid(&auction_id, bidder, &amount);
    }
}

fn assert_same_auction(actual: &Auction, expected: &Auction) {
    assert_eq!(actual.id, expected.id);
    assert_eq!(actual.artist, expected.artist);
    assert_eq!(actual.venue, expected.venue);
    assert_eq!(actual.artist_bps, expected.artist_bps);
    assert_eq!(actual.min_price, expected.min_price);
    assert_eq!(actual.min_increment, expected.min_increment);
    assert_eq!(actual.end_time, expected.end_time);
    assert_eq!(actual.highest_bidder, expected.highest_bidder);
    assert_eq!(actual.highest_bid, expected.highest_bid);
    assert_eq!(actual.settled, expected.settled);
}

fn assert_required_auth(
    env: &Env,
    auths: &[(Address, AuthorizedInvocation)],
    expected_address: &Address,
    expected_contract: &Address,
    expected_fn: &str,
) {
    assert_eq!(auths.len(), 1, "expected exactly one authorization");
    assert_eq!(&auths[0].0, expected_address);
    match &auths[0].1.function {
        AuthorizedFunction::Contract((contract, fn_name, _args)) => {
            assert_eq!(contract, expected_contract);
            assert_eq!(fn_name, &Symbol::new(env, expected_fn));
        }
        other => panic!("expected a contract authorization, got {other:?}"),
    }
}

fn auction_events(env: &Env, contract_id: &Address) -> std::vec::Vec<ContractEvent> {
    env.events()
        .all()
        .filter_by_contract(contract_id)
        .events()
        .to_vec()
}

fn assert_event_topics(event: &ContractEvent, expected: &[ScVal]) {
    match &event.body {
        ContractEventBody::V0(body) => {
            let actual: &[ScVal] = body.topics.as_ref();
            assert_eq!(actual, expected);
        }
    }
}

fn bid_refund_topics(env: &Env, event_name: &str, auction_id: u32, bidder: &Address) -> [ScVal; 3] {
    [
        ScVal::from(&Symbol::new(env, event_name)),
        ScVal::U32(auction_id),
        ScVal::from(bidder),
    ]
}

fn settled_topics(env: &Env, auction_id: u32) -> [ScVal; 2] {
    [
        ScVal::from(&Symbol::new(env, "settled")),
        ScVal::U32(auction_id),
    ]
}

#[test]
fn create_auction_returns_sequential_ids_and_reads_match() {
    let fixture = Fixture::new();

    let id0 = fixture.create_default_auction();
    let id1 = fixture.create_default_auction();

    assert_eq!(id0, 0);
    assert_eq!(id1, 1);

    let auction0 = fixture.client().get_auction(&id0);
    assert_eq!(auction0.id, id0);
    assert_eq!(auction0.artist, fixture.artist);
    assert_eq!(auction0.venue, fixture.venue);
    assert_eq!(auction0.artist_bps, ARTIST_BPS);
    assert_eq!(auction0.min_price, MIN_PRICE);
    assert_eq!(auction0.min_increment, MIN_INCREMENT);
    assert_eq!(auction0.end_time, END_TIME);
    assert_eq!(auction0.highest_bidder, None);
    assert_eq!(auction0.highest_bid, 0);
    assert!(!auction0.settled);

    let auction1 = fixture.client().get_auction(&id1);
    assert_eq!(auction1.id, id1);

    let auctions = fixture.client().list_auctions();
    assert_eq!(auctions.len(), 2);
    assert_same_auction(&auctions.get(0).unwrap(), &auction0);
    assert_same_auction(&auctions.get(1).unwrap(), &auction1);

    assert_eq!(fixture.client().token(), fixture.token_id);
}

#[test]
fn create_auction_rejects_invalid_split() {
    let fixture = Fixture::new();

    let result = fixture.client().mock_all_auths().try_create_auction(
        &fixture.artist,
        &fixture.venue,
        &10_001u32,
        &MIN_PRICE,
        &MIN_INCREMENT,
        &END_TIME,
    );

    assert_eq!(result, Err(Ok(Error::InvalidSplit)));
}

#[test]
fn create_auction_rejects_invalid_amounts() {
    let fixture = Fixture::new();

    for (min_price, min_increment) in [
        (0i128, MIN_INCREMENT),
        (-1i128, MIN_INCREMENT),
        (MIN_PRICE, 0i128),
        (MIN_PRICE, -1i128),
    ] {
        let result = fixture.client().mock_all_auths().try_create_auction(
            &fixture.artist,
            &fixture.venue,
            &ARTIST_BPS,
            &min_price,
            &min_increment,
            &END_TIME,
        );
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }
}

#[test]
fn create_auction_rejects_invalid_end_time() {
    let fixture = Fixture::new();

    for end_time in [NOW, NOW - 1] {
        let result = fixture.client().mock_all_auths().try_create_auction(
            &fixture.artist,
            &fixture.venue,
            &ARTIST_BPS,
            &MIN_PRICE,
            &MIN_INCREMENT,
            &end_time,
        );
        assert_eq!(result, Err(Ok(Error::InvalidEndTime)));
    }
}

#[test]
fn create_auction_requires_admin_auth() {
    let fixture = Fixture::new();

    let result = fixture.client().try_create_auction(
        &fixture.artist,
        &fixture.venue,
        &ARTIST_BPS,
        &MIN_PRICE,
        &MIN_INCREMENT,
        &END_TIME,
    );
    assert!(
        result.is_err(),
        "create_auction without admin auth must fail"
    );

    fixture.create_default_auction();
    assert_required_auth(
        &fixture.env,
        &fixture.env.auths(),
        &fixture.admin,
        &fixture.contract_id,
        "create_auction",
    );
}

#[test]
fn first_bid_below_min_price_fails_and_equal_min_price_succeeds() {
    let fixture = Fixture::new();
    let auction_id = fixture.create_default_auction();

    let result =
        fixture
            .client()
            .mock_all_auths()
            .try_bid(&auction_id, &fixture.bidder1, &(MIN_PRICE - 1));
    assert_eq!(result, Err(Ok(Error::BidTooLow)));

    fixture.bid(auction_id, &fixture.bidder1, MIN_PRICE);

    let auction = fixture.client().get_auction(&auction_id);
    assert_eq!(auction.highest_bidder, Some(fixture.bidder1.clone()));
    assert_eq!(auction.highest_bid, MIN_PRICE);
}

#[test]
fn second_bid_below_highest_plus_increment_fails() {
    let fixture = Fixture::new();
    let auction_id = fixture.create_default_auction();
    fixture.bid(auction_id, &fixture.bidder1, MIN_PRICE);

    for amount in [MIN_PRICE, MIN_PRICE + MIN_INCREMENT - 1] {
        let result =
            fixture
                .client()
                .mock_all_auths()
                .try_bid(&auction_id, &fixture.bidder2, &amount);
        assert_eq!(result, Err(Ok(Error::BidTooLow)));
    }

    fixture.bid(auction_id, &fixture.bidder2, MIN_PRICE + MIN_INCREMENT);
    let auction = fixture.client().get_auction(&auction_id);
    assert_eq!(auction.highest_bid, MIN_PRICE + MIN_INCREMENT);
}

#[test]
fn outbid_refunds_previous_bidder_exactly_in_same_call() {
    let fixture = Fixture::new();
    let auction_id = fixture.create_default_auction();
    let token = fixture.token();
    let bidder1_initial = token.balance(&fixture.bidder1);
    let bidder2_initial = token.balance(&fixture.bidder2);
    let first_bid = MIN_PRICE;
    let second_bid = MIN_PRICE + MIN_INCREMENT;

    fixture.bid(auction_id, &fixture.bidder1, first_bid);
    fixture.bid(auction_id, &fixture.bidder2, second_bid);

    assert_eq!(token.balance(&fixture.bidder1), bidder1_initial);
    assert_eq!(
        token.balance(&fixture.bidder2),
        bidder2_initial - second_bid
    );
    assert_eq!(token.balance(&fixture.contract_id), second_bid);

    let auction = fixture.client().get_auction(&auction_id);
    assert_eq!(auction.highest_bidder, Some(fixture.bidder2.clone()));
    assert_eq!(auction.highest_bid, second_bid);
}

#[test]
fn bid_requires_bidder_auth() {
    let fixture = Fixture::new();
    let auction_id = fixture.create_default_auction();

    let result = fixture
        .client()
        .try_bid(&auction_id, &fixture.bidder1, &MIN_PRICE);
    assert!(result.is_err(), "bid without bidder auth must fail");

    fixture.bid(auction_id, &fixture.bidder1, MIN_PRICE);

    assert_required_auth(
        &fixture.env,
        &fixture.env.auths(),
        &fixture.bidder1,
        &fixture.contract_id,
        "bid",
    );
}

#[test]
fn bid_rejects_invalid_amounts_and_missing_auction() {
    let fixture = Fixture::new();
    let auction_id = fixture.create_default_auction();

    for amount in [0i128, -1i128] {
        let result =
            fixture
                .client()
                .mock_all_auths()
                .try_bid(&auction_id, &fixture.bidder1, &amount);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    let result = fixture
        .client()
        .mock_all_auths()
        .try_bid(&999u32, &fixture.bidder1, &MIN_PRICE);
    assert_eq!(result, Err(Ok(Error::AuctionNotFound)));

    let result = fixture.client().try_get_auction(&999u32);
    assert_eq!(result, Err(Ok(Error::AuctionNotFound)));
}

#[test]
fn bid_at_or_after_end_time_fails() {
    let fixture = Fixture::new();
    let auction_id = fixture.create_default_auction();

    fixture.env.ledger().set_timestamp(END_TIME);
    let result =
        fixture
            .client()
            .mock_all_auths()
            .try_bid(&auction_id, &fixture.bidder1, &MIN_PRICE);
    assert_eq!(result, Err(Ok(Error::AuctionEnded)));

    fixture.env.ledger().set_timestamp(END_TIME + 1);
    let result =
        fixture
            .client()
            .mock_all_auths()
            .try_bid(&auction_id, &fixture.bidder1, &MIN_PRICE);
    assert_eq!(result, Err(Ok(Error::AuctionEnded)));
}

#[test]
fn settle_before_end_time_fails() {
    let fixture = Fixture::new();
    let auction_id = fixture.create_default_auction();

    let result = fixture.client().try_settle(&auction_id);

    assert_eq!(result, Err(Ok(Error::AuctionNotEnded)));
}

#[test]
fn settle_distributes_exact_split_with_rounding_to_artist() {
    let fixture = Fixture::new();
    let amount = 10_001i128;
    let auction_id = fixture.create_auction(3_333, amount, 1, END_TIME);
    fixture.bid(auction_id, &fixture.bidder1, amount);

    fixture.env.ledger().set_timestamp(END_TIME);
    fixture.client().settle(&auction_id);

    let token = fixture.token();
    assert_eq!(token.balance(&fixture.artist), 3_334);
    assert_eq!(token.balance(&fixture.venue), 6_667);
    assert_eq!(token.balance(&fixture.contract_id), 0);

    let auction = fixture.client().get_auction(&auction_id);
    assert!(auction.settled);
}

#[test]
fn double_settle_and_bid_after_settle_fail_with_already_settled() {
    let fixture = Fixture::new();
    let auction_id = fixture.create_default_auction();
    fixture.bid(auction_id, &fixture.bidder1, MIN_PRICE);

    fixture.env.ledger().set_timestamp(END_TIME);
    fixture.client().settle(&auction_id);

    let result = fixture.client().try_settle(&auction_id);
    assert_eq!(result, Err(Ok(Error::AlreadySettled)));

    let result = fixture.client().mock_all_auths().try_bid(
        &auction_id,
        &fixture.bidder2,
        &(MIN_PRICE + MIN_INCREMENT),
    );
    assert_eq!(result, Err(Ok(Error::AlreadySettled)));
}

#[test]
fn settle_without_bids_closes_without_moving_funds() {
    let fixture = Fixture::new();
    let auction_id = fixture.create_default_auction();

    fixture.env.ledger().set_timestamp(END_TIME);
    fixture.client().settle(&auction_id);

    let token = fixture.token();
    assert_eq!(token.balance(&fixture.artist), 0);
    assert_eq!(token.balance(&fixture.venue), 0);
    assert_eq!(token.balance(&fixture.contract_id), 0);

    let auction = fixture.client().get_auction(&auction_id);
    assert!(auction.settled);
    assert_eq!(auction.highest_bidder, None);
    assert_eq!(auction.highest_bid, 0);
}

#[test]
fn failed_refund_becomes_pending_and_claim_refund_pays_it_once() {
    let fixture = Fixture::new();
    let auction_id = fixture.create_default_auction();
    let first_bid = MIN_PRICE;
    let second_bid = MIN_PRICE + MIN_INCREMENT;
    let bidder1_initial = fixture.token().balance(&fixture.bidder1);

    fixture.bid(auction_id, &fixture.bidder1, first_bid);

    fixture.asset.issuer().set_flag(IssuerFlags::RevocableFlag);
    fixture
        .sac()
        .mock_all_auths()
        .set_authorized(&fixture.bidder1, &false);

    fixture.bid(auction_id, &fixture.bidder2, second_bid);
    let events = auction_events(&fixture.env, &fixture.contract_id);

    assert_eq!(fixture.client().pending_refund(&fixture.bidder1), first_bid);
    assert_eq!(
        fixture.token().balance(&fixture.bidder1),
        bidder1_initial - first_bid
    );
    assert_eq!(
        fixture.token().balance(&fixture.contract_id),
        first_bid + second_bid
    );

    let expected_refund = Refund {
        auction_id,
        bidder: fixture.bidder1.clone(),
        amount: first_bid,
        pending: true,
    }
    .to_xdr(&fixture.env, &fixture.contract_id);
    assert_eq!(events.len(), 2, "expected refund and bid events");
    assert!(
        events.contains(&expected_refund),
        "expected a refund event with pending: true"
    );
    let refund_index = events
        .iter()
        .position(|event| event == &expected_refund)
        .expect("pending refund event not found");
    assert_event_topics(
        &events[refund_index],
        &bid_refund_topics(&fixture.env, "refund", auction_id, &fixture.bidder1),
    );

    fixture
        .sac()
        .mock_all_auths()
        .set_authorized(&fixture.bidder1, &true);

    let claimed = fixture
        .client()
        .mock_all_auths()
        .claim_refund(&fixture.bidder1);
    assert_eq!(claimed, first_bid);
    assert_eq!(fixture.client().pending_refund(&fixture.bidder1), 0);
    assert_eq!(fixture.token().balance(&fixture.bidder1), bidder1_initial);
    assert_eq!(fixture.token().balance(&fixture.contract_id), second_bid);

    let result = fixture
        .client()
        .mock_all_auths()
        .try_claim_refund(&fixture.bidder1);
    assert_eq!(result, Err(Ok(Error::NothingToClaim)));
}

#[test]
fn bid_refund_and_settled_events_are_emitted_by_auction_contract() {
    let fixture = Fixture::new();
    let auction_id = fixture.create_default_auction();
    let first_bid = MIN_PRICE;
    let second_bid = MIN_PRICE + MIN_INCREMENT;

    fixture.bid(auction_id, &fixture.bidder1, first_bid);
    let events = auction_events(&fixture.env, &fixture.contract_id);
    let expected_first_bid = Bid {
        auction_id,
        bidder: fixture.bidder1.clone(),
        amount: first_bid,
    }
    .to_xdr(&fixture.env, &fixture.contract_id);
    assert_eq!(events.len(), 1);
    assert!(events.contains(&expected_first_bid));
    assert_event_topics(
        &events[0],
        &bid_refund_topics(&fixture.env, "bid", auction_id, &fixture.bidder1),
    );

    fixture.bid(auction_id, &fixture.bidder2, second_bid);
    let events = auction_events(&fixture.env, &fixture.contract_id);
    let expected_refund = Refund {
        auction_id,
        bidder: fixture.bidder1.clone(),
        amount: first_bid,
        pending: false,
    }
    .to_xdr(&fixture.env, &fixture.contract_id);
    let expected_second_bid = Bid {
        auction_id,
        bidder: fixture.bidder2.clone(),
        amount: second_bid,
    }
    .to_xdr(&fixture.env, &fixture.contract_id);
    assert_eq!(events.len(), 2);
    assert!(events.contains(&expected_refund));
    assert!(events.contains(&expected_second_bid));
    let refund_index = events
        .iter()
        .position(|event| event == &expected_refund)
        .expect("refund event not found");
    let bid_index = events
        .iter()
        .position(|event| event == &expected_second_bid)
        .expect("second bid event not found");
    assert_event_topics(
        &events[refund_index],
        &bid_refund_topics(&fixture.env, "refund", auction_id, &fixture.bidder1),
    );
    assert_event_topics(
        &events[bid_index],
        &bid_refund_topics(&fixture.env, "bid", auction_id, &fixture.bidder2),
    );

    fixture.env.ledger().set_timestamp(END_TIME);
    fixture.client().settle(&auction_id);
    let events = auction_events(&fixture.env, &fixture.contract_id);
    let expected_settled = Settled {
        auction_id,
        winner: Some(fixture.bidder2.clone()),
        amount: second_bid,
        artist_amount: 440_000_000,
        venue_amount: 110_000_000,
    }
    .to_xdr(&fixture.env, &fixture.contract_id);
    assert_eq!(events.len(), 1);
    assert!(events.contains(&expected_settled));
    assert_event_topics(&events[0], &settled_topics(&fixture.env, auction_id));
}

#[test]
fn bid_outside_anti_sniping_window_does_not_extend_end_time() {
    let fixture = Fixture::new();
    let auction_id = fixture.create_default_auction();
    let bid_time = END_TIME - ANTI_SNIPING_WINDOW_SECS - 1;

    fixture.env.ledger().set_timestamp(bid_time);
    fixture.bid(auction_id, &fixture.bidder1, MIN_PRICE);

    let auction = fixture.client().get_auction(&auction_id);
    assert_eq!(auction.end_time, END_TIME);
}

#[test]
fn bid_exactly_at_anti_sniping_window_boundary_does_not_extend_end_time() {
    let fixture = Fixture::new();
    let auction_id = fixture.create_default_auction();
    let bid_time = END_TIME - ANTI_SNIPING_WINDOW_SECS;

    fixture.env.ledger().set_timestamp(bid_time);
    fixture.bid(auction_id, &fixture.bidder1, MIN_PRICE);

    let auction = fixture.client().get_auction(&auction_id);
    assert_eq!(auction.end_time, END_TIME);
}

#[test]
fn bid_inside_anti_sniping_window_extends_end_time_and_delays_settle() {
    let fixture = Fixture::new();
    let auction_id = fixture.create_default_auction();
    let bid_time = END_TIME - 10;
    let extended_end_time = bid_time + ANTI_SNIPING_EXTENSION_SECS;

    fixture.env.ledger().set_timestamp(bid_time);
    fixture.bid(auction_id, &fixture.bidder1, MIN_PRICE);

    let auction = fixture.client().get_auction(&auction_id);
    assert_eq!(auction.end_time, extended_end_time);
    assert!(extended_end_time > END_TIME);

    fixture.env.ledger().set_timestamp(END_TIME);
    let result = fixture.client().try_settle(&auction_id);
    assert_eq!(result, Err(Ok(Error::AuctionNotEnded)));

    fixture.env.ledger().set_timestamp(extended_end_time);
    fixture.client().settle(&auction_id);
    assert!(fixture.client().get_auction(&auction_id).settled);
}

#[test]
fn consecutive_bids_inside_window_extend_from_their_own_time() {
    let fixture = Fixture::new();
    let auction_id = fixture.create_default_auction();
    let first_bid_time = END_TIME - 10;
    let second_bid_time = first_bid_time + 20;
    let first_extended_end_time = first_bid_time + ANTI_SNIPING_EXTENSION_SECS;
    let second_extended_end_time = second_bid_time + ANTI_SNIPING_EXTENSION_SECS;

    fixture.env.ledger().set_timestamp(first_bid_time);
    fixture.bid(auction_id, &fixture.bidder1, MIN_PRICE);
    assert_eq!(
        fixture.client().get_auction(&auction_id).end_time,
        first_extended_end_time
    );

    fixture.env.ledger().set_timestamp(second_bid_time);
    fixture.bid(auction_id, &fixture.bidder2, MIN_PRICE + MIN_INCREMENT);
    assert_eq!(
        fixture.client().get_auction(&auction_id).end_time,
        second_extended_end_time
    );
    assert!(second_extended_end_time > first_extended_end_time);

    fixture.env.ledger().set_timestamp(second_extended_end_time);
    let result = fixture.client().mock_all_auths().try_bid(
        &auction_id,
        &fixture.bidder1,
        &(MIN_PRICE + 2 * MIN_INCREMENT),
    );
    assert_eq!(result, Err(Ok(Error::AuctionEnded)));
}
