import { Asset, BASE_FEE, Keypair, Operation, StrKey, TransactionBuilder } from "@stellar/stellar-sdk";
import type { NextRequest } from "next/server";
import deployConfig from "@/data/deploy.testnet.json";
import {
  ONBOARDING_TARGET_STROOPS,
  assetAmountToStroops,
  createHorizonServer,
  findAssetBalanceLine,
  horizonResultCodes,
  isNotFoundError,
  stroopsToAssetAmount,
  type FaucetErrorResponse,
  type FaucetResponse,
} from "@/lib/onboarding";

const RATE_LIMIT_MS = 60_000;

type RateLimitStore = {
  byAddress: Map<string, number>;
  byIp: Map<string, number>;
};

const globalWithRateLimit = globalThis as typeof globalThis & {
  __rematarteFaucetRateLimit?: RateLimitStore;
};

function getRateLimitStore(): RateLimitStore {
  globalWithRateLimit.__rematarteFaucetRateLimit ??= {
    byAddress: new Map<string, number>(),
    byIp: new Map<string, number>(),
  };
  return globalWithRateLimit.__rematarteFaucetRateLimit;
}

function pruneStore(store: RateLimitStore, now: number) {
  for (const [key, at] of store.byAddress) {
    if (now - at > RATE_LIMIT_MS) store.byAddress.delete(key);
  }
  for (const [key, at] of store.byIp) {
    if (now - at > RATE_LIMIT_MS) store.byIp.delete(key);
  }
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "desconocida";
  return request.headers.get("x-real-ip") ?? "desconocida";
}

function rateLimitRetryAfterSeconds(address: string, ip: string): number {
  const now = Date.now();
  const store = getRateLimitStore();
  pruneStore(store, now);

  const lastByAddress = store.byAddress.get(address) ?? 0;
  const lastByIp = store.byIp.get(ip) ?? 0;
  const retryAfterMs = Math.max(lastByAddress + RATE_LIMIT_MS - now, lastByIp + RATE_LIMIT_MS - now, 0);
  return retryAfterMs > 0 ? Math.ceil(retryAfterMs / 1_000) : 0;
}

function markRateLimit(address: string, ip: string): number {
  const now = Date.now();
  const store = getRateLimitStore();
  store.byAddress.set(address, now);
  store.byIp.set(ip, now);
  return now;
}

function unmarkRateLimit(address: string, ip: string, at: number) {
  const store = getRateLimitStore();
  if (store.byAddress.get(address) === at) store.byAddress.delete(address);
  if (store.byIp.get(ip) === at) store.byIp.delete(ip);
}

function json(body: FaucetResponse | FaucetErrorResponse, status = 200, headers?: HeadersInit): Response {
  return Response.json(body, { status, headers });
}

function error(status: number, message: string, retryAfterSeconds?: number): Response {
  return json(
    { error: message, ...(retryAfterSeconds ? { retryAfterSeconds } : {}) },
    status,
    retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined,
  );
}

function readAddress(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("address" in body)) return null;
  const address = body.address;
  return typeof address === "string" ? address.trim() : null;
}

function distributorKeypair(): Keypair | null {
  const secret = process.env.USDC_DISTRIBUTOR_SECRET?.trim();
  if (!secret) return null;
  try {
    return Keypair.fromSecret(secret);
  } catch {
    return null;
  }
}

function paymentFailureResponse(errorUnknown: unknown): Response {
  const codes = horizonResultCodes(errorUnknown);

  if (codes.includes("op_underfunded")) {
    return error(503, "El faucet de prueba no tiene saldo disponible en este momento. Avisale al equipo.");
  }
  if (codes.includes("op_no_trust")) {
    return error(400, "La cuenta todavía no tiene USDC de prueba habilitado. Volvé al paso 3 y probá de nuevo.");
  }
  if (codes.includes("tx_bad_seq")) {
    return error(409, "La cuenta del faucet quedó sincronizando con la red. Esperá unos segundos y probá de nuevo.");
  }
  if (codes.includes("tx_insufficient_balance")) {
    return error(503, "El faucet de prueba no puede pagar la comisión de red en este momento. Avisale al equipo.");
  }
  return error(502, "Stellar Testnet no confirmó el envío. Esperá unos segundos y probá de nuevo.");
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, "El pedido no tiene un JSON válido. Enviá { \"address\": \"G...\" }.");
  }

  const address = readAddress(body);
  if (!address || !StrKey.isValidEd25519PublicKey(address)) {
    return error(400, "La dirección no es una cuenta Stellar válida. Conectá tu wallet y probá de nuevo.");
  }

  const distributor = distributorKeypair();
  if (!distributor) {
    return error(503, "El faucet de prueba no está configurado en este servidor. Avisale al equipo.");
  }

  const server = createHorizonServer();
  let account;
  try {
    account = await server.loadAccount(address);
  } catch (loadError) {
    if (isNotFoundError(loadError)) {
      return error(400, "La cuenta todavía no está activa en Testnet. Volvé al paso 2 y activala con Friendbot.");
    }
    return error(502, "No pudimos leer tu cuenta en Stellar Testnet. Esperá unos segundos y probá de nuevo.");
  }

  const usdcLine = findAssetBalanceLine(account.balances, deployConfig.usdc.code, deployConfig.usdc.issuer);
  if (!usdcLine) {
    return error(400, "La cuenta todavía no tiene USDC de prueba habilitado. Volvé al paso 3 y probá de nuevo.");
  }

  const currentBalance = assetAmountToStroops(usdcLine.balance);
  if (currentBalance === null) {
    return error(502, "No pudimos leer el saldo de USDC de prueba. Esperá unos segundos y probá de nuevo.");
  }
  if (currentBalance >= ONBOARDING_TARGET_STROOPS) {
    return json({ funded: false });
  }

  const ip = clientIp(request);
  const retryAfter = rateLimitRetryAfterSeconds(address, ip);
  if (retryAfter > 0) {
    return error(429, "Ya se entregó USDC de prueba hace menos de un minuto. Esperá un poco y probá de nuevo.", retryAfter);
  }

  let distributorAccount;
  try {
    distributorAccount = await server.loadAccount(distributor.publicKey());
  } catch (loadError) {
    if (isNotFoundError(loadError)) {
      return error(503, "El faucet de prueba no está configurado correctamente. Avisale al equipo.");
    }
    return error(502, "No pudimos leer la cuenta del faucet en Stellar Testnet. Esperá unos segundos y probá de nuevo.");
  }

  const amountStroops = ONBOARDING_TARGET_STROOPS - currentBalance;
  const amount = stroopsToAssetAmount(amountStroops);
  const asset = new Asset(deployConfig.usdc.code, deployConfig.usdc.issuer);
  const transaction = new TransactionBuilder(distributorAccount, {
    fee: BASE_FEE,
    networkPassphrase: deployConfig.networkPassphrase,
  })
    .addOperation(Operation.payment({ destination: address, asset, amount }))
    .setTimeout(180)
    .build();
  transaction.sign(distributor);

  const rateLimitMark = markRateLimit(address, ip);
  try {
    const submitted = await server.submitTransaction(transaction);
    return json({ funded: true, hash: submitted.hash, amount });
  } catch (submitError) {
    unmarkRateLimit(address, ip, rateLimitMark);
    return paymentFailureResponse(submitError);
  }
}
