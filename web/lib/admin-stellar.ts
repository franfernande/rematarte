import "server-only";

import { Keypair, contract } from "@stellar/stellar-sdk";
import { Client } from "@/lib/contract/auction";
import { getDeploy } from "@/lib/data";

// The contract only lets its admin call create_auction. The admin secret (identity `admin` of
// scripts/deploy.sh) lives only in the server environment: STELLAR_ADMIN_SECRET.

export class AdminKeyError extends Error {}

export function adminKeypair(): Keypair {
  const secret = process.env.STELLAR_ADMIN_SECRET?.trim();
  if (!secret) throw new AdminKeyError("Falta STELLAR_ADMIN_SECRET en el servidor: sin esa clave no se pueden crear subastas.");
  try {
    return Keypair.fromSecret(secret);
  } catch {
    throw new AdminKeyError("STELLAR_ADMIN_SECRET no es una clave secreta de Stellar válida (S...).");
  }
}

export function adminPublicKey(): string | null {
  try {
    return adminKeypair().publicKey();
  } catch {
    return null;
  }
}

export async function createAuctionAsAdmin(args: {
  artist: string;
  venue: string;
  artistBps: number;
  minPrice: bigint;
  minIncrement: bigint;
  endTime: number;
}): Promise<{ auctionId: number; hash: string }> {
  const keypair = adminKeypair();
  const deploy = getDeploy();
  const client = new Client({
    contractId: deploy.auctionContractId,
    rpcUrl: deploy.rpcUrl,
    networkPassphrase: deploy.networkPassphrase,
    publicKey: keypair.publicKey(),
    ...contract.basicNodeSigner(keypair, deploy.networkPassphrase),
  });

  const tx = await client.create_auction({
    artist: args.artist,
    venue: args.venue,
    artist_bps: args.artistBps,
    min_price: args.minPrice,
    min_increment: args.minIncrement,
    end_time: BigInt(args.endTime),
  });
  if (tx.result.isErr()) {
    throw new Error("El contrato rechazó la subasta. Revisá el reparto, los montos y la fecha de cierre.");
  }

  const sent = await tx.signAndSend();
  const hash = sent.sendTransactionResponse?.hash;
  const result = sent.result;
  if (!hash || result.isErr()) throw new Error("La subasta no se confirmó en la red. Probá de nuevo.");
  return { auctionId: Number(result.unwrap()), hash };
}
