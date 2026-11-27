import { nativeToScVal, rpc, scValToNative, xdr } from "@stellar/stellar-sdk";
import { Client, type Auction, type Errors } from "@/lib/contract/auction";
import type { DeployConfig } from "@/lib/data";

export type { Auction };

export const USDC_DECIMALS = 7;
const UNITS_PER_USDC = BigInt(10 ** USDC_DECIMALS);
const ZERO = BigInt(0);
const BPS = 10_000;

export type WalletSignTransaction = (
  xdr: string,
  opts?: { networkPassphrase?: string; address?: string; submit?: boolean; submitUrl?: string },
) => Promise<{ signedTxXdr: string; signerAddress?: string }>;

export type WalletSigner = {
  publicKey: string;
  signTransaction: WalletSignTransaction;
};

// Without a signer the client can still simulate reads such as get_auction.
export function auctionClient(deploy: DeployConfig, signer?: WalletSigner): Client {
  return new Client({
    contractId: deploy.auctionContractId,
    rpcUrl: deploy.rpcUrl,
    networkPassphrase: deploy.networkPassphrase,
    ...signer,
  });
}

export function auctionIdFor(deploy: DeployConfig, slug: string): number | undefined {
  return Object.hasOwn(deploy.subastas, slug) ? deploy.subastas[slug] : undefined;
}

export async function getAuction(deploy: DeployConfig, auctionId: number): Promise<Auction> {
  const tx = await auctionClient(deploy).get_auction({ auction_id: auctionId });
  const result = tx.result;
  if (result.isErr()) {
    throw new Error(contractErrorMessage(tx.simulation) ?? `No se pudo leer la subasta ${auctionId}.`);
  }
  return result.unwrap();
}

// list_auctions also returns test auctions (scripts/smoke.sh), so only the ones mapped to an obra are kept.
export async function getAuctionsBySlug(deploy: DeployConfig): Promise<Record<string, Auction>> {
  const { result } = await auctionClient(deploy).list_auctions();
  const byId = new Map(result.map((auction) => [auction.id, auction]));
  return Object.fromEntries(
    Object.entries(deploy.subastas).flatMap(([slug, id]) => {
      const auction = byId.get(id);
      return auction ? [[slug, auction]] : [];
    }),
  );
}

export function minimumBid(auction: Auction): bigint {
  return auction.highest_bid === ZERO ? auction.min_price : auction.highest_bid + auction.min_increment;
}

// Same arithmetic as settle(): the venue share is rounded down and the remainder goes to the artist.
export function settlementSplit(auction: Auction): { artist: bigint; venue: bigint } {
  const venue = (auction.highest_bid * BigInt(BPS - auction.artist_bps)) / BigInt(BPS);
  return { artist: auction.highest_bid - venue, venue };
}

export function artistPercent(auction: Auction): number {
  return auction.artist_bps / 100;
}

export type AuctionStatus = "open" | "ended" | "settled";

// Uses the local clock; the contract decides with the ledger timestamp, which can differ by a few seconds.
export function auctionStatus(auction: Auction, nowSeconds = Math.floor(Date.now() / 1000)): AuctionStatus {
  if (auction.settled) return "settled";
  return BigInt(nowSeconds) < auction.end_time ? "open" : "ended";
}

const USDC_AMOUNT = new RegExp(`^\\d+(?:[.,]\\d{1,${USDC_DECIMALS}})?$`);

// Accepts "12", "12.5" or "12,5" (decimal keyboards in es-AR use a comma). No thousands separators.
export function parseUsdc(value: string | number): bigint {
  const text = typeof value === "number" ? value.toFixed(USDC_DECIMALS) : value.trim();
  if (!USDC_AMOUNT.test(text)) throw new RangeError(`Monto en USDC inválido: ${value}`);
  const [whole, fraction = ""] = text.split(/[.,]/);
  return BigInt(whole) * UNITS_PER_USDC + BigInt(fraction.padEnd(USDC_DECIMALS, "0"));
}

const usdcFormat = new Intl.NumberFormat("es-AR", { maximumFractionDigits: USDC_DECIMALS });

function usdcParts(units: bigint): { whole: bigint; fraction: string } {
  const fraction = (units % UNITS_PER_USDC).toString().padStart(USDC_DECIMALS, "0").replace(/0+$/, "");
  return { whole: units / UNITS_PER_USDC, fraction };
}

export function formatUsdc(units: bigint): string {
  const { whole, fraction } = usdcParts(units);
  return usdcFormat.format(`${whole}${fraction ? `.${fraction}` : ""}` as `${number}`);
}

// For prefilling inputs: no thousands separator, so parseUsdc reads it back unchanged.
export function usdcInput(units: bigint): string {
  const { whole, fraction } = usdcParts(units);
  return fraction ? `${whole},${fraction}` : `${whole}`;
}

const CONTRACT_ERROR_MESSAGES: Record<keyof typeof Errors, string> = {
  1: "No encontramos esta subasta.",
  2: "La subasta ya cerró.",
  3: "La subasta todavía no cerró.",
  4: "La oferta es menor a la mínima. Puede que alguien haya ofertado recién.",
  5: "La subasta ya se liquidó.",
  6: "El reparto entre artista y espacio no es válido.",
  7: "El monto no es válido.",
  8: "La fecha de cierre no es válida.",
  9: "No tenés reembolsos pendientes.",
};

// The SDK's Err carries an empty message because the contract errors have no doc comments,
// so the code is read from the "Error(Contract, #N)" text of the simulation or send error.
const CONTRACT_ERROR = /Error\(Contract, #(\d+)\)/;

export function contractErrorCode(source: unknown): number | undefined {
  let text: string | undefined;
  if (typeof source === "string") text = source;
  else if (source instanceof Error) text = source.message;
  else if (typeof source === "object" && source !== null && "error" in source && typeof source.error === "string") {
    text = source.error;
  }
  const match = text?.match(CONTRACT_ERROR);
  return match ? Number(match[1]) : undefined;
}

export function contractErrorMessage(source: unknown): string | undefined {
  const code = contractErrorCode(source);
  return code !== undefined && code in CONTRACT_ERROR_MESSAGES
    ? CONTRACT_ERROR_MESSAGES[code as keyof typeof Errors]
    : undefined;
}

export function explorerUrl(deploy: DeployConfig, kind: "tx" | "contract" | "account", id: string): string {
  return `https://stellar.expert/explorer/${deploy.network}/${kind}/${id}`;
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

type EventMeta = { id: string; txHash: string; ledger: number; closedAt: string };

export type AuctionEvent =
  | (EventMeta & { type: "bid"; bidder: string; amount: bigint })
  | (EventMeta & { type: "refund"; bidder: string; amount: bigint; pending: boolean })
  | (EventMeta & { type: "settled"; winner: string | null; amount: bigint; artistAmount: bigint; venueAmount: bigint });

export type AuctionEventsPage = { events: AuctionEvent[]; cursor: string };

// Stellar RPC scans at most 10,000 ledgers per getEvents call and keeps about 7 days of events.
const EVENTS_SCAN_LEDGERS = 10_000;
const EVENTS_PAGE_LIMIT = 100;
// Keeps the first window inside retention even if oldestLedger advances before the request lands.
const RETENTION_MARGIN_LEDGERS = 20;

const servers = new Map<string, rpc.Server>();

export function rpcServer(deploy: DeployConfig): rpc.Server {
  let server = servers.get(deploy.rpcUrl);
  if (!server) {
    server = new rpc.Server(deploy.rpcUrl);
    servers.set(deploy.rpcUrl, server);
  }
  return server;
}

function auctionEventFilters(deploy: DeployConfig, auctionId: number): rpc.Api.EventFilter[] {
  const id = nativeToScVal(auctionId, { type: "u32" }).toXDR("base64");
  const name = (symbol: string) => xdr.ScVal.scvSymbol(symbol).toXDR("base64");
  return [
    {
      type: "contract",
      contractIds: [deploy.auctionContractId],
      topics: [[name("bid"), id, "*"], [name("refund"), id, "*"], [name("settled"), id]],
    },
  ];
}

function parseAuctionEvent(event: rpc.Api.EventResponse): AuctionEvent | undefined {
  const [name, , account] = event.topic.map((topic) => scValToNative(topic));
  const data = scValToNative(event.value) as Record<string, unknown>;
  const meta = { id: event.id, txHash: event.txHash, ledger: event.ledger, closedAt: event.ledgerClosedAt };
  switch (name) {
    case "bid":
      return { ...meta, type: "bid", bidder: account, amount: data.amount as bigint };
    case "refund":
      return { ...meta, type: "refund", bidder: account, amount: data.amount as bigint, pending: data.pending as boolean };
    case "settled":
      return {
        ...meta,
        type: "settled",
        winner: (data.winner as string | null) ?? null,
        amount: data.amount as bigint,
        artistAmount: data.artist_amount as bigint,
        venueAmount: data.venue_amount as bigint,
      };
    default:
      return undefined;
  }
}

async function drainEvents(server: rpc.Server, request: rpc.Api.GetEventsRequest): Promise<AuctionEventsPage> {
  let response = await server.getEvents(request);
  const raw = [...response.events];
  while (response.events.length === EVENTS_PAGE_LIMIT) {
    response = await server.getEvents({ filters: request.filters, cursor: response.cursor, limit: EVENTS_PAGE_LIMIT });
    raw.push(...response.events);
  }
  return { events: raw.flatMap((event) => parseAuctionEvent(event) ?? []), cursor: response.cursor };
}

// Without a cursor, scans the whole retention window in parallel; with the returned cursor, fetches only newer events.
export async function getAuctionEvents(
  deploy: DeployConfig,
  auctionId: number,
  cursor?: string,
): Promise<AuctionEventsPage> {
  const server = rpcServer(deploy);
  const filters = auctionEventFilters(deploy, auctionId);
  if (cursor) return drainEvents(server, { filters, cursor, limit: EVENTS_PAGE_LIMIT });

  const { oldestLedger, latestLedger } = await server.getHealth();
  const starts: number[] = [];
  for (let start = oldestLedger + RETENTION_MARGIN_LEDGERS; start <= latestLedger; start += EVENTS_SCAN_LEDGERS) {
    starts.push(start);
  }
  const pages = await Promise.all(
    starts.map((startLedger, index) =>
      drainEvents(
        server,
        index === starts.length - 1
          ? { filters, startLedger, limit: EVENTS_PAGE_LIMIT }
          : { filters, startLedger, endLedger: startLedger + EVENTS_SCAN_LEDGERS, limit: EVENTS_PAGE_LIMIT },
      ),
    ),
  );
  return { events: mergeAuctionEvents([], pages.flatMap((page) => page.events)), cursor: pages[pages.length - 1].cursor };
}

export function mergeAuctionEvents(current: AuctionEvent[], incoming: AuctionEvent[]): AuctionEvent[] {
  const byId = new Map(current.map((event) => [event.id, event]));
  for (const event of incoming) byId.set(event.id, event);
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}
