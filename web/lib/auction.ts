import { contract, NotFoundError, scValToNative, xdr } from "@stellar/stellar-sdk";
import type { AuctionEvent, AuctionState, FriendlyError, SignTransaction, TxResult } from "@/lib/auction-types";
import { Client as GeneratedClient } from "@/lib/contract/auction";
import { minNextBid } from "@/lib/format";
import { AUCTION_CONTRACT_ID, NETWORK_PASSPHRASE, RPC_URL, USDC, horizonServer, rpcServer } from "@/lib/stellar";

type RawAuction = {
  id: number;
  artist: string;
  venue: string;
  artist_bps: number;
  min_price: bigint;
  min_increment: bigint;
  end_time: bigint;
  highest_bidder: string | null;
  highest_bid: bigint;
  settled: boolean;
};

type AuctionContract = {
  get_auction(
    args: { auction_id: number },
    options?: contract.MethodOptions,
  ): Promise<contract.AssembledTransaction<contract.Result<RawAuction>>>;
  list_auctions(options?: contract.MethodOptions): Promise<contract.AssembledTransaction<RawAuction[]>>;
  pending_refund(
    args: { bidder: string },
    options?: contract.MethodOptions,
  ): Promise<contract.AssembledTransaction<bigint>>;
  bid(
    args: { auction_id: number; bidder: string; amount: bigint },
    options?: contract.MethodOptions,
  ): Promise<contract.AssembledTransaction<contract.Result<void>>>;
  settle(
    args: { auction_id: number },
    options?: contract.MethodOptions,
  ): Promise<contract.AssembledTransaction<contract.Result<void>>>;
  claim_refund(
    args: { bidder: string },
    options?: contract.MethodOptions,
  ): Promise<contract.AssembledTransaction<contract.Result<bigint>>>;
};

type AuctionClient = contract.Client & AuctionContract;

const EVENT_LOOKBACK_LEDGERS = 100_000;
const EVENTS_PAGE_LIMIT = 100;

let readClientPromise: Promise<AuctionClient> | undefined;
const writeClientPromises = new Map<string, Promise<AuctionClient>>();

function clientOptions(): contract.ClientOptions {
  return {
    contractId: AUCTION_CONTRACT_ID,
    rpcUrl: RPC_URL,
    networkPassphrase: NETWORK_PASSPHRASE,
    server: rpcServer,
  };
}

// Typed client generated from the contract bindings (lib/contract/auction.ts, synced with `npm run bindings:sync`).
// It embeds the contract spec, so no network round trip is needed to build it.
function makeClient(options: contract.ClientOptions): AuctionClient {
  return new GeneratedClient(options) as unknown as AuctionClient;
}

function getReadClient(): Promise<AuctionClient> {
  readClientPromise ??= Promise.resolve(makeClient(clientOptions()));
  return readClientPromise;
}

function getWriteClient(publicKey: string, signTransaction: SignTransaction): Promise<AuctionClient> {
  let clientPromise = writeClientPromises.get(publicKey);
  if (!clientPromise) {
    clientPromise = Promise.resolve(
      makeClient({
        ...clientOptions(),
        publicKey,
        signTransaction: signTransaction as contract.ClientOptions["signTransaction"],
      }),
    );
    writeClientPromises.set(publicKey, clientPromise);
  }
  return clientPromise;
}

class ContractInvocationError extends Error {
  readonly contractCode: number;

  constructor(code: number) {
    super(`Error(Contract, #${code})`);
    this.name = "ContractInvocationError";
    this.contractCode = code;
  }
}

function isRustResult<T>(value: unknown): value is contract.Result<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "isOk" in value &&
    "isErr" in value &&
    typeof value.isOk === "function" &&
    typeof value.isErr === "function"
  );
}

function unwrapContractResult<T>(value: contract.Result<T> | T): T {
  if (!isRustResult<T>(value)) return value;
  if (value.isErr()) {
    const error = value.unwrapErr();
    throw new Error(error.message || "El contrato rechazó la operación");
  }
  return value.unwrap();
}


function toAuctionState(raw: RawAuction): AuctionState {
  return {
    id: raw.id,
    artist: raw.artist,
    venue: raw.venue,
    artistBps: raw.artist_bps,
    minPrice: raw.min_price,
    minIncrement: raw.min_increment,
    endTime: Number(raw.end_time),
    highestBidder: raw.highest_bidder ?? null,
    highestBid: raw.highest_bid,
    settled: raw.settled,
  };
}

export async function readAuction(id: number): Promise<AuctionState> {
  const client = await getReadClient();
  const tx = await client.get_auction({ auction_id: id });
  if (tx.result.isErr()) {
    throw new ContractInvocationError(1);
  }
  return toAuctionState(tx.result.unwrap());
}

export async function readAuctions(): Promise<AuctionState[]> {
  const client = await getReadClient();
  const tx = await client.list_auctions();
  return tx.result.map(toAuctionState);
}

function nativeData(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function bigintField(data: Record<string, unknown>, key: string): bigint {
  const value = data[key];
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  return 0n;
}

function ledgerCloseUnix(ledgerClosedAt: string): number {
  if (/^\d+$/.test(ledgerClosedAt)) return Number(ledgerClosedAt);
  return Math.floor(new Date(ledgerClosedAt).getTime() / 1000);
}

function topicBidder(event: { topic: xdr.ScVal[] }): string {
  return event.topic.length > 2 ? String(scValToNative(event.topic[2])) : "";
}

function decodeEvent(event: {
  topic: xdr.ScVal[];
  value: xdr.ScVal;
  txHash: string;
  ledger: number;
  ledgerClosedAt: string;
}): AuctionEvent | null {
  if (event.topic.length < 2) return null;
  const kind = String(scValToNative(event.topic[0]));
  const auctionId = Number(scValToNative(event.topic[1]));
  const base = {
    auctionId,
    txHash: event.txHash,
    ledger: event.ledger,
    at: ledgerCloseUnix(event.ledgerClosedAt),
  };
  const data = nativeData(scValToNative(event.value));

  if (kind === "bid") {
    const bidder = typeof data.bidder === "string" ? data.bidder : topicBidder(event);
    return { ...base, kind, bidder, amount: bigintField(data, "amount") };
  }
  if (kind === "refund") {
    const bidder = typeof data.bidder === "string" ? data.bidder : topicBidder(event);
    return { ...base, kind, bidder, amount: bigintField(data, "amount"), pending: data.pending === true };
  }
  if (kind === "settled") {
    const winner = typeof data.winner === "string" ? data.winner : null;
    return {
      ...base,
      kind,
      winner,
      amount: bigintField(data, "amount"),
      artistAmount: bigintField(data, "artist_amount"),
      venueAmount: bigintField(data, "venue_amount"),
    };
  }
  return null;
}

function eventTopics(id: number): string[][] {
  const auctionIdTopic = xdr.ScVal.scvU32(id).toXDR("base64");
  return (["bid", "refund", "settled"] as const).map((name) => {
    const symbolTopic = xdr.ScVal.scvSymbol(name).toXDR("base64");
    return name === "settled" ? [symbolTopic, auctionIdTopic] : [symbolTopic, auctionIdTopic, "*"];
  });
}

async function fetchEventRange(filters: { type: "contract"; contractIds: string[]; topics: string[][] }[], start: number, end: number) {
  const events: Awaited<ReturnType<typeof rpcServer.getEvents>>["events"] = [];
  let cursor: string | undefined;
  for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
    const page = await rpcServer.getEvents(
      cursor
        ? { filters, cursor, limit: EVENTS_PAGE_LIMIT }
        : { filters, startLedger: start, endLedger: end, limit: EVENTS_PAGE_LIMIT },
    );
    events.push(...page.events);
    if (!page.cursor || page.cursor === cursor) break;
    cursor = page.cursor;
  }
  return events;
}

export async function readEvents(id: number): Promise<AuctionEvent[]> {
  return (await readEventsSince(id)).events;
}

// Full scan when sinceLedger is omitted; otherwise only ledgers after sinceLedger (for incremental polling).
// Returns events newest first and the latest ledger scanned, to pass back as sinceLedger next time.
export async function readEventsSince(
  id: number,
  sinceLedger?: number,
): Promise<{ events: AuctionEvent[]; latestLedger: number }> {
  const latest = await rpcServer.getLatestLedger();
  if (sinceLedger !== undefined && sinceLedger >= latest.sequence) {
    return { events: [], latestLedger: latest.sequence };
  }
  const oldest = sinceLedger === undefined ? (await rpcServer.getHealth()).oldestLedger : 1;
  const requestedStart = sinceLedger === undefined ? latest.sequence - EVENT_LOOKBACK_LEDGERS : sinceLedger + 1;
  const start = Math.max(1, requestedStart, oldest);
  const filters = [
    {
      type: "contract" as const,
      contractIds: [AUCTION_CONTRACT_ID],
      topics: eventTopics(id),
    },
  ];

  let rawEvents;
  try {
    rawEvents = await fetchEventRange(filters, start, latest.sequence);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/startLedger|ledger.*range|-32600/i.test(message)) throw error;
    const freshHealth = await rpcServer.getHealth();
    rawEvents = await fetchEventRange(filters, freshHealth.oldestLedger, latest.sequence);
  }

  const events = rawEvents
    .map(decodeEvent)
    .filter((event): event is AuctionEvent => event !== null)
    .reverse();
  return { events, latestLedger: latest.sequence };
}

// Stable identity for merging incremental pages without duplicates.
export function eventKey(event: AuctionEvent): string {
  const who = event.kind === "settled" ? (event.winner ?? "-") : event.bidder;
  return `${event.txHash}:${event.kind}:${who}:${event.amount}`;
}

export async function readPendingRefund(address: string): Promise<bigint> {
  const client = await getReadClient();
  const tx = await client.pending_refund({ bidder: address });
  return tx.result;
}

function decimalToStroops(value: string): bigint {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return 0n;
  const whole = match[1];
  const fraction = (match[2] ?? "").padEnd(7, "0").slice(0, 7);
  return BigInt(whole) * 10_000_000n + BigInt(fraction);
}

export async function readUsdcBalance(address: string): Promise<bigint | null> {
  try {
    const account = await horizonServer.loadAccount(address);
    const balance = account.balances.find(
      (entry) => "asset_code" in entry && entry.asset_code === USDC.code && "asset_issuer" in entry && entry.asset_issuer === USDC.issuer,
    );
    if (!balance || !("balance" in balance)) return null;
    return decimalToStroops(balance.balance);
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}

export async function readLedgerTime(): Promise<number> {
  const latest = await rpcServer.getLatestLedger();
  return Number(latest.closeTime);
}

async function assertCanBid(auctionId: number, amount: bigint): Promise<void> {
  if (amount <= 0n) throw new ContractInvocationError(7);
  const auction = await readAuction(auctionId);
  const now = await readLedgerTime();
  if (now >= auction.endTime) throw new ContractInvocationError(2);
  if (amount < minNextBid(auction)) throw new ContractInvocationError(4);
}

async function assertCanSettle(auctionId: number): Promise<void> {
  const auction = await readAuction(auctionId);
  if (auction.settled) throw new ContractInvocationError(5);
  const now = await readLedgerTime();
  if (now < auction.endTime) throw new ContractInvocationError(3);
}

async function signAndSendWrite<T>(
  publicKey: string,
  signTransaction: SignTransaction,
  build: (client: AuctionClient) => Promise<contract.AssembledTransaction<contract.Result<T>>>,
): Promise<TxResult> {
  const client = await getWriteClient(publicKey, signTransaction);
  const tx = await build(client);
  unwrapContractResult(tx.result);
  const sent = await tx.signAndSend({ signTransaction: signTransaction as contract.ClientOptions["signTransaction"] });
  const hash = sent.sendTransactionResponse?.hash;
  if (!hash) throw new Error("La transacción fue enviada pero la RPC no devolvió su hash");
  return { hash };
}

export async function placeBid(args: {
  auctionId: number;
  bidder: string;
  amount: bigint;
  signTransaction: SignTransaction;
}): Promise<TxResult> {
  await assertCanBid(args.auctionId, args.amount);
  return signAndSendWrite(args.bidder, args.signTransaction, (client) =>
    client.bid({ auction_id: args.auctionId, bidder: args.bidder, amount: args.amount }),
  );
}

export async function settleAuction(args: {
  auctionId: number;
  source: string;
  signTransaction: SignTransaction;
}): Promise<TxResult> {
  await assertCanSettle(args.auctionId);
  return signAndSendWrite(args.source, args.signTransaction, (client) => client.settle({ auction_id: args.auctionId }));
}

export async function claimRefund(args: { bidder: string; signTransaction: SignTransaction }): Promise<TxResult> {
  const pending = await readPendingRefund(args.bidder);
  if (pending === 0n) throw new ContractInvocationError(9);
  return signAndSendWrite(args.bidder, args.signTransaction, (client) => client.claim_refund({ bidder: args.bidder }));
}

const CONTRACT_ERROR_MESSAGES: Record<number, string> = {
  1: "No existe esa subasta",
  2: "La subasta ya cerró",
  3: "Todavía no cerró",
  4: "La oferta es menor a la mínima",
  5: "Ya se liquidó",
  6: "El reparto configurado no es válido",
  7: "Monto inválido",
  8: "La fecha de cierre no es válida",
  9: "No tenés reembolsos pendientes",
};

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "";
}

export function toFriendlyError(error: unknown): FriendlyError {
  const text = errorText(error);
  const directCode =
    typeof error === "object" && error !== null && "contractCode" in error && typeof error.contractCode === "number"
      ? error.contractCode
      : undefined;
  const match = /Error\(Contract,\s*#(\d+)\)/i.exec(text) ?? /(?:contract error|error)\s*#(\d+)/i.exec(text);
  const code = directCode ?? (match ? Number(match[1]) : undefined);
  if (code !== undefined && CONTRACT_ERROR_MESSAGES[code]) {
    return { code, message: CONTRACT_ERROR_MESSAGES[code] };
  }

  const lower = text.toLowerCase();
  if (/reject|cancel|denied|declin|closed the modal|user closed/.test(lower)) {
    return { message: "Firma cancelada. La operación no se envió." };
  }
  if (/wrong network|network mismatch|different network|invalid network|passphrase/.test(lower)) {
    return { message: "Tu wallet está en otra red. Cambiala a Stellar Testnet e intentá de nuevo." };
  }
  if (/trustline|trust line|no trust/.test(lower)) {
    return { message: "Tu cuenta no tiene habilitado el USDC de prueba. Entrá a Empezar para prepararla." };
  }
  if (/op_underfunded|insufficient.*usdc|usdc.*insufficient|not enough usdc/.test(lower)) {
    return { message: "No tenés suficiente USDC de prueba para esa oferta." };
  }
  if (/tx_insufficient_fee|insufficient.*xlm|xlm.*insufficient|underfunded|insufficient balance/.test(lower)) {
    return { message: "No tenés suficiente XLM para pagar la comisión de la transacción." };
  }
  if (/account.*not.*found|not funded|unfunded|404/.test(lower)) {
    return { message: "La cuenta todavía no está fondeada en Testnet." };
  }
  if (/timeout|timed out|still pending|transactionstillpending/.test(lower)) {
    return { message: "La red tardó demasiado en confirmar. Esperá unos segundos y actualizá antes de reintentar." };
  }
  if (/failed to fetch|networkerror|network error|econnrefused|enotfound|429|rate limit/.test(lower)) {
    return { message: "No pudimos conectarnos con la red Stellar. Revisá tu conexión e intentá de nuevo." };
  }

  const detail = text.split("\n")[0]?.trim();
  return {
    message: detail ? `No se pudo completar la operación: ${detail}` : "No se pudo completar la operación. Intentá de nuevo.",
  };
}
