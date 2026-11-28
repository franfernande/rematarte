export class ContactoApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function readError(response: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const body = (await response.json()) as { error?: string };
    if (typeof body.error === "string" && body.error) message = body.error;
  } catch {
    // Keep the fallback.
  }
  throw new ContactoApiError(response.status, message);
}

export async function contactoEstaRegistrado(address: string): Promise<boolean> {
  const response = await fetch(`/api/contactos?address=${encodeURIComponent(address)}`, { cache: "no-store" });
  if (!response.ok) return readError(response, "No pudimos revisar tus datos. Probá de nuevo.");
  const body = (await response.json()) as { registrado?: boolean };
  return body.registrado === true;
}

export async function guardarContacto(input: { address: string; nombre: string; telefono: string }): Promise<void> {
  const response = await fetch("/api/contactos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return readError(response, "No pudimos guardar tus datos. Probá de nuevo.");
}
