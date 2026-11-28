import Link from "next/link";
import { T } from "@/components/language-switch";
import { adminPublicKey } from "@/lib/admin-stellar";
import { storeConfigured } from "@/lib/store";

const cardClass = "cartela flex flex-col gap-2 p-5 transition-colors hover:border-malbec";

export default function AdminHomePage() {
  const faltantes = [
    !adminPublicKey() && "STELLAR_ADMIN_SECRET (clave del admin del contrato, para crear subastas)",
    !storeConfigured() && "BLOB_READ_WRITE_TOKEN (Vercel Blob privado, para guardar obras y contactos)",
  ].filter((item): item is string => Boolean(item));

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-serif text-4xl leading-tight"><T>Hola, espacio</T></h1>
        <p className="mt-2 text-tinta-2"><T>Desde acá cargás obras nuevas y ves a quién contactar cuando cierra cada subasta.</T></p>
      </header>

      {faltantes.length > 0 && (
        <div role="alert" className="rounded-sm border border-ocre/40 bg-ocre/10 px-4 py-3 text-sm text-tinta">
          <p className="font-medium"><T>Falta configurar en el servidor:</T></p>
          <ul className="mt-1 list-disc pl-5">
            {faltantes.map((item) => (
              <li key={item}><code>{item}</code></li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/cargar" className={cardClass}>
          <span className="font-serif text-2xl"><T>Cargar una obra</T></span>
          <span className="text-sm text-tinta-2"><T>Foto, ficha y condiciones. La subasta se crea en Stellar al guardar.</T></span>
        </Link>
        <Link href="/admin/ventas" className={cardClass}>
          <span className="font-serif text-2xl"><T>Ventas y contactos</T></span>
          <span className="text-sm text-tinta-2"><T>Quién va ganando, quién ganó y su teléfono para coordinar la entrega.</T></span>
        </Link>
      </div>
    </div>
  );
}
