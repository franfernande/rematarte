"use client";

import { T, TranslatedAttributes } from "@/components/language-switch";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { placeBid, readUsdcBalance, toFriendlyError } from "@/lib/auction";
import type { AuctionState } from "@/lib/auction-types";
import { ContactoApiError, contactoEstaRegistrado, guardarContacto } from "@/lib/contactos-client";
import { formatUsdc, minNextBid, parseUsdc } from "@/lib/format";
import { ContactForm } from "@/components/contacto/contact-form";
import { useWallet } from "@/components/wallet-provider";
import { stroopsToInput } from "./auction-utils";
import { idleTransaction, TransactionStatus, type TransactionView } from "./transaction-status";

type BalanceResult = {
  owner: string;
  value?: bigint | null;
};

type SuccessfulBid = {
  bidder: string;
  amount: bigint;
  baselineBid: bigint;
  baselineBidder: string | null;
};

type ContactStep = {
  address: string;
  amount: bigint;
};

const quickMultipliers = [1, 2, 5] as const;

function contactSessionKey(address: string): string {
  return `rematarte:contacto-registrado:${address}`;
}

function readContactSession(address: string): boolean {
  try {
    return window.sessionStorage.getItem(contactSessionKey(address)) === "1";
  } catch {
    return false;
  }
}

function writeContactSession(address: string) {
  try {
    window.sessionStorage.setItem(contactSessionKey(address), "1");
  } catch {
    // Session storage can be unavailable in private browsing; the API remains authoritative.
  }
}

function telefonoPareceValido(value: string): boolean {
  if (!/^\+?[\d\s().-]+$/.test(value.trim())) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export function BidForm({ auction, titulo, onRefresh }: { auction: AuctionState; titulo: string; onRefresh: () => void }) {
  const { address, connecting, connect, signTransaction } = useWallet();
  const minimum = minNextBid(auction);
  const [inputOverride, setInputOverride] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<TransactionView>(idleTransaction);
  const [busy, setBusy] = useState(false);
  const [balanceResult, setBalanceResult] = useState<BalanceResult | null>(null);
  const [successfulBid, setSuccessfulBid] = useState<SuccessfulBid | null>(null);
  const [contactStep, setContactStep] = useState<ContactStep | null>(null);
  const [contactNombre, setContactNombre] = useState("");
  const [contactTelefono, setContactTelefono] = useState("");
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactNotice, setContactNotice] = useState<string | null>(null);

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

  async function executeBid(bidder: string, bidAmount: bigint) {
    const signWithProgress: typeof signTransaction = async (xdr, opts) => {
      setTransaction({ state: "working", message: "Confirmá en tu wallet…" });
      const signed = await signTransaction(xdr, opts);
      setTransaction({ state: "working", message: "Enviando a la red…" });
      return signed;
    };
    const result = await placeBid({ auctionId: auction.id, bidder, amount: bidAmount, signTransaction: signWithProgress });
    setSuccessfulBid({
      bidder,
      amount: bidAmount,
      baselineBid: auction.highestBid,
      baselineBidder: auction.highestBidder,
    });
    setTransaction({
      state: "success",
      message: `Tu oferta de ${formatUsdc(bidAmount)} USDC está depositada.`,
      hash: result.hash,
    });
    setInputOverride(null);
    onRefresh();
    void refreshBalance(bidder);
  }

  async function contactIsMissing(bidder: string): Promise<boolean> {
    if (readContactSession(bidder)) return false;
    try {
      const registered = await contactoEstaRegistrado(bidder);
      if (registered) writeContactSession(bidder);
      return !registered;
    } catch (cause) {
      if (cause instanceof ContactoApiError && cause.status === 403) {
        setContactNotice("El registro de contacto no está disponible en esta versión, pero tu oferta puede continuar.");
        return false;
      }
      throw new Error("No pudimos revisar tus datos de contacto. Revisá tu conexión y probá de nuevo.");
    }
  }

  async function startBid(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !amountIsValid || amount === null) return;

    setBusy(true);
    setSuccessfulBid(null);
    setContactError(null);
    setTransaction({ state: "working", message: address ? "Preparando tu oferta…" : "Conectá tu wallet…" });
    try {
      const bidder = address ?? (await connect());
      if (!bidder) {
        setTransaction(idleTransaction);
        return;
      }
      if (await contactIsMissing(bidder)) {
        setContactStep({ address: bidder, amount });
        setTransaction(idleTransaction);
        return;
      }
      await executeBid(bidder, amount);
    } catch (cause) {
      setTransaction({ state: "error", message: toFriendlyError(cause).message });
    } finally {
      setBusy(false);
    }
  }

  async function saveContactAndBid(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !contactStep) return;

    const nombre = contactNombre.trim();
    const telefono = contactTelefono.trim();
    if (nombre.length < 2 || nombre.length > 80) {
      setContactError("Ingresá nombre y apellido, entre 2 y 80 caracteres.");
      return;
    }
    if (!telefonoPareceValido(telefono)) {
      setContactError("Ingresá un teléfono válido en formato internacional.");
      return;
    }
    if (contactStep.amount < minimum) {
      setContactStep(null);
      setTransaction({ state: "error", message: `La oferta mínima cambió. Ahora es ${formatUsdc(minimum)} USDC.` });
      return;
    }

    setBusy(true);
    setContactError(null);
    try {
      await guardarContacto({ address: contactStep.address, nombre, telefono });
      writeContactSession(contactStep.address);
    } catch (cause) {
      if (cause instanceof ContactoApiError && cause.status === 403) {
        setContactNotice("El registro de contacto no está disponible en esta versión, pero tu oferta puede continuar.");
      } else {
        setContactError(cause instanceof ContactoApiError ? cause.message : "No pudimos guardar tus datos. Probá de nuevo.");
        setBusy(false);
        return;
      }
    }

    const pending = contactStep;
    setContactStep(null);
    setTransaction({ state: "working", message: "Preparando tu oferta…" });
    try {
      await executeBid(pending.address, pending.amount);
    } catch (cause) {
      setTransaction({ state: "error", message: toFriendlyError(cause).message });
    } finally {
      setBusy(false);
    }
  }

  const validAmount = amount ?? minimum;
  const buttonText = contactStep
    ? busy
      ? "Guardando…"
      : "Guardar y ofertar"
    : busy
      ? "Ofertando…"
      : connecting
        ? "Conectando…"
        : address
          ? `Ofertar ${formatUsdc(validAmount)} USDC`
          : "Conectar y ofertar";
  const successStillValid =
    !successfulBid ||
    (auction.highestBid === successfulBid.amount && auction.highestBidder === successfulBid.bidder) ||
    (auction.highestBid === successfulBid.baselineBid && auction.highestBidder === successfulBid.baselineBidder);
  const showTransaction = transaction.state !== "idle" && (transaction.state !== "success" || successStillValid);
  const submitDisabled = busy || connecting || !amountIsValid;

  return (
    <TranslatedAttributes><form aria-label={`Ofertar por ${titulo}`} onSubmit={(event) => void (contactStep ? saveContactAndBid(event) : startBid(event))} className="rounded-sm border border-linea bg-cal-2/35 px-4 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={`monto-oferta-${auction.id}`} className="etiqueta">
          <T>Tu oferta</T>
        </label>
        <span className="text-xs text-piedra"><T>Mínima actual:</T> {formatUsdc(minimum)} USDC</span>
      </div>

      <div className="relative mt-3">
        <input
          id={`monto-oferta-${auction.id}`}
          name="monto"
          inputMode="decimal"
          autoComplete="off"
          value={input}
          disabled={busy || contactStep !== null}
          onChange={(event) => setInputOverride(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={`ayuda-oferta-${auction.id}`}
          className="min-h-14 w-full rounded-sm border border-linea bg-papel px-4 pr-16 font-serif text-3xl text-tinta outline-none transition-colors placeholder:text-piedra focus:border-malbec disabled:opacity-60"
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-serif text-lg italic text-piedra">USDC</span>
      </div>

      <TranslatedAttributes><div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto pb-1" aria-label="Atajos de monto">
        {quickMultipliers.map((multiplier) => (
          <TranslatedAttributes key={multiplier}><button
            type="button"
            onClick={() => chooseQuick(multiplier)}
            disabled={busy || contactStep !== null}
            className="min-h-11 shrink-0 rounded-full border border-tinta/20 px-4 text-sm font-medium text-tinta-2 transition-colors hover:border-malbec hover:text-malbec disabled:opacity-50"
            aria-label={`Ofertar ${formatUsdc(minimum + auction.minIncrement * BigInt(multiplier))} USDC`}
          >
            {formatUsdc(minimum + auction.minIncrement * BigInt(multiplier))} USDC
          </button></TranslatedAttributes>
        ))}
      </div></TranslatedAttributes>

      <div id={`ayuda-oferta-${auction.id}`} className="mt-3 space-y-2 text-sm leading-relaxed">
        <p className="text-xs text-tinta-2"><T>Podés usar coma o punto para los decimales, con un máximo de 7.</T></p>
        {error ? (
          <p role="alert" className="text-malbec">
            <T>{error}</T>
          </p>
        ) : (
          <p className="text-tinta-2"><T>Tu oferta queda depositada en el contrato. Si alguien te supera, te la devolvemos al instante.</T></p>
        )}

        <T>{address && balance !== undefined && insufficientBalance && (
          <p className="rounded-sm border border-ocre/40 bg-ocre/10 px-3 py-2 text-tinta">
            <T>Te faltan USDC de prueba:</T>{" "}
            <Link href="/empezar" className="font-medium text-malbec underline decoration-malbec/35 underline-offset-4">
              <T>conseguí 200 en 1 minuto</T>
            </Link>
            .
          </p>
        )}</T>
        <T>{address && balance !== undefined && balance !== null && !insufficientBalance && (
          <p className="text-xs text-piedra"><T>Tenés</T> {formatUsdc(balance)} <T>USDC de prueba disponibles.</T></p>
        )}</T>
        <T>{contactNotice && <p className="rounded-sm border border-ocre/40 bg-ocre/10 px-3 py-2 text-xs text-tinta-2"><T>{contactNotice}</T></p>}</T>
      </div>

      {contactStep && (
        <ContactForm
          id={`contacto-oferta-${auction.id}`}
          nombre={contactNombre}
          telefono={contactTelefono}
          error={contactError}
          disabled={busy}
          onNombreChange={setContactNombre}
          onTelefonoChange={setContactTelefono}
        />
      )}

      <button
        type="submit"
        disabled={submitDisabled}
        className="mt-4 min-h-12 w-full rounded-full bg-malbec px-6 font-medium text-cal transition-colors hover:bg-malbec-2 disabled:opacity-50"
      >
        <T>{buttonText}</T>
      </button>

      {showTransaction && (
        <div className="mt-3">
          <TransactionStatus transaction={transaction} />
        </div>
      )}
    </form></TranslatedAttributes>
  );
}
