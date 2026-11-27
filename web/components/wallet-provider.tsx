"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LoginDialog, type LoginProgressStep, type LoginStage } from "@/components/wallet/login-dialog";
import { readUsdcBalance } from "@/lib/auction";
import {
  PasskeyWalletError,
  clearStoredWalletSession,
  createDeviceWallet,
  createPasskeyWallet,
  detectPrfSupport,
  loadDeviceWallet,
  loadStoredWalletSession,
  loginPasskeyWallet,
  passkeyErrorMessage,
  signWithLocalKeypair,
  type LocalWallet,
  type PrfSupport,
  type WalletKind,
} from "@/lib/passkey-wallet";
import { loadWalletKit } from "@/lib/wallet";
import type { Keypair } from "@stellar/stellar-sdk";

type SignTransaction = (
  xdr: string,
  opts?: { networkPassphrase?: string; address?: string },
) => Promise<{ signedTxXdr: string; signerAddress?: string }>;

type WalletContextValue = {
  address: string | null;
  connecting: boolean;
  walletKind: WalletKind | null;
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  signTransaction: SignTransaction;
};

type LoginRetryAction = "create-passkey" | "login-passkey" | "create-device" | "external";

type PrepareAccount = (args: {
  address: string;
  signTransaction: SignTransaction;
  onStep: (event: LoginProgressStep) => void;
}) => Promise<void>;

const WalletContext = createContext<WalletContextValue | null>(null);

function isModalClosed(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    error.message === "The user closed the modal."
  );
}

function upsertProgress(current: LoginProgressStep[], event: LoginProgressStep[]): LoginProgressStep[] {
  const next = [...current];
  for (const item of event) {
    const index = next.findIndex((existing) => existing.step === item.step);
    if (index >= 0) next[index] = item;
    else next.push(item);
  }
  return next;
}

async function loadPrepareAccount(): Promise<PrepareAccount | null> {
  const onboarding = await import("@/lib/onboarding");
  return (onboarding as { prepareAccount?: PrepareAccount }).prepareAccount ?? null;
}

export function WalletProvider({ networkPassphrase, children }: { networkPassphrase: string; children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [walletKind, setWalletKind] = useState<WalletKind | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stage, setStage] = useState<LoginStage>("choice");
  const [dialogMessage, setDialogMessage] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [progress, setProgress] = useState<LoginProgressStep[]>([]);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [prfSupport, setPrfSupport] = useState<PrfSupport>("unknown");
  const [forceDeviceFallback, setForceDeviceFallback] = useState(false);
  const retryActionRef = useRef<LoginRetryAction>("create-passkey");

  const keypairRef = useRef<Keypair | null>(null);
  const walletKindRef = useRef<WalletKind | null>(null);
  const addressRef = useRef<string | null>(null);
  const connectResolverRef = useRef<((value: string | null) => void) | null>(null);
  const connectPromiseRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    walletKindRef.current = walletKind;
  }, [walletKind]);

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      const stored = loadStoredWalletSession();
      if (!stored) return;
      if (stored.kind === "device") {
        const device = loadDeviceWallet();
        if (!device || device.keypair.publicKey() !== stored.publicKey) {
          clearStoredWalletSession();
          return;
        }
        keypairRef.current = device.keypair;
      }
      setAddress(stored.publicKey);
      setWalletKind(stored.kind);
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void detectPrfSupport().then((support) => {
      if (!cancelled) setPrfSupport(support);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: Array<() => void> = [];

    loadWalletKit(networkPassphrase).then(({ kit, KitEventType }) => {
      if (cancelled) return;
      unsubscribe = [
        kit.on(KitEventType.STATE_UPDATED, (event) => {
          if (walletKindRef.current === "external" || walletKindRef.current === null) {
            setAddress(event.payload.address ?? null);
            if (event.payload.address) setWalletKind("external");
          }
        }),
        kit.on(KitEventType.DISCONNECT, () => {
          if (walletKindRef.current === "external") {
            setAddress(null);
            setWalletKind(null);
          }
        }),
      ];
    });

    return () => {
      cancelled = true;
      unsubscribe.forEach((off) => off());
    };
  }, [networkPassphrase]);

  const resolveConnect = useCallback((value: string | null) => {
    const resolve = connectResolverRef.current;
    connectResolverRef.current = null;
    connectPromiseRef.current = null;
    if (resolve) resolve(value);
    setConnecting(false);
  }, []);

  const resetDialog = useCallback(() => {
    setStage("choice");
    setDialogMessage(null);
    setDialogError(null);
    setProgress([]);
    setBalance(null);
  }, []);

  const connect = useCallback(() => {
    if (connectPromiseRef.current) return connectPromiseRef.current;
    if (addressRef.current && keypairRef.current) return Promise.resolve(addressRef.current);
    resetDialog();
    setForceDeviceFallback(false);
    setDialogOpen(true);
    setConnecting(true);
    const promise = new Promise<string | null>((resolve) => {
      connectResolverRef.current = resolve;
    });
    connectPromiseRef.current = promise;
    return promise;
  }, [resetDialog]);

  const closeDialog = useCallback(() => {
    resolveConnect(null);
    setDialogOpen(false);
  }, [resolveConnect]);

  const adoptLocalWallet = useCallback((wallet: LocalWallet) => {
    keypairRef.current = wallet.keypair;
    const publicKey = wallet.keypair.publicKey();
    setAddress(publicKey);
    setWalletKind(wallet.kind);
    return publicKey;
  }, []);

  const finishLocalLogin = useCallback(
    async (wallet: LocalWallet) => {
      const publicKey = adoptLocalWallet(wallet);
      setStage("preparing");
      setDialogMessage("Preparando tu cuenta…");
      setProgress([]);

      const localSignTransaction: SignTransaction = async (xdr, opts) =>
        signWithLocalKeypair(wallet.keypair, xdr, networkPassphrase, opts);

      let finalMessage = "Tu cuenta quedó lista para ofertar.";
      try {
        const prepareAccount = await loadPrepareAccount();
        if (prepareAccount) {
          await prepareAccount({
            address: publicKey,
            signTransaction: localSignTransaction,
            onStep: (event) => {
              setProgress((current) => upsertProgress(current, [event]));
            },
          });
        } else {
          finalMessage = "Tu cuenta fue creada. La preparación automática todavía está pendiente de otro módulo; si hace falta, completala desde “Empezar”.";
        }
      } catch (error) {
        finalMessage = `Tu cuenta fue creada, pero no pudimos completar la preparación automática. ${error instanceof Error ? error.message : "Podés intentarlo desde “Empezar”."}`;
      }

      let latestBalance: bigint | null = null;
      try {
        latestBalance = await readUsdcBalance(publicKey);
      } catch {
        latestBalance = null;
      }
      setBalance(latestBalance);
      setDialogMessage(finalMessage);
      setStage("success");
      resolveConnect(publicKey);
    },
    [adoptLocalWallet, networkPassphrase, resolveConnect],
  );

  const handleCreatePasskey = useCallback(async () => {
    retryActionRef.current = "create-passkey";
    setStage("working");
    setDialogError(null);
    setDialogMessage("Esperando tu huella, Face ID o PIN…");
    try {
      const wallet = await createPasskeyWallet();
      await finishLocalLogin(wallet);
    } catch (error) {
      if (error instanceof PasskeyWalletError && (error.code === "prf-unavailable" || error.code === "unsupported")) {
        setForceDeviceFallback(true);
      }
      setDialogError(passkeyErrorMessage(error));
      setStage("error");
    }
  }, [finishLocalLogin]);

  const handleLoginPasskey = useCallback(async () => {
    retryActionRef.current = "login-passkey";
    setStage("working");
    setDialogError(null);
    setDialogMessage("Buscando tu cuenta con la passkey guardada…");
    try {
      const wallet = await loginPasskeyWallet();
      await finishLocalLogin(wallet);
    } catch (error) {
      if (error instanceof PasskeyWalletError && error.code === "unsupported") setForceDeviceFallback(true);
      setDialogError(passkeyErrorMessage(error));
      setStage("error");
    }
  }, [finishLocalLogin]);

  const handleCreateDevice = useCallback(async () => {
    retryActionRef.current = "create-device";
    setStage("working");
    setDialogError(null);
    setDialogMessage("Creando una cuenta en este dispositivo…");
    try {
      const wallet = createDeviceWallet();
      await finishLocalLogin(wallet);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "No pudimos crear la cuenta en este dispositivo.");
      setStage("error");
    }
  }, [finishLocalLogin]);

  const handleExternal = useCallback(async () => {
    retryActionRef.current = "external";
    setStage("working");
    setDialogError(null);
    setDialogMessage("Abriendo Albedo o Freighter…");
    try {
      const { kit } = await loadWalletKit(networkPassphrase);
      const { address: connected } = await kit.authModal();
      keypairRef.current = null;
      setAddress(connected);
      setWalletKind("external");
      resolveConnect(connected);
      setDialogOpen(false);
    } catch (error) {
      if (isModalClosed(error)) {
        setStage("choice");
        setDialogMessage(null);
        return;
      }
      setDialogError(error instanceof Error ? error.message : "No pudimos conectar la wallet externa.");
      setStage("error");
    }
  }, [networkPassphrase, resolveConnect]);

  const retryLoginAction = useCallback(() => {
    const action = retryActionRef.current;
    if (action === "login-passkey") void handleLoginPasskey();
    else if (action === "create-device") void handleCreateDevice();
    else if (action === "external") void handleExternal();
    else void handleCreatePasskey();
  }, [handleCreateDevice, handleCreatePasskey, handleExternal, handleLoginPasskey]);

  const disconnect = useCallback(async () => {
    if (walletKindRef.current === "external") {
      const { kit } = await loadWalletKit(networkPassphrase);
      await kit.disconnect();
    }
    keypairRef.current = null;
    clearStoredWalletSession();
    setAddress(null);
    setWalletKind(null);
  }, [networkPassphrase]);

  const signTransaction = useCallback<SignTransaction>(
    async (xdr, opts) => {
      const kind = walletKindRef.current;
      if (kind === "passkey" || kind === "device") {
        let keypair = keypairRef.current;
        if (!keypair && kind === "device") {
          keypair = loadDeviceWallet()?.keypair ?? null;
        }
        if (!keypair && kind === "passkey") {
          const wallet = await loginPasskeyWallet({ persist: false });
          if (addressRef.current && wallet.keypair.publicKey() !== addressRef.current) {
            throw new PasskeyWalletError("mismatch", "Esa passkey abrió otra cuenta.");
          }
          keypair = wallet.keypair;
        }
        if (!keypair) throw new Error("No encontramos la clave de esta sesión. Entrá de nuevo.");
        keypairRef.current = keypair;
        if (addressRef.current && keypair.publicKey() !== addressRef.current) {
          throw new Error("La clave disponible no corresponde a la cuenta conectada.");
        }
        return signWithLocalKeypair(keypair, xdr, networkPassphrase, opts);
      }

      const { kit } = await loadWalletKit(networkPassphrase);
      return kit.signTransaction(xdr, {
        networkPassphrase,
        address: opts?.address ?? addressRef.current ?? undefined,
      });
    },
    [networkPassphrase],
  );

  const value = useMemo(
    () => ({ address, connecting, walletKind, connect, disconnect, signTransaction }),
    [address, connecting, walletKind, connect, disconnect, signTransaction],
  );

  return (
    <WalletContext.Provider value={value}>
      {children}
      <LoginDialog
        open={dialogOpen}
        stage={stage}
        message={dialogMessage}
        error={dialogError}
        address={address}
        balance={balance}
        progress={progress}
        prfSupport={prfSupport}
        forceDeviceFallback={forceDeviceFallback}
        onClose={closeDialog}
        onRetry={retryLoginAction}
        onCreatePasskey={() => void handleCreatePasskey()}
        onLoginPasskey={() => void handleLoginPasskey()}
        onCreateDevice={() => void handleCreateDevice()}
        onExternal={() => void handleExternal()}
      />
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet tiene que usarse dentro de <WalletProvider>");
  return context;
}
