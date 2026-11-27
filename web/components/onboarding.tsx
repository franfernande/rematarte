"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useWallet } from "@/components/wallet-provider";
import type { DeployConfig } from "@/lib/data";
import { createUsdcTrustline, fundWithFriendbot, getOnboardingState, type OnboardingState } from "@/lib/onboarding";
import { explorerUrl, formatUsdc, shortAddress } from "@/lib/stellar";
import { isUserRejection, WrongNetworkError } from "@/lib/wallet";

type Action = "connect" | "fund" | "trustline" | "usdc";

function nextAction(address: string | null, state?: OnboardingState): Action | undefined {
  if (!address) return "connect";
  if (!state?.funded) return "fund";
  if (!state.hasTrustline) return "trustline";
  if (state.usdc === BigInt(0)) return "usdc";
  return undefined;
}

const LABELS: Record<Action, string> = {
  connect: "Conectar wallet",
  fund: "Activar con XLM de prueba",
  trustline: "Aceptar USDC de prueba",
  usdc: "Recibir 100 USDC de prueba",
};

export function Onboarding({ deploy }: { deploy: DeployConfig }) {
  const { address, connect, signTransaction } = useWallet();
  const [loaded, setLoaded] = useState<{ address: string; state: OnboardingState }>();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [txHash, setTxHash] = useState<string>();
  const state = address && loaded?.address === address ? loaded.state : undefined;

  async function refresh() {
    if (address) setLoaded({ address, state: await getOnboardingState(deploy, address) });
  }

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    getOnboardingState(deploy, address).then(
      (nextState) => {
        if (!cancelled) setLoaded({ address, state: nextState });
      },
      () => {
        if (!cancelled) setError("No pudimos leer tu cuenta en Testnet.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [address, deploy]);

  const action = nextAction(address, state);

  async function advance() {
    if (working || !action) return;
    setWorking(true);
    setError(undefined);
    setMessage(undefined);
    setTxHash(undefined);
    try {
      if (action === "connect") {
        await connect();
        return;
      }
      if (!address) return;
      if (action === "fund") {
        await fundWithFriendbot(deploy, address);
        setMessage("Cuenta activada con XLM de prueba.");
      } else if (action === "trustline") {
        const hash = await createUsdcTrustline(deploy, address, signTransaction);
        setTxHash(hash);
        setMessage("Tu wallet ya acepta el USDC de esta demo.");
      } else {
        const response = await fetch("/api/test-usdc", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ address }),
        });
        const result = (await response.json()) as {
          error?: string;
          alreadyClaimed?: boolean;
          txHash?: string;
        };
        if (!response.ok) throw new Error(result.error ?? "No pudimos entregar USDC.");
        setTxHash(result.txHash);
        setMessage(
          result.alreadyClaimed
            ? "Esta cuenta ya recibió su entrega única de USDC de prueba."
            : "Listo: recibiste 100 USDC de prueba.",
        );
      }
      await refresh();
    } catch (cause) {
      if (cause instanceof WrongNetworkError) {
        setError("Tu wallet está en otra red. Cambiala a Testnet.");
      } else if (isUserRejection(cause)) {
        setError("Cancelaste la firma. No se cambió nada.");
      } else {
        setError(cause instanceof Error ? cause.message : "No pudimos completar este paso.");
      }
    } finally {
      setWorking(false);
    }
  }

  const ready = Boolean(address && state?.funded && state.hasTrustline && state.usdc > BigInt(0));

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-col gap-3">
        <Step done={Boolean(address)} number="1" title="Conectá tu wallet">
          {address ? <span className="font-mono">{shortAddress(address)}</span> : "Albedo funciona sin instalar nada."}
        </Step>
        <Step done={Boolean(state?.funded)} number="2" title="Activá la cuenta">
          Friendbot entrega XLM de Testnet para la reserva y las comisiones. No tiene valor real.
        </Step>
        <Step done={Boolean(state?.hasTrustline)} number="3" title="Aceptá el USDC de la demo">
          La trustline identifica exactamente USDC:{shortAddress(deploy.usdc.issuer)} y requiere una firma.
        </Step>
        <Step done={Boolean(state && state.usdc > BigInt(0))} number="4" title="Recibí USDC de prueba">
          {state?.usdc ? `Saldo: ${formatUsdc(state.usdc)} USDC.` : "La entrega es de 100 USDC, una vez por cuenta."}
        </Step>
      </ol>

      {action && (
        <button
          type="button"
          onClick={() => void advance()}
          disabled={working}
          className="min-h-12 rounded-full bg-malbec px-6 font-medium text-cal hover:bg-malbec-2 disabled:opacity-60"
        >
          {working ? "Preparando…" : LABELS[action]}
        </button>
      )}

      {ready && (
        <Link
          href="/"
          className="flex min-h-12 items-center justify-center rounded-full bg-malbec px-6 font-medium text-cal hover:bg-malbec-2"
        >
          Ver las obras y ofertar
        </Link>
      )}

      <div aria-live="polite" className="text-sm">
        {message && (
          <p className="border-l-2 border-malbec pl-3">
            {message}{" "}
            {txHash && (
              <a
                href={explorerUrl(deploy, "tx", txHash)}
                target="_blank"
                rel="noreferrer"
                className="text-malbec underline underline-offset-2"
              >
                Ver transacción
              </a>
            )}
          </p>
        )}
        {error && (
          <p role="alert" className="border-l-2 border-ocre pl-3">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function Step({
  done,
  number,
  title,
  children,
}: {
  done: boolean;
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-3 border-b border-linea pb-3">
      <span
        aria-hidden="true"
        className={`grid size-8 place-items-center rounded-full text-sm ${done ? "bg-malbec text-cal" : "border border-linea"}`}
      >
        {done ? "✓" : number}
      </span>
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-tinta-2">{children}</p>
      </div>
    </li>
  );
}
