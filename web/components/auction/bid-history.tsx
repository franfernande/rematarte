import { T } from "@/components/language-switch";
import type { AuctionEvent } from "@/lib/auction-types";
import { formatUsdc, shortAddress, txUrl } from "@/lib/format";
import { formatRelativeTime, romanNumeral, sortEventsChronologically } from "./auction-utils";

function eventLine(event: AuctionEvent, address: string | null): { title: string; detail: string } {
  const bidder = event.kind !== "settled" && event.bidder === address ? "Vos" : event.kind !== "settled" ? shortAddress(event.bidder) : null;
  if (event.kind === "bid") {
    return {
      title: `Oferta de ${formatUsdc(event.amount)} USDC`,
      detail: `${bidder} · depositada`,
    };
  }
  if (event.kind === "refund") {
    return {
      title: `Reembolso de ${formatUsdc(event.amount)} USDC`,
      detail: `${bidder} · ${event.pending ? "quedó pendiente" : "volvió a la wallet"}`,
    };
  }
  const winner = event.winner ? (event.winner === address ? "Vos" : shortAddress(event.winner)) : "Sin ganador";
  return {
    title: event.amount > 0n ? `Liquidación por ${formatUsdc(event.amount)} USDC` : "Liquidación sin venta",
    detail: `${winner} · reparto cerrado`,
  };
}

type BidHistoryProps = {
  events: AuctionEvent[];
  now: number;
  address: string | null;
  hasBid?: boolean;
  highestBid?: bigint;
  onRetry?: () => void;
};

export function BidHistory({ events, now, address, hasBid = false, highestBid = 0n, onRetry }: BidHistoryProps) {
  const ordered = sortEventsChronologically(events).reverse();
  const missingBidEvents = ordered.length === 0 && (hasBid || highestBid > 0n);

  return (
    <details>
      <summary className="obra-resumen">
        <span>
          <T>Registro de la puja</T>
        </span>
        {ordered.length > 0 && (
          <span className="ml-3 text-xs font-normal text-piedra">
            {ordered.length} <T>movimiento</T><T>{ordered.length === 1 ? "" : "s"}</T>
          </span>
        )}
      </summary>

      {ordered.length === 0 ? (
        missingBidEvents ? (
          <div className="mt-4 rounded-sm border border-linea bg-cal-2/35 px-4 py-3">
            <p className="text-sm leading-relaxed text-tinta-2">
              <T>Ya hay una puja</T><T>{highestBid > 0n ? ` de ${formatUsdc(highestBid)} USDC` : ""}</T> <T>en esta subasta; el registro de movimientos todavía no se pudo leer.</T>
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-1 min-h-8 font-medium text-malbec underline decoration-malbec/35 underline-offset-4 transition-colors hover:text-malbec-2"
              >
                <T>Reintentar</T>
              </button>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-tinta-2"><T>Todavía nadie ofertó. Podés ser la primera persona.</T></p>
        )
      ) : (
        <ol className="mt-4 space-y-0">
          {ordered.map((event, index) => {
            const line = eventLine(event, address);
            return (
              <li key={`${event.txHash}-${event.kind}-${index}`} className="relative grid grid-cols-[2.4rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
                {index < ordered.length - 1 && <span className="absolute bottom-0 left-5 top-7 w-px bg-linea" aria-hidden />}
                <span className="relative z-10 font-serif text-lg italic leading-6 text-malbec"><T>{romanNumeral(ordered.length - index)}</T>.</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-sm font-medium text-tinta"><T>{line.title}</T></p>
                    <p className="text-xs text-piedra"><T>{formatRelativeTime(event.at, now)}</T></p>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-tinta-2"><T>{line.detail}</T></p>
                  <a
                    href={txUrl(event.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex min-h-8 items-center text-xs font-medium text-malbec underline decoration-malbec/30 underline-offset-4 transition-colors hover:text-malbec-2"
                  >
                    <T>Ver en el explorador</T>
                  </a>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </details>
  );
}
