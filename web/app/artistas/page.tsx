import { AcequiaDivisor } from "@/components/brand/acequia";
import { T, TranslatedAttributes } from "@/components/language-switch";
import type { Metadata } from "next";
import { ArtistCard } from "@/components/artistas/artist-card";
import { getArtistas } from "@/lib/data";

export const metadata: Metadata = {
  title: "Artistas",
  description: "Conocé a las artistas de Artemi y las obras que subastan en vivo durante la muestra.",
};

export default function ArtistasPage() {
  const artistas = getArtistas();

  return (
    <div className="contenedor pb-16 pt-8 sm:pt-10">
      <header className="border-b border-malbec pb-7">
        <div className="md:flex md:items-end md:justify-between md:gap-10">
          <div>

            <h1 className="mt-3 text-balance font-serif text-5xl leading-[0.95] tracking-tight text-malbec sm:text-6xl lg:text-7xl">
              <T>Artistas de Mendoza</T>
            </h1>
            <AcequiaDivisor />
          </div>
          <p className="mt-4 max-w-[31rem] text-lg leading-relaxed text-tinta md:mt-0 md:pb-2 md:text-right md:text-xl">
            <T>Recorré la muestra y el archivo de artistas vinculados a Mendoza.</T>
          </p>
        </div>
      </header>

      {artistas.length === 0 ? (
        <section className="border-b border-malbec py-12" aria-labelledby="sin-artistas">
          <h2 id="sin-artistas" className="font-serif text-3xl text-tinta">
            <T>Todavía no hay fichas de artistas.</T>
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-tinta-2">
            <T>Cuando se publique la muestra, cada artista aparecerá acá con sus obras.</T>
          </p>
        </section>
      ) : (
        <TranslatedAttributes><section aria-label="Perfiles de artistas" className="mt-8 border-b border-malbec pb-8">
          <ul className={artistas.length === 1 ? "max-w-4xl" : "grid gap-x-10 gap-y-12 md:grid-cols-2"}>
            {artistas.map((artista, index) => (
              <li
                key={artista.slug}
                className={index === 0 ? "" : "border-t border-malbec pt-10 md:border-t-0 md:pt-0"}
              >
                <ArtistCard artista={artista} index={index} />
              </li>
            ))}
          </ul>
        </section></TranslatedAttributes>
      )}
    </div>
  );
}
