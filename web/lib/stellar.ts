import type { contract } from "@stellar/stellar-sdk";
import { Client, type Auction, type Errors } from "@/lib/contract/auction";
import type { DeployConfig } from "@/lib/data";

export type { Auction };

export const USDC_DECIMALS = 7;
const UNITS_PER_USDC = BigInt(10 ** USDC_DECIMALS);
const ZERO = BigInt(0);

export type WalletSigner = {
  publicKey: string;
  signTransaction: NonNullable<contract.ClientOptions["signTransaction"]>;
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

export function formatUsdc(units: bigint): string {
  const whole = units / UNITS_PER_USDC;
  const fraction = (units % UNITS_PER_USDC).toString().padStart(USDC_DECIMALS, "0").replace(/0+$/, "");
  return usdcFormat.format(`${whole}${fraction ? `.${fraction}` : ""}` as `${number}`);
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
