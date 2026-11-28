import { GalleryDate, T, TranslatedAttributes } from "@/components/language-switch";
type QrCardProps = {
  titulo: string;
  artista: string;
  tecnica: string;
  medidas: string;
  anio: number;
  precioBase: string;
  cierre: string;
  reproduccion?: boolean;
  qrSvg: string;
  displayUrl: string;
};

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

export function QrCard({
  titulo,
  artista,
  tecnica,
  medidas,
  anio,
  precioBase,
  cierre,
  reproduccion,
  qrSvg,
  displayUrl,
}: QrCardProps) {
  return (
    <article className="qr-card cartela animate-aparecer p-5 sm:p-7">
      <div className="qr-card-main flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="etiqueta"><T>{reproduccion ? "Subasta de demostración · Stellar Testnet" : "Cartela de subasta"}</T></p>
          <h2 className="mt-3 font-serif text-3xl italic leading-tight text-malbec sm:text-4xl"><T>{titulo}</T></h2>
          <p className="mt-2 text-base font-semibold text-tinta"><T>{artista}</T></p>
          <p className="mt-1 text-sm leading-relaxed text-tinta-2">
            <T>{tecnica}</T> · <T>{medidas}</T> · {anio}
          </p>

          <div className="mt-5 border-t border-linea pt-4">
            <p className="flex items-center gap-2 text-sm font-medium text-tinta">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-ocre animate-latido" />
              <T>Cierre previsto ·</T> <GalleryDate iso={cierre} />
            </p>
            <p className="mt-2 font-serif text-2xl text-tinta">
              <T>Precio base</T> <span className="italic text-malbec"><T>{precioBase}</T> USDC</span>
            </p>
          </div>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-tinta-2">
            <T>Escaneá con la cámara del celu para ver la puja y ofertar.</T>
          </p>
        </div>

        <figure className="qr-figure mx-auto flex w-full max-w-56 shrink-0 flex-col items-center sm:mx-0 sm:max-w-64">
          <TranslatedAttributes><div
            className="qr-svg w-full rounded-sm border border-linea bg-white p-2"
            role="img"
            aria-label={`Código QR de la subasta de ${titulo}`}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          /></TranslatedAttributes>
          <figcaption className="mt-3 w-full break-words text-center font-mono text-[0.68rem] leading-relaxed text-tinta-2">
            <UrlWithBreaks value={displayUrl} />
          </figcaption>
        </figure>
      </div>

      <footer className="mt-6 border-t border-linea pt-3 text-xs tracking-wide text-piedra">
        <T>Artemi · Stellar Testnet · USDC de prueba</T>
      </footer>
    </article>
  );
}
