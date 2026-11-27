"use client";

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

type StepId = "wallet" | "account" | "trustline" | "faucet";
type StepErrors = Partial<Record<StepId, string>>;

const primaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-malbec px-6 text-center font-medium text-cal transition-colors hover:bg-malbec-2 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-tinta/20 px-6 text-center font-medium text-tinta transition-colors hover:border-tinta/40 hover:bg-cal-2 disabled:cursor-not-allowed disabled:opacity-50";

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
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState(
    address ? "Wallet conectada. Leyendo el estado real de la cuenta en Testnet." : "Conectá una wallet para empezar.",
  );
  const [trustlineHash, setTrustlineHash] = useState<string | null>(null);
  const [faucetHash, setFaucetHash] = useState<string | null>(null);

  const setStepError = useCallback((step: StepId, message: string | null) => {
    setErrors((current) => {
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
        if (announce) setLiveMessage("Estado de la cuenta actualizado desde Stellar Testnet.");
        return next;
      } catch (error) {
        const message = onboardingErrorMessage(error, "No pudimos leer el estado de tu cuenta en Stellar Testnet.");
        setRefreshError(message);
        setLiveMessage(message);
        return null;
      } finally {
        setChecking(false);
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
        const message = onboardingErrorMessage(error, "No pudimos leer el estado de tu cuenta en Stellar Testnet.");
        setRefreshError(message);
        setLiveMessage(message);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  const busy = connecting || workingStep !== null;
  const accountDone = Boolean(address) && accountState.exists;
  const trustlineDone = accountDone && accountState.hasTrustline;
  const faucetDone = trustlineDone && accountState.usdcBalanceStroops >= ONBOARDING_TARGET_STROOPS;

  function statusFor(step: StepId, done: boolean, available: boolean): OnboardingStepStatus {
    if (done) return "hecho";
    if (errors[step]) return "error";
    if (workingStep === step || (step === "wallet" && connecting)) return "en curso";
    return available ? "en curso" : "pendiente";
  }

  async function handleConnect() {
    setStepError("wallet", null);
    setLiveMessage("Abriendo el selector de wallet.");
    try {
      const connected = await connect();
      if (!connected) {
        const message = "No entraste todavía. Tocá “Entrar” y usá tu huella o Face ID, o elegí Albedo o Freighter.";
        setStepError("wallet", message);
        setLiveMessage(message);
        return;
      }
      setLiveMessage("Wallet conectada. Leyendo el estado real de la cuenta en Testnet.");
    } catch (error) {
      const message = onboardingErrorMessage(error, "No pudimos conectar la wallet.");
      setStepError("wallet", message);
      setLiveMessage(message);
    }
  }

  async function handleActivate() {
    if (!address || busy) return;
    setWorkingStep("account");
    setStepError("account", null);
    setLiveMessage("Pidiendo XLM de prueba a Friendbot.");
    try {
      await activateTestAccount(address);
      const next = await refreshAccountState(address);
      if (next?.exists) {
        setLiveMessage("Cuenta activada. Ya podés habilitar USDC de prueba.");
      }
    } catch (error) {
      const message = onboardingErrorMessage(error, "No pudimos activar tu cuenta de prueba.");
      setStepError("account", message);
      setLiveMessage(message);
    } finally {
      setWorkingStep(null);
    }
  }

  async function handleTrustline() {
    if (!address || busy) return;
    setWorkingStep("trustline");
    setStepError("trustline", null);
    setLiveMessage("Preparando la habilitación de USDC de prueba para firmar.");
    try {
      const result = await createUsdcTrustline(address, signTransaction);
      if (result.hash) setTrustlineHash(result.hash);
      const next = await refreshAccountState(address);
      if (next?.hasTrustline) {
        setLiveMessage("USDC de prueba habilitado. Ya podés recibir saldo para ofertar.");
      }
    } catch (error) {
      const message = onboardingErrorMessage(error, "No pudimos habilitar USDC de prueba.");
      setStepError("trustline", message);
      setLiveMessage(message);
    } finally {
      setWorkingStep(null);
    }
  }

  async function handleFaucet() {
    if (!address || busy) return;
    setWorkingStep("faucet");
    setStepError("faucet", null);
    setLiveMessage("Pidiendo USDC de prueba al faucet.");
    try {
      const result = await requestUsdcFaucet(address);
      if (result.funded) setFaucetHash(result.hash);
      const next = await waitForTargetUsdcBalance(address);
      setAccountState(next);
      if (next.usdcBalanceStroops >= ONBOARDING_TARGET_STROOPS) {
        setLiveMessage(
          result.funded
            ? `Recibiste ${result.amount} USDC de prueba. Ya estás listo para ofertar.`
            : "Ya tenés al menos 200 USDC de prueba. Estás listo para ofertar.",
        );
      } else {
        const message = "El pago fue aceptado, pero el saldo todavía no aparece en Testnet. Esperá unos segundos y tocá “Volver a leer estado”.";
        setStepError("faucet", message);
        setLiveMessage(message);
      }
    } catch (error) {
      const message = onboardingErrorMessage(error, "No pudimos entregar USDC de prueba.");
      setStepError("faucet", message);
      setLiveMessage(message);
    } finally {
      setWorkingStep(null);
    }
  }

  const missingForTarget = ONBOARDING_TARGET_STROOPS - accountState.usdcBalanceStroops;

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:py-12">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </p>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
        <div>
          <div className="animate-aparecer">
            <p className="etiqueta">Tu cuenta de la muestra</p>
            <h1 className="mt-4 max-w-2xl font-serif text-5xl leading-[0.95] tracking-tight text-tinta sm:text-6xl">
              Empezá en <em className="text-malbec">un minuto</em>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-tinta-2 sm:text-lg">
              Cuatro pasos y ya podés ofertar en la muestra. Te guiamos con el estado real de tu cuenta en Stellar Testnet.
            </p>
          </div>

          <ol className="mt-8 flex flex-col gap-4 sm:mt-10">
            <OnboardingStepCard
              number={1}
              title="Entrá con tu huella"
              description="Con tu huella, Face ID o PIN creamos tu cuenta y la dejamos lista sola. Si ya usás Albedo o Freighter, también podés entrar con esas."
              status={statusFor("wallet", Boolean(address), true)}
              busy={connecting}
              error={errors.wallet}
            >
              {address ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-exito/10 px-3 py-2 text-sm text-exito">
                    <span className="size-2 rounded-full bg-exito" aria-hidden />
                    Wallet conectada
                  </span>
                  <span className="font-mono text-xs text-tinta-2" title={address}>
                    {shortAddress(address)}
                  </span>
                </div>
              ) : (
                <button type="button" onClick={() => void handleConnect()} disabled={connecting} className={primaryButton}>
                  {connecting ? "Entrando…" : "Entrar"}
                </button>
              )}
            </OnboardingStepCard>

            <OnboardingStepCard
              number={2}
              title="Activá tu cuenta de prueba"
              description="Stellar necesita una cuenta activa. Friendbot le regala XLM de prueba solo para pagar las pequeñas comisiones de red."
              status={statusFor("account", accountDone, Boolean(address))}
              busy={workingStep === "account"}
              error={errors.account}
            >
              {accountDone ? (
                <p className="inline-flex items-center gap-2 rounded-full bg-exito/10 px-3 py-2 text-sm text-exito">
                  <span className="size-2 rounded-full bg-exito" aria-hidden />
                  Cuenta activa en Testnet
                </p>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => void handleActivate()}
                    disabled={!address || busy || checking}
                    className={primaryButton}
                  >
                    {workingStep === "account" ? "Activando…" : "Activar cuenta"}
                  </button>
                  <p className="text-sm text-tinta-2">Es gratis y tarda unos segundos.</p>
                </div>
              )}
            </OnboardingStepCard>

            <OnboardingStepCard
              number={3}
              title="Habilitá USDC de prueba"
              description="Tu cuenta necesita permiso para recibir este USDC de prueba. Lo vas a firmar una sola vez con tu wallet."
              status={statusFor("trustline", trustlineDone, accountDone)}
              busy={workingStep === "trustline"}
              error={errors.trustline}
            >
              {trustlineDone ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="inline-flex items-center gap-2 rounded-full bg-exito/10 px-3 py-2 text-sm text-exito">
                    <span className="size-2 rounded-full bg-exito" aria-hidden />
                    USDC habilitado
                  </p>
                  {trustlineHash && (
                    <a
                      href={txUrl(trustlineHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-malbec underline decoration-malbec/30 underline-offset-4 hover:decoration-malbec"
                    >
                      Ver comprobante
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => void handleTrustline()}
                    disabled={!accountDone || busy || checking}
                    className={primaryButton}
                  >
                    {workingStep === "trustline" ? "Esperando firma…" : "Habilitar USDC"}
                  </button>
                  <p className="text-sm text-tinta-2">Se abre tu wallet para confirmar.</p>
                </div>
              )}
            </OnboardingStepCard>

            <OnboardingStepCard
              number={4}
              title="Recibí 200 USDC de prueba"
              description="Te completamos el saldo hasta 200 USDC de prueba. Si ya tenés 200 o más, este paso se marca solo."
              status={statusFor("faucet", faucetDone, trustlineDone)}
              busy={workingStep === "faucet"}
              error={errors.faucet}
            >
              {faucetDone ? (
                <div className="rounded-2xl border border-exito/20 bg-exito/10 p-4">
                  <p className="etiqueta">Saldo disponible</p>
                  <p className="mt-1 font-serif text-4xl text-exito">{formatUsdc(accountState.usdcBalanceStroops)} USDC</p>
                  {faucetHash && (
                    <a
                      href={txUrl(faucetHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm text-malbec underline decoration-malbec/30 underline-offset-4 hover:decoration-malbec"
                    >
                      Ver comprobante del envío
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => void handleFaucet()}
                    disabled={!trustlineDone || busy || checking}
                    className={primaryButton}
                  >
                    {workingStep === "faucet" ? "Enviando…" : "Recibir USDC"}
                  </button>
                  <p className="text-sm text-tinta-2">
                    {accountState.usdcBalanceStroops > 0n && missingForTarget > 0n
                      ? `Te faltan ${formatUsdc(missingForTarget)} USDC para llegar a 200.`
                      : "Solo sirve para esta muestra de prueba."}
                  </p>
                </div>
              )}
            </OnboardingStepCard>

            <OnboardingStepCard
              number={5}
              title="Listo para ofertar"
              description={
                faucetDone
                  ? "Ya tenés wallet, cuenta activa y saldo de prueba. Volvé a la muestra y elegí una obra."
                  : "Cuando termines los pasos anteriores, acá aparecen los enlaces para volver a la muestra o a la obra."
              }
              status={faucetDone ? "hecho" : "pendiente"}
            >
              {faucetDone ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href="/" className={primaryButton}>
                    Ir a la muestra
                  </Link>
                  {obra && (
                    <Link href={`/obra/${obra}`} className={secondaryButton}>
                      Volver a la obra
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-sm text-tinta-2">Los enlaces se habilitan cuando termina el paso 4.</p>
              )}
            </OnboardingStepCard>
          </ol>
        </div>

        <aside className="flex flex-col gap-5 lg:pt-24">
          <div className="cartela animate-aparecer rounded-2xl p-5 sm:p-6">
            <p className="etiqueta">Aviso de sala</p>
            <p className="mt-3 font-serif text-3xl leading-tight text-tinta">
              Esto es una red de prueba: <em className="text-malbec">nada de esto es plata real.</em>
            </p>
            <p className="mt-4 text-sm leading-relaxed text-tinta-2">
              El XLM de Friendbot y el USDC del faucet solo existen en Stellar Testnet para que puedas probar la subasta sin riesgo.
            </p>
          </div>

          <div className="rounded-2xl border border-linea bg-papel/75 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="etiqueta">Estado real</p>
              {checking && <span className="size-2 rounded-full bg-ocre animate-latido" aria-hidden />}
            </div>

            {address ? (
              <dl className="mt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3 border-b border-linea/70 pb-3">
                  <dt className="text-sm text-tinta-2">Wallet</dt>
                  <dd className="font-mono text-xs text-tinta" title={address}>
                    {shortAddress(address)}
                  </dd>
                </div>
                {firstLines(accountState).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 border-b border-linea/70 pb-3 last:border-b-0 last:pb-0">
                    <dt className="text-sm text-tinta-2">{label}</dt>
                    <dd className="text-sm font-medium text-tinta">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-tinta-2">Todavía no hay una wallet conectada.</p>
            )}

            {refreshError && (
              <p role="alert" className="mt-4 rounded-xl border border-malbec/25 bg-malbec/10 px-3 py-2 text-sm text-malbec">
                {refreshError}
              </p>
            )}

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
              {checking ? "Leyendo…" : "Volver a leer estado"}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
