import type { Metadata } from "next";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { Suspense } from "react";
import { PrintButton } from "@/components/print-button";
import { getObras } from "@/lib/data";

export const metadata: Metadata = {
  title: "QR para imprimir",
};

const LOCAL_HOST = /^(localhost|127\.|192\.168\.|10\.|\[::1\])/;

// The QR codes point at whatever host serves this page, so print it from the public (HTTPS) URL.
async function siteOrigin(): Promise<{ origin: string; local: boolean }> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const local = LOCAL_HOST.test(host);
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return { origin: `${protocol}://${host}`, local };
}

async function QrSheet() {
  const { origin, local } = await siteOrigin();
  const codes = await Promise.all(
    getObras().map(async (obra) => {
      const url = `${origin}/obra/${obra.slug}`;
      const svg = await QRCode.toString(url, {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: "#1e1b18", light: "#ffffff" },
      });
      return { obra, url, svg };
    }),
  );

  return (
    <>
      {local && (
        <p role="alert" className="border-l-2 border-ocre bg-papel px-3 py-2 text-sm text-tinta-2 print:hidden">
          Estás abriendo esta hoja desde <code>{origin}</code>, y otro celular no va a poder entrar ahí. Para
          imprimir, abrila desde la URL pública del sitio.
        </p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-0">
        {codes.map(({ obra, url, svg }) => (
          <li
            key={obra.slug}
            className="flex break-inside-avoid flex-col items-center gap-3 border border-dashed border-piedra bg-white p-6 text-center"
          >
            <div
              role="img"
              aria-label={`Código QR de ${obra.titulo}`}
              className="w-44 [&>svg]:h-auto [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <div className="flex flex-col gap-1">
              <p className="font-serif text-xl leading-snug italic">{obra.titulo}</p>
              <p className="text-sm">
                <span className="font-semibold">{obra.artista}</span>, {obra.anio}
              </p>
              <p className="text-sm text-tinta-2">Escaneá para ver la obra y ofertar en USDC.</p>
              <p className="font-mono text-xs break-all text-piedra">{url}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function QrPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 print:max-w-none print:p-0">
      <header className="flex flex-col gap-3 print:hidden">
        <h1 className="font-serif text-4xl leading-tight">QR para imprimir</h1>
        <p className="text-tinta-2">
          Un QR por obra. Cada uno abre la ficha de la obra en el celular, sin instalar nada. Recortalos por la línea
          punteada y pegalos al lado de cada obra.
        </p>
        <PrintButton />
      </header>
      <Suspense fallback={<p className="text-sm text-tinta-2">Generando los QR…</p>}>
        <QrSheet />
      </Suspense>
    </div>
  );
}
