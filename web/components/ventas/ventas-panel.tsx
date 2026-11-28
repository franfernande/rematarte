"use client";

import { T, TranslatedAttributes } from "@/components/language-switch";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { readAuctions } from "@/lib/auction";
import type { AuctionState } from "@/lib/auction-types";
import { accountUrl, formatUsdc, shortAddress } from "@/lib/format";
import type { Obra } from "@/lib/data";

const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-sm px-5 text-sm font-medium transition-colors";
const primaryButtonClass = `${buttonClass} bg-malbec text-cal hover:bg-malbec-2`;
const secondaryButtonClass = `${buttonClass} border border-tinta/20 text-tinta hover:bg-cal-2`;

type Contacto = {
  address: string;
  nombre: string;
  apellido: string;
  telefono: string;
  actualizado: string;
};

type Props = {
  obras: Obra[];
  subastas: Record<string, number>;
};

type Status = "en vivo" | "cerrada" | "liquidada";

function nombreCompleto(contacto: Contacto): string {
  return `${contacto.nombre} ${contacto.apellido}`.trim();
}

function whatsappUrl(contacto: Contacto, titulo: string, ganada: boolean): string {
  const digits = contacto.telefono.replace(/\D/g, "");
  const message = ganada
    ? `Hola ${contacto.nombre}, te escribimos de Artemi por la obra «${titulo}» que ganaste en la subasta. Coordinemos la entrega.`
    : `Hola ${contacto.nombre}, te escribimos de Artemi por tu oferta por la obra «${titulo}».`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function auctionStatus(auction: AuctionState, nowSeconds: number): Status {
  if (auction.settled) return "liquidada";
  return nowSeconds >= auction.endTime ? "cerrada" : "en vivo";
}

function formatDate(value: number | string): string {
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(date);
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

function ContactoBox({ contacto, address, titulo, ganada }: { contacto?: Contacto; address: string; titulo: string; ganada: boolean }) {
  if (!contacto) {
    return (
      <div className="mt-4 rounded-sm border border-ocre/30 bg-ocre/10 p-4">
        <p className="font-medium text-tinta"><T>Sin datos de contacto</T></p>
        <p className="mt-1 text-sm text-tinta-2"><T>Esta wallet ofertó antes de que se pidieran los datos.</T></p>
        <a href={accountUrl(address)} target="_blank" rel="noreferrer" className={`${secondaryButtonClass} mt-2 font-mono`}>
          {shortAddress(address)}
        </a>
      </div>
    );
  }
  return (
    <div className="mt-4 rounded-sm border border-linea bg-cal-2/45 p-4">
      <p className="font-medium text-tinta">{nombreCompleto(contacto)}</p>
      <a href={`tel:${contacto.telefono}`} className="mt-1 inline-flex min-h-11 items-center text-malbec underline">
        {contacto.telefono}
      </a>
      <div className="mt-2 flex flex-wrap gap-2">
        <a href={whatsappUrl(contacto, titulo, ganada)} target="_blank" rel="noreferrer" className={primaryButtonClass}>
          <T>Escribir por WhatsApp</T>
        </a>
        <a href={accountUrl(address)} target="_blank" rel="noreferrer" className={`${secondaryButtonClass} font-mono`}>
          {shortAddress(address)}
        </a>
      </div>
    </div>
  );
}

export function VentasPanel({ obras, subastas }: Props) {
  const router = useRouter();
  const [auctions, setAuctions] = useState<AuctionState[] | null>(null);
  const [contactos, setContactos] = useState<Contacto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowSeconds, setNowSeconds] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [auctionResult, contactResponse] = await Promise.all([
        readAuctions(),
        fetch("/api/contactos", { cache: "no-store" }),
      ]);
      if (contactResponse.status === 401) {
        router.push("/admin/entrar?volver=/admin/ventas");
        return;
      }
      const contactData = (await contactResponse.json().catch(() => ({}))) as { contactos?: Contacto[]; error?: string };
      if (!contactResponse.ok) throw new Error(contactData.error || "No pudimos leer los contactos. Probá de nuevo.");
      setAuctions(auctionResult);
      setNowSeconds(Math.floor(Date.now() / 1000));
      setContactos(Array.isArray(contactData.contactos) ? contactData.contactos : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos cargar las ventas. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

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

  const contactByAddress = new Map(contactos.map((contacto) => [contacto.address, contacto]));
  const rows = obras.flatMap((obra) => {
    const auctionId = subastas[obra.slug];
    const auction = auctions.find((item) => item.id === auctionId);
    return auction ? [{ obra, auction, status: auctionStatus(auction, nowSeconds) }] : [];
  });
  const closed = rows.filter((row) => row.status !== "en vivo" && row.auction.highestBidder);
  const live = rows.filter((row) => row.status === "en vivo");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-serif text-3xl text-tinta"><T>Entregas para coordinar</T></h1>
          <button type="button" className={secondaryButtonClass} onClick={() => void load()} disabled={loading}>
            <T>{loading ? "Actualizando…" : "Actualizar"}</T>
          </button>
        </div>

        {closed.length === 0 ? (
          <div className="cartela mt-5 p-5 text-tinta-2"><T>Todavía no hay obras cerradas con ofertas.</T></div>
        ) : (
          <div className="mt-5 grid gap-4">
            {closed.map(({ obra, auction, status }) => {
              const winner = auction.highestBidder!;
              return (
                <article key={obra.slug} className="cartela p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="etiqueta"><T>{status}</T></p>
                      <h2 className="mt-1 font-serif text-2xl text-tinta">
                        <Link href={`/obra/${obra.slug}`} className="hover:text-malbec">{obra.titulo}</Link>
                      </h2>
                      <p className="mt-1 text-sm text-tinta-2"><T>Artista:</T> {obra.artista}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-3xl tabular-nums text-tinta">{formatUsdc(auction.highestBid)} USDC</p>
                      <p className="text-xs text-tinta-2"><T>Cerró:</T> {formatDate(auction.endTime)}</p>
                    </div>
                  </div>
                  <ContactoBox contacto={contactByAddress.get(winner)} address={winner} titulo={obra.titulo} ganada />
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
              const contacto = bidder ? contactByAddress.get(bidder) : undefined;
              return (
                <article key={obra.slug} className="cartela flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <h3 className="font-medium text-tinta">
                      <Link href={`/obra/${obra.slug}`} className="hover:text-malbec">{obra.titulo}</Link>
                    </h3>
                    <p className="mt-1 text-sm text-tinta-2">
                      <T>Va ganando:</T>{" "}
                      {contacto ? (
                        <>
                          {nombreCompleto(contacto)} ·{" "}
                          <a href={`tel:${contacto.telefono}`} className="text-malbec underline">{contacto.telefono}</a>
                        </>
                      ) : bidder ? (
                        <span className="font-mono">{shortAddress(bidder)}</span>
                      ) : (
                        <T>sin ofertas</T>
                      )}
                    </p>
                    <p className="text-xs text-piedra"><T>Cierra:</T> {formatDate(auction.endTime)}</p>
                  </div>
                  <p className="font-serif text-2xl tabular-nums text-tinta">
                    {formatUsdc(bidder ? auction.highestBid : auction.minPrice)} USDC
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-serif text-2xl text-tinta"><T>Postores registrados</T></h2>
        <p className="mt-1 text-sm text-tinta-2"><T>Cada persona completa estos datos antes de su primera oferta.</T></p>
        {contactos.length === 0 ? (
          <p className="mt-3 text-tinta-2"><T>Todavía nadie se registró.</T></p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="border-b border-linea text-tinta-2">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium"><T>Nombre</T></th>
                  <th scope="col" className="py-2 pr-3 font-medium"><T>Teléfono</T></th>
                  <th scope="col" className="py-2 pr-3 font-medium"><T>Wallet</T></th>
                  <th scope="col" className="py-2 font-medium"><T>Registro</T></th>
                </tr>
              </thead>
              <tbody>
                {contactos.map((contacto) => (
                  <tr key={contacto.address} className="border-b border-linea last:border-b-0">
                    <td className="py-2 pr-3">{nombreCompleto(contacto)}</td>
                    <td className="py-2 pr-3">
                      <a href={`tel:${contacto.telefono}`} className="text-malbec underline">{contacto.telefono}</a>
                    </td>
                    <td className="py-2 pr-3 font-mono">
                      <a href={accountUrl(contacto.address)} target="_blank" rel="noreferrer" className="underline">
                        {shortAddress(contacto.address)}
                      </a>
                    </td>
                    <td className="py-2 text-tinta-2">{formatDate(contacto.actualizado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
