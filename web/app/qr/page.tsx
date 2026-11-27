import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { PrintButton } from "@/components/qr/print-button";
import { QrCard } from "@/components/qr/qr-card";
import { getObras } from "@/lib/data";
import { qrSvgForUrl } from "@/lib/qr";
import "./qr-print.css";

export const metadata: Metadata = {
  title: "Cartelas QR",
  description: "Cartelas imprimibles con QR para las obras de la muestra RematArte.",
};

const cierreFormat = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Argentina/Mendoza",
});

const precioFormat = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 2,
});

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

async function requestBaseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return normalizeBaseUrl(configured);

  const requestHeaders = await headers();
  const proto = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
  const host = requestHeaders.get("host")?.split(",")[0]?.trim() || "localhost:3000";
  return normalizeBaseUrl(`${proto}://${host}`);
}

function isLocalUrl(base: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(base);
}

async function PrintableQrCards() {
  const base = await requestBaseUrl();
  const obras = getObras();
  const local = isLocalUrl(base);

  const cards = await Promise.all(
    obras.map(async (obra) => {
      const absoluteUrl = `${base}/obra/${obra.slug}?ref=qr`;
      const qrSvg = await qrSvgForUrl(absoluteUrl);
      return {
        obra,
        absoluteUrl,
        displayUrl: absoluteUrl.replace(/^https?:\/\//, ""),
        qrSvg,
      };
    }),
  );

  return (
    <>
      {local && (
        <p className="mb-5 rounded-lg border border-ocre/40 bg-ocre/10 px-4 py-3 text-sm leading-relaxed text-tinta-2 print:hidden">
          Estos QR apuntan a localhost: generalos desde la URL pública de Vercel.
        </p>
      )}
      <div className="qr-list grid gap-6">
        {cards.map(({ obra, displayUrl, qrSvg }) => (
          <QrCard
            key={obra.slug}
            titulo={obra.titulo}
            artista={obra.artista}
            tecnica={obra.tecnica}
            medidas={obra.medidas}
            anio={obra.anio}
            precioBase={precioFormat.format(obra.precioMinimoUsdc)}
            cierre={cierreFormat.format(new Date(obra.cierre))}
            qrSvg={qrSvg}
            displayUrl={displayUrl}
          />
        ))}
      </div>
    </>
  );
}

function QrCardsFallback() {
  return (
    <div className="qr-list grid gap-6" aria-label="Preparando cartelas">
      {[0, 1, 2].map((item) => (
        <div key={item} className="cartela h-72 animate-pulse p-6">
          <div className="h-4 w-32 rounded bg-linea" />
          <div className="mt-6 h-9 w-2/3 rounded bg-linea" />
          <div className="mt-4 h-4 w-1/2 rounded bg-linea" />
        </div>
      ))}
    </div>
  );
}

export default function QrPage() {
  return (
    <div className="qr-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="qr-screen-header flex flex-col gap-5 border-b border-linea pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="etiqueta">Impresión A4</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-tinta sm:text-5xl">
            Cartelas con <span className="italic text-malbec">QR</span> para la muestra
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-tinta-2 sm:text-base">
            Imprimí esta página en A4, recortá por las líneas punteadas y pegá una cartela al lado de cada obra.
            Cada QR abre la ficha correspondiente para ver la puja y ofertar.
          </p>
        </div>
        <div className="shrink-0 print:hidden">
          <PrintButton />
        </div>
      </header>

      <div className="mt-6">
        <Suspense fallback={<QrCardsFallback />}>
          <PrintableQrCards />
        </Suspense>
      </div>
    </div>
  );
}
