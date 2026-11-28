"use client";

import { T, TranslatedAttributes } from "@/components/language-switch";
import { useEffect, useState, type ReactNode } from "react";
import { useAuction } from "@/lib/use-auction";
import { auctionPhase, formatUsdc } from "@/lib/format";
import type { AuctionPhase } from "@/lib/auction-types";
import { formatCountdownClear } from "./auction-utils";

function labelForPhase(phase: AuctionPhase, hasBid: boolean): string {
  if (phase === "settled") return hasBid ? "Vendida" : "Cerrada sin ofertas";
  if (phase === "ended") return hasBid ? "Cerrada" : "Cerrada sin ofertas";
  if (phase === "closing") return "Últimos minutos";
  return "En vivo";
}

function SummaryLink({ label, primary }: { label: string; primary: boolean }) {
  return (
    <a
      href="#ofertar"
      className={`inline-flex min-h-12 shrink-0 items-center justify-center rounded-full px-5 text-sm font-medium transition-colors ${
        primary ? "bg-malbec text-cal hover:bg-malbec-2" : "border border-tinta/20 text-tinta hover:border-tinta hover:bg-papel"
      }`}
    >
      <T>{label}</T>
    </a>
  );
}

function SummaryFrame({
  children,
  phaseText,
  live,
  actionLabel,
  actionPrimary = true,
}: {
  children: ReactNode;
  phaseText: string;
  live: boolean;
  actionLabel?: string;
  actionPrimary?: boolean;
}) {
  return (
    <TranslatedAttributes><section aria-label="Resumen de la subasta" className="cartela overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-linea px-4 py-3">
        <p className="etiqueta"><T>Subasta</T></p>
        <p className={`etiqueta flex items-center gap-2 ${live ? "!text-exito" : "!text-tinta-2"}`}>
          {live && <span className="size-1.5 animate-latido rounded-full bg-exito" aria-hidden />}
          <T>{phaseText}</T>
        </p>
      </div>
      <div className="flex items-end justify-between gap-4 px-4 py-4">
        <div className="min-w-0 flex-1">{children}</div>
        <T>{actionLabel && <SummaryLink label={actionLabel} primary={actionPrimary} />}</T>
      </div>
    </section></TranslatedAttributes>
  );
}

function SummarySkeleton() {
  return (
    <div aria-busy="true">
      <SummaryFrame phaseText="Leyendo" live={false}>
        <div className="h-3 w-20 animate-pulse rounded-sm bg-linea/60" />
        <div className="mt-2 h-9 w-28 animate-pulse rounded-sm bg-linea/70" />
        <div className="mt-2 h-4 w-32 animate-pulse rounded-sm bg-linea/60" />
      </SummaryFrame>
    </div>
  );
}

function MobileBidSummaryContent({ auctionId }: { auctionId: number }) {
  const { auction, now, loading, error, refresh } = useAuction(auctionId, { events: false, intervalMs: 10_000 });

  if (!auction && loading) return <SummarySkeleton />;

  if (!auction) {
    return (
      <SummaryFrame phaseText="Sin datos" live={false} actionLabel="Ver detalle" actionPrimary={false}>
        <p className="font-medium text-tinta"><T>No pudimos leer la subasta.</T></p>
        <p className="mt-1 text-sm leading-relaxed text-tinta-2"><T>{error?.message ?? "La red no respondió."}</T></p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-1 min-h-8 font-medium text-malbec underline decoration-malbec/35 underline-offset-4 transition-colors hover:text-malbec-2"
        >
          <T>Reintentar</T>
        </button>
      </SummaryFrame>
    );
  }

  const phase = auctionPhase(auction, now);
  const hasBid = auction.highestBid > 0n;
  const amount = hasBid ? auction.highestBid : auction.minPrice;
  const amountLabel = hasBid ? (phase === "open" || phase === "closing" ? "Puja actual" : "Puja ganadora") : "Precio base";
  const live = phase === "open" || phase === "closing";
  const phaseText = labelForPhase(phase, hasBid);
  const secondsLeft = Math.max(0, auction.endTime - now);
  const timeText =
    now <= 0
      ? "Leyendo cierre…"
      : phase === "settled"
        ? "Subasta liquidada"
        : phase === "ended"
          ? "Subasta cerrada"
          : `Cierra en ${formatCountdownClear(secondsLeft)}`;

  return (
    <SummaryFrame phaseText={phaseText} live={live} actionLabel={live ? "Ofertar" : "Ver detalle"} actionPrimary={live}>
      <div aria-live="polite" aria-atomic="true">
        <p className="etiqueta"><T>{amountLabel}</T></p>
        <p className="mt-1 font-serif text-4xl leading-none tracking-tight text-tinta">
          {formatUsdc(amount)} <span className="text-xl italic text-piedra">USDC</span>
        </p>
        <p className={`mt-2 text-sm font-medium ${phase === "closing" ? "text-ocre" : "text-tinta-2"}`}><T>{timeText}</T></p>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs leading-relaxed text-malbec">
          <T>No pudimos actualizar el estado. Se muestra la última lectura disponible.</T>
        </p>
      )}
    </SummaryFrame>
  );
}

function useIsMobile(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023.98px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export function MobileBidSummary({ auctionId }: { auctionId: number }) {
  const isMobile = useIsMobile();

  return (
    <div className="lg:hidden">
      {isMobile === null ? <SummarySkeleton /> : isMobile ? <MobileBidSummaryContent auctionId={auctionId} /> : null}
    </div>
  );
}
