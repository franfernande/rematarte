"use client";

import { T, TranslatedAttributes } from "@/components/language-switch";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { accountUrl, formatUsdc, shortAddress } from "@/lib/format";
import { getOnboardingAccountState, type OnboardingAccountState } from "@/lib/onboarding";
import type { WalletKind } from "@/lib/passkey-wallet";

const buttonBase = "inline-flex items-center justify-center rounded-full font-medium transition-colors disabled:opacity-60";
const smallButton = `${buttonBase} min-h-9 px-3 text-xs`;
const fullButton = `${buttonBase} min-h-11 px-4 text-sm`;

function kindLabel(kind: WalletKind | null): string {
  if (kind === "passkey") return "Cuenta con huella";
  if (kind === "device") return "Cuenta en este dispositivo";
  return "Wallet externa Albedo o Varial";
}

export function AccountPanel({ address, walletKind, onDisconnect }: { address: string; walletKind: WalletKind | null; onDisconnect: () => void }) {
  const [state, setState] = useState<OnboardingAccountState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setState(await getOnboardingAccountState(address));
    } catch {
      setError("No pudimos leer el saldo. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0);
    return () => {
      window.clearTimeout(initialLoad);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    };
  }, [refresh]);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const incomplete = state !== null && (!state.exists || !state.hasTrustline);

  return (
    <div className="grid gap-4 p-4">
      <div className="flex items-start justify-between gap-3 border-b border-linea pb-4">
        <div>
          <p className="text-sm font-medium text-tinta"><T>{kindLabel(walletKind)}</T></p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TranslatedAttributes><span className="font-mono text-sm text-tinta-2" title={address}>
              <T>{shortAddress(address)}</T>
            </span></TranslatedAttributes>
            <button type="button" onClick={() => void copyAddress()} className={`${smallButton} border border-tinta/20 text-tinta hover:bg-cal-2`}>
              <T>{copied ? "Copiada" : "Copiar"}</T>
            </button>
          </div>
        </div>
        <span className="rounded-full border border-dashed border-ocre px-3 py-1 text-xs text-tinta-2"><T>Modo prueba</T></span>
      </div>

      <div className="rounded-sm border border-linea bg-cal-2/35 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="etiqueta"><T>USDC de prueba</T></p>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${incomplete ? "bg-ocre/10 text-tinta-2" : "bg-exito/10 text-exito"}`}>
            <T>{incomplete ? "Falta un paso" : "Cuenta activa"}</T>
          </span>
        </div>
        {loading ? (
          <TranslatedAttributes><div className="mt-3" aria-label="Cargando saldo">
            <div className="h-9 w-32 animate-pulse rounded-sm bg-linea/60" />
            <div className="mt-2 h-4 w-44 animate-pulse rounded-sm bg-linea/50" />
          </div></TranslatedAttributes>
        ) : error ? (
          <div className="mt-3">
            <p className="text-sm text-malbec"><T>{error}</T></p>
            <button type="button" onClick={() => void refresh()} className={`${smallButton} mt-3 border border-malbec/30 text-malbec hover:bg-malbec/5`}>
              <T>Reintentar</T>
            </button>
          </div>
        ) : incomplete ? (
          <div className="mt-3">
            <p className="text-sm leading-relaxed text-tinta-2">
              <T>{!state?.exists ? "La cuenta todavía no está activada." : "La cuenta todavía no tiene USDC habilitado."}</T>
            </p>
            <Link href="/empezar" className={`${fullButton} mt-3 bg-malbec text-cal hover:bg-malbec-2`}>
              <T>Completar en Empezar</T>
            </Link>
          </div>
        ) : (
          <p className="mt-2 font-serif text-4xl tabular-nums text-tinta">
            {formatUsdc(state?.usdcBalanceStroops ?? 0n)} <span className="text-lg italic text-piedra">USDC</span>
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <a href={accountUrl(address)} target="_blank" rel="noreferrer" className={`${fullButton} border border-tinta/20 text-tinta hover:bg-cal-2`}>
          <T>Ver en el explorador</T>
        </a>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => void refresh()} disabled={loading} className={`${fullButton} border border-tinta/20 text-tinta hover:bg-cal-2`}>
            <T>{loading ? "Actualizando…" : "Actualizar saldo"}</T>
          </button>
          <button type="button" onClick={onDisconnect} className={`${fullButton} bg-tinta text-cal hover:bg-malbec`}>
            <T>Salir</T>
          </button>
        </div>
      </div>
    </div>
  );
}
