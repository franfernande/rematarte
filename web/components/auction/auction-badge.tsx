"use client";

import { T, TranslatedAttributes } from "@/components/language-switch";
import type { AuctionPhase } from "@/lib/auction-types";
import { useAuction } from "@/lib/use-auction";
import { auctionPhase, formatUsdc, shortAddress } from "@/lib/format";
import { formatCountdownClear } from "./auction-utils";

function labelFor(phase: AuctionPhase, hasBid: boolean): string {
  if (phase === "settled") return hasBid ? "Vendida" : "Cerrada sin ofertas";
  if (phase === "ended") return hasBid ? "Cerrada" : "Cerrada sin ofertas";
  if (phase === "closing") return "Últimos minutos";
  return "En vivo";
}

export function AuctionBadge({ auctionId }: { auctionId: number }) {
  const { auction, now, loading, error } = useAuction(auctionId, { events: false, intervalMs: 8000 });

  if (!auction && loading) {
    return (
      <TranslatedAttributes><span className="block" role="status" aria-label="Cargando estado de la subasta">
        <span className="block h-3 w-20 animate-pulse rounded-sm bg-linea/60" />
        <span className="mt-2 block h-6 w-28 animate-pulse rounded-sm bg-linea/50" />
        <span className="mt-1 block text-xs text-piedra"><T>Leyendo puja…</T></span>
      </span></TranslatedAttributes>
    );
  }

  if (!auction) {
    return (
      <span role="status" className="text-sm text-piedra">
        <T>{error ? "Puja no disponible · reintentando" : "Subasta no encontrada"}</T>
      </span>
    );
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
        <span className={`etiqueta flex items-center gap-2 ${live ? "!text-exito" : phase === "settled" && hasBid ? "!text-malbec" : "!text-piedra"}`}>
          {live && <span className="size-1.5 animate-latido rounded-full bg-exito" aria-hidden />}
          <T>{labelFor(phase, hasBid)}</T>
        </span>
        <span className="mt-1 block font-serif text-2xl leading-none text-tinta">
          <T>{hasBid ? (
            <>
              {formatUsdc(amount)} <span className="text-sm italic text-piedra">USDC</span>
            </>
          ) : live ? (
            <>
              <T>Desde</T> {formatUsdc(amount)} <span className="text-sm italic text-piedra">USDC</span>
            </>
          ) : (
            "Sin ofertas"
          )}</T>
        </span>
        <span className="mt-1 block truncate text-xs text-tinta-2">
          <T>{hasBid
            ? `Va ganando ${auction.highestBidder ? shortAddress(auction.highestBidder) : "otra wallet"}`
            : live
              ? "Todavía nadie ofertó"
              : "La subasta terminó sin ofertas"}</T>
        </span>
      </span>
      {live && effectiveNow > 0 && (
        <span className="shrink-0 text-right">
          <span className="block text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-piedra"><T>cierra</T></span>
          <span className={`mt-0.5 block font-mono text-xs tabular-nums ${phase === "closing" ? "text-ocre" : "text-tinta-2"}`}>
            <T>{formatCountdownClear(secondsLeft)}</T>
          </span>
        </span>
      )}
    </span>
  );
}
