import type { NextRequest } from "next/server";
import { StrKey } from "@stellar/stellar-sdk";
import { requestIsAdmin } from "@/lib/admin-session";
import { verifyContactoProof } from "@/lib/contacto-prueba";
import { contactoBodySchema, contactoRegistrado, readContactos, upsertContacto } from "@/lib/contactos";
import { getDeploy } from "@/lib/data";
import { StoreUnavailableError } from "@/lib/store";

const FIELD_ERRORS: Record<string, string> = {
  nombre: "Ingresá tu nombre (solo letras, entre 2 y 60 caracteres).",
  apellido: "Ingresá tu apellido (solo letras, entre 2 y 60 caracteres).",
  telefono: "Ingresá un teléfono válido, con código de área (por ejemplo, +54 9 261 123-4567).",
  address: "La dirección de la wallet no es válida.",
  prueba: "Falta la firma de la wallet.",
};

function failure(cause: unknown): Response {
  if (cause instanceof StoreUnavailableError) {
    return Response.json({ error: "El registro de contactos no está disponible ahora. Avisale al espacio." }, { status: 503 });
  }
  console.error("[api/contactos]", cause);
  return Response.json({ error: "No pudimos guardar los datos. Probá de nuevo." }, { status: 500 });
}

// ?address=G... -> { registrado } for anyone (it reveals nothing but a yes/no).
// Without address -> the full list, only with an admin session.
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address")?.trim();
  try {
    if (address) {
      if (!StrKey.isValidEd25519PublicKey(address)) {
        return Response.json({ error: "La dirección de la wallet no es válida." }, { status: 400 });
      }
      return Response.json({ registrado: await contactoRegistrado(address) }, { headers: { "cache-control": "no-store" } });
    }

    if (!(await requestIsAdmin(request))) {
      return Response.json({ error: "Tu sesión de admin venció. Volvé a entrar." }, { status: 401 });
    }
    return Response.json({ contactos: await readContactos() }, { headers: { "cache-control": "no-store" } });
  } catch (cause) {
    return failure(cause);
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El pedido no tiene un JSON válido." }, { status: 400 });
  }

  const parsed = contactoBodySchema.safeParse(body);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? parsed.error.issues[0]?.message);
    return Response.json({ error: FIELD_ERRORS[field] ?? "Revisá tus datos." }, { status: 400 });
  }

  const { prueba, ...datos } = parsed.data;
  if (!verifyContactoProof(datos, prueba, getDeploy().networkPassphrase)) {
    return Response.json(
      { error: "No pudimos comprobar la firma de tu wallet. Volvé a intentarlo y confirmá la firma." },
      { status: 403 },
    );
  }

  try {
    await upsertContacto(datos);
    return Response.json({ ok: true });
  } catch (cause) {
    return failure(cause);
  }
}
