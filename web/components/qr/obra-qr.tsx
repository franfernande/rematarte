import { T, TranslatedAttributes } from "@/components/language-switch";
import { headers } from "next/headers";
import { qrSvgForUrl } from "@/lib/qr";

type ObraQrProps = {
  slug: string;
  titulo: string;
};

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

function UrlWithBreaks({ value }: { value: string }) {
  const parts = value.split(/([\/\-?=&.])/g);
  return (
    <>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`}>
          <T>{part}</T>
          {/^[\/\-?=&.]$/.test(part) && <wbr />}
        </span>
      ))}
    </>
  );
}

export async function ObraQr({ slug, titulo }: ObraQrProps) {
  const base = await requestBaseUrl();
  const absoluteUrl = `${base}/obra/${slug}?ref=qr`;
  const displayUrl = absoluteUrl.replace(/^https?:\/\//, "");
  const qrSvg = await qrSvgForUrl(absoluteUrl);

  return (
    <div className="cartela animate-aparecer p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <TranslatedAttributes><div
          className="aspect-square w-28 shrink-0 rounded-sm border border-linea bg-white p-2 sm:w-36 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
          role="img"
          aria-label={`Código QR de la subasta de ${titulo}`}
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        /></TranslatedAttributes>
        <div className="min-w-0 flex-1">
          <p className="etiqueta !text-ocre"><T>QR de la obra</T></p>
          <p className="mt-2 font-serif text-xl leading-tight text-tinta"><T>{titulo}</T></p>
          <p className="mt-2 text-sm leading-relaxed text-tinta-2"><T>Escaneá para seguir la puja desde tu celu</T></p>
          <p className="mt-3 break-words font-mono text-[0.68rem] leading-relaxed text-piedra">
            <UrlWithBreaks value={displayUrl} />
          </p>
        </div>
      </div>
    </div>
  );
}

export function ObraQrFallback() {
  return (
    <TranslatedAttributes><div className="cartela p-4 sm:p-5" aria-label="Preparando código QR">
      <div className="flex items-start gap-4">
        <div className="aspect-square w-28 shrink-0 animate-pulse rounded-sm bg-linea/50 sm:w-36" />
        <div className="min-w-0 flex-1 animate-pulse">
          <div className="h-3 w-24 rounded-sm bg-linea/60" />
          <div className="mt-3 h-6 w-4/5 rounded-sm bg-linea/50" />
          <div className="mt-3 h-4 w-full rounded-sm bg-linea/45" />
          <div className="mt-3 h-3 w-2/3 rounded-sm bg-linea/40" />
        </div>
      </div>
    </div></TranslatedAttributes>
  );
}
