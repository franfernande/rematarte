import { T, TranslatedAttributes } from "@/components/language-switch";
import Image from "next/image";
import type { Artista } from "@/lib/data";

function initialsFor(nombre: string): string {
  const words = nombre.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "A";
  const first = words[0]?.[0] ?? "A";
  const last = words.length > 1 ? words[words.length - 1]?.[0] : "";
  return `${first}${last}`.toUpperCase();
}

export function ArtistaRetrato({
  artista,
  className = "",
  sizes = "(max-width: 768px) 100vw, 33vw",
  preload = false,
}: {
  artista: Artista;
  className?: string;
  sizes?: string;
  preload?: boolean;
}) {
  if (artista.imagen) {
    return (
      <div className={`relative aspect-[4/3] overflow-hidden bg-cal-2 ${className}`}>
        <TranslatedAttributes><Image
          src={artista.imagen}
          alt={`Retrato de ${artista.nombre}`}
          fill
          sizes={sizes}
          preload={preload}
          className="object-contain"
        /></TranslatedAttributes>
      </div>
    );
  }

  return (
    <TranslatedAttributes><div
      role="img"
      aria-label={`Monograma de ${artista.nombre}`}
      className={`relative aspect-[4/3] overflow-hidden bg-cal-2 text-malbec ${className}`}
    >
      <div className="flex h-full items-center justify-center">
        <span aria-hidden="true" className="font-serif text-7xl leading-none tracking-tight sm:text-8xl">
          <T>{initialsFor(artista.nombre)}</T>
        </span>
      </div>
      <span
        aria-hidden="true"
        className="absolute bottom-3 left-3 font-sans text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-malbec"
      >
        <T>Monograma</T>
      </span>
    </div></TranslatedAttributes>
  );
}
