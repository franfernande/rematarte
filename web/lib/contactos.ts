import "server-only";

import { StrKey } from "@stellar/stellar-sdk";
import { z } from "zod";
import { listKeys, readJson, writeJson } from "@/lib/store";

// One JSON per wallet in the private store (lib/store.ts): contactos/<G...>.json.
// Only the admin can list them (GET /api/contactos).

const PREFIX = "contactos";

const nombreSchema = (campo: string) =>
  z
    .string()
    .trim()
    .min(2, campo)
    .max(60, campo)
    .regex(/^[\p{L}\p{M}' .-]+$/u, campo);

const telefonoSchema = z
  .string()
  .trim()
  .max(32, "telefono")
  .regex(/^\+?[\d\s().-]+$/, "telefono")
  .refine((value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 15;
  }, "telefono");

export const contactoBodySchema = z.object({
  address: z.string().trim().refine((value) => StrKey.isValidEd25519PublicKey(value), "address"),
  nombre: nombreSchema("nombre"),
  apellido: nombreSchema("apellido"),
  telefono: telefonoSchema,
  prueba: z.string().min(1, "prueba").max(4000, "prueba"),
});

const contactoGuardadoSchema = z.object({
  address: z.string(),
  nombre: z.string(),
  apellido: z.string().default(""),
  telefono: z.string(),
  creado: z.iso.datetime().optional(),
  actualizado: z.iso.datetime(),
});

export type ContactoGuardado = z.infer<typeof contactoGuardadoSchema>;

export function normalizarTelefono(value: string): string {
  const trimmed = value.trim();
  return `${trimmed.startsWith("+") ? "+" : ""}${trimmed.replace(/\D/g, "")}`;
}

function key(address: string): string {
  return `${PREFIX}/${address}.json`;
}

export async function readContacto(address: string): Promise<ContactoGuardado | null> {
  const parsed = contactoGuardadoSchema.safeParse(await readJson(key(address)));
  return parsed.success ? parsed.data : null;
}

export async function contactoRegistrado(address: string): Promise<boolean> {
  return (await readContacto(address)) !== null;
}

export async function readContactos(): Promise<ContactoGuardado[]> {
  const keys = (await listKeys(`${PREFIX}/`)).filter((item) => item.endsWith(".json"));
  const contactos = await Promise.all(
    keys.map(async (item) => {
      const parsed = contactoGuardadoSchema.safeParse(await readJson(item));
      return parsed.success ? parsed.data : null;
    }),
  );
  return contactos
    .filter((contacto): contacto is ContactoGuardado => contacto !== null)
    .sort((a, b) => b.actualizado.localeCompare(a.actualizado));
}

export async function upsertContacto(input: {
  address: string;
  nombre: string;
  apellido: string;
  telefono: string;
}): Promise<ContactoGuardado> {
  const previous = await readContacto(input.address);
  const now = new Date().toISOString();
  const contacto: ContactoGuardado = {
    address: input.address,
    nombre: input.nombre,
    apellido: input.apellido,
    telefono: normalizarTelefono(input.telefono),
    creado: previous?.creado ?? previous?.actualizado ?? now,
    actualizado: now,
  };
  await writeJson(key(input.address), contacto);
  return contacto;
}
