"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 self-start rounded-full bg-malbec px-5 text-sm font-medium text-cal hover:bg-malbec-2"
    >
      Imprimir
    </button>
  );
}
