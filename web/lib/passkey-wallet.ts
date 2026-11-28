import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";

export type LocalWalletKind = "passkey" | "device";
export type WalletKind = LocalWalletKind | "external";

export type LocalWallet = {
  kind: LocalWalletKind;
  keypair: Keypair;
  credentialId?: string;
};

export type StoredWalletSession = {
  kind: LocalWalletKind;
  credentialId?: string;
  publicKey: string;
};

export type PrfSupport = "unknown" | "supported" | "unsupported";

const SESSION_STORAGE_KEY = "rematarte.local-wallet";
const DEVICE_SECRET_STORAGE_KEY = "rematarte.device-wallet-secret";
const SALT_INPUT = "rematarte/stellar/v1";
const SEED_SUFFIX = "rematarte-stellar-seed-v1";
const textEncoder = new TextEncoder();

export class PasskeyWalletError extends Error {
  readonly code: "unsupported" | "cancelled" | "prf-unavailable" | "mismatch" | "unknown";

  constructor(code: PasskeyWalletError["code"], message: string) {
    super(message);
    this.name = "PasskeyWalletError";
    this.code = code;
  }
}

function concatBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  const output = new Uint8Array(left.length + right.length);
  output.set(left, 0);
  output.set(right, left.length);
  return output;
}

function toBytes(value: ArrayBuffer | ArrayBufferView): Uint8Array {
  return value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

function exactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const output = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(output).set(bytes);
  return output;
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", exactArrayBuffer(bytes)));
}

async function prfSalt(): Promise<Uint8Array> {
  return sha256(textEncoder.encode(SALT_INPUT));
}

function extensionResults(credential: PublicKeyCredential): { first?: Uint8Array } {
  const results = credential.getClientExtensionResults() as {
    prf?: { results?: { first?: ArrayBuffer | ArrayBufferView }; enabled?: boolean };
  };
  const first = results.prf?.results?.first;
  return { first: first ? toBytes(first) : undefined };
}

async function deriveKeypair(prfOutput: Uint8Array): Promise<Keypair> {
  const seed = await sha256(concatBytes(prfOutput, textEncoder.encode(SEED_SUFFIX)));
  return Keypair.fromRawEd25519Seed(seed);
}

// WebAuthn rejects IP addresses as relying-party IDs ("This is an invalid domain"), e.g. the 127.0.0.1 preview or a LAN IP.
function hostAllowsPasskeys(): boolean {
  const host = window.location.hostname;
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
  return window.isSecureContext && !isIp;
}

export function webAuthnAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.PublicKeyCredential && navigator.credentials) &&
    hostAllowsPasskeys()
  );
}

export async function detectPrfSupport(): Promise<PrfSupport> {
  if (!webAuthnAvailable()) return "unsupported";
  const capabilitiesApi = PublicKeyCredential as unknown as {
    getClientCapabilities?: () => Promise<Record<string, boolean>>;
  };
  if (!capabilitiesApi.getClientCapabilities) return "unknown";
  try {
    const capabilities = await capabilitiesApi.getClientCapabilities();
    if (capabilities["extension:prf"] === true || capabilities.prf === true) return "supported";
    return "unsupported";
  } catch {
    return "unknown";
  }
}

function publicKeyOptionsExtensions(salt: Uint8Array): AuthenticationExtensionsClientInputs {
  return { prf: { eval: { first: exactArrayBuffer(salt) } } } as AuthenticationExtensionsClientInputs;
}

function webAuthnError(error: unknown): PasskeyWalletError {
  if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "AbortError")) {
    return new PasskeyWalletError("cancelled", "Cancelaste la huella o el PIN.");
  }
  if (error instanceof DOMException && error.name === "NotSupportedError") {
    return new PasskeyWalletError("unsupported", "Tu navegador no soporta passkeys.");
  }
  if (error instanceof DOMException && error.name === "SecurityError") {
    return new PasskeyWalletError("unsupported", "Las passkeys no funcionan en esta dirección. Creá la cuenta en este dispositivo.");
  }
  return new PasskeyWalletError("unknown", error instanceof Error ? error.message : "No pudimos usar la passkey.");
}

async function keypairFromAssertion(assertion: PublicKeyCredential): Promise<Keypair> {
  const { first } = extensionResults(assertion);
  if (!first || first.length !== 32) {
    throw new PasskeyWalletError("prf-unavailable", "Esta passkey no expone la extensión PRF.");
  }
  return deriveKeypair(first);
}

function saveSession(session: StoredWalletSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function loadStoredWalletSession(): StoredWalletSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredWalletSession>;
    if ((parsed.kind === "passkey" || parsed.kind === "device") && typeof parsed.publicKey === "string") {
      return { kind: parsed.kind, publicKey: parsed.publicKey, credentialId: parsed.credentialId };
    }
  } catch {
    // Datos locales corruptos: se ignora la sesión recordada.
  }
  return null;
}

export function clearStoredWalletSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function createPasskeyWallet(): Promise<LocalWallet> {
  if (!webAuthnAvailable()) throw new PasskeyWalletError("unsupported", "Tu navegador no soporta passkeys.");
  const salt = await prfSalt();
  const extensions = publicKeyOptionsExtensions(salt);
  const userId = randomBytes(16);

  let credential: PublicKeyCredential | null;
  try {
    credential = (await navigator.credentials.create({
      publicKey: {
        rp: { name: "Artemi" },
        user: {
          id: exactArrayBuffer(userId),
          name: `visitante-${base64UrlEncode(userId)}`,
          displayName: "Visitante de Artemi",
        },
        challenge: exactArrayBuffer(randomBytes(32)),
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          residentKey: "required",
          userVerification: "required",
        },
        timeout: 60_000,
        attestation: "none",
        extensions,
      },
    })) as PublicKeyCredential | null;
  } catch (error) {
    throw webAuthnError(error);
  }

  if (!credential) throw new PasskeyWalletError("cancelled", "Cancelaste la huella o el PIN.");
  let keypair: Keypair;
  try {
    keypair = await keypairFromAssertion(credential);
  } catch (error) {
    if (!(error instanceof PasskeyWalletError) || error.code !== "prf-unavailable") throw error;
    const rawId = toBytes(credential.rawId);
    let assertion: PublicKeyCredential | null;
    try {
      assertion = (await navigator.credentials.get({
        publicKey: {
          challenge: exactArrayBuffer(randomBytes(32)),
          allowCredentials: [{ type: "public-key", id: exactArrayBuffer(rawId) }],
          userVerification: "required",
          timeout: 60_000,
          extensions,
        },
      })) as PublicKeyCredential | null;
    } catch (getError) {
      throw webAuthnError(getError);
    }
    if (!assertion) throw new PasskeyWalletError("cancelled", "Cancelaste la huella o el PIN.");
    keypair = await keypairFromAssertion(assertion);
  }

  const credentialId = base64UrlEncode(toBytes(credential.rawId));
  saveSession({ kind: "passkey", credentialId, publicKey: keypair.publicKey() });
  return { kind: "passkey", keypair, credentialId };
}

export async function loginPasskeyWallet(options?: { persist?: boolean }): Promise<LocalWallet> {
  if (!webAuthnAvailable()) throw new PasskeyWalletError("unsupported", "Tu navegador no soporta passkeys.");
  const salt = await prfSalt();
  let assertion: PublicKeyCredential | null;
  try {
    assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: exactArrayBuffer(randomBytes(32)),
        userVerification: "required",
        timeout: 60_000,
        extensions: publicKeyOptionsExtensions(salt),
      },
    })) as PublicKeyCredential | null;
  } catch (error) {
    throw webAuthnError(error);
  }
  if (!assertion) throw new PasskeyWalletError("cancelled", "Cancelaste la huella o el PIN.");
  const keypair = await keypairFromAssertion(assertion);
  const credentialId = base64UrlEncode(toBytes(assertion.rawId));
  if (options?.persist !== false) saveSession({ kind: "passkey", credentialId, publicKey: keypair.publicKey() });
  return { kind: "passkey", keypair, credentialId };
}

export function createDeviceWallet(): LocalWallet {
  // Never replace an existing device account: it may hold USDC, a live bid or a pending refund.
  const existing = loadDeviceWallet();
  if (existing) {
    saveSession({ kind: "device", publicKey: existing.keypair.publicKey() });
    return existing;
  }
  const keypair = Keypair.random();
  localStorage.setItem(DEVICE_SECRET_STORAGE_KEY, keypair.secret());
  saveSession({ kind: "device", publicKey: keypair.publicKey() });
  return { kind: "device", keypair };
}

export function loadDeviceWallet(): LocalWallet | null {
  if (typeof window === "undefined") return null;
  const secret = localStorage.getItem(DEVICE_SECRET_STORAGE_KEY);
  if (!secret) return null;
  try {
    return { kind: "device", keypair: Keypair.fromSecret(secret) };
  } catch {
    return null;
  }
}

export function signWithLocalKeypair(
  keypair: Keypair,
  xdr: string,
  expectedNetworkPassphrase: string,
  opts?: { networkPassphrase?: string },
): { signedTxXdr: string; signerAddress: string } {
  const networkPassphrase = opts?.networkPassphrase ?? expectedNetworkPassphrase;
  if (networkPassphrase !== expectedNetworkPassphrase) {
    throw new Error("La transacción no es de Stellar Testnet; no la vamos a firmar.");
  }
  const transaction = TransactionBuilder.fromXdr(xdr, networkPassphrase);
  transaction.sign(keypair);
  return { signedTxXdr: transaction.toXdr(), signerAddress: keypair.publicKey() };
}

export function passkeyErrorMessage(error: unknown): string {
  if (error instanceof PasskeyWalletError) {
    if (error.code === "cancelled") return "Cancelaste la huella o el PIN.";
    if (error.code === "unsupported") return "Tu navegador no soporta passkeys.";
    if (error.code === "prf-unavailable") return "Este autenticador no soporta la extensión PRF necesaria para recuperar la misma wallet.";
    if (error.code === "mismatch") return "Esa passkey abrió otra cuenta. Usá la passkey con la que entraste antes.";
  }
  return error instanceof Error && error.message ? error.message : "No pudimos usar la passkey.";
}
