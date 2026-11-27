import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { DeployConfig } from "@/lib/data";
import {
  getAuction,
  getAuctionEvents,
  getAuctionsBySlug,
  mergeAuctionEvents,
  type Auction,
  type AuctionEvent,
} from "@/lib/stellar";

const EVENTS_POLL_MS = 4_000;
const AUCTION_REFRESH_EVERY_POLLS = 8;
const LIST_POLL_MS = 15_000;

type LiveAuctionState = { auction?: Auction; events?: AuctionEvent[]; error?: string };
type LiveAuction = LiveAuctionState & { refresh: () => void };

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo leer la subasta.";
}

// New contract events trigger a re-read of the auction, so a bid (and its anti-sniping extension) shows up within one poll.
export function useLiveAuction(deploy: DeployConfig, auctionId: number): LiveAuction {
  const [state, setState] = useState<LiveAuctionState>({});
  const refreshRef = useRef<() => void>(() => {});
  const refresh = useCallback(() => refreshRef.current(), []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cursor: string | undefined;
    let polls = 0;
    let inFlight = false;

    const refreshAuction = async () => {
      try {
        const auction = await getAuction(deploy, auctionId);
        if (!cancelled) setState((current) => ({ ...current, auction, error: undefined }));
      } catch (error) {
        if (!cancelled) setState((current) => (current.auction ? current : { ...current, error: errorText(error) }));
      }
    };

    // A poll already in flight schedules the next one, so an early refresh() never starts a second loop.
    const poll = async () => {
      clearTimeout(timer);
      if (inFlight) return;
      inFlight = true;
      if (!document.hidden) {
        polls += 1;
        try {
          const firstLoad = cursor === undefined;
          const page = await getAuctionEvents(deploy, auctionId, cursor);
          cursor = page.cursor;
          if (!cancelled) {
            setState((current) => ({ ...current, events: mergeAuctionEvents(current.events ?? [], page.events) }));
            if (!firstLoad && (page.events.length > 0 || polls % AUCTION_REFRESH_EVERY_POLLS === 0)) {
              await refreshAuction();
            }
          }
        } catch {
          // Transient RPC errors keep the last known state; the next poll retries.
        }
      }
      inFlight = false;
      if (!cancelled) timer = setTimeout(poll, EVENTS_POLL_MS);
    };

    refreshRef.current = () => {
      void refreshAuction();
      void poll();
    };
    void refreshAuction();
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      refreshRef.current = () => {};
    };
  }, [deploy, auctionId]);

  return { ...state, refresh };
}

export function useLiveAuctions(deploy: DeployConfig): Record<string, Auction> | undefined {
  const [auctions, setAuctions] = useState<Record<string, Auction>>();

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (!document.hidden) {
        try {
          const bySlug = await getAuctionsBySlug(deploy);
          if (!cancelled) setAuctions(bySlug);
        } catch {
          // Keeps the last known state; the next poll retries.
        }
      }
      if (!cancelled) timer = setTimeout(poll, LIST_POLL_MS);
    };

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [deploy]);

  return auctions;
}

const clock = {
  seconds: undefined as number | undefined,
  listeners: new Set<() => void>(),
  timer: undefined as ReturnType<typeof setInterval> | undefined,
};

function readClock(): number {
  return Math.floor(Date.now() / 1000);
}

function subscribeClock(listener: () => void): () => void {
  clock.listeners.add(listener);
  if (!clock.timer) {
    clock.seconds = readClock();
    clock.timer = setInterval(() => {
      clock.seconds = readClock();
      clock.listeners.forEach((notify) => notify());
    }, 1_000);
  }
  return () => {
    clock.listeners.delete(listener);
    if (clock.listeners.size === 0) {
      clearInterval(clock.timer);
      clock.timer = undefined;
    }
  };
}

function clockSnapshot(): number {
  clock.seconds ??= readClock();
  return clock.seconds;
}

// Undefined while prerendering: the time is only read in the browser, with one interval shared by every countdown.
export function useNowSeconds(): number | undefined {
  return useSyncExternalStore(subscribeClock, clockSnapshot, () => undefined);
}
