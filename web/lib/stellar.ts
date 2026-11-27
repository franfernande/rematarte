import * as StellarSdk from "@stellar/stellar-sdk";
import deploy from "@/data/deploy.testnet.json";

export const NETWORK = deploy.network;
export const RPC_URL = deploy.rpcUrl;
export const NETWORK_PASSPHRASE = deploy.networkPassphrase;
export const AUCTION_CONTRACT_ID = deploy.auctionContractId;
export const USDC = deploy.usdc;
export const AUCTION_IDS = deploy.subastas;
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

export const stellarConfig = {
  network: NETWORK,
  rpcUrl: RPC_URL,
  networkPassphrase: NETWORK_PASSPHRASE,
  horizonUrl: HORIZON_URL,
  auctionContractId: AUCTION_CONTRACT_ID,
  usdc: USDC,
  auctionIds: AUCTION_IDS,
} as const;

export const rpcServer = new StellarSdk.rpc.Server(RPC_URL);
export const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);
