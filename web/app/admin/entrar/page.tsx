import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/login-form";
import { T } from "@/components/language-switch";

export const metadata: Metadata = {
  title: "Acceso del espacio",
  robots: { index: false },
};

export default function AdminLoginPage() {
  return (
    <div className="mx-auto w-full max-w-md flex-1 px-5 pb-14 pt-10 sm:pt-16">
      <section className="cartela panel-sala">
        <p className="etiqueta"><T>Espacio</T></p>
        <h1 className="mt-2 font-serif text-4xl leading-tight"><T>Acceso del espacio</T></h1>
        <p className="mt-3 text-tinta-2">
          <T>Para cargar obras y ver los datos de contacto de quienes ofertan.</T>
        </p>
        <Suspense>
          <AdminLoginForm />
        </Suspense>
      </section>
    </div>
  );
}
