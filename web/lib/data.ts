import "server-only";

import fs from "node:fs";
import path from "node:path";
import { StrKey } from "@stellar/stellar-sdk";
import { z } from "zod";

// Shapes agreed in docs/plan.md: I2 (obras.json, owned by G3) and I3 (deploy.testnet.json, owned by G1).

const contractId = z
  .string()
  .refine((value) => StrKey.isValidContract(value), "ID de contrato inválido (C...)");
const accountId = z
  .string()
  .refine((value) => StrKey.isValidEd25519PublicKey(value), "Cuenta inválida (G...)");

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El slug va en minúsculas y con guiones");

const obraSchema = z.object({
  slug: slugSchema,
  titulo: z.string().min(1),
  artista: z.string().min(1),
  artistaSlug: slugSchema.optional(),
  tecnica: z.string().min(1),
  medidas: z.string().min(1),
  anio: z.number().int(),
  descripcion: z.string(),
  imagen: z.string().startsWith("/"),
  alt: z.string().optional(),
  reproduccion: z.object({
    coleccion: z.string(),
    inventario: z.string(),
    catalogo: z.url({ protocol: /^https$/ }),
    fuente: z.url({ protocol: /^https$/ }),
    credito: z.string(),
    licencia: z.string(),
  }).optional(),
  precioMinimoUsdc: z.number().positive(),
  incrementoMinimoUsdc: z.number().positive(),
  porcentajeArtista: z.number().min(0).max(100),
  cierre: z.iso.datetime({ offset: true }),
});

const obrasSchema = z
  .array(obraSchema)
  .refine((obras) => new Set(obras.map((obra) => obra.slug)).size === obras.length, "Hay slugs repetidos");

const artistaSchema = z.object({
  slug: slugSchema,
  nombre: z.string().min(1),
  disciplina: z.string().optional(),
  referencia: z.url({ protocol: /^https$/ }).optional(),
  proximas: z.array(z.object({
    titulo: z.string().min(1),
    imagen: z.string().startsWith("/"),
    alt: z.string().min(1),
    ficha: z.string().min(1),
    credito: z.string().min(1),
    fuente: z.url({ protocol: /^https$/ }),
  })).optional(),
  fuenteRetrato: z.url({ protocol: /^https$/ }).optional(),
  creditoRetrato: z.string().optional(),
  bio: z.string().min(1).max(280),
  origen: z.string().min(1).optional(),
  imagen: z.string().startsWith("/").optional(),
});

const artistasSchema = z
  .array(artistaSchema)
  .refine((artistas) => new Set(artistas.map((artista) => artista.slug)).size === artistas.length, "Hay slugs repetidos");

const deploySchema = z.object({
  network: z.literal("testnet"),
  rpcUrl: z.url(),
  networkPassphrase: z.string().min(1),
  auctionContractId: contractId,
  usdc: z.object({
    code: z.string().min(1).max(12),
    issuer: accountId,
    sacId: contractId,
  }),
  subastas: z.record(z.string(), z.number().int().nonnegative()),
});

export type Obra = z.infer<typeof obraSchema>;
export type Artista = z.infer<typeof artistaSchema>;
export type ArtistaConObras = Artista & { obras: Obra[] };
export type DeployConfig = z.infer<typeof deploySchema>;
export type DataSource = "real" | "mock";

const DATA_DIR = path.join(process.cwd(), "data");
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const DATA_FILES = ["obras.json", "artistas.json", "deploy.testnet.json"] as const;
type DataFile = (typeof DATA_FILES)[number];

type DataFileState = {
  source: DataSource;
  filePath: string;
  mtimeMs: number;
  size: number;
};

type DataFileStates = Record<DataFile, DataFileState>;

// Falls back to data/mocks/ until the owner commits the real file (today only obras.json, from G3).
function resolveJsonFile(file: string): DataFileState {
  const realPath = path.join(DATA_DIR, file);
  const source: DataSource = fs.existsSync(realPath) ? "real" : "mock";
  const filePath = source === "real" ? realPath : path.join(DATA_DIR, "mocks", file);
  const stat = fs.statSync(filePath);
  return { source, filePath, mtimeMs: stat.mtimeMs, size: stat.size };
}

function resolveDataFiles(): DataFileStates {
  return {
    "obras.json": resolveJsonFile("obras.json"),
    "artistas.json": resolveJsonFile("artistas.json"),
    "deploy.testnet.json": resolveJsonFile("deploy.testnet.json"),
  };
}

function loadJson<T>(schema: z.ZodType<T>, fileState: DataFileState): { data: T; source: DataSource } {
  const parsed = schema.safeParse(JSON.parse(fs.readFileSync(fileState.filePath, "utf-8")));
  if (!parsed.success) {
    const relative = path.relative(process.cwd(), fileState.filePath);
    throw new Error(`${relative} no respeta el formato de docs/plan.md:
${z.prettifyError(parsed.error)}`);
  }
  return { data: parsed.data, source: fileState.source };
}

function sameFileState(a: DataFileState, b: DataFileState): boolean {
  return a.source === b.source && a.filePath === b.filePath && a.mtimeMs === b.mtimeMs && a.size === b.size;
}

function dataFilesChanged(files: DataFileStates): boolean {
  return DATA_FILES.some((file) => !sameFileState(files[file], resolveJsonFile(file)));
}

function slugifyArtistaName(nombre: string): string {
  const slug = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "artista";
}

function uniqueArtistaSlug(base: string, used: Set<string>): string {
  let slug = base;
  let suffix = 2;
  while (used.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

function minimalArtist(slug: string, nombre: string): ArtistaConObras {
  return {
    slug,
    nombre,
    bio: "Ficha biográfica en preparación.",
    obras: [],
  };
}

function buildArtistasConObras(fichas: Artista[], obrasData: Obra[]): ArtistaConObras[] {
  const bySlug = new Map<string, ArtistaConObras>();
  const slugByExactName = new Map<string, string>();
  const generatedSlugByName = new Map<string, string>();
  const used = new Set<string>();

  for (const ficha of fichas) {
    bySlug.set(ficha.slug, { ...ficha, obras: [] });
    slugByExactName.set(ficha.nombre, ficha.slug);
    used.add(ficha.slug);
  }

  for (const obra of obrasData) {
    let slug = obra.artistaSlug ?? slugByExactName.get(obra.artista) ?? generatedSlugByName.get(obra.artista);

    if (!slug) {
      slug = uniqueArtistaSlug(slugifyArtistaName(obra.artista), used);
      generatedSlugByName.set(obra.artista, slug);
    }

    if (!bySlug.has(slug)) {
      bySlug.set(slug, minimalArtist(slug, obra.artista));
    }
    used.add(slug);
    bySlug.get(slug)?.obras.push(obra);
  }

  return [...bySlug.values()];
}

type DataSnapshot = {
  files: DataFileStates;
  obras: { data: Obra[]; source: DataSource };
  artistas: { data: Artista[]; source: DataSource };
  deploy: { data: DeployConfig; source: DataSource };
  artistasConObras: ArtistaConObras[];
};

function loadSnapshot(): DataSnapshot {
  const files = resolveDataFiles();
  const obras = loadJson(obrasSchema, files["obras.json"]);
  const artistas = loadJson(artistasSchema, files["artistas.json"]);
  const deploy = loadJson(deploySchema, files["deploy.testnet.json"]);
  return {
    files,
    obras,
    artistas,
    deploy,
    artistasConObras: buildArtistasConObras(artistas.data, obras.data),
  };
}

let snapshot = loadSnapshot();

export const dataSources = {
  get obras() {
    return getSnapshot().obras.source;
  },
  get artistas() {
    return getSnapshot().artistas.source;
  },
  get deploy() {
    return getSnapshot().deploy.source;
  },
} as const;

function getSnapshot(): DataSnapshot {
  if (!IS_PRODUCTION && dataFilesChanged(snapshot.files)) {
    snapshot = loadSnapshot();
  }
  return snapshot;
}

export function getObras(): Obra[] {
  return getSnapshot().obras.data;
}

export function getObra(slug: string): Obra | undefined {
  return getSnapshot().obras.data.find((obra) => obra.slug === slug);
}

export function getArtistas(): ArtistaConObras[] {
  return getSnapshot().artistasConObras;
}

export function getArtista(slug: string): ArtistaConObras | undefined {
  return getSnapshot().artistasConObras.find((artista) => artista.slug === slug);
}

export function getArtistaSlugForObra(obra: Obra): string {
  const match = getSnapshot().artistasConObras.find((artista) =>
    artista.obras.some((candidate) => candidate.slug === obra.slug),
  );
  return match?.slug ?? obra.artistaSlug ?? slugifyArtistaName(obra.artista);
}

export function getDeploy(): DeployConfig {
  return getSnapshot().deploy.data;
}
