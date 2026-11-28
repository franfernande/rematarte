"use client";

import { T, TranslatedAttributes } from "@/components/language-switch";
import { useEffect, useRef } from "react";
import { formatUsdc, shortAddress } from "@/lib/format";
import type { PrfSupport } from "@/lib/passkey-wallet";
import { useScrollLock } from "@/components/wallet/use-scroll-lock";

export type LoginStage = "choice" | "working" | "preparing" | "success" | "partial" | "error";

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
  onEnterSample: () => void;
  onCompleteOnboarding: () => void;
};

const stepLabels: Record<Exclude<LoginProgressStep["step"], "done">, string> = {
  fund: "Creando tu cuenta…",
  trustline: "Habilitando USDC…",
  usdc: "Recibiendo 200 USDC de prueba…",
};

function stepLabel(item: LoginProgressStep): string {
  if (item.step === "fund") return item.status === "done" ? "Cuenta creada" : item.status === "error" ? "Falta activar la cuenta" : stepLabels.fund;
  if (item.step === "trustline") return item.status === "done" ? "USDC habilitado" : item.status === "error" ? "Falta habilitar USDC" : stepLabels.trustline;
  if (item.step === "usdc") return item.status === "done" ? "USDC recibido" : item.status === "error" ? "Falta recibir los USDC de prueba" : stepLabels.usdc;
  return "Listo";
}

function stepDetail(item: LoginProgressStep): string | null {
  if (item.status === "error") return "Todavía no se pudo completar este paso.";
  return item.message ?? null;
}

const primaryButtonClass =
  "min-h-12 w-full rounded-sm bg-malbec px-6 font-medium text-cal transition-colors hover:bg-malbec-2";
const secondaryButtonClass =
  "min-h-12 w-full rounded-full border border-tinta/20 px-6 font-medium text-tinta transition-colors hover:border-tinta/40 hover:bg-cal-2";
const closeButtonClass =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-tinta-2 transition-colors hover:bg-cal-2 hover:text-tinta";

function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
  ).filter((element) => {
    if (element.hasAttribute("disabled") || element.getAttribute("aria-hidden") === "true" || element.tabIndex < 0) {
      return false;
    }
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

function topLevelBodyChild(element: HTMLElement): HTMLElement {
  let current = element;
  while (current.parentElement && current.parentElement !== document.body) current = current.parentElement;
  return current;
}

function hasExternalLayer(element: HTMLElement): boolean {
  const ownLayer = topLevelBodyChild(element);
  return Array.from(document.body.children).some(
    (child) =>
      child instanceof HTMLElement &&
      child !== ownLayer &&
      !child.hasAttribute("inert") &&
      Boolean(child.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')),
  );
}

function isolateSiblings(element: HTMLElement): () => void {
  const changed: HTMLElement[] = [];
  let current: HTMLElement | null = element;

  while (current) {
    const parent: HTMLElement | null = current.parentElement;
    if (!parent) break;

    for (const sibling of Array.from(parent.children)) {
      if (sibling === current || !(sibling instanceof HTMLElement) || sibling.hasAttribute("inert")) continue;
      sibling.setAttribute("inert", "");
      changed.push(sibling);
    }

    if (parent === document.body) break;
    current = parent;
  }

  return () => {
    for (const sibling of changed) sibling.removeAttribute("inert");
  };
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
  onEnterSample,
  onCompleteOnboarding,
}: LoginDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryChoiceRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const successActionRef = useRef<HTMLButtonElement>(null);
  const partialActionRef = useRef<HTMLButtonElement>(null);
  const errorActionRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const busy = stage === "working" || stage === "preparing";
  const useDevicePrimary = prfSupport === "unsupported" || forceDeviceFallback;

  useScrollLock(open);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) return;

    function rememberTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return;
      if (overlayRef.current?.contains(target)) return;
      const interactive = target.closest('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (interactive instanceof HTMLElement) restoreFocusRef.current = interactive;
    }

    function handlePointerDown(event: PointerEvent) {
      rememberTarget(event.target);
    }

    function handleFocusIn(event: FocusEvent) {
      rememberTarget(event.target);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("focusin", handleFocusIn, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("focusin", handleFocusIn, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const dialogElement: HTMLElement = dialog;

    const activeBeforeOpen = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const restoreTarget =
      activeBeforeOpen && activeBeforeOpen !== document.body && !dialogElement.contains(activeBeforeOpen)
        ? activeBeforeOpen
        : restoreFocusRef.current;

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      if (hasExternalLayer(dialogElement)) return;

      const elements = focusableElements(dialogElement);
      if (elements.length === 0) {
        event.preventDefault();
        dialogElement.focus({ preventScroll: true });
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (!active || !dialogElement.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      } else if (active === dialogElement) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      window.setTimeout(() => {
        if (restoreTarget && document.contains(restoreTarget)) restoreTarget.focus({ preventScroll: true });
      }, 0);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    return isolateSiblings(overlay);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      let target: HTMLElement | null = null;
      if (stage === "choice") target = primaryChoiceRef.current;
      else if (stage === "working" || stage === "preparing") target = statusRef.current;
      else if (stage === "success") target = successActionRef.current;
      else if (stage === "partial") target = partialActionRef.current;
      else if (stage === "error") target = errorActionRef.current;
      (target ?? dialogRef.current)?.focus({ preventScroll: true });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open, stage]);

  if (!open) return null;

  const visibleSteps = progress.filter((item) => item.step !== "done");

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-end justify-center bg-noche/55 px-3 pb-3 sm:items-center sm:p-6" role="presentation">
      <TranslatedAttributes><button
        type="button"
        aria-label="Cerrar el diálogo"
        className="absolute inset-0 cursor-default"
        onClick={() => {
          if (!busy) onClose();
        }}
      /></TranslatedAttributes>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-busy={busy}
        aria-labelledby="login-dialog-title"
        tabIndex={-1}
        className="cartela animate-aparecer relative z-10 max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-bottom)_-_env(safe-area-inset-top))] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border-linea bg-papel p-5 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[calc(100dvh_-_3rem_-_env(safe-area-inset-bottom)_-_env(safe-area-inset-top))] sm:rounded-lg sm:p-6 sm:pb-6"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-linea sm:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="etiqueta"><T>Tu cuenta en Artemi</T></p>
            <h2 id="login-dialog-title" className="mt-2 font-serif text-3xl leading-tight text-tinta">
              <T>Entrá a la</T> <span className="italic text-malbec"><T>muestra</T></span>
            </h2>
          </div>
          <TranslatedAttributes><button
            type="button"
            onClick={onClose}
            aria-label={busy ? "Cancelar acceso" : "Cerrar"}
            className={closeButtonClass}
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
            </svg>
          </button></TranslatedAttributes>
        </div>

        {stage === "choice" && (
          <div className="mt-5">
            <T>{message && (
              <p className="mb-4 rounded-lg border border-linea bg-cal px-3 py-2 text-sm leading-relaxed text-tinta-2"><T>{message}</T></p>
            )}</T>
            {useDevicePrimary ? (
              <>
                <button ref={primaryChoiceRef} type="button" onClick={onCreateDevice} className={primaryButtonClass}>
                  <T>Crear cuenta en este dispositivo</T>
                </button>
                <p className="mt-3 rounded-lg border border-ocre/40 bg-ocre/10 px-3 py-2 text-sm leading-relaxed text-tinta-2">
                  <T>Tu navegador no soporta passkeys con recuperación segura. Esta cuenta queda guardada en este navegador:
                  si borrás los datos, la perdés.</T>
                </p>
              </>
            ) : (
              <>
                <button
                  ref={primaryChoiceRef}
                  type="button"
                  onClick={onCreatePasskey}
                  className={`${primaryButtonClass} flex items-center justify-center gap-3`}
                >
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                    <path d="M7 11a5 5 0 0 1 10 0v3c0 3-1 5-2 7" strokeLinecap="round" />
                    <path d="M5 13a7 7 0 0 1 14 0v2" strokeLinecap="round" />
                    <path d="M9 11a3 3 0 0 1 6 0v4c0 2-.5 4-1.5 5.5" strokeLinecap="round" />
                    <path d="M12 11v4c0 1.5-.2 3-.8 4.5" strokeLinecap="round" />
                  </svg>
                  <T>Entrar con huella o Face ID</T>
                </button>
                <p className="mt-3 text-center text-sm leading-relaxed text-tinta-2">
                  <T>Creamos tu cuenta de la muestra en un toque. Sin contraseñas ni apps.</T>
                </p>
                <button
                  type="button"
                  onClick={onLoginPasskey}
                  className="mt-3 min-h-11 w-full rounded-full px-4 text-sm font-medium text-malbec transition-colors hover:bg-malbec/5"
                >
                  <T>Ya tengo cuenta de la muestra</T>
                </button>
              </>
            )}

            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-piedra" aria-hidden>
              <span className="h-px flex-1 bg-linea" />
              <T>o</T>
              <span className="h-px flex-1 bg-linea" />
            </div>
            <button type="button" onClick={onExternal} className={secondaryButtonClass}>
              <T>Usar Albedo o Varial</T>
            </button>
          </div>
        )}

        {(stage === "working" || stage === "preparing") && (
          <div ref={statusRef} tabIndex={-1} className="mt-6" aria-live="polite" aria-atomic="true">
            <div className="flex items-center gap-3">
              <span className="size-3 animate-latido rounded-full bg-ocre" aria-hidden />
              <p className="font-medium text-tinta"><T>{message ?? "Esperando confirmación…"}</T></p>
            </div>
            {visibleSteps.length > 0 && (
              <ol className="mt-5 space-y-3">
                {visibleSteps.map((item) => (
                  <li key={`${item.step}-${item.status}`} className="flex items-start gap-3 text-sm">
                    <span
                      className={`mt-1 size-2.5 rounded-full ${item.status === "done" ? "bg-exito" : item.status === "error" ? "bg-malbec" : "bg-ocre animate-latido"}`}
                      aria-hidden
                    />
                    <div>
                      <p className="text-tinta"><T>{stepLabel(item)}</T></p>
                      <T>{stepDetail(item) && <p className="text-xs text-piedra"><T>{stepDetail(item)}</T></p>}</T>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <button type="button" onClick={onClose} className={`${secondaryButtonClass} mt-5`}>
              <T>Cancelar acceso</T>
            </button>
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
                <p className="font-medium text-tinta"><T>¡Listo!</T></p>
                <T>{address && <p className="font-mono text-sm text-tinta-2"><T>{shortAddress(address)}</T></p>}</T>
              </div>
            </div>
            {balance !== null && <p className="mt-3 text-sm text-tinta-2"><T>Saldo de prueba:</T> {formatUsdc(balance)} USDC</p>}
            <T>{message && <p className="mt-3 text-sm leading-relaxed text-tinta-2"><T>{message}</T></p>}</T>
            <button ref={successActionRef} type="button" onClick={onEnterSample} className={`${primaryButtonClass} mt-5`}>
              <T>Entrar a la muestra</T>
            </button>
          </div>
        )}

        {stage === "partial" && (
          <div className="mt-6" aria-live="polite">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-ocre text-cal" aria-hidden>
                <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 4v7" strokeLinecap="round" />
                  <path d="M10 15.5h.01" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-tinta"><T>Entraste, pero falta un paso</T></p>
                <T>{address && <p className="font-mono text-sm text-tinta-2"><T>{shortAddress(address)}</T></p>}</T>
              </div>
            </div>
            {balance !== null && <p className="mt-3 text-sm text-tinta-2"><T>Saldo de prueba:</T> {formatUsdc(balance)} USDC</p>}
            <T>{message && <p className="mt-3 text-sm leading-relaxed text-tinta-2"><T>{message}</T></p>}</T>
            {visibleSteps.length > 0 && (
              <ol className="mt-4 space-y-3">
                {visibleSteps.map((item) => (
                  <li key={`partial-${item.step}-${item.status}`} className="flex items-start gap-3 text-sm">
                    <span
                      className={`mt-1 size-2.5 rounded-full ${item.status === "done" ? "bg-exito" : item.status === "error" ? "bg-malbec" : "bg-ocre"}`}
                      aria-hidden
                    />
                    <div>
                      <p className="text-tinta"><T>{stepLabel(item)}</T></p>
                      <T>{stepDetail(item) && <p className="text-xs text-piedra"><T>{stepDetail(item)}</T></p>}</T>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-5 grid gap-3">
              <button ref={partialActionRef} type="button" onClick={onCompleteOnboarding} className={primaryButtonClass}>
                <T>Completar en Empezar</T>
              </button>
              <button type="button" onClick={onClose} className={secondaryButtonClass}>
                <T>Cerrar por ahora</T>
              </button>
            </div>
          </div>
        )}

        {stage === "error" && (
          <div className="mt-6" aria-live="assertive">
            <p className="rounded-lg border border-malbec/25 bg-malbec/5 px-3 py-2 text-sm leading-relaxed text-malbec">
              <T>{error ?? "No pudimos completar el acceso."}</T>
            </p>
            <div className="mt-4 grid gap-3">
              {useDevicePrimary ? (
                <button ref={errorActionRef} type="button" onClick={onCreateDevice} className={primaryButtonClass}>
                  <T>Crear cuenta en este dispositivo</T>
                </button>
              ) : (
                <button ref={errorActionRef} type="button" onClick={onRetry} className={primaryButtonClass}>
                  <T>Probar de nuevo</T>
                </button>
              )}
              <button type="button" onClick={onClose} className={secondaryButtonClass}>
                <T>Cerrar</T>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
