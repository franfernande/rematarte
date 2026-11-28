"use client";

import { usePathname, useRouter } from "next/navigation";
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
const LOGIN_TIMEOUT_MS = 60_000;

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

function missingStepLabel(step: LoginProgressStep["step"] | null): string {
  if (step === "fund") return "activar la cuenta";
  if (step === "trustline") return "habilitar USDC";
  if (step === "usdc") return "recibir los USDC de prueba";
  return "completar la preparación automática";
}

export function WalletProvider({ networkPassphrase, children }: { networkPassphrase: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
  const stageRef = useRef<LoginStage>("choice");
  const connectResolverRef = useRef<((value: string | null) => void) | null>(null);
  const connectPromiseRef = useRef<Promise<string | null> | null>(null);
  const loginGenerationRef = useRef(0);
  const loginTimeoutRef = useRef<number | null>(null);
  const pendingLocalWalletRef = useRef<LocalWallet | null>(null);
  const acknowledgedAddressRef = useRef<string | null>(null);

  useEffect(() => {
    walletKindRef.current = walletKind;
  }, [walletKind]);

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

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

  const clearLoginTimeout = useCallback(() => {
    if (loginTimeoutRef.current !== null) {
      window.clearTimeout(loginTimeoutRef.current);
      loginTimeoutRef.current = null;
    }
  }, []);

  const discardPendingLocalWallet = useCallback(() => {
    const pending = pendingLocalWalletRef.current;
    if (!pending) return;
    pendingLocalWalletRef.current = null;
    if (keypairRef.current === pending.keypair) keypairRef.current = null;
    clearStoredWalletSession();
    setAddress(null);
    setWalletKind(null);
  }, []);

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
    if (addressRef.current) return Promise.resolve(addressRef.current);
    resetDialog();
    setForceDeviceFallback(false);
    acknowledgedAddressRef.current = null;
    pendingLocalWalletRef.current = null;
    setDialogOpen(true);
    setConnecting(true);
    const promise = new Promise<string | null>((resolve) => {
      connectResolverRef.current = resolve;
    });
    connectPromiseRef.current = promise;
    return promise;
  }, [resetDialog]);

  const closeDialog = useCallback(() => {
    const currentStage = stageRef.current;
    clearLoginTimeout();
    loginGenerationRef.current += 1;
    if (currentStage !== "success" && currentStage !== "partial") discardPendingLocalWallet();
    const acknowledged = currentStage === "success" ? acknowledgedAddressRef.current : null;
    acknowledgedAddressRef.current = null;
    pendingLocalWalletRef.current = null;
    resolveConnect(acknowledged);
    setDialogOpen(false);
  }, [clearLoginTimeout, discardPendingLocalWallet, resolveConnect]);

  const enterSample = useCallback(() => {
    const shouldNavigate = pathname !== "/";
    closeDialog();
    if (shouldNavigate) router.push("/#muestra");
  }, [closeDialog, pathname, router]);

  const completeOnboarding = useCallback(() => {
    closeDialog();
    router.push("/empezar");
  }, [closeDialog, router]);

  const armLoginTimeout = useCallback(
    (generation: number) => {
      clearLoginTimeout();
      loginTimeoutRef.current = window.setTimeout(() => {
        if (loginGenerationRef.current !== generation) return;
        if (stageRef.current !== "working" && stageRef.current !== "preparing") return;
        loginGenerationRef.current += 1;
        acknowledgedAddressRef.current = null;
        discardPendingLocalWallet();
        setDialogMessage(null);
        setDialogError("La red está tardando más de lo normal. No vamos a seguir esperando esta operación; podés reintentarla.");
        setStage("error");
      }, LOGIN_TIMEOUT_MS);
    },
    [clearLoginTimeout, discardPendingLocalWallet],
  );

  const beginAttempt = useCallback(
    (action: LoginRetryAction, message: string): number => {
      retryActionRef.current = action;
      loginGenerationRef.current += 1;
      const generation = loginGenerationRef.current;
      setStage("working");
      setDialogError(null);
      setDialogMessage(message);
      if (action !== "external") armLoginTimeout(generation);
      return generation;
    },
    [armLoginTimeout],
  );

  const attemptIsCurrent = useCallback((generation: number) => loginGenerationRef.current === generation, []);

  const adoptLocalWallet = useCallback((wallet: LocalWallet) => {
    keypairRef.current = wallet.keypair;
    pendingLocalWalletRef.current = wallet;
    const publicKey = wallet.keypair.publicKey();
    setAddress(publicKey);
    setWalletKind(wallet.kind);
    return publicKey;
  }, []);

  const finishLocalLogin = useCallback(
    async (wallet: LocalWallet, generation: number) => {
      if (!attemptIsCurrent(generation)) {
        clearStoredWalletSession();
        return;
      }

      const publicKey = adoptLocalWallet(wallet);
      setStage("preparing");
      setDialogMessage("Preparando tu cuenta…");
      setProgress([]);

      const localSignTransaction: SignTransaction = async (xdr, opts) =>
        signWithLocalKeypair(wallet.keypair, xdr, networkPassphrase, opts);

      let failedStep: LoginProgressStep["step"] | null = null;
      let preparationError: string | null = null;
      try {
        const prepareAccount = await loadPrepareAccount();
        if (prepareAccount) {
          await prepareAccount({
            address: publicKey,
            signTransaction: localSignTransaction,
            onStep: (event) => {
              if (event.status === "error") failedStep = event.step;
              if (attemptIsCurrent(generation)) setProgress((current) => upsertProgress(current, [event]));
            },
          });
        } else {
          preparationError = "La preparación automática todavía no está disponible.";
        }
      } catch (error) {
        preparationError = error instanceof Error ? error.message : "No pudimos preparar la cuenta de prueba.";
      }

      if (!attemptIsCurrent(generation)) return;
      clearLoginTimeout();

      let latestBalance: bigint | null = null;
      try {
        latestBalance = await readUsdcBalance(publicKey);
      } catch {
        latestBalance = null;
      }
      if (!attemptIsCurrent(generation)) return;

      setBalance(latestBalance);
      acknowledgedAddressRef.current = publicKey;
      if (preparationError) {
        setDialogMessage(`Entraste, pero falta ${missingStepLabel(failedStep)}. Podés completarlo desde Empezar.`);
        setStage("partial");
      } else {
        setDialogMessage("Tu cuenta quedó lista para ofertar.");
        setStage("success");
      }
    },
    [adoptLocalWallet, attemptIsCurrent, clearLoginTimeout, networkPassphrase],
  );

  const finishPasskeyCancellation = useCallback(() => {
    clearLoginTimeout();
    setDialogError(null);
    setDialogMessage("Cancelaste la huella o el PIN. Seguís sin entrar; podés probar otra vez o elegir otra opción.");
    setStage("choice");
  }, [clearLoginTimeout]);

  const handleCreatePasskey = useCallback(async () => {
    const generation = beginAttempt("create-passkey", "Esperando tu huella, Face ID o PIN…");
    try {
      const wallet = await createPasskeyWallet();
      if (!attemptIsCurrent(generation)) {
        clearStoredWalletSession();
        return;
      }
      await finishLocalLogin(wallet, generation);
    } catch (error) {
      if (!attemptIsCurrent(generation)) return;
      if (error instanceof PasskeyWalletError && error.code === "cancelled") {
        finishPasskeyCancellation();
        return;
      }
      if (error instanceof PasskeyWalletError && (error.code === "prf-unavailable" || error.code === "unsupported")) {
        setForceDeviceFallback(true);
      }
      clearLoginTimeout();
      setDialogError(passkeyErrorMessage(error));
      setStage("error");
    }
  }, [attemptIsCurrent, beginAttempt, clearLoginTimeout, finishLocalLogin, finishPasskeyCancellation]);

  const handleLoginPasskey = useCallback(async () => {
    const generation = beginAttempt("login-passkey", "Buscando tu cuenta con la passkey guardada…");
    try {
      const wallet = await loginPasskeyWallet();
      if (!attemptIsCurrent(generation)) {
        clearStoredWalletSession();
        return;
      }
      await finishLocalLogin(wallet, generation);
    } catch (error) {
      if (!attemptIsCurrent(generation)) return;
      if (error instanceof PasskeyWalletError && error.code === "cancelled") {
        finishPasskeyCancellation();
        return;
      }
      if (error instanceof PasskeyWalletError && error.code === "unsupported") setForceDeviceFallback(true);
      clearLoginTimeout();
      setDialogError(passkeyErrorMessage(error));
      setStage("error");
    }
  }, [attemptIsCurrent, beginAttempt, clearLoginTimeout, finishLocalLogin, finishPasskeyCancellation]);

  const handleCreateDevice = useCallback(async () => {
    const generation = beginAttempt("create-device", "Creando una cuenta en este dispositivo…");
    try {
      const wallet = createDeviceWallet();
      if (!attemptIsCurrent(generation)) {
        clearStoredWalletSession();
        return;
      }
      await finishLocalLogin(wallet, generation);
    } catch (error) {
      if (!attemptIsCurrent(generation)) return;
      clearLoginTimeout();
      setDialogError(error instanceof Error ? error.message : "No pudimos crear la cuenta en este dispositivo.");
      setStage("error");
    }
  }, [attemptIsCurrent, beginAttempt, clearLoginTimeout, finishLocalLogin]);

  const handleExternal = useCallback(async () => {
    const generation = beginAttempt("external", "Abriendo Albedo o Varial…");
    try {
      const { kit } = await loadWalletKit(networkPassphrase);
      if (!attemptIsCurrent(generation)) return;
      setDialogOpen(false);
      const { address: connected } = await kit.authModal();
      if (!attemptIsCurrent(generation)) {
        await kit.disconnect().catch(() => undefined);
        return;
      }
      clearLoginTimeout();
      keypairRef.current = null;
      setAddress(connected);
      setWalletKind("external");
      acknowledgedAddressRef.current = null;
      resolveConnect(connected);
    } catch (error) {
      if (!attemptIsCurrent(generation)) return;
      clearLoginTimeout();
      setDialogOpen(true);
      if (isModalClosed(error)) {
        setDialogError(null);
        setDialogMessage("Cerraste la wallet externa. Seguís sin entrar; podés elegir otra opción.");
        setStage("choice");
        return;
      }
      setDialogError(error instanceof Error ? error.message : "No pudimos conectar la wallet externa.");
      setStage("error");
    }
  }, [attemptIsCurrent, beginAttempt, clearLoginTimeout, networkPassphrase, resolveConnect]);

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
        onEnterSample={enterSample}
        onCompleteOnboarding={completeOnboarding}
      />
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet tiene que usarse dentro de <WalletProvider>");
  return context;
}
