import { AcequiaDivisor } from "@/components/brand/acequia";
import { T } from "@/components/language-switch";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArtistaRetrato } from "@/components/artistas/artista-marca";
import { disciplinaDe } from "@/components/artistas/artista-utils";
import { UpcomingWorkCard } from "@/components/artistas/upcoming-work-card";
import { ArtistWorkCard } from "@/components/artistas/artist-work-card";
import { getArtista, getArtistas, getDeploy } from "@/lib/data";

export function generateStaticParams() {
  return getArtistas().map((artista) => ({ slug: artista.slug }));
}

export async function generateMetadata({ params }: PageProps<"/artistas/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const artista = getArtista(slug);
  if (!artista) return { title: "Artista no encontrada" };
  return {
    title: artista.nombre,
    description: `${artista.nombre} en Artemi: biografía y selección de obras.`,
  };
}

export default function ArtistaPage({ params }: PageProps<"/artistas/[slug]">) {
  return (
    <Suspense fallback={<ArtistaSkeleton />}>
      <FichaArtista params={params} />
    </Suspense>
  );
}

function ArtistaSkeleton() {
  return (
    <div className="contenedor pb-16 pt-8 sm:pt-10" aria-busy="true">
      <div className="h-4 w-24 animate-pulse bg-linea/70" />
      <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="aspect-[4/3] animate-pulse bg-linea/50" />
        <div>
          <div className="h-4 w-32 animate-pulse bg-linea/70" />
          <div className="mt-4 h-14 w-2/3 animate-pulse bg-linea/50" />
          <div className="mt-5 h-24 max-w-xl animate-pulse bg-linea/40" />
        </div>
      </div>
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="aspect-[4/3] animate-pulse bg-linea/40" />
        ))}
      </div>
    </div>
  );
}

async function FichaArtista({ params }: { params: PageProps<"/artistas/[slug]">["params"] }) {
  const { slug } = await params;
  const artista = getArtista(slug);
  if (!artista) notFound();

  const { subastas } = getDeploy();
  const total = artista.obras.length;

  return (
    <div className="contenedor pb-16 pt-8 sm:pt-10">
      <Link
        href="/artistas"
        className="etiqueta inline-flex min-h-11 items-center gap-2 !text-malbec transition-colors hover:!text-tinta"
      >
        <span aria-hidden="true">←</span> <T>Artistas</T>
      </Link>

      <header className="mt-6 grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-end">
        <ArtistaRetrato
          artista={artista}
          preload
          sizes="(max-width: 768px) calc(100vw - 2.5rem), 38vw"
          className="w-full"
        />
        <div className="min-w-0">
          <p className="etiqueta !text-malbec"><T>Quién crea</T></p>
          <h1 className="mt-3 text-balance font-serif text-5xl leading-[0.95] tracking-tight text-malbec sm:text-6xl lg:text-7xl">
            {artista.nombre}
          </h1>
          <p className="mt-4 text-lg font-semibold leading-snug text-tinta sm:text-xl"><T>{disciplinaDe(artista)}</T></p>
          <T>{artista.origen && <p className="mt-1 text-sm leading-relaxed text-tinta-2 sm:text-base"><T>{artista.origen}</T></p>}</T>
          <p className="mt-4 max-w-[44ch] text-base leading-relaxed text-tinta sm:text-lg"><T>{artista.bio}</T></p>
          <T>{artista.referencia && <a href={artista.referencia} className="sala-texto"><T>Leer más en Cultura Mendoza</T></a>}</T>
          <T>{artista.fuenteRetrato && artista.creditoRetrato && (
            <a href={artista.fuenteRetrato} className="mt-4 block text-xs text-tinta-2 underline underline-offset-4">
              <T>{artista.creditoRetrato}</T>
            </a>
          )}</T>
          <p className="mt-5 text-sm font-medium text-tinta-2">
            <T>{total === 0 ? "Archivo de artistas" : total === 1 ? "1 obra en subasta" : `${total} obras en subasta`}</T>
          </p>
        </div>
      </header>

      <section aria-labelledby="obras-artista" className="mt-10 border-t border-malbec pt-9">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="etiqueta !text-malbec"><T>Colección</T></p>
            <AcequiaDivisor />
            <h2 id="obras-artista" className="mt-3 text-balance font-serif text-4xl leading-tight tracking-tight text-tinta sm:text-5xl">
              <T>Obras de</T> {artista.nombre}
            </h2>
          </div>
          <Link
            href="/muestra"
            className="inline-flex min-h-11 items-center self-start font-semibold text-malbec underline decoration-malbec/70 underline-offset-4 transition-colors hover:text-malbec-2 hover:decoration-malbec-2"
          >
            <T>Ver toda la muestra</T>
          </Link>
        </div>

        {total === 0 && !artista.proximas?.length ? (
          <div className="mt-9 border-t border-malbec pt-8">
            <p className="font-serif text-2xl text-tinta"><T>Todavía no hay obras publicadas.</T></p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-tinta-2">
              <T>Podés seguir el recorrido por las obras disponibles en la muestra.</T>
            </p>
          </div>
        ) : total > 0 && (
          <ul className="mt-9 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {artista.obras.map((obra) => (
              <li key={obra.slug}>
                <ArtistWorkCard obra={obra} auctionId={subastas[obra.slug]} />
              </li>
            ))}
          </ul>
        )}
        {!!artista.proximas?.length && (
          <ul className="mt-9 grid gap-8 sm:grid-cols-2 lg:max-w-5xl">
            {artista.proximas.map(obra => (
              <li key={obra.titulo}><UpcomingWorkCard obra={obra} artista={artista.nombre} /></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
