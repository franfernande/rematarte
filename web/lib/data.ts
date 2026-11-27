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

const obraSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El slug va en minúsculas y con guiones"),
  titulo: z.string().min(1),
  artista: z.string().min(1),
  tecnica: z.string().min(1),
  medidas: z.string().min(1),
  anio: z.number().int(),
  descripcion: z.string(),
  imagen: z.string().startsWith("/"),
  precioMinimoUsdc: z.number().positive(),
  incrementoMinimoUsdc: z.number().positive(),
  porcentajeArtista: z.number().min(0).max(100),
  cierre: z.iso.datetime({ offset: true }),
});

const obrasSchema = z
  .array(obraSchema)
  .refine((obras) => new Set(obras.map((obra) => obra.slug)).size === obras.length, "Hay slugs repetidos");

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
export type DeployConfig = z.infer<typeof deploySchema>;
export type DataSource = "real" | "mock";

const DATA_DIR = path.join(process.cwd(), "data");

// Falls back to data/mocks/ until the owner commits the real file (today only obras.json, from G3).
function loadJson<T>(file: string, schema: z.ZodType<T>): { data: T; source: DataSource } {
  const realPath = path.join(DATA_DIR, file);
  const source: DataSource = fs.existsSync(realPath) ? "real" : "mock";
  const filePath = source === "real" ? realPath : path.join(DATA_DIR, "mocks", file);

  const parsed = schema.safeParse(JSON.parse(fs.readFileSync(filePath, "utf-8")));
  if (!parsed.success) {
    const relative = path.relative(process.cwd(), filePath);
    throw new Error(`${relative} no respeta el formato de docs/plan.md:\n${z.prettifyError(parsed.error)}`);
  }
  return { data: parsed.data, source };
}

const obras = loadJson("obras.json", obrasSchema);
const deploy = loadJson("deploy.testnet.json", deploySchema);

export const dataSources = { obras: obras.source, deploy: deploy.source } as const;

export function getObras(): Obra[] {
  return obras.data;
}

export function getObra(slug: string): Obra | undefined {
  return obras.data.find((obra) => obra.slug === slug);
}

export function getDeploy(): DeployConfig {
  return deploy.data;
}
