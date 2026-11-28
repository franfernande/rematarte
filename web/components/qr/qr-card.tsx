type QrCardProps = {
  titulo: string;
  artista: string;
  tecnica: string;
  medidas: string;
  anio: number;
  precioBase: string;
  cierre: string;
  qrSvg: string;
  displayUrl: string;
};

export function QrCard({
  titulo,
  artista,
  tecnica,
  medidas,
  anio,
  precioBase,
  cierre,
  qrSvg,
  displayUrl,
}: QrCardProps) {
  return (
    <article className="qr-card cartela animate-aparecer p-5 sm:p-7">
      <div className="qr-card-main flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="etiqueta">Cartela de subasta</p>
          <h2 className="mt-3 font-serif text-3xl italic leading-tight text-malbec sm:text-4xl">{titulo}</h2>
          <p className="mt-2 text-base font-semibold text-tinta">{artista}</p>
          <p className="mt-1 text-sm leading-relaxed text-tinta-2">
            {tecnica} · {medidas} · {anio}
          </p>

          <div className="mt-5 border-t border-linea pt-4">
            <p className="flex items-center gap-2 text-sm font-medium text-tinta">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-ocre animate-latido" />
              Subasta en vivo · cierra {cierre}
            </p>
            <p className="mt-2 font-serif text-2xl text-tinta">
              Precio base <span className="italic text-malbec">{precioBase} USDC</span>
            </p>
          </div>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-tinta-2">
            Escaneá con la cámara del celu para ver la puja y ofertar.
          </p>
        </div>

        <figure className="qr-figure mx-auto flex w-full max-w-56 shrink-0 flex-col items-center sm:mx-0 sm:max-w-64">
          <div
            className="qr-svg w-full rounded-sm border border-linea bg-white p-2"
            role="img"
            aria-label={`Código QR de la subasta de ${titulo}`}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <figcaption className="mt-3 w-full break-all text-center font-mono text-[0.68rem] leading-relaxed text-tinta-2">
            {displayUrl}
          </figcaption>
        </figure>
      </div>

      <footer className="mt-6 border-t border-linea pt-3 text-xs tracking-wide text-piedra">
        Artemi · Stellar Testnet · USDC de prueba
      </footer>
    </article>
  );
}
