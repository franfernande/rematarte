import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/admin/actions";
import { T } from "@/components/language-switch";

export const metadata: Metadata = {
  title: { default: "Panel del espacio", template: "%s · Panel del espacio" },
  robots: { index: false },
};

const linkClass =
  "inline-flex min-h-11 items-center rounded-full border border-tinta/20 px-4 text-sm font-medium text-tinta transition-colors hover:border-tinta hover:bg-cal-2";

// proxy.ts only lets this through with a valid admin session.
export default function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-5 pb-14 pt-6 sm:pt-10">
      <nav aria-label="Panel del espacio" className="mb-6 flex flex-wrap items-center gap-2 border-b border-linea pb-4">
        <Link href="/admin" className="etiqueta mr-auto inline-flex min-h-11 items-center !text-malbec">
          <T>Panel del espacio</T>
        </Link>
        <Link href="/admin/cargar" className={linkClass}><T>Cargar obra</T></Link>
        <Link href="/admin/ventas" className={linkClass}><T>Ventas y contactos</T></Link>
        <form action={logout}>
          <button type="submit" className="inline-flex min-h-11 items-center px-3 text-sm text-tinta-2 underline underline-offset-4 hover:text-malbec">
            <T>Salir</T>
          </button>
        </form>
      </nav>
      {children}
    </div>
  );
}
