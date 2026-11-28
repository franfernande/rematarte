import { T } from "@/components/language-switch";
import type { ReactNode } from "react";

export type OnboardingStepStatus = "pendiente" | "en curso" | "hecho" | "error";

const statusLabel: Record<OnboardingStepStatus, string> = {
  pendiente: "Pendiente",
  "en curso": "Te toca",
  hecho: "Hecho",
  error: "Error",
};

const cardStyles: Record<OnboardingStepStatus, string> = {
  pendiente: "border-linea/80 bg-papel/60 text-tinta-2",
  "en curso": "border-ocre/70 bg-papel shadow-[0_18px_40px_-34px_rgb(0_0_0/0.45)]",
  hecho: "border-exito/35 bg-papel",
  error: "border-malbec/55 bg-papel",
};

const badgeStyles: Record<OnboardingStepStatus, string> = {
  pendiente: "border-linea bg-cal text-tinta-2",
  "en curso": "border-ocre/45 bg-ocre/10 text-tinta-2",
  hecho: "border-exito/30 bg-exito/10 text-exito",
  error: "border-malbec/30 bg-malbec/10 text-malbec",
};

function StepIcon({ number, status, busy }: { number?: number; status: OnboardingStepStatus; busy: boolean }) {
  if (busy) {
    return (
      <span
        className="mt-1 size-8 shrink-0 rounded-full border-2 border-ocre/25 border-t-ocre motion-safe:animate-spin"
        aria-hidden
      />
    );
  }

  if (status === "hecho") {
    return (
      <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-exito text-cal" aria-hidden>
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m4.5 10.5 3.5 3.5 7.5-8" />
        </svg>
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-malbec text-cal" aria-hidden>
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M10 4.5v6.5" />
          <path d="M10 15h.01" />
        </svg>
      </span>
    );
  }

  if (number === undefined) {
    return (
      <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full border border-linea bg-cal text-piedra" aria-hidden>
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 17V4" />
          <path d="M6 4.8h8l-2 3.1 2 3.1H6" />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={`mt-1 grid size-8 shrink-0 place-items-center rounded-full border font-serif text-lg italic ${
        status === "en curso" ? "border-ocre bg-ocre/10 text-tinta-2" : "border-linea text-piedra"
      }`}
      aria-hidden
    >
      {number}
    </span>
  );
}

export function OnboardingStepCard({
  number,
  title,
  description,
  status,
  busy = false,
  error,
  notice,
  children,
}: {
  number?: number;
  title: string;
  description: string;
  status: OnboardingStepStatus;
  busy?: boolean;
  error?: string | null;
  notice?: string | null;
  children?: ReactNode;
}) {
  return (
    <li
      className={`rounded-sm border-l-2 border-y p-5 transition-colors duration-200 sm:p-6 ${cardStyles[status]}`}
      aria-current={status === "en curso" ? "step" : undefined}
    >
      <div className="flex gap-4">
        <StepIcon number={number} status={status} busy={busy} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-piedra"><T>{number === undefined ? "Confirmación" : `Paso ${number} de 4`}</T></p>
              <h2 className="mt-1 font-serif text-2xl leading-tight text-tinta"><T>{title}</T></h2>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeStyles[status]}`}>
              <T>{busy ? "Procesando" : statusLabel[status]}</T>
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-tinta-2 sm:text-base"><T>{description}</T></p>
          <T>{children && <div className="mt-4">{children}</div>}</T>
          <T>{notice && !error && (
            <p className="mt-4 rounded-sm border border-linea bg-cal-2/35 px-3 py-2 text-sm leading-relaxed text-tinta-2">
              <T>{notice}</T>
            </p>
          )}</T>
          <T>{error && (
            <p role="alert" className="mt-4 rounded-xl border border-malbec/25 bg-malbec/10 px-3 py-2 text-sm leading-relaxed text-malbec">
              <T>{error}</T>
            </p>
          )}</T>
        </div>
      </div>
    </li>
  );
}
