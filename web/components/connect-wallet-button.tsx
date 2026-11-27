"use client";

import { useState } from "react";
import { useWallet } from "@/components/wallet-provider";
import { shortAddress } from "@/lib/format";
import type { WalletKind } from "@/lib/passkey-wallet";

function WalletKindIcon({ kind }: { kind: WalletKind | null }) {
  if (kind === "passkey") {
    return (
      <svg viewBox="0 0 24 24" className="size-3.5 text-tinta-2" fill="none" stroke="currentColor" strokeWidth="1.8" aria-label="Cuenta con huella">
        <path d="M7 11a5 5 0 0 1 10 0v3c0 3-1 5-2 7" strokeLinecap="round" />
        <path d="M9 11a3 3 0 0 1 6 0v4c0 2-.5 4-1.5 5.5" strokeLinecap="round" />
        <path d="M12 11v4c0 1.5-.2 3-.8 4.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "device") {
    return (
      <svg viewBox="0 0 24 24" className="size-3.5 text-tinta-2" fill="none" stroke="currentColor" strokeWidth="1.8" aria-label="Cuenta en este dispositivo">
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M11 17.5h2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 text-tinta-2" fill="none" stroke="currentColor" strokeWidth="1.8" aria-label="Wallet externa">
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path d="M15 12h5v3h-5a1.5 1.5 0 0 1 0-3Z" />
    </svg>
  );
}

export function ConnectWalletButton() {
  const { address, connecting, walletKind, connect, disconnect } = useWallet();
  const [error, setError] = useState<string | null>(null);

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
      <div className="flex items-center gap-1 rounded-full border border-linea bg-papel py-1 pl-3 pr-1">
        <span className="size-2 rounded-full bg-exito" aria-hidden />
        <WalletKindIcon kind={walletKind} />
        <span className="font-mono text-xs text-tinta" title={address}>
          {shortAddress(address)}
        </span>
        <button
          type="button"
          onClick={() => void disconnect()}
          className="ml-1 min-h-9 rounded-full px-3 text-xs text-tinta-2 transition-colors hover:bg-cal-2 hover:text-tinta"
        >
          Salir
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-end">
      <button
        type="button"
        onClick={() => void handleConnect()}
        disabled={connecting}
        className="min-h-11 rounded-full bg-tinta px-5 text-sm font-medium text-cal transition-colors hover:bg-malbec disabled:opacity-60"
      >
        {connecting ? "Entrando…" : "Entrar"}
      </button>
      {error && (
        <p role="alert" className="absolute top-full mt-1 whitespace-nowrap text-xs text-malbec">
          {error}
        </p>
      )}
    </div>
  );
}
