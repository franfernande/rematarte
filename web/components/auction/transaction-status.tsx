import { T } from "@/components/language-switch";
import { txUrl } from "@/lib/format";

export type TransactionView =
  | { state: "idle" }
  | { state: "working"; message: string }
  | { state: "success"; message: string; hash?: string }
  | { state: "error"; message: string };

export const idleTransaction: TransactionView = { state: "idle" };

function errorNextStep(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("firma cancelada")) return "No se envió ninguna operación. Cuando quieras, volvé a intentarlo con el mismo botón.";
  if (lower.includes("oferta es menor")) return "El mínimo subió mientras se confirmaba. Revisá el nuevo mínimo y volvé a ofertar.";
  if (lower.includes("subasta ya cerró")) return "La subasta cerró antes de confirmar tu operación. Revisá el estado final en el registro.";
  if (lower.includes("todavía no cerró")) return "Esperá a que termine la subasta y después volvé a liquidarla.";
  if (lower.includes("ya se liquidó")) return "Otra persona ya ejecutó la liquidación. Actualizá la página para ver el reparto.";
  if (lower.includes("reembolsos pendientes")) return "Actualizá la página: si el aviso desaparece, el reembolso ya volvió o fue reclamado.";
  if (lower.includes("otra red")) return "Cambiá la wallet a la red de prueba y después volvé a intentarlo.";
  if (lower.includes("habilitado el usdc")) return "Entrá a Empezar, prepará tu cuenta para USDC y después volvé a intentarlo.";
  if (lower.includes("suficiente usdc")) return "Conseguí más USDC de prueba en Empezar o bajá el monto antes de reintentar.";
  if (lower.includes("suficiente xlm")) return "Activá tu cuenta desde Empezar y después volvé a intentarlo.";
  if (lower.includes("tardó demasiado")) return "Esperá unos segundos y mirá el registro de la puja antes de reintentar, para no enviarla dos veces.";
  if (lower.includes("conectarnos")) return "Cuando recuperes conexión, volvé a intentarlo con el mismo botón.";
  return "Revisá el detalle anterior y, cuando esté resuelto, volvé a intentarlo con el mismo botón.";
}

export function TransactionStatus({ transaction }: { transaction: TransactionView }) {
  if (transaction.state === "idle") return null;

  const isError = transaction.state === "error";
  const isSuccess = transaction.state === "success";

  return (
    <div
      aria-live="polite"
      role={isError ? "alert" : "status"}
      className={`rounded-sm border px-4 py-3 text-sm leading-relaxed ${
        isError ? "border-malbec/35 bg-malbec/5 text-malbec" : isSuccess ? "border-exito/35 bg-exito/5 text-exito" : "border-linea bg-cal-2/50 text-tinta-2"
      }`}
    >
      {isError ? (
        <div>
          <p className="font-medium"><T>No terminó la operación</T></p>
          <p className="mt-1"><T>{transaction.message}</T></p>
          <p className="mt-2"><T>{errorNextStep(transaction.message)}</T></p>
        </div>
      ) : (
        <p><T>{transaction.message}</T></p>
      )}
      <T>{transaction.state === "success" && transaction.hash && (
        <a
          href={txUrl(transaction.hash)}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex min-h-11 items-center font-medium text-tinta underline decoration-malbec/40 underline-offset-4 transition-colors hover:text-malbec"
        >
          <T>Ver en el explorador</T>
        </a>
      )}</T>
    </div>
  );
}
