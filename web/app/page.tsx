import Link from "next/link";
import { AuctionBadge } from "@/components/auction/auction-badge";
import { ObraArte } from "@/components/obra-arte";
import { dataSources, getDeploy, getObras } from "@/lib/data";

const cierreFormat = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Mendoza",
});

const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

const pasos = [
  { n: "01", titulo: "Escaneás el QR", texto: "La ficha abre en el celu, sin instalar nada: la obra, la puja actual y el cierre." },
  { n: "02", titulo: "Ofertar es depositar", texto: "Tus USDC quedan en un contrato inteligente. No es una promesa: es plata que ya está." },
  { n: "03", titulo: "Si te superan, vuelve", texto: "El reembolso viaja en la misma transacción que la oferta nueva. Sin pedirlo, sin esperar." },
  { n: "04", titulo: "Al cierre, se reparte", texto: "La artista y el espacio cobran solos, con el porcentaje fijado antes de empezar." },
];

export default function Home() {
  const obras = getObras();
  const { subastas } = getDeploy();
  const usingMocks = dataSources.obras === "mock";

  return (
    <>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-16 pt-12 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="animate-aparecer">
          <p className="etiqueta !text-malbec">Muestra en vivo · Mendoza</p>
          <h1 className="mt-5 font-serif text-[3.4rem] leading-[0.95] tracking-tight sm:text-7xl lg:text-[5.5rem]">
            La obra cuelga en la pared.
            <br />
            <em className="text-malbec">La puja vive en la cadena.</em>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-tinta-2">
            Escaneá el QR de la obra que te gustó y ofertá en USDC desde el celu. Tu oferta queda depositada: si te
            superan, te la devolvemos al instante; si ganás, la artista ya cobró.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#muestra"
              className="inline-flex min-h-12 items-center rounded-full bg-malbec px-7 font-medium text-cal transition-colors hover:bg-malbec-2"
            >
              Ver la muestra
            </a>
            <Link
              href="/empezar"
              className="inline-flex min-h-12 items-center rounded-full border border-tinta/20 px-7 font-medium transition-colors hover:border-tinta hover:bg-papel"
            >
              Empezar en 1 minuto
            </Link>
          </div>
        </div>

        {obras[0] && (
          <Link
            href={`/obra/${obras[0].slug}`}
            className="group relative mx-auto w-full max-w-sm animate-aparecer [animation-delay:150ms] lg:max-w-md"
          >
            <div className="marco rotate-[-1.5deg] transition-transform duration-500 group-hover:rotate-0">
              <div className="paspartu">
                <div className="aspect-[4/5] overflow-hidden">
                  <ObraArte obra={obras[0]} />
                </div>
              </div>
            </div>
            <div className="cartela absolute -bottom-8 -left-4 w-60 rotate-[1deg] px-4 py-3 sm:-left-10">
              <p className="font-serif text-xl italic leading-tight">{obras[0].titulo}</p>
              <p className="mt-1 text-xs text-tinta-2">
                {obras[0].artista} · {obras[0].tecnica}
              </p>
              <p className="etiqueta mt-2 flex items-center gap-2 !text-ocre">
                <span className="size-1.5 animate-latido rounded-full bg-ocre" aria-hidden />
                En subasta
              </p>
            </div>
          </Link>
        )}
      </section>

      <section aria-labelledby="como" className="border-y border-linea bg-papel/60">
        <div className="mx-auto w-full max-w-6xl px-5 py-16">
          <p className="etiqueta">El recorrido</p>
          <h2 id="como" className="mt-3 font-serif text-4xl sm:text-5xl">
            Cuatro pasos, <em className="text-malbec">del QR al cobro.</em>
          </h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {pasos.map((paso) => (
              <li key={paso.n} className="border-t-2 border-tinta pt-5 last:border-malbec">
                <span className="font-serif text-xl italic text-malbec">{paso.n}</span>
                <h3 className="mt-2 font-serif text-3xl leading-tight">{paso.titulo}</h3>
                <p className="mt-3 leading-relaxed text-tinta-2">{paso.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="muestra" aria-labelledby="muestra-titulo" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="etiqueta">La muestra</p>
            <h2 id="muestra-titulo" className="mt-3 font-serif text-4xl sm:text-5xl">
              Obras en <em className="text-malbec">subasta</em>
            </h2>
          </div>
          {usingMocks && (
            <p className="rounded-full border border-dashed border-ocre px-4 py-2 text-xs text-tinta-2">
              Obras de ejemplo: las fichas reales llegan con <code className="font-mono">obras.json</code>
            </p>
          )}
        </div>

        <ul className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {obras.map((obra, i) => {
            const auctionId = subastas[obra.slug];
            return (
              <li key={obra.slug} className="animate-aparecer" style={{ animationDelay: `${i * 90}ms` }}>
                <Link href={`/obra/${obra.slug}`} className="group block">
                  <div className="marco transition-transform duration-300 group-hover:-translate-y-1">
                    <div className="paspartu !p-3">
                      <div className="aspect-[4/5] overflow-hidden">
                        <ObraArte obra={obra} className="transition-transform duration-700 group-hover:scale-[1.03]" />
                      </div>
                    </div>
                  </div>
                  <div className="cartela mt-5 px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-serif text-2xl italic leading-tight">{obra.titulo}</p>
                      <span className="font-serif text-lg italic text-piedra">{roman[i] ?? i + 1}</span>
                    </div>
                    <p className="mt-1 text-sm text-tinta-2">
                      {obra.artista} · {obra.tecnica}, {obra.anio}
                    </p>
                    <div className="mt-3 border-t border-linea pt-3">
                      {auctionId === undefined ? (
                        <p className="text-sm text-piedra">Subasta todavía no publicada</p>
                      ) : (
                        <AuctionBadge auctionId={auctionId} />
                      )}
                    </div>
                    <p className="mt-2 text-xs text-piedra">Cierra el {cierreFormat.format(new Date(obra.cierre))}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
