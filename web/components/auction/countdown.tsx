"use client";

import { useEffect, useRef, useState } from "react";
import type { AuctionPhase } from "@/lib/auction-types";
import { formatCountdown } from "@/lib/format";

export function Countdown({ endTime, now, phase }: { endTime: number; now: number; phase: AuctionPhase }) {
  const [extended, setExtended] = useState(false);
  const previousEndRef = useRef(endTime);

  useEffect(() => {
    const previousEnd = previousEndRef.current;
    previousEndRef.current = endTime;
    if (endTime <= previousEnd) return undefined;

    const show = window.setTimeout(() => setExtended(true), 0);
    const hide = window.setTimeout(() => setExtended(false), 5200);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [endTime]);

  if (now <= 0) {
    return <p className="text-sm font-medium text-piedra">Cierre —</p>;
  }

  if (phase === "settled") {
    return <p className="text-sm font-medium text-piedra">Subasta liquidada</p>;
  }

  if (phase === "ended") {
    return <p className="text-sm font-medium text-piedra">Subasta cerrada</p>;
  }

  const closing = phase === "closing";
  const secondsLeft = Math.max(0, endTime - now);

  return (
    <div>
      <p className={`flex items-center gap-2 text-sm font-medium ${closing ? "text-ocre" : "text-tinta-2"}`}>
        {closing && <span className="size-2 animate-latido rounded-full bg-ocre" aria-hidden />}
        Cierra en <span className="font-mono tabular-nums">{formatCountdown(secondsLeft)}</span>
      </p>
      {closing && <p className="mt-1 text-xs leading-relaxed text-ocre">Si alguien oferta ahora, el cierre se corre 5 minutos.</p>}
      {extended && (
        <p aria-live="polite" className="mt-1 animate-aparecer text-xs font-medium text-exito">
          El cierre se extendió.
        </p>
      )}
    </div>
  );
}
