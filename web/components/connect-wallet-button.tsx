"use client";

import { T, TranslatedAttributes } from "@/components/language-switch";
import { useEffect, useRef, useState } from "react";
import { useWallet } from "@/components/wallet-provider";
import { AccountPanel } from "@/components/wallet/account-panel";
import { shortAddress } from "@/lib/format";
import type { WalletKind } from "@/lib/passkey-wallet";

function walletKindLabel(kind: WalletKind | null): string {
  if (kind === "passkey") return "Cuenta con huella";
  if (kind === "device") return "Cuenta en este dispositivo";
  return "Wallet externa";
}

function WalletKindIcon({ kind }: { kind: WalletKind | null }) {
  if (kind === "passkey") {
    return (
      <svg viewBox="0 0 24 24" className="size-3.5 text-tinta-2" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M7 11a5 5 0 0 1 10 0v3c0 3-1 5-2 7" strokeLinecap="round" />
        <path d="M9 11a3 3 0 0 1 6 0v4c0 2-.5 4-1.5 5.5" strokeLinecap="round" />
        <path d="M12 11v4c0 1.5-.2 3-.8 4.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "device") {
    return (
      <svg viewBox="0 0 24 24" className="size-3.5 text-tinta-2" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M11 17.5h2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 text-tinta-2" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path d="M15 12h5v3h-5a1.5 1.5 0 0 1 0-3Z" />
    </svg>
  );
}

export function ConnectWalletButton() {
  const { address, connecting, walletKind, connect, disconnect } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!panelOpen) return;
    const root = rootRef.current;
    const trigger = triggerRef.current;
    window.setTimeout(() => root?.querySelector<HTMLElement>("#panel-cuenta button")?.focus({ preventScroll: true }), 0);
    function pointer(event: PointerEvent) {
      if (root && event.target instanceof Node && !root.contains(event.target)) setPanelOpen(false);
    }
    function keys(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setPanelOpen(false);
      }
    }
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", keys);
      window.setTimeout(() => trigger?.focus({ preventScroll: true }), 0);
    };
  }, [panelOpen]);

  async function handleConnect() {
    setError(null);
    try {
      await connect();
    } catch {
      setError("No se pudo conectar la wallet.");
    }
  }

  if (address) {
    return (
      <div ref={rootRef} className="relative">
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={panelOpen}
          aria-controls="panel-cuenta"
          onClick={() => setPanelOpen((open) => !open)}
          className="flex min-h-11 items-center gap-1 rounded-full border border-linea bg-papel py-1 pl-3 pr-2 transition-colors hover:bg-cal-2"
        >
          <span className="size-2 rounded-full bg-exito" aria-hidden />
          <WalletKindIcon kind={walletKind} />
          <span className="sr-only"><T>{walletKindLabel(walletKind)}</T></span>
          <TranslatedAttributes><span className="font-mono text-xs text-tinta" title={address}>
            <T>{shortAddress(address)}</T>
          </span></TranslatedAttributes>
          <svg viewBox="0 0 16 16" className="size-3 text-tinta-2" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {panelOpen && (
          <div id="panel-cuenta" className="cartela absolute right-0 top-full z-50 mt-2 w-[calc(100vw-1.5rem)] max-w-sm overflow-hidden sm:w-96">
            <AccountPanel address={address} walletKind={walletKind} onDisconnect={() => void disconnect()} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-end">
      <button
        type="button"
        onClick={() => void handleConnect()}
        disabled={connecting}
        className="min-h-11 whitespace-nowrap rounded-full border border-malbec bg-transparent px-3 text-sm font-medium text-malbec transition-colors hover:bg-malbec/5 disabled:opacity-60 sm:px-5"
      >
        <T>{connecting ? (
          "Conectando…"
        ) : (
          <>
            <span className="sm:hidden">
              <T>Conectar</T><span className="sr-only"> wallet</span>
            </span>
            <span className="hidden sm:inline"><T>Conectar wallet</T></span>
          </>
        )}</T>
      </button>
      <T>{error && (
        <p role="alert" className="absolute top-full mt-1 whitespace-nowrap text-xs text-malbec">
          <T>{error}</T>
        </p>
      )}</T>
    </div>
  );
}
