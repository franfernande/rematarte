"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { T } from "@/components/language-switch";
import { login, type LoginState } from "@/app/admin/actions";

const initialState: LoginState = { error: null };

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(login, initialState);
  const volver = useSearchParams().get("volver") ?? "/admin";

  return (
    <form action={action} className="mt-6 grid gap-4">
      <input type="hidden" name="volver" value={volver} />
      <label className="text-sm font-medium text-tinta">
        <T>Contraseña</T>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          disabled={pending}
          aria-invalid={state.error !== null}
          aria-describedby={state.error ? "admin-login-error" : undefined}
          className="mt-1 min-h-12 w-full rounded-sm border border-linea bg-papel px-3 text-base text-tinta outline-none transition-colors focus:border-malbec disabled:opacity-60"
        />
      </label>
      {state.error && (
        <p id="admin-login-error" role="alert" className="rounded-sm border border-malbec/30 bg-malbec/5 px-3 py-2 text-sm text-malbec">
          <T>{state.error}</T>
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-full bg-malbec px-6 font-medium text-cal transition-colors hover:bg-malbec-2 disabled:opacity-60"
      >
        <T>{pending ? "Entrando…" : "Entrar"}</T>
      </button>
    </form>
  );
}
