import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-12">
      <h1 className="font-serif text-3xl leading-tight">No encontramos esta página</h1>
      <p className="text-tinta-2">
        Si llegaste desde un QR, puede que el link esté mal copiado o que la obra ya no esté en la muestra.
      </p>
      <Link href="/" className="text-malbec underline underline-offset-2">
        Ver toda la muestra
      </Link>
    </div>
  );
}
