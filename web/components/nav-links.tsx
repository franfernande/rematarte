"use client";

import { T } from "@/components/language-switch";
import Link from "next/link";
import { usePathname } from "next/navigation";

const baseClass =
  "inline-flex min-h-11 items-center whitespace-nowrap px-1 min-[400px]:px-1.5 font-serif text-base text-tinta-2 transition-colors hover:text-tinta lg:px-3";
const activeClass = "text-tinta underline decoration-malbec decoration-2 underline-offset-[6px]";

export function NavLinks() {
  const pathname = usePathname() ?? "";
  const inicioActivo = pathname === "/";
  const muestraActiva = pathname === "/muestra" || pathname.startsWith("/obra");
  const artistasActivo = pathname.startsWith("/artistas");

  return (
    <>
      <Link
        href="/"
        aria-current={inicioActivo ? "page" : undefined}
        className={`${baseClass} ${inicioActivo ? activeClass : ""}`}
      >
        <T>Inicio</T>
      </Link>
      <Link
        href="/muestra"
        aria-current={muestraActiva ? "page" : undefined}
        className={`${baseClass} ${muestraActiva ? activeClass : ""}`}
      >
        <T>La muestra</T>
      </Link>
      <Link
        href="/artistas"
        aria-current={artistasActivo ? "page" : undefined}
        className={`${baseClass} ${artistasActivo ? activeClass : ""}`}
      >
        <T>Artistas</T>
      </Link>
    </>
  );
}
