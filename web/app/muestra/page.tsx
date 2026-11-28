import { AcequiaDivisor } from "@/components/brand/acequia";
import { T, TranslatedAttributes } from "@/components/language-switch";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuctionBadge } from "@/components/auction/auction-badge";
import { ObraArte } from "@/components/obra-arte";
import { ObraQr, ObraQrFallback } from "@/components/qr/obra-qr";
import { UpcomingWorkCard } from "@/components/artistas/upcoming-work-card";
import { getArtistas, getArtistaSlugForObra, getDeploy, getObras } from "@/lib/data";

const pasos = [
  {
    n: "01",
    titulo: "Escaneás el QR",
    texto: "La ficha abre en el celu, sin instalar nada: la obra, la puja actual y el cierre.",
  },
  {
    n: "02",
    titulo: "Ofertás en USDC",
    texto: "Tu oferta queda depositada en un contrato inteligente de Stellar, visible y verificable.",
  },
  {
    n: "03",
    titulo: "Si te superan, vuelve",
    texto: "El reembolso viaja en la misma transacción que la oferta nueva. Sin pedirlo, sin esperar.",
  },
  {
    n: "04",
    titulo: "Al cierre, se reparte",
    texto: "La artista y el espacio cobran con el porcentaje fijado antes de empezar.",
  },
];

export default function Home() {
  return (
    <Suspense fallback={<PortadaFallback />}>
      <Portada />
    </Suspense>
  );
}

function PortadaFallback() {
  return (
    <TranslatedAttributes><section className="sala-portada" aria-busy="true" aria-label="Cargando la muestra">
      <div className="contenedor sala-pared">
        <div className="sala-lamina animate-pulse bg-cal-2" />
        <div className="space-y-5" aria-hidden="true">
          <div className="h-4 w-36 bg-linea" />
          <div className="h-20 max-w-80 bg-cal-2" />
          <div className="h-4 max-w-64 bg-linea" />
        </div>
      </div>
    </section></TranslatedAttributes>
  );
}

async function obtenerPortada() {
  await connection();
  const ahora = Date.now();
  const obras = getObras();
  const { subastas } = getDeploy();
  const destacada =
    obras.find((obra) => obra.reproduccion?.inventario === "1664") ??
    obras.find((obra) => subastas[obra.slug] !== undefined && new Date(obra.cierre).getTime() > ahora) ?? obras[0];

  return { obras, subastas, destacada };
}

async function Portada() {
  const { obras, subastas, destacada } = await obtenerPortada();

  const proximas = getArtistas().flatMap(artista =>
    (artista.proximas ?? []).map(obra => ({ artista: artista.nombre, obra })),
  );

  if (!destacada) {
    return (
      <section className="contenedor py-20">
        <p className="etiqueta !text-malbec"><T>La muestra</T></p>
        <h1 className="mt-4 font-serif text-5xl leading-tight tracking-tight text-tinta"><T>Todavía no hay obras publicadas.</T></h1>
        <p className="mt-5 max-w-prose text-lg leading-relaxed text-tinta-2">
          <T>Cuando la muestra esté colgada, las obras van a aparecer acá con su puja actual.</T>
        </p>
      </section>
    );
  }

  const resto = obras.filter((obra) => obra.slug !== destacada.slug);
  const artistaDestacadaSlug = getArtistaSlugForObra(destacada);
  const auctionDestacada = subastas[destacada.slug];

  return (
    <>
      <section aria-labelledby="obra-destacada" className="sala-portada">
        <div className="contenedor sala-pared">
          <figure className="sala-pieza">
            <TranslatedAttributes><Link href={`/obra/${destacada.slug}`} className="sala-lamina" aria-label={`Mirá la obra: ${destacada.titulo}`}>
              <ObraArte obra={destacada} priority />
            </Link></TranslatedAttributes>
            <figcaption className="pie-lamina">
              <span><T>{destacada.artista}</T>, {destacada.anio}</span>
              <span><T>{destacada.tecnica}</T></span>
            </figcaption>
          </figure>
          <div className="sala-cartela">
            <p className="sala-folio"><T>{destacada.reproduccion ? `Muestra de ${destacada.artista}` : "La muestra"}</T></p>
            <h1 id="obra-destacada" className="sala-titulo"><T>{destacada.titulo}</T></h1>
            <p className="sala-descripcion"><T>{destacada.descripcion}</T></p>
            <div className="sala-enlaces">
              <Link className="sala-boton" href={`/obra/${destacada.slug}`}><T>Mirá la obra</T> <span aria-hidden="true">↗</span></Link>
              <Link className="sala-texto" href={`/artistas/${artistaDestacadaSlug}`}><T>Conocé al artista</T></Link>
            </div>
            <div className="sala-puja">
              {destacada.reproduccion && <p className="etiqueta mb-3"><T>Subasta de demostración · Stellar Testnet</T></p>}
              {auctionDestacada === undefined ? <p><T>Subasta todavía no publicada</T></p> : <AuctionBadge auctionId={auctionDestacada} />}
            </div>
          </div>
        </div>
      </section>

      <section id="muestra" aria-labelledby="muestra-titulo" className="contenedor scroll-mt-24 py-14 sm:py-20">
        <h2 id="muestra-titulo" className="font-serif text-4xl leading-none tracking-tight sm:text-6xl"><T>Recorré la muestra</T></h2>
            <AcequiaDivisor />
        {resto.length === 0 ? <p className="mt-6"><T>Por ahora, esta es la única obra en sala.</T></p> : (
          <ul className="sala-galeria">
            {resto.map((obra) => (
              <li data-entrada key={obra.slug} className="min-w-0">
                <Link href={`/obra/${obra.slug}`} className="group block">
                  <div className="sala-miniatura"><ObraArte obra={obra} /></div>
                  <p className="mt-4 text-sm text-tinta-2">{obra.artista}, {obra.anio}</p>
                  <h3 className="mt-1 font-serif text-3xl leading-tight group-hover:text-malbec sm:text-4xl">{obra.titulo}</h3>
                </Link>
                <div className="mt-5 border-t border-linea pt-3">
                  {obra.reproduccion && <p className="etiqueta mb-2"><T>Subasta de demostración · Stellar Testnet</T></p>}
                  {subastas[obra.slug] !== undefined ? <AuctionBadge auctionId={subastas[obra.slug]} /> : <p><T>Subasta todavía no publicada</T></p>}
                </div>
                <Link href={`/obra/${obra.slug}#ofertar`} className="sala-texto mt-2"><T>Ver ofertas</T><span className="sr-only"> <T>de</T> {obra.titulo}</span></Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {proximas.length > 0 && (
        <section aria-labelledby="proximas-obras" className="contenedor border-t border-linea py-12">
          <h2 id="proximas-obras" className="landing-heading"><T>Próximas obras</T></h2>
          <ul className="mt-7 grid gap-x-7 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
            {proximas.map(({ artista, obra }) => (
              <li key={obra.imagen}><UpcomingWorkCard obra={obra} artista={artista} /></li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="como-funciona" className="border-t border-linea bg-papel/55">
        <div className="contenedor py-14 sm:py-16 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:gap-16">
            <div>
              <p className="etiqueta !text-malbec"><T>Para ofertar</T></p>
              <h2 id="como-funciona" className="mt-3 text-balance font-serif text-4xl leading-tight tracking-tight text-tinta sm:text-5xl">
                <T>Cómo funciona</T>
              </h2>
              <p className="mt-4 max-w-prose text-lg leading-relaxed text-tinta-2">
                <T>Las ofertas se hacen en USDC sobre Stellar Testnet. El depósito queda en el contrato de la muestra,
                el reembolso se ejecuta cuando otra oferta lo supera y la liquidación reparte el pago final.</T>
              </p>
              <ol className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2">
                {pasos.map((paso) => (
                  <li key={paso.n} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4">
                    <span className="font-serif text-2xl italic leading-none text-malbec"><T>{paso.n}</T></span>
                    <div>
                      <h3 className="font-serif text-2xl leading-tight text-tinta"><T>{paso.titulo}</T></h3>
                      <p className="mt-2 leading-relaxed text-tinta-2"><T>{paso.texto}</T></p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <TranslatedAttributes><aside aria-label="QR de ejemplo y verificación" className="lg:pt-2">
              <div className="max-w-md">
                <Suspense fallback={<ObraQrFallback />}>
                  <ObraQr slug={destacada.slug} titulo={destacada.titulo} />
                </Suspense>
                <Link
                  href="/qr"
                  className="mt-5 inline-flex min-h-12 items-center rounded-full border border-tinta/20 px-6 font-medium transition-colors hover:border-malbec hover:text-malbec"
                >
                  <T>Ver la hoja de QR para imprimir</T>
                </Link>
                <p className="mt-5 text-sm leading-relaxed text-tinta-2">
                  <T>En esta demo los USDC son de prueba. Cada movimiento queda verificable en Stellar Testnet y puede
                  auditarse desde la ficha de la obra.</T>
                </p>
              </div>
            </aside></TranslatedAttributes>
          </div>
        </div>
      </section>
    </>
  );
}
