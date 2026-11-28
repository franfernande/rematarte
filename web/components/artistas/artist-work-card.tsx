import { T, TranslatedAttributes } from "@/components/language-switch";
import Image from "next/image";
import Link from "next/link";
import { AuctionBadge } from "@/components/auction/auction-badge";
import type { Obra } from "@/lib/data";

export function ArtistWorkCard({ obra, auctionId }: { obra: Obra; auctionId?: number }) {
  return (
    <article className="h-full">
      <Link href={`/obra/${obra.slug}`} className="group block">
        <div className="relative aspect-[4/3] overflow-hidden bg-cal-2">
          <TranslatedAttributes><Image
            src={obra.imagen}
            alt={`${obra.titulo}, de ${obra.artista}`}
            fill
            sizes="(max-width: 640px) calc(100vw - 2.5rem), (max-width: 1024px) 45vw, 30vw"
            unoptimized={obra.imagen.endsWith(".svg")}
            className="object-contain"
          /></TranslatedAttributes>
        </div>
        <div className="mt-4">
          <h3 className="font-serif text-3xl leading-tight tracking-tight text-tinta transition-colors group-hover:text-malbec">
            {obra.titulo}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-tinta-2 sm:text-base">
            <T>{obra.tecnica}</T> · {obra.anio}
          </p>
        </div>
      </Link>
      <div className="mt-4 border-t border-malbec/60 pt-3">
        {obra.reproduccion && <p className="etiqueta mb-2"><T>Subasta de demostración · Stellar Testnet</T></p>}
        {auctionId === undefined ? (
          <p className="text-sm text-piedra"><T>Subasta todavía no publicada</T></p>
        ) : (
          <AuctionBadge auctionId={auctionId} />
        )}
      </div>
    </article>
  );
}
