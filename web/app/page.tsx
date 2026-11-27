import { dataSources, getObras } from "@/lib/data";

const cierreFormat = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Argentina/Mendoza",
});

export default function Home() {
  const obras = getObras();
  const usingMocks = dataSources.obras === "mock" || dataSources.deploy === "mock";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      {usingMocks && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
          Datos de prueba: todavía no están <code>obras.json</code> o <code>deploy.testnet.json</code> reales.
        </p>
      )}

      <h1 className="text-2xl font-semibold">La muestra</h1>

      <ul className="flex flex-col gap-3">
        {obras.map((obra) => (
          <li key={obra.slug} className="rounded-lg border border-foreground/10 p-4">
            <h2 className="font-medium">{obra.titulo}</h2>
            <p className="text-sm text-foreground/70">
              {obra.artista} · {obra.tecnica}
            </p>
            <p className="mt-2 text-sm">
              Precio mínimo: {obra.precioMinimoUsdc} USDC · Cierra {cierreFormat.format(new Date(obra.cierre))}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
