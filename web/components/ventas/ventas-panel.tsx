"use client";

import { T, TranslatedAttributes } from "@/components/language-switch";
import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/components/wallet-provider";
import { readAuctions } from "@/lib/auction";
import type { AuctionState } from "@/lib/auction-types";
import { accountUrl, formatUsdc, shortAddress } from "@/lib/format";
import type { Obra } from "@/lib/data";

const ADMIN_ADDRESS = "GBT3IVJYJWNZ5QX4TIFUQT5Z4KD4DOJMLWEVX4THRWUYAAKZSBZNKDZY";

const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-sm px-5 text-sm font-medium transition-colors";
const primaryButtonClass = `${buttonClass} bg-malbec text-cal hover:bg-malbec-2`;
const secondaryButtonClass = `${buttonClass} border border-tinta/20 text-tinta hover:bg-cal-2`;

type Contacto = {
  address: string;
  nombre: string;
  telefono: string;
  actualizado: string;
};

type Props = {
  obras: Obra[];
  subastas: Record<string, number>;
};

function contactKey(address: string): string {
  return address.trim().toUpperCase();
}

function whatsappUrl(contacto: Contacto, titulo: string): string {
  const digits = contacto.telefono.replace(/\D/g, "");
  const message = `Hola ${contacto.nombre}, te escribimos de Artemi por la obra ${titulo} que ganaste en la subasta.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function auctionStatus(auction: AuctionState, nowSeconds: number): "en vivo" | "cerrada" | "liquidada" {
  if (auction.settled) return "liquidada";
  return nowSeconds >= auction.endTime ? "cerrada" : "en vivo";
}

function formatClose(endTime: number): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(endTime * 1000));
}

function Skeleton() {
  return (
    <TranslatedAttributes><div className="grid gap-4" aria-label="Cargando ventas">
      {[0, 1].map((item) => (
        <div key={item} className="cartela animate-pulse p-5 motion-reduce:animate-none">
          <div className="h-5 w-40 rounded-sm bg-piedra/20" />
          <div className="mt-4 h-4 w-64 rounded-sm bg-piedra/15" />
          <div className="mt-2 h-4 w-52 rounded-sm bg-piedra/15" />
        </div>
      ))}
    </div></TranslatedAttributes>
  );
}

export function VentasPanel({ obras, subastas }: Props) {
  const { address, connecting, connect } = useWallet();
  const [auctions, setAuctions] = useState<AuctionState[] | null>(null);
  const [contactos, setContactos] = useState<Contacto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowSeconds, setNowSeconds] = useState(0);
  const isAdmin = address === ADMIN_ADDRESS;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [auctionResult, contactResponse] = await Promise.all([
        readAuctions(),
        fetch("/api/contactos", { cache: "no-store" }),
      ]);
      if (!contactResponse.ok) throw new Error("No pudimos leer los contactos. Probá de nuevo en unos segundos.");
      const contactData = (await contactResponse.json()) as { contactos?: Contacto[] };
      setAuctions(auctionResult);
      setNowSeconds(Math.floor(Date.now() / 1000));
      setContactos(Array.isArray(contactData.contactos) ? contactData.contactos : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos cargar las ventas. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [isAdmin, load]);

  if (!address) {
    return (
      <section className="cartela panel-sala">
        <p className="etiqueta"><T>Ventas</T></p>
        <h1 className="mt-2 font-serif text-4xl leading-tight"><T>Entrá con la wallet del espacio</T></h1>
        <p className="mt-3 text-tinta-2"><T>Los datos de contacto solo se cargan después de confirmar que sos el espacio.</T></p>
        <button type="button" className={`${primaryButtonClass} mt-5`} disabled={connecting} onClick={() => void connect()}>
          <T>{connecting ? "Entrando…" : "Entrar"}</T>
        </button>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="cartela panel-sala">
        <h1 className="font-serif text-3xl"><T>Esta página es solo para el espacio</T></h1>
        <p className="mt-3 text-tinta-2"><T>La wallet conectada no es la administradora del contrato.</T></p>
      </section>
    );
  }

  if (loading && !auctions) return <Skeleton />;
  if (error) {
    return (
      <section className="cartela panel-sala">
        <p role="alert" className="rounded-sm border border-malbec/30 bg-malbec/5 px-3 py-2 text-sm text-malbec">
          <T>{error}</T>
        </p>
        <button type="button" className={`${primaryButtonClass} mt-4`} onClick={() => void load()}>
          <T>Reintentar</T>
        </button>
      </section>
    );
  }
  if (!auctions || !contactos) return <Skeleton />;

  const contactByAddress = new Map(contactos.map((contacto) => [contactKey(contacto.address), contacto]));
  const rows = obras
    .map((obra) => {
      const auctionId = subastas[obra.slug];
      const auction = auctions.find((item) => item.id === auctionId);
      return auction ? { obra, auction, status: auctionStatus(auction, nowSeconds) } : null;
    })
    .filter((row): row is { obra: Obra; auction: AuctionState; status: "en vivo" | "cerrada" | "liquidada" } => row !== null);
  const closed = rows.filter((row) => row.status !== "en vivo" && row.auction.highestBidder);
  const live = rows.filter((row) => row.status === "en vivo");

  return (
    <div className="grid gap-8">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="etiqueta"><T>Ventas</T></p>
            <h1 className="mt-2 font-serif text-3xl text-tinta"><T>Entregas para coordinar</T></h1>
          </div>
          <button type="button" className={secondaryButtonClass} onClick={() => void load()} disabled={loading}>
            <T>{loading ? "Actualizando…" : "Actualizar"}</T>
          </button>
        </div>

        {closed.length === 0 ? (
          <div className="cartela mt-5 p-5 text-tinta-2"><T>Todavía no hay obras cerradas.</T></div>
        ) : (
          <div className="mt-5 grid gap-4">
            {closed.map(({ obra, auction, status }) => {
              const winner = auction.highestBidder;
              const contacto = winner ? contactByAddress.get(contactKey(winner)) : undefined;
              return (
                <article key={obra.slug} className="cartela animate-aparecer p-5 motion-reduce:animate-none">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="etiqueta"><T>{status}</T></p>
                      <h2 className="mt-1 font-serif text-2xl text-tinta">{obra.titulo}</h2>
                      <p className="mt-1 text-sm text-tinta-2"><T>Artista:</T> {obra.artista}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-3xl tabular-nums text-tinta">{formatUsdc(auction.highestBid)} USDC</p>
                      <p className="text-xs text-tinta-2"><T>Cerró:</T> <T>{formatClose(auction.endTime)}</T></p>
                    </div>
                  </div>

                  {winner && contacto ? (
                    <div className="mt-4 rounded-sm border border-linea bg-cal-2/45 p-4">
                      <p className="font-medium text-tinta"><T>{contacto.nombre}</T></p>
                      <a href={`tel:${contacto.telefono}`} className="mt-1 inline-flex min-h-11 items-center text-malbec underline">
                        <T>{contacto.telefono}</T>
                      </a>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <a
                          href={whatsappUrl(contacto, obra.titulo)}
                          target="_blank"
                          rel="noreferrer"
                          className={primaryButtonClass}
                        >
                          <T>Escribir por WhatsApp</T>
                        </a>
                        <a href={accountUrl(winner)} target="_blank" rel="noreferrer" className={secondaryButtonClass}>
                          <T>{shortAddress(winner)}</T>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-sm border border-ocre/30 bg-ocre/10 p-4">
                      <p className="font-medium text-tinta"><T>Sin datos de contacto</T></p>
                      <T>{winner && (
                        <a href={accountUrl(winner)} target="_blank" rel="noreferrer" className={`${secondaryButtonClass} mt-2`}>
                          <T>{shortAddress(winner)}</T>
                        </a>
                      )}</T>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-serif text-2xl text-tinta"><T>Subastas en vivo</T></h2>
        {live.length === 0 ? (
          <p className="mt-3 text-tinta-2"><T>No hay subastas en vivo.</T></p>
        ) : (
          <div className="mt-3 grid gap-3">
            {live.map(({ obra, auction }) => {
              const bidder = auction.highestBidder;
              const contacto = bidder ? contactByAddress.get(contactKey(bidder)) : undefined;
              return (
                <article key={obra.slug} className="cartela flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <h3 className="font-medium text-tinta">{obra.titulo}</h3>
                    <p className="mt-1 text-sm text-tinta-2">
                      <T>Va ganando:</T> <T>{contacto ? contacto.nombre : bidder ? shortAddress(bidder) : "sin ofertas"}</T>
                    </p>
                  </div>
                  <p className="font-serif text-2xl tabular-nums text-tinta">{formatUsdc(auction.highestBid)} USDC</p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
