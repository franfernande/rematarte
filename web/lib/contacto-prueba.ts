import {
  Account,
  BASE_FEE,
  Keypair,
  Operation,
  Transaction,
  TransactionBuilder,
  hash,
} from "@stellar/stellar-sdk";

// Proof that whoever registers a contact controls the wallet: a transaction that is signed but never sent,
// whose only operation carries the hash of the data. Every wallet can sign it (passkey, device,
// Freighter, Albedo), and the server only needs the public key to check it.

export const CONTACTO_DATA_NAME = "artemi:contacto";
const VALID_SECONDS = 5 * 60;

export type ContactoDatos = { address: string; nombre: string; apellido: string; telefono: string };

function digest(datos: ContactoDatos): Uint8Array {
  return hash(
    new TextEncoder().encode(JSON.stringify([CONTACTO_DATA_NAME, datos.address, datos.nombre, datos.apellido, datos.telefono])),
  );
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

export function buildContactoProof(datos: ContactoDatos, networkPassphrase: string): string {
  // Sequence "0" and no submission: it is never valid on the network, only as a signature.
  return new TransactionBuilder(new Account(datos.address, "0"), { fee: BASE_FEE, networkPassphrase })
    .addOperation(Operation.manageData({ name: CONTACTO_DATA_NAME, value: digest(datos) }))
    .setTimeout(VALID_SECONDS)
    .build()
    .toXDR();
}

export function verifyContactoProof(
  datos: ContactoDatos,
  signedXdr: string,
  networkPassphrase: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  let tx: Transaction;
  try {
    const parsed = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
    if (!(parsed instanceof Transaction)) return false;
    tx = parsed;
  } catch {
    return false;
  }

  if (tx.source !== datos.address || tx.operations.length !== 1) return false;
  const [operation] = tx.operations;
  if (operation.type !== "manageData" || operation.name !== CONTACTO_DATA_NAME) return false;
  if (!operation.value || !sameBytes(operation.value, digest(datos))) return false;

  const bounds = tx.timeBounds;
  if (!bounds || Number(bounds.minTime) > nowSeconds + 60 || Number(bounds.maxTime) < nowSeconds) return false;
  if (Number(bounds.maxTime) - nowSeconds > VALID_SECONDS + 60) return false;

  const keypair = Keypair.fromPublicKey(datos.address);
  const txHash = tx.hash();
  return tx.signatures.some(
    (signature) =>
      sameBytes(signature.hint.value, keypair.signatureHint()) && keypair.verify(txHash, signature.signature.value),
  );
}
