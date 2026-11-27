"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadWalletKit } from "@/lib/wallet";

type SignTransaction = (
  xdr: string,
  opts?: { networkPassphrase?: string; address?: string },
) => Promise<{ signedTxXdr: string; signerAddress?: string }>;

type WalletContextValue = {
  address: string | null;
  connecting: boolean;
  // Resolves to null when the user closes the wallet picker without choosing.
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  // Same signature as contract.ClientOptions["signTransaction"] in @stellar/stellar-sdk.
  signTransaction: SignTransaction;
};

const WalletContext = createContext<WalletContextValue | null>(null);

// Wallets Kit rejects authModal() with this exact error when the picker is dismissed.
function isModalClosed(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    error.message === "The user closed the modal."
  );
}

export function WalletProvider({ networkPassphrase, children }: { networkPassphrase: string; children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: Array<() => void> = [];

    loadWalletKit(networkPassphrase).then(({ kit, KitEventType }) => {
      if (cancelled) return;
      unsubscribe = [
        kit.on(KitEventType.STATE_UPDATED, (event) => setAddress(event.payload.address ?? null)),
        kit.on(KitEventType.DISCONNECT, () => setAddress(null)),
      ];
    });

    return () => {
      cancelled = true;
      unsubscribe.forEach((off) => off());
    };
  }, [networkPassphrase]);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const { kit } = await loadWalletKit(networkPassphrase);
      const { address: connected } = await kit.authModal();
      setAddress(connected);
      return connected;
    } catch (error) {
      if (isModalClosed(error)) return null;
      throw error;
    } finally {
      setConnecting(false);
    }
  }, [networkPassphrase]);

  const disconnect = useCallback(async () => {
    const { kit } = await loadWalletKit(networkPassphrase);
    await kit.disconnect();
    setAddress(null);
  }, [networkPassphrase]);

  const signTransaction = useCallback<SignTransaction>(
    async (xdr, opts) => {
      const { kit } = await loadWalletKit(networkPassphrase);
      return kit.signTransaction(xdr, {
        networkPassphrase,
        address: opts?.address ?? address ?? undefined,
      });
    },
    [networkPassphrase, address],
  );

  const value = useMemo(
    () => ({ address, connecting, connect, disconnect, signTransaction }),
    [address, connecting, connect, disconnect, signTransaction],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet tiene que usarse dentro de <WalletProvider>");
  return context;
}
