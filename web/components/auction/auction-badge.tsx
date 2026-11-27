"use client";

import type { AuctionPhase } from "@/lib/auction-types";
import { useAuction } from "@/lib/use-auction";
import { auctionPhase, formatCountdown, formatUsdc, shortAddress } from "@/lib/format";

function labelFor(phase: AuctionPhase): string {
  if (phase === "settled") return "Vendida";
  if (phase === "ended") return "Cerrada";
  if (phase === "closing") return "Últimos minutos";
  return "En vivo";
}

export function AuctionBadge({ auctionId }: { auctionId: number }) {
  const { auction, now, loading, error } = useAuction(auctionId, { events: false, intervalMs: 8000 });

  if (!auction && loading) {
    return (
      <span className="block" aria-label="Cargando estado de la subasta">
        <span className="block h-3 w-20 animate-pulse rounded-sm bg-linea/60" />
        <span className="mt-2 block h-6 w-28 animate-pulse rounded-sm bg-linea/50" />
      </span>
    );
  }

  if (!auction) {
    return <span className="text-sm text-piedra">{error ? "Puja no disponible" : "Subasta no encontrada"}</span>;
  }

  const effectiveNow = now;
  const phase = auctionPhase(auction, effectiveNow);
  const live = phase === "open" || phase === "closing";
  const hasBid = auction.highestBid > 0n;
  const amount = hasBid ? auction.highestBid : auction.minPrice;
  const secondsLeft = Math.max(0, auction.endTime - effectiveNow);

  return (
    <span className="flex items-end justify-between gap-3">
      <span className="min-w-0">
        <span className={`etiqueta flex items-center gap-2 ${live ? "!text-ocre" : phase === "settled" ? "!text-malbec" : "!text-piedra"}`}>
          {live && <span className="size-1.5 animate-latido rounded-full bg-ocre" aria-hidden />}
          {labelFor(phase)}
        </span>
        <span className="mt-1 block font-serif text-2xl leading-none text-tinta">
          {hasBid ? (
            <>
              {formatUsdc(amount)} <span className="text-sm italic text-piedra">USDC</span>
            </>
          ) : live ? (
            <>
              Desde {formatUsdc(amount)} <span className="text-sm italic text-piedra">USDC</span>
            </>
          ) : (
            "Sin ofertas"
          )}
        </span>
        <span className="mt-1 block truncate text-xs text-tinta-2">
          {hasBid
            ? `Va ganando ${auction.highestBidder ? shortAddress(auction.highestBidder) : "otra wallet"}`
            : live
              ? "Todavía nadie ofertó"
              : "La subasta terminó sin ofertas"}
        </span>
      </span>
      {live && effectiveNow > 0 && (
        <span className="shrink-0 text-right">
          <span className="block text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-piedra">cierra</span>
          <span className={`mt-0.5 block font-mono text-xs tabular-nums ${phase === "closing" ? "text-ocre" : "text-tinta-2"}`}>
            {formatCountdown(secondsLeft)}
          </span>
        </span>
      )}
    </span>
  );
}
