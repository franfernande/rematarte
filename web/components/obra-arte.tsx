import { TranslatedAttributes } from "@/components/language-switch";
import Image from "next/image";
import type { Obra } from "@/lib/data";

export function ObraArte({ obra, className, priority = false }: { obra: Obra; className?: string; priority?: boolean }) {
  return (
    <TranslatedAttributes><Image
      src={obra.imagen}
      alt={obra.alt ?? `${obra.titulo}, de ${obra.artista}`}
      fill
      preload={priority}
      sizes={priority ? "(max-width: 767px) 88vw, 44vw" : "(max-width: 639px) 92vw, 42vw"}
      unoptimized={obra.imagen.endsWith(".svg")}
      className={`object-contain ${className ?? ""}`}
    /></TranslatedAttributes>
  );
}
