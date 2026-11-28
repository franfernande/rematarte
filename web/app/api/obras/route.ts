import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Obra } from "@/lib/data";
import { readAuction } from "@/lib/auction";
import { STROOPS_PER_USDC, parseUsdc } from "@/lib/format";

const obraPayloadSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  titulo: z.string().min(1),
  artista: z.string().min(1),
  tecnica: z.string().min(1),
  medidas: z.string().min(1),
  anio: z.coerce.number().int(),
  descripcion: z.string(),
  precioMinimoUsdc: z.coerce.number().positive(),
  incrementoMinimoUsdc: z.coerce.number().positive(),
  porcentajeArtista: z.coerce.number().min(0).max(100),
  cierre: z.string(),
  auctionId: z.coerce.number().int().nonnegative(),
  artistWallet: z.string(),
  venueWallet: z.string(),
});

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function atomicWrite(file: string, data: string | Buffer) {
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, data);
  fs.renameSync(temporary, file);
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isoWithLocalOffset(value: string): string {
  const date = new Date(value);
  const offset = -date.getTimezoneOffset();
  const sign = Math.sign(offset) < 0 ? "-" : "+";
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offset) % 60).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00${sign}${hours}:${minutes}`;
}

function readDeploy(dataDir: string): { subastas?: Record<string, number> } {
  const deployPath = path.join(dataDir, "deploy.testnet.json");
  return JSON.parse(fs.readFileSync(deployPath, "utf8")) as { subastas?: Record<string, number> };
}

function readObras(dataDir: string): { obras: Obra[]; realObrasPath: string } {
  const realObrasPath = path.join(dataDir, "obras.json");
  const sourcePath = fs.existsSync(realObrasPath) ? realObrasPath : path.join(dataDir, "mocks", "obras.json");
  return {
    obras: JSON.parse(fs.readFileSync(sourcePath, "utf8")) as Obra[],
    realObrasPath,
  };
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return errorResponse("La carga desde la web solo está disponible en la demo local", 403);
  }

  try {
    const formData = await request.formData();
    const image = formData.get("imagen");

    if (!(image instanceof File)) return errorResponse("Falta la imagen");
    if (image.size > 5 * 1024 * 1024) return errorResponse("La imagen no puede pasar de 5 MB");

    const extension = imageExtensions[image.type];
    if (!extension) return errorResponse("La imagen tiene que ser JPG, PNG o WebP");

    const parsed = obraPayloadSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return errorResponse("Los datos de la obra no son válidos");

    const payload = parsed.data;
    if (payload.slug.includes("..") || payload.slug.includes("/")) return errorResponse("Slug inválido");

    const minPrice = parseUsdc(String(formData.get("precio")));
    const minIncrement = parseUsdc(String(formData.get("incremento")));
    if (!minPrice || !minIncrement) return errorResponse("Montos inválidos");

    const endTime = Math.floor(new Date(payload.cierre).getTime() / 1000);
    const artistBps = Math.round(payload.porcentajeArtista * 100);
    const auction = await readAuction(payload.auctionId);
    const auctionMatches =
      auction.artist === payload.artistWallet &&
      auction.venue === payload.venueWallet &&
      auction.minPrice === minPrice &&
      auction.minIncrement === minIncrement &&
      auction.endTime === endTime &&
      auction.artistBps === artistBps;

    if (!auctionMatches) {
      return errorResponse("La subasta on-chain no coincide con los datos de la obra", 409);
    }

    const root = process.cwd();
    const dataDir = path.join(root, "data");
    const deployPath = path.join(dataDir, "deploy.testnet.json");
    const deploy = readDeploy(dataDir);
    const auctionAlreadyAssigned = Object.entries(deploy.subastas ?? {}).some(
      ([slug, auctionId]) => auctionId === payload.auctionId && slug !== payload.slug,
    );

    if (auctionAlreadyAssigned) {
      return errorResponse("Esa subasta ya está asignada a otra obra. Elegí una subasta nueva para no mezclar las pujas.", 409);
    }

    const { obras, realObrasPath } = readObras(dataDir);
    if (obras.some((obra) => obra.slug === payload.slug)) {
      return errorResponse("Ya existe una obra con ese slug. Elegí otro nombre o slug.", 409);
    }

    const imagePath = `/obras/${payload.slug}.${extension}`;
    obras.push({
      slug: payload.slug,
      titulo: payload.titulo,
      artista: payload.artista,
      tecnica: payload.tecnica,
      medidas: payload.medidas,
      anio: payload.anio,
      descripcion: payload.descripcion,
      imagen: imagePath,
      precioMinimoUsdc: Number(minPrice) / Number(STROOPS_PER_USDC),
      incrementoMinimoUsdc: Number(minIncrement) / Number(STROOPS_PER_USDC),
      porcentajeArtista: payload.porcentajeArtista,
      cierre: isoWithLocalOffset(payload.cierre),
    });

    atomicWrite(realObrasPath, `${JSON.stringify(obras, null, 2)}\n`);
    deploy.subastas = { ...deploy.subastas, [payload.slug]: payload.auctionId };
    atomicWrite(deployPath, `${JSON.stringify(deploy, null, 2)}\n`);

    const imagesDir = path.join(root, "public", "obras");
    fs.mkdirSync(imagesDir, { recursive: true });
    atomicWrite(path.join(imagesDir, `${payload.slug}.${extension}`), Buffer.from(await image.arrayBuffer()));

    return NextResponse.json({ ok: true, slug: payload.slug });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "No pudimos guardar la obra", 500);
  }
}
