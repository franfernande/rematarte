"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-12 rounded-full bg-malbec px-6 font-medium text-cal transition-colors duration-200 hover:bg-malbec-2 focus-visible:outline-malbec"
    >
      Imprimir
    </button>
  );
}
