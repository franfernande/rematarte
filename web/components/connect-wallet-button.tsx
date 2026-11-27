"use client";

import { useState } from "react";
import { useWallet } from "@/components/wallet-provider";

function shortAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function ConnectWalletButton() {
  const { address, connecting, connect, disconnect } = useWallet();
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
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm" title={address}>
          {shortAddress(address)}
        </span>
        <button
          type="button"
          onClick={() => void disconnect()}
          className="min-h-11 rounded-full border border-foreground/20 px-4 text-sm"
        >
          Desconectar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void handleConnect()}
        disabled={connecting}
        className="min-h-11 rounded-full bg-foreground px-4 text-sm font-medium text-background disabled:opacity-60"
      >
        {connecting ? "Conectando…" : "Conectar wallet"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
