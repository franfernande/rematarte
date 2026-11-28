import type { NextRequest } from "next/server";
import { StrKey } from "@stellar/stellar-sdk";
import { contactoBodySchema, contactoRegistrado, readContactos, upsertContacto } from "@/lib/contactos";

function productionBlock(): Response | null {
  if (process.env.NODE_ENV !== "production") return null;
  return Response.json({ error: "Disponible solo en la demo local" }, { status: 403 });
}

function validationMessage(path: PropertyKey | undefined): string {
  if (path === "nombre") return "Ingresá nombre y apellido, entre 2 y 80 caracteres.";
  if (path === "telefono") return "Ingresá un teléfono válido en formato internacional.";
  return "La dirección de la wallet no es válida.";
}

export async function GET(request: NextRequest) {
  const blocked = productionBlock();
  if (blocked) return blocked;

  const address = request.nextUrl.searchParams.get("address")?.trim();
  if (address) {
    if (!StrKey.isValidEd25519PublicKey(address)) {
      return Response.json({ error: "La dirección de la wallet no es válida." }, { status: 400 });
    }
    return Response.json({ registrado: contactoRegistrado(address) });
  }

  return Response.json({ contactos: readContactos() });
}

export async function POST(request: NextRequest) {
  const blocked = productionBlock();
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El pedido no tiene un JSON válido." }, { status: 400 });
  }

  const parsed = contactoBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: validationMessage(parsed.error.issues[0]?.path[0]) }, { status: 400 });
  }

  try {
    upsertContacto(parsed.data);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "No pudimos guardar los datos. Probá de nuevo." }, { status: 500 });
  }
}
