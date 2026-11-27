import type { ReactNode } from "react";

export type OnboardingStepStatus = "pendiente" | "en curso" | "hecho" | "error";

const statusLabel: Record<OnboardingStepStatus, string> = {
  pendiente: "Pendiente",
  "en curso": "En curso",
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

function StepIcon({ number, status, busy }: { number: number; status: OnboardingStepStatus; busy: boolean }) {
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
  children,
}: {
  number: number;
  title: string;
  description: string;
  status: OnboardingStepStatus;
  busy?: boolean;
  error?: string | null;
  children?: ReactNode;
}) {
  return (
    <li
      className={`rounded-2xl border p-5 transition-colors duration-200 sm:p-6 ${cardStyles[status]}`}
      aria-current={status === "en curso" ? "step" : undefined}
    >
      <div className="flex gap-4">
        <StepIcon number={number} status={status} busy={busy} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-2xl leading-tight text-tinta">{title}</h2>
            <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold tracking-[0.14em] uppercase ${badgeStyles[status]}`}>
              {busy ? "Procesando" : statusLabel[status]}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-tinta-2 sm:text-base">{description}</p>
          {children && <div className="mt-4">{children}</div>}
          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-malbec/25 bg-malbec/10 px-3 py-2 text-sm leading-relaxed text-malbec">
              {error}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
