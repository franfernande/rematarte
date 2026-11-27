import type { Metadata } from "next";
import { Onboarding } from "@/components/onboarding";
import { getDeploy } from "@/lib/data";

export const metadata: Metadata = {
  title: "Preparar mi wallet",
  description: "Activá una wallet de Testnet y recibí USDC de prueba para participar de la muestra.",
};

export default function EmpezarPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-3">
        <p className="font-serif text-lg italic text-malbec">Antes de ofertar</p>
        <h1 className="font-serif text-4xl leading-tight">Prepará tu wallet de prueba</h1>
        <p className="font-serif text-lg leading-relaxed text-tinta-2">
          Son cuatro pasos en Stellar Testnet. No se usa dinero real y no tenés que compartir ninguna clave.
        </p>
      </header>
      <Onboarding deploy={getDeploy()} />
      <p className="text-sm text-tinta-2">
        Los XLM y USDC de esta experiencia existen solo en Testnet y no se pueden vender ni cambiar por dinero real.
      </p>
    </div>
  );
}
