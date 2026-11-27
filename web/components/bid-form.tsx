"use client";

import { useRef, useState, type FormEvent } from "react";
import { useWallet } from "@/components/wallet-provider";
import { BidError, placeBid, type BidFailure, type BidStage } from "@/lib/bid";
import type { DeployConfig } from "@/lib/data";
import { explorerUrl, formatUsdc, minimumBid, parseUsdc, usdcInput, type Auction } from "@/lib/stellar";

type Status =
  | { kind: "idle" }
  | { kind: "working"; stage: BidStage }
  | { kind: "done"; amount: bigint; txHash: string }
  | { kind: "error"; reason: BidFailure | "unknown"; message: string; txHash?: string };

const STAGE_TEXT: Record<BidStage, string> = {
  checking: "Revisando tu saldo y preparando la oferta…",
  signing: "Firmá la oferta en tu wallet.",
  sending: "Enviando la oferta a la red…",
};

function parseDraft(draft: string): bigint | undefined {
  try {
    return parseUsdc(draft);
  } catch {
    return undefined;
  }
}

function TxLink({ deploy, hash }: { deploy: DeployConfig; hash: string }) {
  return (
    <a
      href={explorerUrl(deploy, "tx", hash)}
      target="_blank"
      rel="noreferrer"
      className="text-malbec underline underline-offset-2"
    >
      Ver transacción
    </a>
  );
}

export function BidForm({
  deploy,
  auction,
  onFinished,
}: {
  deploy: DeployConfig;
  auction: Auction;
  onFinished: () => void;
}) {
  const { address, connecting, connect, signTransaction } = useWallet();
  // null follows the minimum bid, so the prefilled amount updates when someone else bids.
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const submitting = useRef(false);

  const minimum = minimumBid(auction);
  const value = draft ?? usdcInput(minimum);
  const amount = parseDraft(value);
  const invalid =
    amount === undefined
      ? "Escribí un monto en USDC, por ejemplo 55 o 27,5."
      : amount < minimum
        ? `La oferta mínima es ${formatUsdc(minimum)} USDC.`
        : undefined;
  const working = status.kind === "working";
  const leading = address !== null && auction.highest_bidder === address;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || amount === undefined || invalid) return;
    submitting.current = true;
    try {
      const bidder = address ?? (await connect());
      if (!bidder) return;
      const { txHash } = await placeBid(
        deploy,
        { publicKey: bidder, signTransaction },
        auction.id,
        amount,
        (stage) => setStatus({ kind: "working", stage }),
      );
      setStatus({ kind: "done", amount, txHash });
      setDraft(null);
    } catch (error) {
      if (error instanceof BidError) {
        setStatus({ kind: "error", reason: error.reason, message: error.message, txHash: error.txHash });
        if (error.reason === "below-minimum") setDraft(null);
      } else {
        setStatus({
          kind: "error",
          reason: "unknown",
          message: "No pudimos completar la oferta. Revisá tu conexión y probá de nuevo.",
        });
      }
    } finally {
      submitting.current = false;
      onFinished();
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      {leading && status.kind !== "done" && (
        <p className="text-sm font-semibold text-malbec">Tu oferta es la más alta.</p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="monto" className="text-sm text-tinta-2">
          Tu oferta
        </label>
        <div className="flex items-baseline gap-2 border-b-2 border-tinta focus-within:border-malbec">
          <input
            id="monto"
            name="monto"
            inputMode="decimal"
            autoComplete="off"
            value={value}
            disabled={working}
            aria-invalid={invalid ? true : undefined}
            aria-describedby="monto-ayuda"
            onChange={(event) => {
              setDraft(event.target.value);
              if (status.kind === "error" || status.kind === "done") setStatus({ kind: "idle" });
            }}
            className="min-w-0 flex-1 bg-transparent py-1 font-serif text-3xl tabular-nums focus:outline-none"
          />
          <span className="text-lg text-tinta-2">USDC</span>
        </div>
        <p id="monto-ayuda" className={`text-sm ${invalid ? "text-malbec" : "text-tinta-2"}`}>
          {invalid ?? `Ofertá desde ${formatUsdc(minimum)} USDC.`}
        </p>
      </div>

      <button
        type="submit"
        disabled={working || connecting || Boolean(invalid)}
        className="min-h-12 rounded-full bg-malbec px-6 font-medium text-cal hover:bg-malbec-2 disabled:opacity-60"
      >
        {working ? "Ofertando…" : `Ofertar ${amount === undefined ? "" : `${formatUsdc(amount)} `}USDC`}
      </button>

      <p className="text-sm text-tinta-2">
        {address ? "" : "Primero vas a elegir tu wallet. "}Al firmar, los USDC quedan depositados en el contrato. Si
        alguien te supera, vuelven a tu wallet en esa misma transacción.
      </p>

      <div aria-live="polite" className="text-sm">
        {status.kind === "working" && <p>{STAGE_TEXT[status.stage]}</p>}
        {status.kind === "done" && (
          <p className="border-l-2 border-malbec pl-3">
            Listo: tu oferta de {formatUsdc(status.amount)} USDC quedó depositada.{" "}
            <TxLink deploy={deploy} hash={status.txHash} />
          </p>
        )}
        {status.kind === "error" && (
          <p role="alert" className="border-l-2 border-ocre pl-3">
            {status.message}{" "}
            {status.txHash && <TxLink deploy={deploy} hash={status.txHash} />}
          </p>
        )}
      </div>
    </form>
  );
}
