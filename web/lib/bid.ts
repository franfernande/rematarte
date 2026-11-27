import { Asset, Keypair, rpc, xdr } from "@stellar/stellar-sdk";
import type { DeployConfig } from "@/lib/data";
import {
  auctionClient,
  contractErrorCode,
  contractErrorMessage,
  formatUsdc,
  rpcServer,
  type WalletSigner,
} from "@/lib/stellar";
import { isUserRejection, WrongNetworkError } from "@/lib/wallet";

export type BidStage = "checking" | "signing" | "sending";

export type BidFailure =
  | "unfunded"
  | "no-xlm"
  | "no-trustline"
  | "no-usdc"
  | "below-minimum"
  | "closed"
  | "rejected"
  | "wrong-network"
  | "expired"
  | "busy"
  | "failed"
  | "pending";

export class BidError extends Error {
  constructor(
    readonly reason: BidFailure,
    message: string,
    readonly txHash?: string,
  ) {
    super(message);
    this.name = "BidError";
  }
}

const STROOPS_PER_XLM = BigInt(10_000_000);
const BASE_RESERVE = STROOPS_PER_XLM / BigInt(2);
// Generous upper bound for the fee of a bid (resource fee included); Friendbot accounts have far more.
const FEE_ALLOWANCE = STROOPS_PER_XLM;
const SEND_RETRIES = 3;
const SEND_RETRY_MS = 2_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// getAccountEntry() and getAssetBalance() report any RPC failure as "not found", so the entries are read directly.
async function checkFunds(deploy: DeployConfig, address: string, amount: bigint): Promise<void> {
  const keypair = Keypair.fromPublicKey(address);
  const usdc = new Asset(deploy.usdc.code, deploy.usdc.issuer);
  const { entries } = await rpcServer(deploy).getLedgerEntries(
    xdr.LedgerKey.account(new xdr.LedgerKeyAccount({ accountId: keypair.xdrPublicKey() })),
    xdr.LedgerKey.trustline(
      new xdr.LedgerKeyTrustLine({ accountId: keypair.xdrAccountId(), asset: usdc.toTrustLineXdrObject() }),
    ),
  );
  const account = entries.flatMap(({ val }) => (val.type === "account" ? [val.account] : []))[0];
  const trustline = entries.flatMap(({ val }) => (val.type === "trustline" ? [val.trustLine] : []))[0];

  if (!account) {
    throw new BidError("unfunded", "Tu cuenta todavía no existe en Testnet: hay que activarla con XLM de prueba.");
  }
  const spendable = account.balance - BigInt(2 + account.numSubEntries) * BASE_RESERVE;
  if (spendable < FEE_ALLOWANCE) {
    throw new BidError("no-xlm", "Te falta XLM de prueba para pagar la comisión de la red.");
  }
  if (!trustline) {
    throw new BidError("no-trustline", "Tu cuenta todavía no acepta USDC de prueba.");
  }
  const balance = trustline.balance;
  if (balance < amount) {
    throw new BidError(
      "no-usdc",
      `Tenés ${formatUsdc(balance)} USDC y la oferta es de ${formatUsdc(amount)} USDC.`,
    );
  }
}

function signFailure(error: unknown): BidError {
  if (error instanceof WrongNetworkError) {
    return new BidError("wrong-network", "Tu wallet está en otra red. Cambiala a Testnet y volvé a ofertar.");
  }
  if (isUserRejection(error)) {
    return new BidError("rejected", "Cancelaste la firma. No se movió nada.");
  }
  const detail = typeof error === "object" && error !== null && "message" in error ? String(error.message) : "";
  return new BidError("failed", `La wallet no pudo firmar${detail ? `: ${detail}` : "."}`);
}

function sendFailure(response: rpc.Api.SendTransactionResponse): BidError {
  const code = response.errorResult?.result.type;
  switch (code) {
    case "txTooLate":
      return new BidError("expired", "La transacción venció antes de llegar a la red. Volvé a ofertar.");
    case "txBadAuth":
      return new BidError("wrong-network", "La firma no es válida para Testnet. Revisá la red de tu wallet.");
    case "txInsufficientBalance":
      return new BidError("no-xlm", "Te falta XLM de prueba para pagar la comisión de la red.");
    case "txBadSeq":
      return new BidError("busy", "Tu cuenta tiene otra transacción en curso. Esperá unos segundos y volvé a ofertar.");
    default:
      return new BidError("failed", `La red rechazó la transacción${code ? ` (${code})` : ""}.`);
  }
}

// Every check that can fail without spending anything runs before the wallet opens.
export async function placeBid(
  deploy: DeployConfig,
  signer: WalletSigner,
  auctionId: number,
  amount: bigint,
  onStage: (stage: BidStage) => void = () => {},
): Promise<{ txHash: string }> {
  onStage("checking");
  await checkFunds(deploy, signer.publicKey, amount);

  // When connect() and bid() happen in the same click, WalletProvider has not rerendered with the new address yet.
  const signTransaction: WalletSigner["signTransaction"] = (xdr, options) =>
    signer.signTransaction(xdr, { ...options, address: signer.publicKey });
  const tx = await auctionClient(deploy, { ...signer, signTransaction }).bid({
    auction_id: auctionId,
    bidder: signer.publicKey,
    amount,
  });
  if (tx.simulation && rpc.Api.isSimulationError(tx.simulation)) {
    const code = contractErrorCode(tx.simulation);
    const message = contractErrorMessage(tx.simulation) ?? "No se pudo preparar la oferta. Probá de nuevo.";
    const reason = code === 2 || code === 5 ? "closed" : code === 4 ? "below-minimum" : "failed";
    throw new BidError(reason, message);
  }

  onStage("signing");
  try {
    await tx.sign();
  } catch (error) {
    throw signFailure(error);
  }
  if (!tx.signed) throw new BidError("failed", "La wallet no devolvió la transacción firmada.");

  onStage("sending");
  const server = rpcServer(deploy);
  let sent = await server.sendTransaction(tx.signed);
  for (let attempt = 0; sent.status === "TRY_AGAIN_LATER" && attempt < SEND_RETRIES; attempt++) {
    await sleep(SEND_RETRY_MS);
    sent = await server.sendTransaction(tx.signed);
  }
  if (sent.status === "ERROR") throw sendFailure(sent);
  if (sent.status === "TRY_AGAIN_LATER") {
    throw new BidError("busy", "La red está ocupada. Esperá unos segundos y volvé a ofertar.");
  }

  const final = await server.pollTransaction(sent.hash, { attempts: 30 });
  if (final.status === rpc.Api.GetTransactionStatus.SUCCESS) return { txHash: sent.hash };
  if (final.status === rpc.Api.GetTransactionStatus.FAILED) {
    throw new BidError(
      "failed",
      "La red rechazó la oferta; lo más probable es que alguien haya ofertado justo antes. Tus USDC no se movieron.",
      sent.hash,
    );
  }
  throw new BidError("pending", "La red todavía no confirmó la oferta. Fijate en el historial en unos segundos.", sent.hash);
}
