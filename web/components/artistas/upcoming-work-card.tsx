import Image from "next/image";
import { T, TranslatedAttributes } from "@/components/language-switch";
import type { Artista } from "@/lib/data";

type UpcomingWork = NonNullable<Artista["proximas"]>[number];

export function UpcomingWorkCard({ obra, artista }: { obra: UpcomingWork; artista: string }) {
  return (
    <figure data-entrada>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-cal-2">
        <TranslatedAttributes>
          <Image src={obra.imagen} alt={obra.alt} fill sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw" className="object-contain" />
        </TranslatedAttributes>
      </div>
      <figcaption className="pt-4">
        <p className="etiqueta !text-malbec"><T>Próximamente</T></p>
        <h3 className="mt-2 font-serif text-3xl leading-tight">{obra.titulo}</h3>
        <p className="mt-1 text-sm">{artista} · <T>{obra.ficha}</T></p>
        <a href={obra.fuente} className="mt-2 inline-block text-xs text-tinta-2 underline underline-offset-4"><T>{obra.credito}</T></a>
      </figcaption>
    </figure>
  );
}
