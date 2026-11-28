"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  adminConfigured,
  checkAdminPassword,
  createSessionToken,
} from "@/lib/admin-session";

export type LoginState = { error: string | null };

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;
// Per instance and in memory: a brake against guessing, not a hard limit.
const attempts = new Map<string, { count: number; since: number }>();

function safeReturnPath(value: FormDataEntryValue | null): string {
  const text = typeof value === "string" ? value : "";
  return text.startsWith("/admin") && !text.startsWith("//") ? text : "/admin";
}

async function clientKey(): Promise<string> {
  const list = await headers();
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "local";
}

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  if (!adminConfigured()) {
    return { error: "El acceso de admin no está configurado en el servidor (ADMIN_PASSWORD y ADMIN_SESSION_SECRET)." };
  }

  const key = await clientKey();
  const now = Date.now();
  const entry = attempts.get(key);
  const current = entry && now - entry.since < WINDOW_MS ? entry : { count: 0, since: now };
  if (current.count >= MAX_ATTEMPTS) {
    return { error: "Demasiados intentos. Esperá unos minutos y probá de nuevo." };
  }

  const password = formData.get("password");
  if (typeof password !== "string" || !(await checkAdminPassword(password))) {
    attempts.set(key, { count: current.count + 1, since: current.since });
    return { error: "La contraseña no es correcta." };
  }

  attempts.delete(key);
  const store = await cookies();
  store.set(ADMIN_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
  redirect(safeReturnPath(formData.get("volver")));
}

export async function logout() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/admin/entrar");
}
