"use client";

import { contract } from "@stellar/stellar-sdk";
import { Client as GeneratedClient } from "@/lib/contract/auction";
import type { SignTransaction, TxResult } from "@/lib/auction-types";
import { AUCTION_CONTRACT_ID, NETWORK_PASSPHRASE, RPC_URL, rpcServer } from "@/lib/stellar";

// Clave pública de la identidad admin usada por scripts/deploy.sh en esta demo local; nunca guardar secretos.
export const ADMIN_ADDRESS = "GBT3IVJYJWNZ5QX4TIFUQT5Z4KD4DOJMLWEVX4THRWUYAAKZSBZNKDZY";

export async function createAuction(args: {
  artist: string;
  venue: string;
  artistBps: number;
  minPrice: bigint;
  minIncrement: bigint;
  endTime: number;
  signer: string;
  signTransaction: SignTransaction;
}): Promise<TxResult & { auctionId: number }> {
  const client = new GeneratedClient({
    contractId: AUCTION_CONTRACT_ID,
    rpcUrl: RPC_URL,
    networkPassphrase: NETWORK_PASSPHRASE,
    server: rpcServer,
    publicKey: args.signer,
    signTransaction: args.signTransaction as contract.ClientOptions["signTransaction"],
  });
  const tx = await client.create_auction({
    artist: args.artist,
    venue: args.venue,
    artist_bps: args.artistBps,
    min_price: args.minPrice,
    min_increment: args.minIncrement,
    end_time: BigInt(args.endTime),
  });
  if (!tx.result.isOk()) {
    throw new Error("El contrato rechazó la creación de la subasta. Revisá que esta sea la wallet del espacio.");
  }
  const auctionId = Number(tx.result.unwrap());
  const sent = await tx.signAndSend({
    signTransaction: args.signTransaction as contract.ClientOptions["signTransaction"],
  });
  const hash = sent.sendTransactionResponse?.hash;
  if (!hash) throw new Error("La transacción salió pero la red no devolvió su comprobante.");
  return { hash, auctionId };
}
