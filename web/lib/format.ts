import type { AuctionPhase, AuctionState } from "@/lib/auction-types";

export const STROOPS_PER_USDC = 10_000_000n;
// Anti-sniping window from the contract (I1): a bid with less than this left pushes end_time to now + 300.
export const ANTI_SNIPING_SECONDS = 300;

const percentFormat = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2, minimumFractionDigits: 0 });

export function usdcToNumber(stroops: bigint): number {
  return Number(stroops) / Number(STROOPS_PER_USDC);
}

function formatWholeEsAr(whole: bigint): string {
  return whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatUsdc(stroops: bigint): string {
  const negative = stroops < 0n;
  const absolute = negative ? -stroops : stroops;
  const whole = absolute / STROOPS_PER_USDC;
  const fraction = absolute % STROOPS_PER_USDC;
  const decimals = fraction.toString().padStart(7, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${formatWholeEsAr(whole)}${decimals ? `,${decimals}` : ""}`;
}

// Accepts "50", "50,5" or "50.5"; returns null for anything that is not a positive amount with up to 7 decimals.
export function parseUsdc(input: string): bigint | null {
  const value = input.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,7})?$/.test(value)) return null;
  const [whole, frac = ""] = value.split(".");
  const stroops = BigInt(whole) * STROOPS_PER_USDC + BigInt((frac + "0000000").slice(0, 7));
  return stroops > 0n ? stroops : null;
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function minNextBid(auction: AuctionState): bigint {
  return auction.highestBid === 0n ? auction.minPrice : auction.highestBid + auction.minIncrement;
}

export function auctionPhase(auction: AuctionState, nowSeconds: number): AuctionPhase {
  if (auction.settled) return "settled";
  if (nowSeconds >= auction.endTime) return "ended";
  if (auction.endTime - nowSeconds < ANTI_SNIPING_SECONDS) return "closing";
  return "open";
}

// "2 d 4 h", "3 h 12 min", "4:05" (under an hour), "0:00" when past.
export function formatCountdown(secondsLeft: number): string {
  const s = Math.max(0, Math.floor(secondsLeft));
  const days = Math.floor(s / 86_400);
  const hours = Math.floor((s % 86_400) / 3_600);
  const minutes = Math.floor((s % 3_600) / 60);
  const seconds = s % 60;
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function percentFromBps(bps: number): string {
  return `${percentFormat.format(bps / 100)} %`;
}

const EXPLORER = "https://stellar.expert/explorer/testnet";

export function txUrl(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}

export function accountUrl(address: string): string {
  return `${EXPLORER}/${address.startsWith("C") ? "contract" : "account"}/${address}`;
}
