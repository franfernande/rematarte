import type { AuctionEvent } from "@/lib/auction-types";
import { formatCountdown, STROOPS_PER_USDC } from "@/lib/format";

// Decimal string for the bid input: no thousands separators, dot as decimal separator.
export function stroopsToInput(stroops: bigint): string {
  const whole = stroops / STROOPS_PER_USDC;
  const fraction = (stroops % STROOPS_PER_USDC).toString().padStart(7, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function sortEventsChronologically(events: AuctionEvent[]): AuctionEvent[] {
  return [...events].sort((a, b) => a.ledger - b.ledger || a.at - b.at || a.txHash.localeCompare(b.txHash));
}

export function formatCountdownClear(secondsLeft: number): string {
  const seconds = Math.max(0, Math.floor(secondsLeft));
  if (seconds >= 3600) return formatCountdown(seconds);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes} min ${rest} s`;
}

export function formatRelativeTime(at: number, now: number): string {
  const elapsed = Math.max(0, Math.floor(now - at));
  if (elapsed < 15) return "recién";
  if (elapsed < 60) return `hace ${elapsed} s`;
  const minutes = Math.floor(elapsed / 60);
  if (minutes < 60) return minutes === 1 ? "hace 1 min" : `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "hace 1 h" : `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "hace 1 d" : `hace ${days} d`;
}

const ROMAN: Array<[number, string]> = [
  [1000, "m"],
  [900, "cm"],
  [500, "d"],
  [400, "cd"],
  [100, "c"],
  [90, "xc"],
  [50, "l"],
  [40, "xl"],
  [10, "x"],
  [9, "ix"],
  [5, "v"],
  [4, "iv"],
  [1, "i"],
];

export function romanNumeral(value: number): string {
  let remaining = Math.max(1, Math.floor(value));
  let result = "";
  for (const [amount, numeral] of ROMAN) {
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  }
  return result;
}
