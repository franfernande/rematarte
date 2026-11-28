"use client";

import { T, TranslatedAttributes } from "@/components/language-switch";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readPendingRefund } from "@/lib/auction";
import type { AuctionEvent, AuctionPhase } from "@/lib/auction-types";
import { useAuction } from "@/lib/use-auction";
import { auctionPhase, formatUsdc, shortAddress } from "@/lib/format";
import { useWallet } from "@/components/wallet-provider";
import { BidForm } from "./bid-form";
import { BidHistory } from "./bid-history";
import { Countdown } from "./countdown";
import { PendingRefund } from "./pending-refund";
import { SettleCard } from "./settle-card";

type PendingResult = {
  owner: string;
  value: bigint;
};

function phaseLabel(phase: AuctionPhase, hasBid: boolean): string {
  if (phase === "settled") return hasBid ? "Vendida" : "Cerrada sin ofertas";
  if (phase === "ended") return hasBid ? "Cerrada" : "Cerrada sin ofertas";
  if (phase === "closing") return "Últimos minutos";
  return "En vivo";
}

function phaseClass(phase: AuctionPhase, hasBid: boolean): string {
  if ((phase === "settled" || phase === "ended") && !hasBid) return "!text-piedra";
  if (phase === "settled") return "!text-malbec";
  if (phase === "ended") return "!text-piedra";
  return "!text-ocre";
}

function latestRefundFor(events: AuctionEvent[], address: string | null): Extract<AuctionEvent, { kind: "refund" }> | undefined {
  if (!address) return undefined;
  let latest: Extract<AuctionEvent, { kind: "refund" }> | undefined;
  for (const event of events) {
    if (event.kind !== "refund" || event.bidder !== address) continue;
    if (!latest || event.ledger >= latest.ledger) latest = event;
  }
  return latest;
}

function PanelSkeleton() {
  return (
    <TranslatedAttributes><div className="cartela px-5 py-6 sm:px-6" aria-label="Cargando subasta">
      <p className="etiqueta"><T>Subasta</T></p>
      <div className="mt-6 animate-pulse space-y-5">
        <div className="h-12 w-2/3 rounded-sm bg-linea/50" />
        <div className="h-4 w-1/2 rounded-sm bg-linea/50" />
        <div className="h-14 rounded-sm bg-linea/40" />
        <div className="h-12 rounded-full bg-linea/50" />
      </div>
    </div></TranslatedAttributes>
  );
}

export function AuctionPanel({ auctionId, titulo }: { auctionId: number; titulo: string }) {
  const { auction, events, now, loading, error, refresh } = useAuction(auctionId);
  const { address } = useWallet();
  const [pendingResult, setPendingResult] = useState<PendingResult | null>(null);
  const [flashBid, setFlashBid] = useState(false);
  const bidBaselineRef = useRef<{ auctionId: number; value: bigint } | null>(null);

  const loadPendingRefund = useCallback(async (owner: string) => {
    try {
      const value = await readPendingRefund(owner);
      setPendingResult({ owner, value });
    } catch {
      setPendingResult({ owner, value: 0n });
    }
  }, []);

  useEffect(() => {
    if (!address) return;
    void Promise.resolve().then(() => loadPendingRefund(address));
  }, [address, loadPendingRefund]);

  const latestRefund = useMemo(() => latestRefundFor(events, address), [events, address]);
  const pendingRefund =
    address && pendingResult?.owner === address ? pendingResult.value : latestRefund?.pending ? latestRefund.amount : 0n;

  useEffect(() => {
    if (!address || !latestRefund?.pending) return;
    void Promise.resolve().then(() => loadPendingRefund(address));
  }, [address, latestRefund, loadPendingRefund]);

  const refreshAll = useCallback(() => {
    void refresh();
    if (address) void loadPendingRefund(address);
  }, [address, loadPendingRefund, refresh]);

  useEffect(() => {
    if (!auction) return undefined;
    const baseline = bidBaselineRef.current;
    if (!baseline || baseline.auctionId !== auction.id) {
      bidBaselineRef.current = { auctionId: auction.id, value: auction.highestBid };
      return undefined;
    }
    if (baseline.value === auction.highestBid) return undefined;
    bidBaselineRef.current = { auctionId: auction.id, value: auction.highestBid };

    const show = window.setTimeout(() => setFlashBid(true), 0);
    const hide = window.setTimeout(() => setFlashBid(false), 1500);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [auction]);

  if (!auction && loading) return <PanelSkeleton />;

  if (!auction) {
    return (
      <div className="cartela px-5 py-6 sm:px-6">
        <p className="etiqueta"><T>Subasta</T></p>
        <h2 className="mt-4 font-serif text-2xl leading-tight"><T>No pudimos leer la subasta.</T></h2>
        <p className="mt-2 text-sm leading-relaxed text-tinta-2"><T>{error?.message ?? "La red no respondió. Podés intentar de nuevo."}</T></p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-5 min-h-12 rounded-full border border-tinta/20 px-6 font-medium transition-colors hover:border-tinta hover:bg-cal-2"
        >
          <T>Reintentar</T>
        </button>
      </div>
    );
  }

  const effectiveNow = now;
  const phase = auctionPhase(auction, effectiveNow);
  const hasBid = auction.highestBid > 0n;
  const shownAmount = hasBid ? auction.highestBid : auction.minPrice;
  const winnerAddress = auction.highestBidder ? shortAddress(auction.highestBidder) : "otra wallet";
  const winningText = !hasBid
    ? phase === "ended" || phase === "settled"
      ? "Cerrada sin ofertas"
      : "Todavía no hay ofertas"
    : phase === "ended" || phase === "settled"
      ? auction.highestBidder === address
        ? "Ganaste vos"
        : `Ganó ${winnerAddress}`
      : auction.highestBidder === address
        ? "Vas ganando vos"
        : `Va ganando ${winnerAddress}`;
  const showOutbid = Boolean(
    address &&
      (phase === "open" || phase === "closing") &&
      auction.highestBidder !== address &&
      latestRefund &&
      !latestRefund.pending &&
      pendingRefund === 0n,
  );
  const amountLabel = hasBid ? (phase === "open" || phase === "closing" ? "Puja actual" : "Puja ganadora") : "Precio base";

  return (
    <section aria-labelledby={`titulo-panel-subasta-${auctionId}`} className="cartela animate-aparecer overflow-hidden">
      <div className="border-b border-linea px-5 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <h2 id={`titulo-panel-subasta-${auctionId}`} className="etiqueta">
            <T>Subasta</T>
          </h2>
          <p className={`etiqueta flex shrink-0 items-center gap-2 ${phaseClass(phase, hasBid)}`}>
            {(phase === "open" || phase === "closing") && <span className="size-1.5 animate-latido rounded-full bg-ocre" aria-hidden />}
            <T>{phaseLabel(phase, hasBid)}</T>
          </p>
        </div>

        <div className={`-mx-2 mt-2 rounded-sm px-2 py-1 transition-colors duration-700 ${flashBid ? "bg-ocre/20" : "bg-transparent"}`}>
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            <T>{amountLabel}</T>: {formatUsdc(shownAmount)} USDC
          </div>
          <p className="etiqueta"><T>{amountLabel}</T></p>
          <p className="mt-2 font-serif text-[3.4rem] leading-none tracking-tight text-tinta sm:text-6xl">
            {formatUsdc(shownAmount)} <span className="text-2xl italic text-piedra sm:text-3xl">USDC</span>
          </p>
          <p className="mt-2 text-sm font-medium text-tinta-2"><T>{winningText}</T></p>
        </div>

        <div className="mt-2 border-t border-linea pt-4">
          <Countdown endTime={auction.endTime} now={effectiveNow} phase={phase} />
        </div>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6">
        {error && (
          <div role="alert" className="rounded-sm border border-malbec/30 bg-malbec/5 px-3 py-2 text-sm text-malbec">
            <p><T>No pudimos actualizar la puja:</T> <T>{error.message}</T></p>
            <button type="button" onClick={() => void refresh()} className="mt-1 min-h-8 font-medium underline underline-offset-4">
              <T>Reintentar</T>
            </button>
          </div>
        )}

        <PendingRefund amount={pendingRefund} onClaimed={refreshAll} />

        {showOutbid && latestRefund && (
          <div aria-live="polite" className="rounded-sm border border-exito/35 bg-exito/5 px-4 py-3 text-sm leading-relaxed text-exito">
            <T>Te superaron. Tus</T> {formatUsdc(latestRefund.amount)} <T>USDC ya volvieron a tu wallet.</T>
          </div>
        )}

        {(phase === "open" || phase === "closing") && <BidForm auction={auction} titulo={titulo} onRefresh={refreshAll} />}

        {(phase === "ended" || phase === "settled") && <SettleCard auction={auction} events={events} onRefresh={refreshAll} />}
      </div>

      <div className="border-t border-linea px-5 sm:px-6">
        <BidHistory events={events} now={effectiveNow} address={address} hasBid={hasBid} highestBid={auction.highestBid} onRetry={refreshAll} />
      </div>
    </section>
  );
}
