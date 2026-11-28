import { T, TranslatedAttributes } from "@/components/language-switch";
import Image from "next/image";
import Link from "next/link";
import type { ArtistaConObras } from "@/lib/data";
import { ArtistaRetrato } from "./artista-marca";
import { disciplinaDe } from "./artista-utils";

export function ArtistCard({ artista, index = 0 }: { artista: ArtistaConObras; index?: number }) {
  const obrasVisibles = artista.obras.slice(0, 2);
  const startsRow = index % 3 === 0;

  return (
    <article data-entrada className="flex h-full flex-col sm:grid sm:grid-cols-[minmax(8rem,0.85fr)_1fr] sm:items-start sm:gap-7">
      <ArtistaRetrato
        artista={artista}
        preload={index === 0}
        sizes="(max-width: 768px) calc(100vw - 2.5rem), (max-width: 1728px) 29vw, 458px"
      />
      <div
        className={`mt-7 flex flex-1 flex-col ${
          startsRow
            ? ""
            : "md:relative md:before:absolute md:before:-left-5 md:before:top-0 md:before:h-full md:before:w-px md:before:bg-malbec"
        }`}
      >
        <h2 className="font-serif text-4xl leading-none tracking-tight text-malbec sm:text-5xl">{artista.nombre}</h2>
        <p className="mt-3 text-lg font-semibold leading-snug text-tinta"><T>{disciplinaDe(artista)}</T></p>
        <p className="mt-3 max-w-[42ch] text-base leading-relaxed text-tinta sm:text-lg"><T>{artista.bio}</T></p>
        <Link
          href={`/artistas/${artista.slug}`}
          className="mt-3 inline-flex min-h-11 items-center gap-2 self-start font-semibold text-malbec underline decoration-malbec/70 underline-offset-4 transition-colors hover:text-malbec-2 hover:decoration-malbec-2"
        >
          <T>Ver perfil</T> <span aria-hidden="true">→</span>
        </Link>

        {obrasVisibles.length > 0 && (
          <ul className="mt-5 grid grid-cols-2 gap-3">
            {obrasVisibles.map((obra) => (
              <li key={obra.slug}>
                <Link
                  href={`/obra/${obra.slug}`}
                  className="group relative block aspect-[4/3] overflow-hidden rounded-lg bg-cal-2 transition-colors hover:bg-linea"
                >
                  <TranslatedAttributes><Image
                    src={obra.imagen}
                    alt={obra.titulo}
                    fill
                    sizes="(max-width: 768px) 43vw, (max-width: 1728px) 14vw, 220px"
                    unoptimized={obra.imagen.endsWith(".svg")}
                    className="object-contain transition-opacity group-hover:opacity-90"
                  /></TranslatedAttributes>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
