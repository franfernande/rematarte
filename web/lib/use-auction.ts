"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AuctionEvent, AuctionState, FriendlyError } from "@/lib/auction-types";
import { eventKey, readAuction, readEventsSince, readLedgerTime, toFriendlyError } from "@/lib/auction";

const LEDGER_RECALIBRATE_MS = 30_000;
const EVENTS_MAX_AGE_MS = 15_000;

function stateChanged(prev: AuctionState | null, next: AuctionState): boolean {
  return (
    !prev ||
    prev.highestBid !== next.highestBid ||
    prev.highestBidder !== next.highestBidder ||
    prev.settled !== next.settled ||
    prev.endTime !== next.endTime
  );
}

export function useAuction(
  id: number,
  opts?: { intervalMs?: number; events?: boolean },
): {
  auction: AuctionState | null;
  events: AuctionEvent[];
  now: number;
  loading: boolean;
  error: FriendlyError | null;
  refresh: () => Promise<void>;
} {
  const intervalMs = opts?.intervalMs ?? 4000;
  const withEvents = opts?.events ?? true;
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [events, setEvents] = useState<AuctionEvent[]>([]);
  // 0 until mounted: reading the clock during render breaks prerendering with Cache Components.
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FriendlyError | null>(null);

  const auctionRef = useRef<AuctionState | null>(null);
  const eventsRef = useRef<AuctionEvent[]>([]);
  const lastLedgerRef = useRef<number | undefined>(undefined);
  const eventsAtRef = useRef(0);
  const ledgerOffsetRef = useRef(0);
  const calibratedAtRef = useRef(0);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const generationRef = useRef(0);

  const runOnce = useCallback(
    async (force: boolean) => {
      const generation = generationRef.current;
      try {
        const nowMs = Date.now();
        const [nextAuction, ledgerTime] = await Promise.all([
          readAuction(id),
          force || nowMs - calibratedAtRef.current > LEDGER_RECALIBRATE_MS ? readLedgerTime() : Promise.resolve(null),
        ]);
        if (generation !== generationRef.current) return;
        if (ledgerTime !== null) {
          ledgerOffsetRef.current = ledgerTime - Date.now() / 1000;
          calibratedAtRef.current = nowMs;
          setNow(Date.now() / 1000 + ledgerOffsetRef.current);
        }

        const changed = stateChanged(auctionRef.current, nextAuction);
        auctionRef.current = nextAuction;
        setAuction(nextAuction);
        // Show the live bid right away; the first full event scan can take several seconds.
        setLoading(false);

        if (withEvents && (force || changed || nowMs - eventsAtRef.current > EVENTS_MAX_AGE_MS)) {
          const { events: fresh, latestLedger } = await readEventsSince(id, lastLedgerRef.current);
          if (generation !== generationRef.current) return;
          lastLedgerRef.current = latestLedger;
          eventsAtRef.current = nowMs;
          if (fresh.length > 0) {
            const seen = new Set(eventsRef.current.map(eventKey));
            const merged = [...fresh.filter((event) => !seen.has(eventKey(event))), ...eventsRef.current].sort(
              (a, b) => b.ledger - a.ledger,
            );
            eventsRef.current = merged;
            setEvents(merged);
          }
        }
        setError(null);
      } catch (cause) {
        if (generation === generationRef.current) setError(toFriendlyError(cause));
      } finally {
        if (generation === generationRef.current) setLoading(false);
      }
    },
    [id, withEvents],
  );

  // Polls never overlap: a tick that finds a refresh in flight is skipped.
  const poll = useCallback(() => {
    if (inFlightRef.current) return;
    inFlightRef.current = runOnce(false).finally(() => {
      inFlightRef.current = null;
    });
  }, [runOnce]);

  // Manual refresh (e.g. right after a bid): waits for the current one, then forces a full update.
  const refresh = useCallback(async () => {
    if (inFlightRef.current) await inFlightRef.current;
    const run = runOnce(true).finally(() => {
      if (inFlightRef.current === run) inFlightRef.current = null;
    });
    inFlightRef.current = run;
    await run;
  }, [runOnce]);

  useEffect(() => {
    generationRef.current += 1;
    auctionRef.current = null;
    eventsRef.current = [];
    lastLedgerRef.current = undefined;
    eventsAtRef.current = 0;
    inFlightRef.current = null;
    void Promise.resolve().then(refresh);

    const timer = window.setInterval(() => {
      if (!document.hidden) poll();
    }, intervalMs);
    const onVisibility = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      generationRef.current += 1;
    };
  }, [id, intervalMs, poll, refresh]);

  useEffect(() => {
    const tick = () => setNow(Date.now() / 1000 + ledgerOffsetRef.current);
    tick();
    const clock = window.setInterval(tick, 1000);
    return () => window.clearInterval(clock);
  }, []);

  return { auction, events, now, loading, error, refresh };
}
