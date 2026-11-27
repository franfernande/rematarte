// Shared contract between the data layer (lib/auction.ts, lib/use-auction.ts) and the UI.
// Mirrors interface I1 in docs/plan.md. Amounts are stroops (7 decimals); times are Unix seconds.

export type AuctionState = {
  id: number;
  artist: string;
  venue: string;
  artistBps: number;
  minPrice: bigint;
  minIncrement: bigint;
  endTime: number;
  highestBidder: string | null;
  highestBid: bigint;
  settled: boolean;
};

type EventBase = {
  auctionId: number;
  txHash: string;
  ledger: number;
  // Ledger close time, Unix seconds.
  at: number;
};

export type AuctionEvent =
  | (EventBase & { kind: "bid"; bidder: string; amount: bigint })
  | (EventBase & { kind: "refund"; bidder: string; amount: bigint; pending: boolean })
  | (EventBase & {
      kind: "settled";
      winner: string | null;
      amount: bigint;
      artistAmount: bigint;
      venueAmount: bigint;
    });

export type TxResult = { hash: string };

// Same shape as contract.ClientOptions["signTransaction"] and useWallet().signTransaction.
export type SignTransaction = (
  xdr: string,
  opts?: { networkPassphrase?: string; address?: string },
) => Promise<{ signedTxXdr: string; signerAddress?: string }>;

export type AuctionPhase = "open" | "closing" | "ended" | "settled";

export type FriendlyError = {
  // Contract error code from I1 (1-9) when the failure came from the contract.
  code?: number;
  // Spanish, ready to show to the user.
  message: string;
};
