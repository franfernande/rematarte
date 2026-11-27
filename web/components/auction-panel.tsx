"use client";

import { BidForm } from "@/components/bid-form";
import { useLiveAuction, useNowSeconds } from "@/components/use-live-auction";
import { useWallet } from "@/components/wallet-provider";
import type { DeployConfig } from "@/lib/data";
import { formatAgo, formatCierre, formatRemaining } from "@/lib/format";
import {
  artistPercent,
  auctionStatus,
  explorerUrl,
  formatUsdc,
  settlementSplit,
  shortAddress,
  type Auction,
  type AuctionEvent,
} from "@/lib/stellar";

const ANTI_SNIPING_SECONDS = 300;

type BidRow = { bid: Extract<AuctionEvent, { type: "bid" }>; label: string };

function bidRows(events: AuctionEvent[], open: boolean): BidRow[] {
  const pendingRefunds = new Set(
    events.flatMap((event) => (event.type === "refund" && event.pending ? [`${event.bidder}:${event.amount}`] : [])),
  );
  const bids = events.flatMap((event) => (event.type === "bid" ? [event] : [])).reverse();
  return bids.map((bid, index) => ({
    bid,
    label:
      index === 0
        ? open
          ? "Oferta más alta"
          : "Ganadora"
        : pendingRefunds.has(`${bid.bidder}:${bid.amount}`)
          ? "Superada; el reembolso quedó pendiente"
          : "Superada y devuelta al instante",
  }));
}

function Split({ auction }: { auction: Auction }) {
  const artist = artistPercent(auction);
  return (
    <p className="text-sm text-tinta-2">
      Al liquidar, el {artist} % va a la artista y el {100 - artist} % al espacio. El porcentaje se fijó antes de empezar.
    </p>
  );
}

export function AuctionPanel({ deploy, auctionId }: { deploy: DeployConfig; auctionId: number }) {
  const { auction, events, error, refresh } = useLiveAuction(deploy, auctionId);
  const { address } = useWallet();
  const now = useNowSeconds();
  const who = (account: string) => `${shortAddress(account)}${account === address ? " (vos)" : ""}`;

  if (!auction || now === undefined) {
    return (
      <p role={error ? "alert" : "status"} className="text-sm text-tinta-2">
        {error ?? "Leyendo la subasta en Stellar…"}
      </p>
    );
  }

  const status = auctionStatus(auction, now);
  const endTime = Number(auction.end_time);
  const remaining = endTime - now;
  const hasBids = auction.highest_bid > BigInt(0);
  const bidder = auction.highest_bidder ?? undefined;
  const settledEvent = events?.find((event) => event.type === "settled");
  const split = settledEvent
    ? { artist: settledEvent.artistAmount, venue: settledEvent.venueAmount }
    : settlementSplit(auction);
  const rows = events ? bidRows(events, status === "open") : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-tinta-2">
          {status === "open" && (
            <>
              Cierra en <span className="font-semibold text-tinta tabular-nums">{formatRemaining(remaining)}</span>, el{" "}
              {formatCierre(endTime)}
            </>
          )}
          {status === "ended" && <>Cerró el {formatCierre(endTime)}</>}
          {status === "settled" && <>Cerró y se liquidó</>}
        </p>

        <div aria-live="polite" className="flex flex-col gap-1">
          <p className="text-sm text-tinta-2">
            {hasBids ? (status === "open" ? "Oferta actual" : "Oferta ganadora") : "Precio base"}
          </p>
          <p
            key={String(auction.highest_bid)}
            className="motion-safe:animate-recibido font-serif text-5xl leading-none text-malbec tabular-nums"
          >
            {formatUsdc(hasBids ? auction.highest_bid : auction.min_price)}{" "}
            <span className="font-sans text-lg text-tinta-2">USDC</span>
          </p>
          <p className="text-sm text-tinta-2">
            {bidder ? (
              <>
                de <span className="font-mono">{who(bidder)}</span>
              </>
            ) : status === "open" ? (
              "Todavía no hay ofertas."
            ) : (
              "Cerró sin ofertas."
            )}
          </p>
        </div>

        {status === "open" && remaining <= ANTI_SNIPING_SECONDS && (
          <p className="border-l-2 border-ocre pl-3 text-sm text-tinta-2">
            Si alguien oferta en los últimos 5 minutos, el cierre se corre 5 minutos desde esa oferta.
          </p>
        )}
        {status === "ended" && hasBids && (
          <p className="text-sm text-tinta-2">
            Falta liquidarla. Cualquiera puede hacerlo y el contrato paga solo a la artista y al espacio.
          </p>
        )}
        {status === "settled" && hasBids && (
          <p className="text-sm">
            {formatUsdc(split.artist)} USDC para la artista y {formatUsdc(split.venue)} USDC para el espacio.{" "}
            {settledEvent && (
              <a
                href={explorerUrl(deploy, "tx", settledEvent.txHash)}
                target="_blank"
                rel="noreferrer"
                className="text-malbec underline underline-offset-2"
              >
                Ver la liquidación
              </a>
            )}
          </p>
        )}
      </div>

      {status === "open" && <BidForm deploy={deploy} auction={auction} onFinished={refresh} />}
      {status !== "settled" && <Split auction={auction} />}

      <section aria-labelledby="ofertas" className="flex flex-col gap-3 border-t border-linea pt-4">
        <h2 id="ofertas" className="font-serif text-xl">
          Ofertas
        </h2>
        {!rows && <p className="text-sm text-tinta-2">Buscando las ofertas en la red…</p>}
        {rows?.length === 0 && (
          <p className="text-sm text-tinta-2">
            {status === "open"
              ? `Nadie ofertó todavía. La primera oferta arranca en ${formatUsdc(auction.min_price)} USDC.`
              : "No hubo ofertas."}
          </p>
        )}
        {rows && rows.length > 0 && (
          <ol className="flex flex-col">
            {rows.map(({ bid, label }) => (
              <li key={bid.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-linea py-3 last:border-b-0">
                <span className="font-semibold tabular-nums">{formatUsdc(bid.amount)} USDC</span>
                <span className="font-mono text-sm text-tinta-2">{who(bid.bidder)}</span>
                <span className="text-sm text-piedra">{formatAgo(bid.closedAt, now)}</span>
                <span className="basis-full text-sm text-tinta-2">
                  {label}.{" "}
                  <a
                    href={explorerUrl(deploy, "tx", bid.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-malbec underline underline-offset-2"
                  >
                    Ver transacción
                  </a>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="text-sm text-tinta-2">
        Todo lo de esta subasta se puede verificar en{" "}
        <a
          href={explorerUrl(deploy, "contract", deploy.auctionContractId)}
          target="_blank"
          rel="noreferrer"
          className="text-malbec underline underline-offset-2"
        >
          el contrato en stellar.expert
        </a>
        .
      </p>
    </div>
  );
}
