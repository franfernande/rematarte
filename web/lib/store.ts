import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { BlobNotFoundError, get, list, put } from "@vercel/blob";

// Storage for what the web writes at runtime: obras uploaded by the admin, their images and bidder contacts.
// On Vercel the filesystem is read-only, so production uses a *private* Vercel Blob store
// store. Locally, without Blob credentials, everything lives in web/.data/ (gitignored).
//
// Vercel connects a Blob store in one of three ways, and all of them are accepted:
// - BLOB_READ_WRITE_TOKEN (classic),
// - <PREFIX>_BLOB_READ_WRITE_TOKEN or <PREFIX>_READ_WRITE_TOKEN when a custom prefix is chosen,
// - BLOB_STORE_ID with OIDC (the SDK gets the token from the function by itself).

export class StoreUnavailableError extends Error {
  constructor() {
    super("Falta configurar el almacenamiento (BLOB_READ_WRITE_TOKEN en Vercel).");
  }
}

function blobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const prefixed = Object.keys(process.env).find(
    (name) => /READ_WRITE_TOKEN$/.test(name) && process.env[name]?.startsWith("vercel_blob_rw_"),
  );
  return prefixed ? process.env[prefixed] : undefined;
}

function blobConfigured(): boolean {
  return Boolean(blobToken() || process.env.BLOB_STORE_ID);
}

// Only passes the token when it was found under another name; otherwise the SDK reads the env itself.
function auth(): { token?: string } {
  const token = blobToken();
  return token && token !== process.env.BLOB_READ_WRITE_TOKEN ? { token } : {};
}

export type StoredFile = { body: ReadableStream<Uint8Array> | Uint8Array; contentType: string };

type Backend = {
  readText(key: string): Promise<string | null>;
  writeText(key: string, text: string): Promise<void>;
  readFile(key: string): Promise<StoredFile | null>;
  writeFile(key: string, data: Uint8Array, contentType: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
};

const KEY = /^[a-z0-9][a-z0-9_-]*(?:\/[a-zA-Z0-9][a-zA-Z0-9_.-]*)+$/;

function checkKey(key: string): string {
  if (!KEY.test(key) || key.includes("..")) throw new Error(`Clave de almacenamiento inválida: ${key}`);
  return key;
}

const blobBackend: Backend = {
  async readText(key) {
    const result = await get(checkKey(key), { access: "private", useCache: false, ...auth() }).catch((error: unknown) => {
      if (error instanceof BlobNotFoundError) return null;
      throw error;
    });
    if (!result || result.statusCode !== 200) return null;
    return new Response(result.stream).text();
  },
  async writeText(key, text) {
    await put(checkKey(key), text, {
      ...auth(),
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  },
  async readFile(key) {
    const result = await get(checkKey(key), { access: "private", ...auth() }).catch((error: unknown) => {
      if (error instanceof BlobNotFoundError) return null;
      throw error;
    });
    if (!result || result.statusCode !== 200) return null;
    return { body: result.stream, contentType: result.blob.contentType };
  },
  async writeFile(key, data, contentType) {
    await put(checkKey(key), Buffer.from(data), {
      ...auth(),
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType,
    });
  },
  async list(prefix) {
    const keys: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, ...auth() });
      keys.push(...page.blobs.map((blob) => blob.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return keys;
  },
};

const FS_ROOT = path.join(process.cwd(), ".data");
const CONTENT_TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

function fsPath(key: string): string {
  return path.join(FS_ROOT, ...checkKey(key).split("/"));
}

async function readOrNull(file: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function atomicWrite(file: string, data: string | Uint8Array) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, data);
  await fs.rename(temporary, file);
}

const fsBackend: Backend = {
  async readText(key) {
    return (await readOrNull(fsPath(key)))?.toString("utf-8") ?? null;
  },
  async writeText(key, text) {
    await atomicWrite(fsPath(key), text);
  },
  async readFile(key) {
    const data = await readOrNull(fsPath(key));
    if (!data) return null;
    return { body: new Uint8Array(data), contentType: CONTENT_TYPES[path.extname(key)] ?? "application/octet-stream" };
  },
  async writeFile(key, data) {
    await atomicWrite(fsPath(key), data);
  },
  async list(prefix) {
    const dir = path.join(FS_ROOT, ...prefix.replace(/\/$/, "").split("/"));
    try {
      const names = await fs.readdir(dir);
      return names.filter((name) => !name.endsWith(".tmp")).map((name) => `${prefix.replace(/\/$/, "")}/${name}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  },
};

function backend(): Backend {
  if (blobConfigured()) return blobBackend;
  // Vercel functions cannot write to disk: without a Blob store there is nowhere to save.
  if (process.env.VERCEL) {
    console.error("[store] No hay credenciales de Vercel Blob: falta BLOB_READ_WRITE_TOKEN o BLOB_STORE_ID en este deploy.");
    throw new StoreUnavailableError();
  }
  return fsBackend;
}

export function storeConfigured(): boolean {
  return blobConfigured() || !process.env.VERCEL;
}

export async function readJson(key: string): Promise<unknown> {
  const text = await backend().readText(key);
  return text === null ? null : JSON.parse(text);
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await backend().writeText(key, `${JSON.stringify(value, null, 2)}\n`);
}

export async function readFile(key: string): Promise<StoredFile | null> {
  return backend().readFile(key);
}

export async function writeFile(key: string, data: Uint8Array, contentType: string): Promise<void> {
  await backend().writeFile(key, data, contentType);
}

export async function listKeys(prefix: string): Promise<string[]> {
  return backend().list(prefix);
}
