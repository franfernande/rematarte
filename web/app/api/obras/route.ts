import { revalidateTag } from "next/cache";
import { StrKey } from "@stellar/stellar-sdk";
import { z } from "zod";
import { requestIsAdmin } from "@/lib/admin-session";
import { AdminKeyError, createAuctionAsAdmin } from "@/lib/admin-stellar";
import { OBRAS_CACHE_TAG, obraSlugTaken, saveObraCargada } from "@/lib/data";
import { STROOPS_PER_USDC, parseUsdc } from "@/lib/format";
import { StoreUnavailableError, writeFile } from "@/lib/store";

// Vercel rejects request bodies over 4.5 MB; the form shrinks photos before sending them.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
// The contract needs end_time in the future; a minimum margin avoids auctions that close while being created.
const MIN_CLOSE_SECONDS = 5 * 60;

const wallet = z.string().trim().refine((value) => StrKey.isValidEd25519PublicKey(value), "wallet");

const obraFormSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug").max(80, "slug"),
  titulo: z.string().trim().min(1, "titulo").max(120, "titulo"),
  artista: z.string().trim().min(1, "artista").max(80, "artista"),
  tecnica: z.string().trim().min(1, "tecnica").max(120, "tecnica"),
  medidas: z.string().trim().min(1, "medidas").max(60, "medidas"),
  anio: z.coerce.number().int("anio").min(1000, "anio").max(new Date().getFullYear() + 1, "anio"),
  descripcion: z.string().trim().max(2000, "descripcion"),
  alt: z.string().trim().max(300, "alt").optional(),
  precio: z.string().trim(),
  incremento: z.string().trim(),
  porcentaje: z.coerce.number().int("porcentaje").min(0, "porcentaje").max(100, "porcentaje"),
  cierre: z.iso.datetime({ offset: true, message: "cierre" }),
  artistWallet: wallet,
  venueWallet: wallet,
});

const FIELD_ERRORS: Record<string, string> = {
  slug: "El slug va en minúsculas, con guiones y hasta 80 caracteres.",
  titulo: "Falta el título (hasta 120 caracteres).",
  artista: "Falta el nombre de la artista.",
  tecnica: "Falta la técnica.",
  medidas: "Faltan las medidas.",
  anio: "El año no es válido.",
  descripcion: "La descripción puede tener hasta 2000 caracteres.",
  alt: "La descripción de la imagen puede tener hasta 300 caracteres.",
  porcentaje: "El porcentaje de la artista es un entero de 0 a 100.",
  cierre: "La fecha de cierre no es válida.",
  artistWallet: "La wallet de la artista tiene que ser una dirección G… válida.",
  venueWallet: "La wallet del espacio tiene que ser una dirección G… válida.",
};

function error(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

// Trusts the file bytes, not the type the browser declares.
function imageKind(bytes: Uint8Array): { ext: string; type: string } | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return { ext: "png", type: "image/png" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { ext: "webp", type: "image/webp" };
  return null;
}

function usdcToNumber(value: bigint): number {
  return Number(value) / Number(STROOPS_PER_USDC);
}

export async function POST(request: Request) {
  if (!(await requestIsAdmin(request))) return error("Tu sesión de admin venció. Volvé a entrar.", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error("No pudimos leer el formulario. Si la imagen es muy grande, probá con una más liviana.");
  }

  const parsed = obraFormSchema.safeParse(Object.fromEntries([...form].filter(([, value]) => typeof value === "string")));
  if (!parsed.success) {
    const key = parsed.error.issues[0]?.path[0];
    return error(FIELD_ERRORS[String(key)] ?? "Revisá los datos de la obra.");
  }
  const data = parsed.data;

  const minPrice = parseUsdc(data.precio);
  const minIncrement = parseUsdc(data.incremento);
  if (!minPrice || !minIncrement) return error("Revisá el precio base y el incremento en USDC (mayores a 0).");

  const endTime = Math.floor(new Date(data.cierre).getTime() / 1000);
  if (endTime < Math.floor(Date.now() / 1000) + MIN_CLOSE_SECONDS) {
    return error("El cierre tiene que ser al menos 5 minutos en el futuro.");
  }

  const image = form.get("imagen");
  if (!(image instanceof File) || image.size === 0) return error("Falta la imagen de la obra.");
  if (image.size > MAX_IMAGE_BYTES) return error("La imagen no puede pasar de 4 MB.");
  const bytes = new Uint8Array(await image.arrayBuffer());
  const kind = imageKind(bytes);
  if (!kind) return error("La imagen tiene que ser JPG, PNG o WebP.");

  try {
    if (await obraSlugTaken(data.slug)) return error("Ya hay una obra con ese slug. Cambiá el título o el slug.", 409);

    // The image goes first: if it fails, no auction is left without an obra.
    const imageFile = `${data.slug}-${Date.now().toString(36)}.${kind.ext}`;
    await writeFile(`imagenes/${imageFile}`, bytes, kind.type);

    const { auctionId, hash } = await createAuctionAsAdmin({
      artist: data.artistWallet,
      venue: data.venueWallet,
      artistBps: data.porcentaje * 100,
      minPrice,
      minIncrement,
      endTime,
    });

    await saveObraCargada({
      slug: data.slug,
      titulo: data.titulo,
      artista: data.artista,
      tecnica: data.tecnica,
      medidas: data.medidas,
      anio: data.anio,
      descripcion: data.descripcion,
      imagen: `/api/imagenes/${imageFile}`,
      ...(data.alt ? { alt: data.alt } : {}),
      precioMinimoUsdc: usdcToNumber(minPrice),
      incrementoMinimoUsdc: usdcToNumber(minIncrement),
      porcentajeArtista: data.porcentaje,
      cierre: new Date(endTime * 1000).toISOString(),
      auctionId,
    });
    revalidateTag(OBRAS_CACHE_TAG, { expire: 0 });

    return Response.json({ ok: true, slug: data.slug, auctionId, hash });
  } catch (cause) {
    if (cause instanceof StoreUnavailableError || cause instanceof AdminKeyError) return error(cause.message, 503);
    console.error("[api/obras]", cause);
    return error(cause instanceof Error ? cause.message : "No pudimos guardar la obra. Probá de nuevo.", 500);
  }
}
