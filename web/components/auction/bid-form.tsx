"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { placeBid, readUsdcBalance, toFriendlyError } from "@/lib/auction";
import type { AuctionState } from "@/lib/auction-types";
import { formatUsdc, minNextBid, parseUsdc } from "@/lib/format";
import { useWallet } from "@/components/wallet-provider";
import { stroopsToInput } from "./auction-utils";
import { idleTransaction, TransactionStatus, type TransactionView } from "./transaction-status";

type BalanceResult = {
  owner: string;
  value?: bigint | null;
};

const quickMultipliers = [1, 2, 5] as const;

export function BidForm({ auction, titulo, onRefresh }: { auction: AuctionState; titulo: string; onRefresh: () => void }) {
  const { address, connecting, connect, signTransaction } = useWallet();
  const minimum = minNextBid(auction);
  const [inputOverride, setInputOverride] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<TransactionView>(idleTransaction);
  const [busy, setBusy] = useState(false);
  const [balanceResult, setBalanceResult] = useState<BalanceResult | null>(null);

  const input = inputOverride ?? stroopsToInput(minimum);
  const amount = parseUsdc(input);
  const amountIsValid = amount !== null && amount >= minimum;
  const balance = address && balanceResult?.owner === address ? balanceResult.value : undefined;

  const refreshBalance = useCallback(async (owner: string) => {
    try {
      const value = await readUsdcBalance(owner);
      setBalanceResult({ owner, value });
    } catch {
      // A read error is not the same as an unprepared account; leave the
      // balance unknown and let the transaction error explain itself.
      setBalanceResult({ owner });
    }
  }, []);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    readUsdcBalance(address)
      .then((value) => {
        if (!cancelled) setBalanceResult({ owner: address, value });
      })
      .catch(() => {
        if (!cancelled) setBalanceResult({ owner: address });
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  function validationMessage(): string | null {
    if (amount === null) return "Ingresá un monto válido, con hasta 7 decimales.";
    if (amount < minimum) return `La oferta mínima ahora es ${formatUsdc(minimum)} USDC.`;
    return null;
  }

  const error = inputOverride === null ? null : validationMessage();
  const insufficientBalance = Boolean(address && amount !== null && (balance === null || (balance !== undefined && balance < amount)));

  function chooseQuick(multiplier: number) {
    const next = minimum + auction.minIncrement * BigInt(multiplier);
    setInputOverride(stroopsToInput(next));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !amountIsValid || amount === null) return;

    setBusy(true);
    setTransaction({ state: "working", message: address ? "Preparando tu oferta…" : "Conectá tu wallet…" });
    try {
      const bidder = address ?? (await connect());
      if (!bidder) {
        setTransaction(idleTransaction);
        return;
      }
      const signWithProgress: typeof signTransaction = async (xdr, opts) => {
        setTransaction({ state: "working", message: "Confirmá en tu wallet…" });
        const signed = await signTransaction(xdr, opts);
        setTransaction({ state: "working", message: "Enviando a la red…" });
        return signed;
      };
      const result = await placeBid({ auctionId: auction.id, bidder, amount, signTransaction: signWithProgress });
      setTransaction({
        state: "success",
        message: `Tu oferta de ${formatUsdc(amount)} USDC está depositada.`,
        hash: result.hash,
      });
      setInputOverride(null);
      onRefresh();
      void refreshBalance(bidder);
    } catch (cause) {
      setTransaction({ state: "error", message: toFriendlyError(cause).message });
    } finally {
      setBusy(false);
    }
  }

  const validAmount = amount ?? minimum;
  const buttonText = busy
    ? "Ofertando…"
    : connecting
      ? "Conectando…"
      : address
        ? `Ofertar ${formatUsdc(validAmount)} USDC`
        : "Conectar y ofertar";

  return (
    <form aria-label={`Ofertar por ${titulo}`} onSubmit={(event) => void handleSubmit(event)} className="rounded-sm border border-linea bg-cal-2/35 px-4 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={`monto-oferta-${auction.id}`} className="etiqueta">
          Tu oferta
        </label>
        <span className="text-xs text-piedra">Mínima: {formatUsdc(minimum)} USDC</span>
      </div>

      <div className="relative mt-3">
        <input
          id={`monto-oferta-${auction.id}`}
          name="monto"
          inputMode="decimal"
          autoComplete="off"
          value={input}
          disabled={busy}
          onChange={(event) => setInputOverride(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={`ayuda-oferta-${auction.id}`}
          className="min-h-14 w-full rounded-sm border border-linea bg-papel px-4 pr-16 font-serif text-3xl text-tinta outline-none transition-colors placeholder:text-piedra focus:border-malbec disabled:opacity-60"
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-serif text-lg italic text-piedra">USDC</span>
      </div>

      <div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto pb-1" aria-label="Atajos de monto">
        {quickMultipliers.map((multiplier) => (
          <button
            key={multiplier}
            type="button"
            onClick={() => chooseQuick(multiplier)}
            disabled={busy}
            className="min-h-11 shrink-0 rounded-full border border-tinta/20 px-4 text-sm font-medium text-tinta-2 transition-colors hover:border-malbec hover:text-malbec disabled:opacity-50"
            aria-label={`Ofertar ${formatUsdc(minimum + auction.minIncrement * BigInt(multiplier))} USDC`}
          >
            {formatUsdc(minimum + auction.minIncrement * BigInt(multiplier))} USDC
          </button>
        ))}
      </div>

      <div id={`ayuda-oferta-${auction.id}`} className="mt-3 space-y-2 text-sm leading-relaxed">
        {error ? (
          <p role="alert" className="text-malbec">
            {error}
          </p>
        ) : (
          <p className="text-tinta-2">Tu oferta queda depositada en el contrato. Si alguien te supera, te la devolvemos al instante.</p>
        )}

        {address && balance !== undefined && insufficientBalance && (
          <p className="rounded-sm border border-ocre/40 bg-ocre/10 px-3 py-2 text-tinta">
            Te faltan USDC de prueba:{" "}
            <Link href="/empezar" className="font-medium text-malbec underline decoration-malbec/35 underline-offset-4">
              conseguí 200 en 1 minuto
            </Link>
            .
          </p>
        )}
        {address && balance !== undefined && balance !== null && !insufficientBalance && (
          <p className="text-xs text-piedra">Tenés {formatUsdc(balance)} USDC de prueba disponibles.</p>
        )}
      </div>

      <button
        type="submit"
        disabled={busy || connecting || !amountIsValid}
        className="mt-4 min-h-12 w-full rounded-full bg-malbec px-6 font-medium text-cal transition-colors hover:bg-malbec-2 disabled:opacity-50"
      >
        {buttonText}
      </button>

      {transaction.state !== "idle" && (
        <div className="mt-3">
          <TransactionStatus transaction={transaction} />
        </div>
      )}
    </form>
  );
}
