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

export function BidHistory({ events, now, address }: { events: AuctionEvent[]; now: number; address: string | null }) {
  const ordered = sortEventsChronologically(events);

  return (
    <section aria-labelledby="historial-subasta">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="historial-subasta" className="etiqueta">
          Registro de la puja
        </h3>
        {ordered.length > 0 && (
          <span className="text-xs text-piedra">
            {ordered.length} movimiento{ordered.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {ordered.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-tinta-2">Todavía nadie ofertó. Podés ser la primera persona.</p>
      ) : (
        <ol className="mt-4 space-y-0">
          {ordered.map((event, index) => {
            const line = eventLine(event, address);
            return (
              <li key={`${event.txHash}-${event.kind}-${index}`} className="relative grid grid-cols-[2.4rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
                {index < ordered.length - 1 && <span className="absolute bottom-0 left-5 top-7 w-px bg-linea" aria-hidden />}
                <span className="relative z-10 font-serif text-lg italic leading-6 text-malbec">{romanNumeral(index + 1)}.</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-sm font-medium text-tinta">{line.title}</p>
                    <p className="text-xs text-piedra">{formatRelativeTime(event.at, now)}</p>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-tinta-2">{line.detail}</p>
                  <a
                    href={txUrl(event.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex min-h-8 items-center text-xs font-medium text-malbec underline decoration-malbec/30 underline-offset-4 transition-colors hover:text-malbec-2"
                  >
                    Ver en el explorador
                  </a>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
