import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuctionPanel } from "@/components/auction-panel";
import { getDeploy, getObra, getObras } from "@/lib/data";
import { auctionIdFor } from "@/lib/stellar";

// Cache Components has no dynamicParams, so unknown slugs render on demand and fall into notFound().
export function generateStaticParams() {
  return getObras().map((obra) => ({ slug: obra.slug }));
}

export async function generateMetadata({ params }: PageProps<"/obra/[slug]">): Promise<Metadata> {
  const obra = getObra((await params).slug);
  if (!obra) return {};
  return {
    title: obra.titulo,
    description: `${obra.titulo}, de ${obra.artista}. Ofertá en USDC desde el celu.`,
  };
}

export default async function ObraPage({ params }: PageProps<"/obra/[slug]">) {
  const { slug } = await params;
  const obra = getObra(slug);
  if (!obra) notFound();

  const deploy = getDeploy();
  const auctionId = auctionIdFor(deploy, slug);

  return (
    <article className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 md:grid-cols-[3fr_2fr] md:items-start md:gap-10 md:py-10">
      <figure className="relative aspect-[4/3] max-h-[38svh] w-full bg-cal-2 md:sticky md:top-6 md:max-h-none">
        <Image
          src={obra.imagen}
          alt={`${obra.titulo}, de ${obra.artista}`}
          fill
          preload
          sizes="(min-width: 768px) 60vw, 100vw"
          unoptimized={obra.imagen.endsWith(".svg")}
          className="object-contain p-3 md:p-6"
        />
      </figure>

      <div className="flex flex-col gap-5 border border-linea bg-papel p-5 shadow-sm">
        <header className="flex flex-col gap-1">
          <h1 className="font-serif text-3xl leading-tight italic">{obra.titulo}</h1>
          <p>
            <span className="font-semibold">{obra.artista}</span>, {obra.anio}
          </p>
          <p className="text-sm text-tinta-2">
            {obra.tecnica}. {obra.medidas}.
          </p>
        </header>

        <div className="border-t border-linea pt-5">
          {auctionId === undefined ? (
            <p className="text-sm text-tinta-2">Esta obra todavía no tiene subasta en el contrato.</p>
          ) : (
            <AuctionPanel deploy={deploy} auctionId={auctionId} />
          )}
        </div>

        {obra.descripcion && (
          <section aria-labelledby="sobre-la-obra" className="flex flex-col gap-2 border-t border-linea pt-4">
            <h2 id="sobre-la-obra" className="font-serif text-xl">
              Sobre la obra
            </h2>
            <p className="font-serif text-lg leading-relaxed text-tinta-2">{obra.descripcion}</p>
          </section>
        )}
      </div>

      <Link href="/" className="text-sm text-malbec underline underline-offset-2 md:col-span-2">
        Ver toda la muestra
      </Link>
    </article>
  );
}
