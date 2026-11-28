import { GalleryDate, T, TranslatedAttributes } from "@/components/language-switch";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AuctionPanel } from "@/components/auction/auction-panel";
import { ObraArte } from "@/components/obra-arte";
import { ObraQr, ObraQrFallback } from "@/components/qr/obra-qr";
import { getArtistaSlugForObra, getDeploy, getObra, getObras, getSubastas } from "@/lib/data";
import { accountUrl } from "@/lib/format";

export async function generateStaticParams() {
  return (await getObras()).map((obra) => ({ slug: obra.slug }));
}

export async function generateMetadata({ params }: PageProps<"/obra/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const obra = await getObra(slug);
  if (!obra) return { title: "Obra no encontrada" };
  return {
    title: obra.titulo,
    description: `${obra.titulo}, de ${obra.artista}. Subasta en vivo con USDC en Stellar: ofertá desde el celu.`,
  };
}

export default function ObraPage({ params }: PageProps<"/obra/[slug]">) {
  return (
    <Suspense fallback={<FichaSkeleton />}>
      <Ficha params={params} />
    </Suspense>
  );
}

function FichaSkeleton() {
  return (
    <div className="contenedor pb-10 pt-2" aria-busy="true">
      <div className="etiqueta min-h-11"><T>La muestra</T></div>
      <div className="obra-disposicion">
        <div className="obra-imagen obra-lienzo animate-pulse bg-cal-2" />
        <div className="obra-encabezado h-24 animate-pulse rounded-lg bg-cal-2" />
        <div className="obra-puja cartela h-80 animate-pulse" />
      </div>
    </div>
  );
}

async function Ficha({ params }: { params: PageProps<"/obra/[slug]">["params"] }) {
  const { slug } = await params;
  const obra = await getObra(slug);
  if (!obra) notFound();

  const { auctionContractId } = getDeploy();
  const subastas = await getSubastas();
  const auctionId = subastas[obra.slug];
  const artistaSlug = await getArtistaSlugForObra(obra);

  return (
    <div className="contenedor pb-8 pt-2 sm:pt-4">
      <Link href="/muestra" className="etiqueta inline-flex min-h-11 items-center gap-2 hover:!text-tinta">
        <span aria-hidden>←</span> <T>La muestra</T>
      </Link>

      <div className="obra-disposicion obra-ficha">
        <div className="obra-columna">
          <figure className="obra-imagen min-w-0">
            <div className="obra-lienzo"><ObraArte obra={obra} priority /></div>
            <figcaption>
              <a className="inline-flex min-h-11 items-center text-sm text-malbec underline underline-offset-4" href={obra.imagen} target="_blank" rel="noreferrer">
                <T>Ampliá la imagen</T><span className="sr-only"> <T>(nueva pestaña)</T></span>
              </a>
            </figcaption>
          </figure>
          {auctionId !== undefined && (
            <div className="obra-enlaces divide-y divide-linea border-y border-linea">
              <details className="pb-1">
                <summary className="obra-resumen"><T>Detalles de la subasta</T></summary>
                <dl className="mb-4 grid gap-3 text-sm leading-relaxed text-tinta-2">
                  <div>
                    <dt className="etiqueta"><T>Cómo se reparte</T></dt>
                    <dd className="mt-1">
                      <T>Al liquidar, el</T> {obra.porcentajeArtista} <T>% va a la cuenta de artista y el</T> {100 - obra.porcentajeArtista} <T>% al
                      espacio. El porcentaje se fijó antes de empezar y no se puede cambiar.</T>
                    </dd>
                  </div>
                  <div>
                    <dt className="etiqueta"><T>Cierre previsto</T></dt>
                    <dd className="mt-1 first-letter:uppercase">
                      <GalleryDate iso={obra.cierre} full /><T>. Si alguien oferta en los últimos 5 minutos, el cierre se corre 5
                      minutos más.</T>
                    </dd>
                  </div>
                  <div>
                    <dt className="etiqueta"><T>Verificación en Stellar</T></dt>
                    <dd className="mt-1">
                      <T>Todo lo de esta subasta se puede auditar en</T>{" "}
                      <a
                        href={accountUrl(auctionContractId)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-malbec underline decoration-malbec/30 underline-offset-4 hover:decoration-malbec"
                      >
                        <T>el contrato en stellar.expert</T>
                      </a>
                      .
                    </dd>
                  </div>
                </dl>
              </details>
              <details>
                <summary className="obra-resumen"><T>Compartí esta obra</T></summary>
                <div className="max-w-md pb-4">
                  <Suspense fallback={<ObraQrFallback />}><ObraQr slug={obra.slug} titulo={obra.titulo} /></Suspense>
                </div>
              </details>
            </div>
          )}
          <section className="obra-notas border-t border-malbec pt-4" aria-labelledby="ficha-obra">
            <h2 id="ficha-obra" className="font-serif text-2xl"><T>Sobre la obra</T></h2>
            {obra.descripcion && <p className="mt-3 max-w-prose leading-relaxed text-tinta-2"><T>{obra.descripcion}</T></p>}
            {obra.reproduccion && (
              <div className="mt-3 text-sm text-tinta-2">
                <a className="underline underline-offset-4" href={obra.reproduccion.catalogo}><T>{obra.reproduccion.coleccion}</T> · Inv. {obra.reproduccion.inventario}</a>
                <p className="mt-1 text-xs"><a href={obra.reproduccion.fuente} className="underline underline-offset-2"><T>{obra.reproduccion.credito}</T></a> · <T>{obra.reproduccion.licencia}</T></p>
              </div>
            )}
          </section>
        </div>
        <div className="obra-columna">
          <header className="obra-encabezado min-w-0">
            <h1 id="obra-titulo" className="break-words text-balance font-serif text-[clamp(1.75rem,5vw,3.8rem)] leading-[.99] tracking-tight">{obra.titulo}</h1>
            <Link href={`/artistas/${artistaSlug}`} className="inline-flex min-h-11 items-center font-medium underline decoration-tinta/30 underline-offset-4 hover:text-malbec">{obra.artista}</Link>
            <p className="text-sm text-tinta-2"><T>{obra.tecnica}</T> · {obra.medidas} · {obra.anio}</p>
          </header>
          <TranslatedAttributes><aside id="ofertar" aria-label="Subasta" className="obra-puja min-w-0 scroll-mt-32">
            {obra.reproduccion && <p className="demo-note"><T>Subasta de demostración · Stellar Testnet</T></p>}
            {auctionId === undefined ? (
              <p className="border-t border-linea py-4 font-serif text-2xl"><T>Esta obra todavía no tiene subasta publicada.</T></p>
            ) : <AuctionPanel auctionId={auctionId} titulo={obra.titulo} />}
          </aside></TranslatedAttributes>
        </div>
      </div>
    </div>
  );
}
