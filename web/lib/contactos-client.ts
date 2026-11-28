import { buildContactoProof, type ContactoDatos } from "@/lib/contacto-prueba";
import { NETWORK_PASSPHRASE } from "@/lib/stellar";

export class ContactoApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type SignTransaction = (
  xdr: string,
  opts?: { networkPassphrase?: string; address?: string },
) => Promise<{ signedTxXdr: string }>;

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

// Signs the proof with the wallet (nothing is sent to the network) and saves the contact.
export async function guardarContacto(datos: ContactoDatos, signTransaction: SignTransaction): Promise<void> {
  const xdr = buildContactoProof(datos, NETWORK_PASSPHRASE);
  const { signedTxXdr } = await signTransaction(xdr, { networkPassphrase: NETWORK_PASSPHRASE, address: datos.address });
  const response = await fetch("/api/contactos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...datos, prueba: signedTxXdr }),
  });
  if (!response.ok) return readError(response, "No pudimos guardar tus datos. Probá de nuevo.");
}
