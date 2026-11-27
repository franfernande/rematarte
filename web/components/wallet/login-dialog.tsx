"use client";

import { useEffect, useRef } from "react";
import { formatUsdc, shortAddress } from "@/lib/format";
import type { PrfSupport } from "@/lib/passkey-wallet";

export type LoginStage = "choice" | "working" | "preparing" | "success" | "error";

export type LoginProgressStep = {
  step: "fund" | "trustline" | "usdc" | "done";
  status: "running" | "done" | "error";
  message?: string;
};

type LoginDialogProps = {
  open: boolean;
  stage: LoginStage;
  message: string | null;
  error: string | null;
  address: string | null;
  balance: bigint | null;
  progress: LoginProgressStep[];
  prfSupport: PrfSupport;
  forceDeviceFallback: boolean;
  onClose: () => void;
  onRetry: () => void;
  onCreatePasskey: () => void;
  onLoginPasskey: () => void;
  onCreateDevice: () => void;
  onExternal: () => void;
};

const stepLabels: Record<Exclude<LoginProgressStep["step"], "done">, string> = {
  fund: "Creando tu cuenta…",
  trustline: "Habilitando USDC…",
  usdc: "Recibiendo 200 USDC de prueba…",
};

function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
  ).filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");
}

export function LoginDialog({
  open,
  stage,
  message,
  error,
  address,
  balance,
  progress,
  prfSupport,
  forceDeviceFallback,
  onClose,
  onRetry,
  onCreatePasskey,
  onLoginPasskey,
  onCreateDevice,
  onExternal,
}: LoginDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const busy = stage === "working" || stage === "preparing";
  const useDevicePrimary = prfSupport === "unsupported" || forceDeviceFallback;

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const root: HTMLElement = dialog;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.setTimeout(() => focusableElements(root)[0]?.focus(), 0);

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!busy) {
          event.preventDefault();
          onClose();
        }
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusableElements(root);
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      previous?.focus();
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  const visibleSteps = progress.filter((item) => item.step !== "done");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-noche/55 px-3 pb-3 sm:items-center sm:p-6" role="presentation">
      <button
        type="button"
        aria-label="Cerrar el diálogo"
        className="absolute inset-0 cursor-default"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-dialog-title"
        className="cartela animate-aparecer relative z-10 w-full max-w-md rounded-t-3xl border-linea bg-papel p-5 shadow-2xl sm:rounded-lg sm:p-6"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-linea sm:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="etiqueta">Acceso simple</p>
            <h2 id="login-dialog-title" className="mt-2 font-serif text-3xl leading-tight text-tinta">
              Entrá a la <span className="italic text-malbec">muestra</span>
            </h2>
          </div>
          {!busy && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="flex size-11 items-center justify-center rounded-full text-tinta-2 transition-colors hover:bg-cal-2 hover:text-tinta"
            >
              <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {stage === "choice" && (
          <div className="mt-5">
            {useDevicePrimary ? (
              <>
                <button
                  type="button"
                  onClick={onCreateDevice}
                  className="min-h-12 w-full rounded-full bg-malbec px-6 font-medium text-cal transition-colors hover:bg-malbec-2"
                >
                  Crear cuenta en este dispositivo
                </button>
                <p className="mt-3 rounded-lg border border-ocre/40 bg-ocre/10 px-3 py-2 text-sm leading-relaxed text-tinta-2">
                  Tu navegador no soporta passkeys con recuperación segura. Esta cuenta queda guardada en este navegador:
                  si borrás los datos, la perdés.
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onCreatePasskey}
                  className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-malbec px-6 font-medium text-cal transition-colors hover:bg-malbec-2"
                >
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                    <path d="M7 11a5 5 0 0 1 10 0v3c0 3-1 5-2 7" strokeLinecap="round" />
                    <path d="M5 13a7 7 0 0 1 14 0v2" strokeLinecap="round" />
                    <path d="M9 11a3 3 0 0 1 6 0v4c0 2-.5 4-1.5 5.5" strokeLinecap="round" />
                    <path d="M12 11v4c0 1.5-.2 3-.8 4.5" strokeLinecap="round" />
                  </svg>
                  Entrar con huella o Face ID
                </button>
                <p className="mt-3 text-center text-sm leading-relaxed text-tinta-2">
                  Creamos tu cuenta de la muestra en un toque. Sin contraseñas ni apps.
                </p>
                <button
                  type="button"
                  onClick={onLoginPasskey}
                  className="mt-3 min-h-11 w-full rounded-full px-4 text-sm font-medium text-malbec transition-colors hover:bg-malbec/5"
                >
                  Ya tengo cuenta de la muestra
                </button>
              </>
            )}

            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-piedra" aria-hidden>
              <span className="h-px flex-1 bg-linea" />
              o
              <span className="h-px flex-1 bg-linea" />
            </div>
            <button
              type="button"
              onClick={onExternal}
              className="min-h-12 w-full rounded-full border border-tinta/20 px-6 font-medium text-tinta transition-colors hover:border-tinta/40 hover:bg-cal-2"
            >
              Usar Albedo o Freighter
            </button>
          </div>
        )}

        {(stage === "working" || stage === "preparing") && (
          <div className="mt-6" aria-live="polite">
            <div className="flex items-center gap-3">
              <span className="size-3 animate-latido rounded-full bg-ocre" aria-hidden />
              <p className="font-medium text-tinta">{message ?? "Esperando confirmación…"}</p>
            </div>
            {visibleSteps.length > 0 && (
              <ol className="mt-5 space-y-3">
                {visibleSteps.map((item) => (
                  <li key={item.step} className="flex items-start gap-3 text-sm">
                    <span
                      className={`mt-1 size-2.5 rounded-full ${item.status === "done" ? "bg-exito" : item.status === "error" ? "bg-malbec" : "bg-ocre animate-latido"}`}
                      aria-hidden
                    />
                    <div>
                      <p className="text-tinta">{stepLabels[item.step as keyof typeof stepLabels]}</p>
                      {item.message && <p className="text-xs text-piedra">{item.message}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {stage === "success" && (
          <div className="mt-6" aria-live="polite">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-exito text-cal" aria-hidden>
                <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m4 10.5 4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-tinta">¡Listo!</p>
                {address && <p className="font-mono text-sm text-tinta-2">{shortAddress(address)}</p>}
              </div>
            </div>
            {balance !== null && <p className="mt-3 text-sm text-tinta-2">Saldo de prueba: {formatUsdc(balance)} USDC</p>}
            {message && <p className="mt-3 text-sm leading-relaxed text-tinta-2">{message}</p>}
            <button
              type="button"
              onClick={onClose}
              className="mt-5 min-h-12 w-full rounded-full bg-malbec px-6 font-medium text-cal transition-colors hover:bg-malbec-2"
            >
              Entrar a la muestra
            </button>
          </div>
        )}

        {stage === "error" && (
          <div className="mt-6" aria-live="assertive">
            <p className="rounded-lg border border-malbec/25 bg-malbec/5 px-3 py-2 text-sm leading-relaxed text-malbec">
              {error ?? "No pudimos completar el acceso."}
            </p>
            <div className="mt-4 grid gap-3">
              {useDevicePrimary ? (
                <button
                  type="button"
                  onClick={onCreateDevice}
                  className="min-h-12 rounded-full bg-malbec px-6 font-medium text-cal transition-colors hover:bg-malbec-2"
                >
                  Crear cuenta en este dispositivo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onRetry}
                  className="min-h-12 rounded-full bg-malbec px-6 font-medium text-cal transition-colors hover:bg-malbec-2"
                >
                  Probar de nuevo
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="min-h-12 rounded-full border border-tinta/20 px-6 font-medium text-tinta transition-colors hover:bg-cal-2"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
