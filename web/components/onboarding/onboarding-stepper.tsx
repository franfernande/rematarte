"use client";

import { T, TranslatedAttributes } from "@/components/language-switch";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/components/wallet-provider";
import { formatUsdc, shortAddress, txUrl } from "@/lib/format";
import {
  ONBOARDING_TARGET_STROOPS,
  activateTestAccount,
  createUsdcTrustline,
  emptyOnboardingAccountState,
  getOnboardingAccountState,
  onboardingErrorMessage,
  requestUsdcFaucet,
  waitForTargetUsdcBalance,
  type OnboardingAccountState,
} from "@/lib/onboarding";
import { OnboardingStepCard, type OnboardingStepStatus } from "@/components/onboarding/step-card";

type StepId = "wallet" | "account" | "asset" | "funds";
type StepErrors = Partial<Record<StepId, string>>;

const primaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-malbec px-6 text-center font-medium text-cal transition-colors hover:bg-malbec-2 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-tinta/20 px-6 text-center font-medium text-tinta transition-colors hover:border-tinta/40 hover:bg-cal-2 disabled:cursor-not-allowed disabled:opacity-50";

function isCancellationError(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const lower = raw.toLowerCase();
  return lower.includes("cancel") || lower.includes("user closed") || lower.includes("closed the modal");
}

function StepRowsSkeleton({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="h-32 rounded-2xl border border-linea bg-papel/70" aria-hidden />
      ))}
    </>
  );
}

function firstLines(balance: OnboardingAccountState): Array<[string, string]> {
  return [
    ["Cuenta activa", balance.exists ? "Sí" : "Todavía no"],
    ["USDC habilitado", balance.hasTrustline ? "Sí" : "Todavía no"],
    ["Saldo de prueba", balance.hasTrustline ? `${formatUsdc(balance.usdcBalanceStroops)} USDC` : "0 USDC"],
  ];
}

export function OnboardingStepper({ obra }: { obra?: string }) {
  const { address } = useWallet();
  return <OnboardingStepperContent key={address ?? "sin-wallet"} obra={obra} />;
}

function OnboardingStepperContent({ obra }: { obra?: string }) {
  const { address, connecting, connect, signTransaction } = useWallet();
  const [accountState, setAccountState] = useState<OnboardingAccountState>(emptyOnboardingAccountState);
  const [checking, setChecking] = useState(Boolean(address));
  const [workingStep, setWorkingStep] = useState<StepId | null>(null);
  const [errors, setErrors] = useState<StepErrors>({});
  const [notices, setNotices] = useState<StepErrors>({});
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [hasReadAccountState, setHasReadAccountState] = useState(false);
  const [liveMessage, setLiveMessage] = useState(
    address ? "Wallet conectada. Leyendo el estado real de tu cuenta en la red de prueba." : "Conectá una wallet para empezar.",
  );
  const [usdcTxHash, setUsdcTxHash] = useState<string | null>(null);
  const [fundingTxHash, setFundingTxHash] = useState<string | null>(null);
  const [claimedFor, setClaimedFor] = useState<string | null>(null);

  const setStepError = useCallback((step: StepId, message: string | null) => {
    setErrors((current) => {
      const next = { ...current };
      if (message) next[step] = message;
      else delete next[step];
      return next;
    });
  }, []);

  const setStepNotice = useCallback((step: StepId, message: string | null) => {
    setNotices((current) => {
      const next = { ...current };
      if (message) next[step] = message;
      else delete next[step];
      return next;
    });
  }, []);

  const refreshAccountState = useCallback(
    async (targetAddress: string, options: { announce?: boolean } = {}): Promise<OnboardingAccountState | null> => {
      const { announce = false } = options;
      try {
        const next = await getOnboardingAccountState(targetAddress);
        setAccountState(next);
        if (announce) setLiveMessage("Estado de la cuenta actualizado desde la red de prueba.");
        return next;
      } catch (error) {
        const message = onboardingErrorMessage(error, "No pudimos leer el estado de tu cuenta en la red de prueba.");
        setRefreshError(message);
        setLiveMessage(message);
        return null;
      } finally {
        setChecking(false);
        setHasReadAccountState(true);
      }
    },
    [],
  );

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    getOnboardingAccountState(address)
      .then((next) => {
        if (!cancelled) setAccountState(next);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = onboardingErrorMessage(error, "No pudimos leer el estado de tu cuenta en la red de prueba.");
        setRefreshError(message);
        setLiveMessage(message);
      })
      .finally(() => {
        if (!cancelled) {
          setChecking(false);
          setHasReadAccountState(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  const busy = connecting || workingStep !== null;
  const initialReading = Boolean(address) && checking && !hasReadAccountState;
  const accountDone = Boolean(address) && accountState.exists;
  const usdcEnabled = accountDone && accountState.hasTrustline;
  const fundsDone = usdcEnabled && (accountState.usdcBalanceStroops >= ONBOARDING_TARGET_STROOPS || claimedFor === address);

  function statusFor(step: StepId, done: boolean, available: boolean): OnboardingStepStatus {
    if (done) return "hecho";
    if (errors[step]) return "error";
    if (workingStep === step || (step === "wallet" && connecting)) return "en curso";
    return available ? "en curso" : "pendiente";
  }

  async function handleConnect() {
    setStepError("wallet", null);
    setStepNotice("wallet", null);
    setLiveMessage("Abriendo el selector de wallet.");
    try {
      const connected = await connect();
      if (!connected) {
        const message = "No se conectó ninguna cuenta. Cuando quieras, tocá “Entrar” y usá tu huella o Face ID, o elegí Albedo o Varial.";
        setStepNotice("wallet", message);
        setLiveMessage(message);
        return;
      }
      setLiveMessage("Wallet conectada. Leyendo el estado real de tu cuenta en la red de prueba.");
    } catch (error) {
      if (isCancellationError(error)) {
        const message = "No se conectó ninguna cuenta. Podés retomar cuando quieras.";
        setStepNotice("wallet", message);
        setLiveMessage(message);
        return;
      }
      const message = onboardingErrorMessage(error, "No pudimos conectar la wallet.");
      setStepError("wallet", message);
      setLiveMessage(message);
    }
  }

  async function handleActivate() {
    if (!address || busy) return;
    setWorkingStep("account");
    setStepError("account", null);
    setStepNotice("account", null);
    setLiveMessage("Activando tu cuenta en la red de prueba.");
    try {
      await activateTestAccount(address);
      const next = await refreshAccountState(address);
      if (next?.exists) {
        setLiveMessage("Cuenta activada. Ya podés habilitar USDC de prueba.");
      }
    } catch (error) {
      if (isCancellationError(error)) {
        setStepNotice("account", "No se envió nada. La activación queda pendiente hasta que confirmes.");
        setLiveMessage("No se envió nada. La activación queda pendiente hasta que confirmes.");
      } else {
        const message = onboardingErrorMessage(error, "No pudimos activar tu cuenta de prueba.");
        setStepError("account", message);
        setLiveMessage(message);
      }
    } finally {
      setWorkingStep(null);
    }
  }

  async function handleEnableUsdc() {
    if (!address || busy) return;
    setWorkingStep("asset");
    setStepError("asset", null);
    setStepNotice("asset", null);
    setLiveMessage("Preparando la habilitación de USDC de prueba para firmar.");
    try {
      const result = await createUsdcTrustline(address, signTransaction);
      if (result.hash) setUsdcTxHash(result.hash);
      const next = await refreshAccountState(address);
      if (next?.hasTrustline) {
        setLiveMessage("USDC de prueba habilitado. Ya podés recibir saldo para ofertar.");
      }
    } catch (error) {
      if (isCancellationError(error)) {
        setStepNotice("asset", "No se envió ninguna firma. USDC queda pendiente hasta que confirmes.");
        setLiveMessage("No se envió ninguna firma. USDC queda pendiente hasta que confirmes.");
      } else {
        const message = onboardingErrorMessage(error, "No pudimos habilitar USDC de prueba.");
        setStepError("asset", message);
        setLiveMessage(message);
      }
    } finally {
      setWorkingStep(null);
    }
  }

  async function handleReceiveUsdc() {
    if (!address || busy) return;
    setWorkingStep("funds");
    setStepError("funds", null);
    setStepNotice("funds", null);
    setLiveMessage("Pidiendo tu saldo de prueba.");
    try {
      const result = await requestUsdcFaucet(address);
      if (!result.funded && result.alreadyClaimed) {
        setClaimedFor(address);
        await refreshAccountState(address);
        setLiveMessage("Esta cuenta ya recibió su USDC de prueba. Podés ofertar con el saldo que te queda.");
        return;
      }
      if (result.funded) setFundingTxHash(result.hash);
      const next = await waitForTargetUsdcBalance(address);
      setAccountState(next);
      if (next.usdcBalanceStroops >= ONBOARDING_TARGET_STROOPS) {
        setLiveMessage(
          result.funded
            ? `Recibiste ${result.amount} USDC de prueba. Ya estás listo para ofertar.`
            : "Ya tenés al menos 200 USDC de prueba. Estás listo para ofertar.",
        );
      } else {
        const message = "El pago fue aceptado, pero el saldo todavía no aparece en la red de prueba. Esperá unos segundos y tocá “Volver a leer estado”.";
        setStepError("funds", message);
        setLiveMessage(message);
      }
    } catch (error) {
      if (isCancellationError(error)) {
        setStepNotice("funds", "No se envió ninguna operación. Podés pedir el saldo cuando quieras.");
        setLiveMessage("No se envió ninguna operación. Podés pedir el saldo cuando quieras.");
      } else {
        const message = onboardingErrorMessage(error, "No pudimos entregar USDC de prueba.");
        setStepError("funds", message);
        setLiveMessage(message);
      }
    } finally {
      setWorkingStep(null);
    }
  }

  const missingForTarget = ONBOARDING_TARGET_STROOPS - accountState.usdcBalanceStroops;

  return (
    <section className="contenedor py-8 sm:py-12">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        <T>{liveMessage}</T>
      </p>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
        <div>
          <div className="animate-aparecer">
            <div className="flex flex-wrap items-center gap-3">
              <p className="etiqueta"><T>Tu cuenta de la muestra</T></p>
              <p className="rounded-full border border-dashed border-ocre px-4 py-2 text-xs text-tinta-2"><T>Modo prueba</T></p>
            </div>
            <h1 className="mt-4 max-w-2xl font-serif text-5xl leading-[0.95] tracking-tight text-tinta sm:text-6xl">
              <T>Empezá en</T> <em className="text-malbec"><T>un minuto</T></em>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-tinta-2 sm:text-lg">
              <T>Cuatro pasos y ya podés ofertar en la muestra. Te guiamos con el estado real de tu cuenta en la red de prueba.</T>
            </p>
          </div>

          <ol className="mt-8 flex flex-col gap-4 sm:mt-10">
            <TranslatedAttributes><OnboardingStepCard
              number={1}
              title="Entrá con tu huella"
              description="Con tu huella, Face ID o PIN creamos tu cuenta y la dejamos lista sola. Si ya usás Albedo o Varial, también podés entrar con esas."
              status={statusFor("wallet", Boolean(address), true)}
              busy={connecting}
              error={errors.wallet}
              notice={notices.wallet}
            >
              {address ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-exito/10 px-3 py-2 text-sm text-exito">
                    <span className="size-2 rounded-full bg-exito" aria-hidden />
                    <T>Wallet conectada</T>
                  </span>
                  <TranslatedAttributes><span className="font-mono text-xs text-tinta-2" title={address}>
                    <T>{shortAddress(address)}</T>
                  </span></TranslatedAttributes>
                </div>
              ) : (
                <button type="button" onClick={() => void handleConnect()} disabled={connecting} className={primaryButton}>
                  <T>{connecting ? "Entrando…" : "Entrar"}</T>
                </button>
              )}
            </OnboardingStepCard></TranslatedAttributes>

            {initialReading ? (
              <StepRowsSkeleton rows={4} />
            ) : (
              <>
            <TranslatedAttributes><OnboardingStepCard
              number={2}
              title="Activá tu cuenta de prueba"
              description="Activamos tu cuenta en la red de prueba. Es gratis y no usa plata real."
              status={statusFor("account", accountDone, Boolean(address))}
              busy={workingStep === "account"}
              error={errors.account}
              notice={notices.account}
            >
              {accountDone ? (
                <p className="inline-flex items-center gap-2 rounded-full bg-exito/10 px-3 py-2 text-sm text-exito">
                  <span className="size-2 rounded-full bg-exito" aria-hidden />
                  <T>Cuenta activa en la red de prueba</T>
                </p>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => void handleActivate()}
                    disabled={!address || busy || checking}
                    className={primaryButton}
                  >
                    <T>{workingStep === "account" ? "Activando…" : "Activar cuenta"}</T>
                  </button>
                  <p className="text-sm text-tinta-2">
                    <T>{!address ? "Primero entrá con tu cuenta." : checking ? "Estamos leyendo tu estado real." : "Es gratis y tarda unos segundos."}</T>
                  </p>
                </div>
              )}
            </OnboardingStepCard></TranslatedAttributes>

            <TranslatedAttributes><OnboardingStepCard
              number={3}
              title="Habilitá USDC de prueba"
              description="Tu cuenta necesita permiso para recibir este USDC de prueba. Lo vas a firmar una sola vez con tu wallet."
              status={statusFor("asset", usdcEnabled, accountDone)}
              busy={workingStep === "asset"}
              error={errors.asset}
              notice={notices.asset}
            >
              {usdcEnabled ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="inline-flex items-center gap-2 rounded-full bg-exito/10 px-3 py-2 text-sm text-exito">
                    <span className="size-2 rounded-full bg-exito" aria-hidden />
                    <T>USDC habilitado</T>
                  </p>
                  <T>{usdcTxHash && (
                    <a
                      href={txUrl(usdcTxHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-malbec underline decoration-malbec/30 underline-offset-4 hover:decoration-malbec"
                    >
                      <T>Ver comprobante</T>
                    </a>
                  )}</T>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => void handleEnableUsdc()}
                    disabled={!accountDone || busy || checking}
                    className={primaryButton}
                  >
                    <T>{workingStep === "asset" ? "Esperando firma…" : "Habilitar USDC"}</T>
                  </button>
                  <p className="text-sm text-tinta-2">
                    <T>{!address
                      ? "Primero entrá con tu cuenta."
                      : !accountDone
                        ? "Primero activá tu cuenta."
                        : checking
                          ? "Estamos leyendo tu estado real."
                          : "Se abre tu wallet para confirmar."}</T>
                  </p>
                </div>
              )}
            </OnboardingStepCard></TranslatedAttributes>

            <TranslatedAttributes><OnboardingStepCard
              number={4}
              title="Recibí 200 USDC de prueba"
              description="Te completamos el saldo hasta 200 USDC de prueba, una vez por cuenta. Si ya tenés 200 o más, este paso se marca solo."
              status={statusFor("funds", fundsDone, usdcEnabled)}
              busy={workingStep === "funds"}
              error={errors.funds}
              notice={notices.funds}
            >
              {fundsDone ? (
                <div className="rounded-2xl border border-exito/20 bg-exito/10 p-4">
                  <p className="etiqueta"><T>Saldo disponible</T></p>
                  <p className="mt-1 font-serif text-4xl text-exito">{formatUsdc(accountState.usdcBalanceStroops)} USDC</p>
                  <T>{fundingTxHash && (
                    <a
                      href={txUrl(fundingTxHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm text-malbec underline decoration-malbec/30 underline-offset-4 hover:decoration-malbec"
                    >
                      <T>Ver comprobante del envío</T>
                    </a>
                  )}</T>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => void handleReceiveUsdc()}
                    disabled={!usdcEnabled || busy || checking}
                    className={primaryButton}
                  >
                    <T>{workingStep === "funds" ? "Enviando…" : "Recibir USDC"}</T>
                  </button>
                  <p className="text-sm text-tinta-2">
                    <T>{!address
                      ? "Primero entrá con tu cuenta."
                      : !accountDone
                        ? "Primero activá tu cuenta."
                        : !usdcEnabled
                          ? "Primero habilitá USDC."
                          : accountState.usdcBalanceStroops > 0n && missingForTarget > 0n
                            ? `Te faltan ${formatUsdc(missingForTarget)} USDC para llegar a 200.`
                            : "Solo sirve para esta muestra de prueba."}</T>
                  </p>
                </div>
              )}
            </OnboardingStepCard></TranslatedAttributes>

            <TranslatedAttributes><OnboardingStepCard
              title="Listo para ofertar"
              description={
                fundsDone
                  ? "Ya tenés wallet, cuenta activa y saldo de prueba. Volvé a la muestra y elegí una obra."
                  : "Cuando termines los pasos anteriores, acá aparecen los enlaces para volver a la muestra o a la obra."
              }
              status={fundsDone ? "hecho" : "pendiente"}
            >
              {fundsDone ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href="/muestra" className={primaryButton}>
                    <T>Ir a la muestra</T>
                  </Link>
                  <T>{obra && (
                    <Link href={`/obra/${obra}`} className={secondaryButton}>
                      <T>Volver a la obra</T>
                    </Link>
                  )}</T>
                </div>
              ) : (
                <p className="text-sm text-tinta-2"><T>Los enlaces se habilitan cuando terminás los 4 pasos.</T></p>
              )}
            </OnboardingStepCard></TranslatedAttributes>
              </>
            )}
          </ol>
        </div>

        <aside className="flex flex-col gap-5 lg:pt-24">
          <div className="cartela animate-aparecer rounded-2xl p-5 sm:p-6">
            <p className="etiqueta"><T>Aviso de sala</T></p>
            <p className="mt-3 font-serif text-3xl leading-tight text-tinta">
              <T>Esto es una red de prueba:</T> <em className="text-malbec"><T>nada de esto es plata real.</T></em>
            </p>
            <p className="mt-4 text-sm leading-relaxed text-tinta-2">
              <T>Todo el saldo de esta muestra es de prueba y solo sirve para probar la subasta sin riesgo.</T>
            </p>
          </div>

          <div className="rounded-2xl border border-linea bg-papel/75 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="etiqueta"><T>Estado real</T></p>
              {checking && <span className="size-2 rounded-full bg-ocre animate-latido" aria-hidden />}
            </div>

            {address ? (
              <dl className="mt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3 border-b border-linea/70 pb-3">
                  <dt className="text-sm text-tinta-2">Wallet</dt>
                  <TranslatedAttributes><dd className="font-mono text-xs text-tinta" title={address}>
                    <T>{shortAddress(address)}</T>
                  </dd></TranslatedAttributes>
                </div>
                {initialReading
                  ? [0, 1, 2].map((row) => (
                      <div key={row} className="flex animate-pulse items-center justify-between gap-3 border-b border-linea/70 pb-3 last:border-b-0 last:pb-0" aria-hidden>
                        <div className="h-4 w-24 rounded-full bg-linea/60" />
                        <div className="h-4 w-16 rounded-full bg-cal-2" />
                      </div>
                    ))
                  : firstLines(accountState).map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-3 border-b border-linea/70 pb-3 last:border-b-0 last:pb-0">
                        <dt className="text-sm text-tinta-2"><T>{label}</T></dt>
                        <dd className="text-sm font-medium text-tinta"><T>{value}</T></dd>
                      </div>
                    ))}
              </dl>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-tinta-2"><T>Todavía no hay una wallet conectada.</T></p>
            )}

            <T>{refreshError && (
              <p role="alert" className="mt-4 rounded-xl border border-malbec/25 bg-malbec/10 px-3 py-2 text-sm text-malbec">
                <T>{refreshError}</T>
              </p>
            )}</T>

            <button
              type="button"
              onClick={() => {
                if (!address) return;
                setChecking(true);
                setRefreshError(null);
                void refreshAccountState(address, { announce: true });
              }}
              disabled={!address || checking || busy}
              className={`${secondaryButton} mt-5 w-full`}
            >
              <T>{checking ? "Leyendo…" : "Volver a leer estado"}</T>
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
