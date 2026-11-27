"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useLiveAuctions, useNowSeconds } from "@/components/use-live-auction";
import type { DeployConfig } from "@/lib/data";
import { formatRemaining } from "@/lib/format";
import { auctionStatus, formatUsdc, type Auction } from "@/lib/stellar";

const LiveAuctionsContext = createContext<Record<string, Auction> | undefined>(undefined);

export function LiveAuctionsProvider({ deploy, children }: { deploy: DeployConfig; children: ReactNode }) {
  const auctions = useLiveAuctions(deploy);
  return <LiveAuctionsContext value={auctions}>{children}</LiveAuctionsContext>;
}

export function AuctionSummary({ slug }: { slug: string }) {
  const auctions = useContext(LiveAuctionsContext);
  const now = useNowSeconds();

  if (!auctions || now === undefined) return <p className="text-sm text-piedra">Leyendo la subasta…</p>;

  const auction = auctions[slug];
  if (!auction) return <p className="text-sm text-piedra">Todavía sin subasta.</p>;

  const status = auctionStatus(auction, now);
  const hasBids = auction.highest_bid > BigInt(0);

  return (
    <div className="flex items-baseline justify-between gap-3">
      <p>
        <span className="text-sm text-tinta-2">
          {hasBids ? (status === "open" ? "Oferta actual " : "Ganadora ") : "Base "}
        </span>
        <span className="font-serif text-2xl text-malbec tabular-nums">
          {formatUsdc(hasBids ? auction.highest_bid : auction.min_price)}
        </span>{" "}
        <span className="text-sm text-tinta-2">USDC</span>
      </p>
      <p className="text-sm text-tinta-2 tabular-nums">
        {status === "open" && <>Cierra en {formatRemaining(Number(auction.end_time) - now)}</>}
        {status === "ended" && (hasBids ? "Por liquidar" : "Sin ofertas")}
        {status === "settled" && "Liquidada"}
      </p>
    </div>
  );
}
