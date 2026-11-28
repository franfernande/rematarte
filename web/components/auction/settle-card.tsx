"use client";

import { T } from "@/components/language-switch";
import { useMemo, useState } from "react";
import { settleAuction, toFriendlyError } from "@/lib/auction";
import type { AuctionEvent, AuctionState } from "@/lib/auction-types";
import { formatUsdc, percentFromBps, shortAddress, txUrl } from "@/lib/format";
import { useWallet } from "@/components/wallet-provider";
import { idleTransaction, TransactionStatus, type TransactionView } from "./transaction-status";

type SettledEvent = Extract<AuctionEvent, { kind: "settled" }>;

function winnerName(winner: string | null, address: string | null): string {
  if (!winner) return "nadie";
  return winner === address ? "vos" : shortAddress(winner);
}

export function SettleCard({ auction, events, onRefresh }: { auction: AuctionState; events: AuctionEvent[]; onRefresh: () => void }) {
  const { address, connecting, connect, signTransaction } = useWallet();
  const [transaction, setTransaction] = useState<TransactionView>(idleTransaction);
  const [busy, setBusy] = useState(false);

  const settledEvent = useMemo(
    () => [...events].reverse().find((event): event is SettledEvent => event.kind === "settled"),
    [events],
  );

  async function handleSettle() {
    if (busy) return;
    setBusy(true);
    setTransaction({ state: "working", message: address ? "Preparando la liquidación…" : "Conectá tu wallet…" });
    try {
      const source = address ?? (await connect());
      if (!source) {
        setTransaction(idleTransaction);
        return;
      }
      const signWithProgress: typeof signTransaction = async (xdr, opts) => {
        setTransaction({ state: "working", message: "Confirmá en tu wallet…" });
        const signed = await signTransaction(xdr, opts);
        setTransaction({ state: "working", message: "Enviando a la red…" });
        return signed;
      };
      const result = await settleAuction({ auctionId: auction.id, source, signTransaction: signWithProgress });
      setTransaction({ state: "success", message: "La subasta quedó liquidada y el reparto se hizo en la misma transacción.", hash: result.hash });
      onRefresh();
    } catch (cause) {
      setTransaction({ state: "error", message: toFriendlyError(cause).message });
    } finally {
      setBusy(false);
    }
  }

  if (!auction.settled) {
    const winner = winnerName(auction.highestBidder, address);
    return (
      <section aria-labelledby="liquidacion" className="rounded-sm border border-linea bg-cal-2/40 px-4 py-4">
        <h3 id="liquidacion" className="etiqueta">
          <T>Cierre</T>
        </h3>
        <p className="mt-3 font-serif text-2xl leading-tight">
          <T>{auction.highestBid > 0n ? (
            <>
              <T>Subasta cerrada · ganó</T> <em className="text-malbec"><T>{winner}</T></em> <T>con</T> {formatUsdc(auction.highestBid)} USDC
            </>
          ) : (
            "Subasta cerrada · terminó sin ofertas"
          )}</T>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-tinta-2">
          <T>La liquidación es abierta: cualquiera puede ejecutarla y el contrato reparte solo entre artista y espacio.</T>
        </p>
        <button
          type="button"
          onClick={() => void handleSettle()}
          disabled={busy || connecting}
          className="mt-4 min-h-12 w-full rounded-full bg-malbec px-6 font-medium text-cal transition-colors hover:bg-malbec-2 disabled:opacity-50"
        >
          <T>{busy ? "Liquidando…" : address ? "Liquidar subasta" : "Conectar y liquidar"}</T>
        </button>
        {transaction.state !== "idle" && (
          <div className="mt-3">
            <TransactionStatus transaction={transaction} />
          </div>
        )}
      </section>
    );
  }

  const amount = settledEvent?.amount ?? auction.highestBid;
  const winner = settledEvent?.winner ?? auction.highestBidder;
  const fallbackVenue = (amount * BigInt(10_000 - auction.artistBps)) / 10_000n;
  const fallbackArtist = amount - fallbackVenue;
  const artistAmount = settledEvent?.artistAmount ?? fallbackArtist;
  const venueAmount = settledEvent?.venueAmount ?? fallbackVenue;
  const artistWidth = `${auction.artistBps / 100}%`;
  const venueWidth = `${(10_000 - auction.artistBps) / 100}%`;

  const hasSale = amount > 0n;

  return (
    <section
      aria-labelledby="reparto"
      className={`rounded-sm border px-4 py-4 ${hasSale ? "border-exito/35 bg-exito/5" : "border-linea bg-cal-2/40"}`}
    >
      <h3 id="reparto" className={`etiqueta ${hasSale ? "!text-exito" : ""}`}>
        <T>{hasSale ? "Obra vendida" : "Cerrada sin ofertas"}</T>
      </h3>
      {hasSale ? (
        <>
          <p className="mt-3 font-serif text-2xl leading-tight">
            <T>Ganó</T> <em className="text-malbec"><T>{winnerName(winner, address)}</T></em> <T>con</T> {formatUsdc(amount)} USDC
          </p>
          <div className="mt-5">
            <div className="flex h-3 overflow-hidden rounded-full bg-linea" aria-hidden>
              <div className="bg-malbec" style={{ width: artistWidth }} />
              <div className="bg-ocre" style={{ width: venueWidth }} />
            </div>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-tinta-2"><T>Artista ·</T> <T>{percentFromBps(auction.artistBps)}</T></dt>
                <dd className="font-serif text-xl text-tinta">{formatUsdc(artistAmount)} USDC</dd>
              </div>
              <div>
                <dt className="text-tinta-2"><T>Espacio ·</T> <T>{percentFromBps(10_000 - auction.artistBps)}</T></dt>
                <dd className="font-serif text-xl text-tinta">{formatUsdc(venueAmount)} USDC</dd>
              </div>
            </dl>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-tinta-2"><T>La subasta cerró sin ofertas; no se movieron fondos.</T></p>
      )}
      {settledEvent && (
        <a
          href={txUrl(settledEvent.txHash)}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-malbec underline decoration-malbec/30 underline-offset-4 transition-colors hover:text-malbec-2"
        >
          <T>Ver la liquidación en el explorador</T>
        </a>
      )}
      {transaction.state !== "idle" && (
        <div className="mt-3">
          <TransactionStatus transaction={transaction} />
        </div>
      )}
    </section>
  );
}
