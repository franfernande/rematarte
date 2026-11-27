import { txUrl } from "@/lib/format";

export type TransactionView =
  | { state: "idle" }
  | { state: "working"; message: string }
  | { state: "success"; message: string; hash?: string }
  | { state: "error"; message: string };

export const idleTransaction: TransactionView = { state: "idle" };

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
      <p>{transaction.message}</p>
      {transaction.state === "success" && transaction.hash && (
        <a
          href={txUrl(transaction.hash)}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex min-h-11 items-center font-medium text-tinta underline decoration-malbec/40 underline-offset-4 transition-colors hover:text-malbec"
        >
          Ver en el explorador
        </a>
      )}
    </div>
  );
}
