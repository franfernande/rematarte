import { TranslatedAttributes } from "@/components/language-switch";
export default function EmpezarLoading() {
  return (
    <TranslatedAttributes><section className="contenedor py-8 sm:py-12" aria-label="Cargando onboarding">
      <div className="max-w-2xl animate-pulse">
        <div className="h-3 w-36 rounded-full bg-linea" />
        <div className="mt-5 h-14 rounded-2xl bg-cal-2" />
        <div className="mt-4 h-5 w-4/5 rounded-full bg-linea/70" />
      </div>
      <div className="mt-10 flex max-w-3xl flex-col gap-4">
        {[1, 2, 3, 4, 5].map((step) => (
          <div key={step} className="h-32 rounded-2xl border border-linea bg-papel/70" />
        ))}
      </div>
    </section></TranslatedAttributes>
  );
}
