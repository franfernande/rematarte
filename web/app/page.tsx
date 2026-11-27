import Image from "next/image";
import Link from "next/link";
import { AuctionSummary, LiveAuctionsProvider } from "@/components/live-auctions";
import { dataSources, getDeploy, getObras } from "@/lib/data";

export default function Home() {
  const obras = getObras();
  const usingMocks = dataSources.obras === "mock";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
      {usingMocks && (
        <p className="border-l-2 border-ocre bg-papel px-3 py-2 text-sm text-tinta-2">
          Datos de prueba: todavía no está el <code>obras.json</code> real.
        </p>
      )}

      <header className="flex max-w-2xl flex-col gap-3">
        <h1 className="font-serif text-4xl leading-tight">La muestra</h1>
        <p className="font-serif text-lg leading-relaxed text-tinta-2">
          Cada obra se remata en USDC sobre Stellar. Ofertar es depositar: si alguien te supera, el contrato te
          devuelve la plata en la misma transacción.
        </p>
      </header>

      <LiveAuctionsProvider deploy={getDeploy()}>
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {obras.map((obra) => (
            <li key={obra.slug}>
              <Link href={`/obra/${obra.slug}`} className="group flex flex-col">
                <div className="relative aspect-[4/3] w-full bg-cal-2">
                  <Image
                    src={obra.imagen}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    unoptimized={obra.imagen.endsWith(".svg")}
                    className="object-contain p-3 transition-transform duration-300 motion-safe:group-hover:scale-[1.02]"
                  />
                </div>
                <div className="flex flex-col gap-2 border border-t-0 border-linea bg-papel p-4 group-hover:border-piedra">
                  <div>
                    <h2 className="font-serif text-xl leading-snug italic">{obra.titulo}</h2>
                    <p className="text-sm">
                      <span className="font-semibold">{obra.artista}</span>, {obra.anio}
                    </p>
                  </div>
                  <AuctionSummary slug={obra.slug} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </LiveAuctionsProvider>
    </div>
  );
}
