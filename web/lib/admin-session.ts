// Admin session: a cookie "v1.<expires>.<hmac>" signed with ADMIN_SESSION_SECRET.
// Only uses Web Crypto so it runs the same in proxy.ts, route handlers and server actions.

export const ADMIN_COOKIE = "artemi_admin";
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sessionSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD) && sessionSecret() !== null;
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return base64url(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

// Compares digests so the time taken does not depend on where the inputs differ.
export async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const x = new Uint8Array(da);
  const y = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < x.length; i += 1) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function createSessionToken(nowSeconds = Math.floor(Date.now() / 1000)): Promise<string> {
  const secret = sessionSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET no está configurado (mínimo 32 caracteres).");
  const expires = nowSeconds + ADMIN_SESSION_SECONDS;
  return `v1.${expires}.${await hmac(secret, `admin:${expires}`)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const secret = sessionSecret();
  if (!secret || !token) return false;
  const [version, expiresText, signature] = token.split(".");
  if (version !== "v1" || !/^\d+$/.test(expiresText ?? "") || !signature) return false;
  const expires = Number(expiresText);
  if (expires <= nowSeconds) return false;
  return constantTimeEqual(signature, await hmac(secret, `admin:${expires}`));
}

export async function checkAdminPassword(password: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return constantTimeEqual(password, expected);
}

// For route handlers: reads the cookie from the request.
export async function requestIsAdmin(request: Request): Promise<boolean> {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`))
    ?.slice(ADMIN_COOKIE.length + 1);
  return verifySessionToken(token ? decodeURIComponent(token) : undefined);
}
