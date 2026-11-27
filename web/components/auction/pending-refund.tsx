"use client";

import { useState } from "react";
import { claimRefund, toFriendlyError } from "@/lib/auction";
import { formatUsdc } from "@/lib/format";
import { useWallet } from "@/components/wallet-provider";
import { idleTransaction, TransactionStatus, type TransactionView } from "./transaction-status";

export function PendingRefund({ amount, onClaimed }: { amount: bigint; onClaimed: () => void }) {
  const { address, connecting, connect, signTransaction } = useWallet();
  const [transaction, setTransaction] = useState<TransactionView>(idleTransaction);
  const [busy, setBusy] = useState(false);

  if (amount <= 0n) {
    if (transaction.state === "idle") return null;
    return <TransactionStatus transaction={transaction} />;
  }

  async function handleClaim() {
    if (busy) return;
    setBusy(true);
    setTransaction({ state: "working", message: address ? "Preparando el reclamo…" : "Conectá tu wallet…" });
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
      const result = await claimRefund({ bidder, signTransaction: signWithProgress });
      setTransaction({
        state: "success",
        message: `Tus ${formatUsdc(amount)} USDC volvieron a tu wallet.`,
        hash: result.hash,
      });
      onClaimed();
    } catch (cause) {
      setTransaction({ state: "error", message: toFriendlyError(cause).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="reembolso-pendiente" className="rounded-sm border border-ocre/45 bg-ocre/10 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="reembolso-pendiente" className="etiqueta !text-ocre">
            Reembolso pendiente
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-tinta">
            Tu reembolso quedó pendiente. Tenés <strong>{formatUsdc(amount)} USDC</strong> para reclamar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleClaim()}
          disabled={busy || connecting}
          className="min-h-12 rounded-full bg-malbec px-6 font-medium text-cal transition-colors hover:bg-malbec-2 disabled:opacity-50"
        >
          {busy ? "Reclamando…" : address ? "Reclamar" : "Conectar y reclamar"}
        </button>
      </div>
      {transaction.state !== "idle" && (
        <div className="mt-3">
          <TransactionStatus transaction={transaction} />
        </div>
      )}
    </section>
  );
}
