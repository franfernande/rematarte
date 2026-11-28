import { readFile } from "@/lib/store";

// Serves the images uploaded from /admin. The store is private, so they go through here.
// Each upload gets a new name, so the response can be cached for good.
export async function GET(_request: Request, { params }: RouteContext<"/api/imagenes/[archivo]">) {
  const { archivo } = await params;
  if (!/^[a-z0-9-]+\.(jpg|png|webp)$/.test(archivo)) return new Response("No encontrada", { status: 404 });

  try {
    const file = await readFile(`imagenes/${archivo}`);
    if (!file) return new Response("No encontrada", { status: 404 });
    return new Response(file.body as BodyInit, {
      headers: {
        "content-type": file.contentType,
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (cause) {
    console.error("[api/imagenes]", cause);
    return new Response("No disponible", { status: 503 });
  }
}
