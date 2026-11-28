import "server-only";

import fs from "node:fs";
import path from "node:path";
import { StrKey } from "@stellar/stellar-sdk";
import { z } from "zod";

const CONTACTOS_PATH = path.join(process.cwd(), "data", "contactos.json");

const telefonoSchema = z
  .string()
  .trim()
  .min(8)
  .max(32)
  .regex(/^\+?[\d\s().-]+$/, "Ingresá un teléfono válido")
  .transform((value) => {
    const digits = value.replace(/\D/g, "");
    return `${value.trim().startsWith("+") ? "+" : ""}${digits}`;
  })
  .refine((value) => {
    const digits = value.replace(/^\+/, "");
    return digits.length >= 8 && digits.length <= 15;
  }, "Ingresá un teléfono válido");

export const contactoBodySchema = z.object({
  address: z.string().trim().refine((value) => StrKey.isValidEd25519PublicKey(value), "La dirección no es válida"),
  nombre: z.string().trim().min(2).max(80),
  telefono: telefonoSchema,
});

const contactoGuardadoSchema = z.object({
  address: z.string(),
  nombre: z.string(),
  telefono: z.string(),
  actualizado: z.iso.datetime(),
});

const contactosSchema = z.array(contactoGuardadoSchema);

export type ContactoInput = z.infer<typeof contactoBodySchema>;
export type ContactoGuardado = z.infer<typeof contactoGuardadoSchema>;

export function readContactos(): ContactoGuardado[] {
  if (!fs.existsSync(CONTACTOS_PATH)) return [];
  const parsed = contactosSchema.safeParse(JSON.parse(fs.readFileSync(CONTACTOS_PATH, "utf-8")));
  if (!parsed.success) throw new Error("contactos.json no tiene un formato válido");
  return parsed.data;
}

function writeContactos(contactos: ContactoGuardado[]) {
  fs.mkdirSync(path.dirname(CONTACTOS_PATH), { recursive: true });
  const temporary = `${CONTACTOS_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(contactos, null, 2)}\n`, "utf-8");
  fs.renameSync(temporary, CONTACTOS_PATH);
}

export function upsertContacto(input: ContactoInput): ContactoGuardado {
  const contactos = readContactos();
  const actualizado = new Date().toISOString();
  const contacto: ContactoGuardado = { ...input, actualizado };
  const index = contactos.findIndex((item) => item.address === input.address);
  if (index === -1) contactos.push(contacto);
  else contactos[index] = contacto;
  writeContactos(contactos);
  return contacto;
}

export function contactoRegistrado(address: string): boolean {
  return readContactos().some((contacto) => contacto.address === address);
}
