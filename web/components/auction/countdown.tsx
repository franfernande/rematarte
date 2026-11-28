"use client";

import { T } from "@/components/language-switch";
import { useEffect, useRef, useState } from "react";
import type { AuctionPhase } from "@/lib/auction-types";
import { formatCountdownClear } from "./auction-utils";

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
    return <p className="text-sm font-medium text-piedra"><T>Cierre —</T></p>;
  }

  if (phase === "settled") {
    return <p className="text-sm font-medium text-piedra"><T>Subasta liquidada</T></p>;
  }

  if (phase === "ended") {
    return <p className="text-sm font-medium text-piedra"><T>Subasta cerrada</T></p>;
  }

  const closing = phase === "closing";
  const secondsLeft = Math.max(0, endTime - now);

  return (
    <div>
      <p className={`flex items-center gap-2 text-sm font-medium ${closing ? "text-ocre" : "text-tinta-2"}`}>
        {closing && <span className="size-2 animate-latido rounded-full bg-ocre" aria-hidden />}
        <T>Cierra en</T> <span className="font-mono tabular-nums"><T>{formatCountdownClear(secondsLeft)}</T></span>
      </p>
      {closing && <p className="mt-1 text-xs leading-relaxed text-ocre"><T>Si alguien oferta ahora, el cierre vuelve a 5 minutos desde ese momento.</T></p>}
      {extended && (
        <p aria-live="polite" className="mt-1 animate-aparecer text-xs font-medium text-exito">
          <T>El cierre se extendió: vuelve a 5 minutos desde la última oferta.</T>
        </p>
      )}
    </div>
  );
}
