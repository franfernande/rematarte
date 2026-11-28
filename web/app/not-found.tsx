import { T } from "@/components/language-switch";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="contenedor py-12">
      <div className="flex max-w-xl flex-col gap-4">
        <h1 className="font-serif text-3xl leading-tight"><T>No encontramos esta página</T></h1>
        <p className="text-tinta-2">
          <T>Si llegaste desde un QR, puede que el link esté mal copiado o que la obra ya no esté en la muestra.</T>
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            href="/muestra"
            className="inline-flex min-h-12 items-center rounded-full bg-malbec px-6 font-medium text-cal transition-colors hover:bg-malbec-2"
          >
            <T>Ver toda la muestra</T>
          </Link>
          <Link
            href="/empezar"
            className="inline-flex min-h-12 items-center rounded-full border border-tinta/20 px-6 font-medium transition-colors hover:border-tinta hover:bg-papel"
          >
            <T>Empezar</T>
          </Link>
        </div>
      </div>
    </div>
  );
}
