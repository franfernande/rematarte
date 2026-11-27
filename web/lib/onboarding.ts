import {
  Asset,
  BASE_FEE,
  Horizon,
  NotFoundError,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import type { SignTransaction } from "@/lib/auction-types";
import { STROOPS_PER_USDC } from "@/lib/format";
import deployConfig from "@/data/deploy.testnet.json";

export const HORIZON_TESTNET_URL = "https://horizon-testnet.stellar.org";
export const FRIENDBOT_URL = "https://friendbot.stellar.org";
export const ONBOARDING_TARGET_STROOPS = 200n * STROOPS_PER_USDC;

export const usdcAssetConfig = {
  code: deployConfig.usdc.code,
  issuer: deployConfig.usdc.issuer,
} as const;

export type OnboardingAccountState = {
  exists: boolean;
  hasTrustline: boolean;
  usdcBalanceStroops: bigint;
  xlmBalance: string | null;
};

export const emptyOnboardingAccountState: OnboardingAccountState = {
  exists: false,
  hasTrustline: false,
  usdcBalanceStroops: 0n,
  xlmBalance: null,
};

export type FaucetResponse =
  | { funded: true; hash: string; amount: string }
  | { funded: false; alreadyClaimed?: boolean };

export type FaucetErrorResponse = {
  error: string;
  retryAfterSeconds?: number;
};

export function createHorizonServer(): Horizon.Server {
  return new Horizon.Server(HORIZON_TESTNET_URL);
}

function hasResponseStatus(error: unknown, status: number): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "status" in error.response &&
    error.response.status === status
  );
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof NotFoundError || hasResponseStatus(error, 404);
}

export function findAssetBalanceLine(
  balances: Horizon.HorizonApi.BalanceLine[],
  code: string,
  issuer: string,
): Horizon.HorizonApi.BalanceLineAsset | undefined {
  return balances.find(
    (balance): balance is Horizon.HorizonApi.BalanceLineAsset =>
      balance.asset_type !== "native" &&
      balance.asset_type !== "liquidity_pool_shares" &&
      balance.asset_code === code &&
      balance.asset_issuer === issuer,
  );
}

// Horizon devuelve los saldos como strings decimales; el USDC de prueba usa 7 decimales.
export function assetAmountToStroops(amount: string): bigint | null {
  const value = amount.trim();
  if (!/^\d+(\.\d{1,7})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * STROOPS_PER_USDC + BigInt((fraction + "0000000").slice(0, 7));
}

export function stroopsToAssetAmount(stroops: bigint): string {
  const whole = stroops / STROOPS_PER_USDC;
  const fraction = (stroops % STROOPS_PER_USDC).toString().padStart(7, "0").replace(/0+$/, "");
  return fraction ? `${whole.toString()}.${fraction}` : whole.toString();
}

export async function getOnboardingAccountState(address: string): Promise<OnboardingAccountState> {
  const server = createHorizonServer();
  try {
    const account = await server.loadAccount(address);
    const usdcLine = findAssetBalanceLine(account.balances, usdcAssetConfig.code, usdcAssetConfig.issuer);
    const xlmLine = account.balances.find((balance) => balance.asset_type === "native");
    const usdcBalanceStroops = usdcLine ? (assetAmountToStroops(usdcLine.balance) ?? 0n) : 0n;

    return {
      exists: true,
      hasTrustline: Boolean(usdcLine),
      usdcBalanceStroops,
      xlmBalance: xlmLine?.balance ?? null,
    };
  } catch (error) {
    if (isNotFoundError(error)) return emptyOnboardingAccountState;
    throw error;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCondition(check: () => Promise<boolean>, attempts = 8, delayMs = 1_200): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      if (await check()) return true;
    } catch {
      // Horizon puede tardar unos segundos en indexar la cuenta recién creada; reintenta.
    }
    if (attempt < attempts - 1) await sleep(delayMs);
  }
  return false;
}

function friendbotErrorMessage(status: number): string {
  if (status === 429) {
    return "Friendbot está recibiendo demasiados pedidos. Esperá un minuto y probá de nuevo.";
  }
  if (status >= 500) {
    return "Friendbot no respondió bien. Esperá unos segundos y probá de nuevo.";
  }
  return "Friendbot rechazó la activación de la cuenta. Esperá unos segundos y probá de nuevo.";
}

export async function activateTestAccount(address: string): Promise<void> {
  const current = await getOnboardingAccountState(address);
  if (current.exists) return;

  const response = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(address)}`, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const alreadyExists = body.toLowerCase().includes("already") || body.includes("op_already_exists");
    if (!alreadyExists) throw new Error(friendbotErrorMessage(response.status));
  }

  const activated = await waitForCondition(async () => (await getOnboardingAccountState(address)).exists);
  if (!activated) {
    throw new Error("Friendbot aceptó el pedido, pero la cuenta todavía no aparece en Testnet. Esperá unos segundos y probá de nuevo.");
  }
}

export async function createUsdcTrustline(
  address: string,
  signTransaction: SignTransaction,
): Promise<{ hash: string | null }> {
  const current = await getOnboardingAccountState(address);
  if (!current.exists) {
    throw new Error("La cuenta todavía no está activa en Testnet. Activá la cuenta en el paso anterior.");
  }
  if (current.hasTrustline) return { hash: null };

  const server = createHorizonServer();
  const account = await server.loadAccount(address);
  const asset = new Asset(usdcAssetConfig.code, usdcAssetConfig.issuer);
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: deployConfig.networkPassphrase,
  })
    .addOperation(Operation.changeTrust({ asset }))
    .setTimeout(180)
    .build();

  const { signedTxXdr } = await signTransaction(transaction.toXDR(), {
    networkPassphrase: deployConfig.networkPassphrase,
    address,
  });
  const signedTransaction = TransactionBuilder.fromXDR(signedTxXdr, deployConfig.networkPassphrase);
  const result = await server.submitTransaction(signedTransaction);
  return { hash: result.hash };
}

function isFaucetResponse(value: unknown): value is FaucetResponse {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record.funded === false) return true;
  return (
    record.funded === true &&
    typeof record.hash === "string" &&
    typeof record.amount === "string"
  );
}

export async function requestUsdcFaucet(address: string): Promise<FaucetResponse> {
  const response = await fetch("/api/faucet", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address }),
    cache: "no-store",
  });
  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : "El faucet de prueba no pudo responder. Probá de nuevo en unos segundos.";
    throw new Error(message);
  }
  if (!isFaucetResponse(data)) {
    throw new Error("El faucet de prueba devolvió una respuesta inesperada. Avisale al equipo y probá de nuevo.");
  }
  return data;
}

export async function waitForTargetUsdcBalance(address: string): Promise<OnboardingAccountState> {
  let latest = await getOnboardingAccountState(address);
  if (latest.usdcBalanceStroops >= ONBOARDING_TARGET_STROOPS) return latest;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await sleep(1_200);
    latest = await getOnboardingAccountState(address);
    if (latest.usdcBalanceStroops >= ONBOARDING_TARGET_STROOPS) return latest;
  }
  return latest;
}

export type PrepareAccountStep = "fund" | "trustline" | "usdc" | "done";
export type PrepareAccountEvent = {
  step: PrepareAccountStep;
  status: "running" | "done" | "error";
  message?: string;
};

// Prepara una cuenta recién creada sin repetir pasos ya hechos: Friendbot, trustline USDC y faucet.
export async function prepareAccount({
  address,
  signTransaction,
  onStep,
}: {
  address: string;
  signTransaction: SignTransaction;
  onStep?: (event: PrepareAccountEvent) => void;
}): Promise<void> {
  let currentStep: Exclude<PrepareAccountStep, "done"> = "fund";
  const emit = (step: PrepareAccountStep, status: PrepareAccountEvent["status"], message?: string) => {
    onStep?.({ step, status, ...(message ? { message } : {}) });
  };

  try {
    emit("fund", "running");
    let state = await getOnboardingAccountState(address);
    if (!state.exists) {
      await activateTestAccount(address);
      state = await getOnboardingAccountState(address);
    }
    if (!state.exists) throw new Error("La cuenta todavía no aparece activa en Testnet.");
    emit("fund", "done");

    currentStep = "trustline";
    emit("trustline", "running");
    if (!state.hasTrustline) {
      await createUsdcTrustline(address, signTransaction);
      state = await getOnboardingAccountState(address);
    }
    if (!state.hasTrustline) throw new Error("La cuenta todavía no tiene USDC de prueba habilitado.");
    emit("trustline", "done");

    currentStep = "usdc";
    emit("usdc", "running");
    if (state.usdcBalanceStroops < ONBOARDING_TARGET_STROOPS) {
      const result = await requestUsdcFaucet(address);
      // The faucet pays once per account; after that the account bids with whatever balance it has left.
      if (result.funded || !result.alreadyClaimed) {
        state = await waitForTargetUsdcBalance(address);
        if (state.usdcBalanceStroops < ONBOARDING_TARGET_STROOPS) {
          throw new Error("El saldo de USDC de prueba todavía no llega a 200. Esperá unos segundos y verificá de nuevo.");
        }
      }
    }
    emit("usdc", "done");
    emit("done", "done");
  } catch (error) {
    const message = onboardingErrorMessage(error, "No pudimos preparar la cuenta de prueba.");
    emit(currentStep, "error", message);
    throw new Error(message);
  }
}

export function horizonResultCodes(error: unknown): string[] {
  if (typeof error !== "object" || error === null || !("response" in error)) return [];
  const response = error.response;
  if (typeof response !== "object" || response === null || !("data" in response)) return [];
  const data = response.data;
  if (typeof data !== "object" || data === null || !("extras" in data)) return [];
  const extras = data.extras;
  if (typeof extras !== "object" || extras === null || !("result_codes" in extras)) return [];
  const resultCodes = extras.result_codes;
  if (typeof resultCodes !== "object" || resultCodes === null) return [];

  const codes: string[] = [];
  if ("transaction" in resultCodes && typeof resultCodes.transaction === "string") {
    codes.push(resultCodes.transaction);
  }
  if ("operations" in resultCodes && Array.isArray(resultCodes.operations)) {
    codes.push(...resultCodes.operations.filter((code): code is string => typeof code === "string"));
  }
  return codes;
}

// Traduce errores frecuentes de wallet, red y Horizon a una causa + acción entendible.
export function onboardingErrorMessage(error: unknown, fallback: string): string {
  const codes = horizonResultCodes(error);
  if (codes.some((code) => code === "op_low_reserve" || code === "op_underfunded" || code === "tx_insufficient_balance")) {
    return "La cuenta no tiene XLM de prueba suficiente para la reserva o la comisión. Volvé al paso 2, activá la cuenta con Friendbot y probá otra vez.";
  }
  if (codes.some((code) => code === "tx_bad_seq")) {
    return "La cuenta quedó sincronizando con la red. Esperá unos segundos y probá de nuevo.";
  }
  if (codes.some((code) => code === "op_no_trust")) {
    return "La cuenta todavía no tiene USDC de prueba habilitado. Completá el paso 3 y probá otra vez.";
  }

  const raw = error instanceof Error ? error.message : "";
  const lower = raw.toLowerCase();
  if (lower.includes("reject") || lower.includes("denied") || lower.includes("cancelled") || lower.includes("canceled")) {
    return "La firma fue cancelada o rechazada en la wallet. Tocá el botón otra vez y aceptá la firma para continuar.";
  }
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("network error")) {
    return "No pudimos conectarnos con Stellar Testnet. Revisá tu conexión a internet y probá de nuevo.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "Stellar Testnet tardó demasiado en responder. Esperá unos segundos y probá de nuevo.";
  }
  if (lower.includes("network") && lower.includes("passphrase")) {
    return "La wallet parece estar en otra red. Cambiala a Stellar Testnet y probá de nuevo.";
  }
  if (raw.trim()) {
    return `${fallback} ${raw} Probá de nuevo en unos segundos.`;
  }
  return `${fallback} Probá de nuevo en unos segundos.`;
}

