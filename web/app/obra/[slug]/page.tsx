import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AuctionPanel } from "@/components/auction/auction-panel";
import { ObraArte } from "@/components/obra-arte";
import { dataSources, getDeploy, getObra, getObras } from "@/lib/data";
import { accountUrl } from "@/lib/format";

const cierreLargo = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Mendoza",
});

export function generateStaticParams() {
  return getObras().map((obra) => ({ slug: obra.slug }));
}

export async function generateMetadata({ params }: PageProps<"/obra/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const obra = getObra(slug);
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
    <div className="mx-auto w-full max-w-6xl px-5 pb-10 pt-6 sm:pt-10" aria-busy="true">
      <div className="etiqueta min-h-11">La muestra</div>
      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-14">
        <div className="aspect-[4/5] max-h-[640px] animate-pulse rounded-sm bg-cal-2/70" />
        <div className="cartela h-96 animate-pulse" />
      </div>
    </div>
  );
}

async function Ficha({ params }: { params: PageProps<"/obra/[slug]">["params"] }) {
  const { slug } = await params;
  const obra = getObra(slug);
  if (!obra) notFound();

  const { subastas, auctionContractId } = getDeploy();
  const auctionId = subastas[obra.slug];
  const usingMocks = dataSources.obras === "mock";

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-10 pt-6 sm:pt-10">
      <Link href="/#muestra" className="etiqueta inline-flex min-h-11 items-center gap-2 transition-colors hover:!text-tinta">
        <span aria-hidden>←</span> La muestra
      </Link>

      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-14">
        <section aria-label="La obra" className="animate-aparecer">
          <div className="relative rounded-sm bg-cal-2/60 px-6 py-10 sm:px-12 sm:py-14">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(255,240,210,0.7),transparent)]" />
            <div className="marco relative mx-auto max-w-md">
              <div className="paspartu">
                <div className="aspect-[4/5] overflow-hidden">
                  <ObraArte obra={obra} />
                </div>
              </div>
            </div>
          </div>

          <div className="cartela mx-auto -mt-6 max-w-md px-5 py-4 sm:ml-12 sm:mr-auto">
            <h1 className="font-serif text-3xl italic leading-tight sm:text-4xl">{obra.titulo}</h1>
            <p className="mt-1 font-medium">{obra.artista}</p>
            <p className="text-sm text-tinta-2">
              {obra.tecnica} · {obra.medidas} · {obra.anio}
            </p>
            {obra.descripcion && <p className="mt-3 border-t border-linea pt-3 text-sm leading-relaxed text-tinta-2">{obra.descripcion}</p>}
            {usingMocks && <p className="etiqueta mt-3 !text-ocre">Obra de ejemplo · ilustración</p>}
          </div>
        </section>

        <aside aria-label="Subasta" className="lg:sticky lg:top-24 lg:self-start">
          {auctionId === undefined ? (
            <div className="cartela px-6 py-8">
              <p className="etiqueta">Subasta</p>
              <p className="mt-3 font-serif text-2xl">Esta obra todavía no tiene subasta publicada.</p>
            </div>
          ) : (
            <>
              <AuctionPanel auctionId={auctionId} titulo={obra.titulo} />
              <dl className="mt-5 grid gap-4 border-t border-linea pt-5 text-sm leading-relaxed text-tinta-2">
                <div>
                  <dt className="etiqueta">Cómo se reparte</dt>
                  <dd className="mt-1">
                    Al liquidar, el {obra.porcentajeArtista} % va a la artista y el {100 - obra.porcentajeArtista} % al
                    espacio. El porcentaje se fijó antes de empezar y no se puede cambiar.
                  </dd>
                </div>
                <div>
                  <dt className="etiqueta">Cierre previsto</dt>
                  <dd className="mt-1 first-letter:uppercase">
                    {cierreLargo.format(new Date(obra.cierre))}. Si alguien oferta en los últimos 5 minutos, el cierre se corre 5
                    minutos más.
                  </dd>
                </div>
                <div>
                  <dt className="etiqueta">Verificable</dt>
                  <dd className="mt-1">
                    Todo lo de esta subasta se puede auditar en{" "}
                    <a
                      href={accountUrl(auctionContractId)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-malbec underline decoration-malbec/30 underline-offset-4 hover:decoration-malbec"
                    >
                      el contrato en stellar.expert
                    </a>
                    .
                  </dd>
                </div>
              </dl>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
