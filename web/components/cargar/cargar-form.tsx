"use client";

import { T, TranslatedAttributes } from "@/components/language-switch";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { StrKey } from "@stellar/stellar-sdk";
import { formatUsdc, parseUsdc, txUrl } from "@/lib/format";

type FormState = {
  titulo: string;
  artista: string;
  tecnica: string;
  medidas: string;
  anio: string;
  descripcion: string;
  alt: string;
  precio: string;
  incremento: string;
  porcentaje: string;
  cierre: string;
  artistWallet: string;
  venueWallet: string;
  slug: string;
};

type Created = { slug: string; auctionId: number; hash: string; titulo: string };
type FieldKey = keyof FormState;

const inputClass =
  "mt-1 min-h-11 w-full rounded-sm border border-linea bg-papel px-3 text-base text-tinta outline-none transition-colors " +
  "placeholder:text-piedra focus:border-malbec disabled:opacity-60";
const secondaryLinkClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-tinta/20 px-5 text-sm font-medium text-tinta " +
  "transition-colors hover:border-tinta hover:bg-cal-2";

// Phone photos often weigh 5–10 MB; Vercel accepts up to 4.5 MB per request.
const MAX_SIDE = 2000;
const TARGET_BYTES = 1.5 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/-+$/, "");
}

function localInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function shrinkImage(file: File): Promise<File> {
  if (file.size <= TARGET_BYTES && file.type !== "image/heic") return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (!blob || blob.type !== "image/webp") return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
}

export function CargarForm({ defaults }: { defaults: { venueWallet: string; artistWallet: string } }) {
  const [form, setForm] = useState<FormState>(() => ({
    titulo: "",
    artista: "",
    tecnica: "",
    medidas: "",
    anio: "",
    descripcion: "",
    alt: "",
    precio: "",
    incremento: "",
    porcentaje: "80",
    cierre: "",
    artistWallet: defaults.artistWallet,
    venueWallet: defaults.venueWallet,
    slug: "",
  }));
  const router = useRouter();
  const [slugTouched, setSlugTouched] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [preparingImage, setPreparingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : ""), [image]);
  const [minCierre, setMinCierre] = useState("");

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    // Dates are read after mount: Cache Components prerenders this page and rejects new Date() during render.
    const timer = window.setTimeout(() => {
      setMinCierre(localInputValue(new Date(Date.now() + 10 * 60 * 1000)));
      setForm((current) => (current.anio ? current : { ...current, anio: String(new Date().getFullYear()) }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function update(key: FieldKey, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "titulo" && !slugTouched ? { slug: slugify(value) } : {}),
    }));
  }

  async function chooseImage(file: File | undefined) {
    setError(null);
    if (!file) {
      setImage(null);
      return;
    }
    if (!/^image\//.test(file.type)) {
      setError("Elegí una imagen JPG, PNG o WebP.");
      return;
    }
    setPreparingImage(true);
    try {
      const ready = await shrinkImage(file);
      if (!/^image\/(jpeg|png|webp)$/.test(ready.type)) setError("La imagen tiene que ser JPG, PNG o WebP.");
      else if (ready.size > MAX_UPLOAD_BYTES) setError("La imagen sigue pesando más de 4 MB. Probá con otra.");
      else setImage(ready);
    } finally {
      setPreparingImage(false);
    }
  }

  function validate(): string | null {
    if (!form.titulo.trim() || !form.artista.trim() || !form.tecnica.trim() || !form.medidas.trim()) {
      return "Completá título, artista, técnica y medidas.";
    }
    if (!image) return "Elegí la imagen de la obra.";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) return "El slug va en minúsculas y con guiones (por ejemplo, atardecer-en-uspallata).";
    if (!parseUsdc(form.precio)) return "Ingresá un precio base en USDC mayor a 0.";
    if (!parseUsdc(form.incremento)) return "Ingresá un incremento mínimo en USDC mayor a 0.";
    const percent = Number(form.porcentaje);
    if (!Number.isInteger(percent) || percent < 0 || percent > 100) return "El porcentaje de la artista es un entero de 0 a 100.";
    const close = new Date(form.cierre);
    if (Number.isNaN(close.getTime()) || close.getTime() < Date.now() + 5 * 60 * 1000) {
      return "El cierre tiene que ser al menos 5 minutos en el futuro.";
    }
    if (!StrKey.isValidEd25519PublicKey(form.artistWallet.trim())) return "La wallet de la artista tiene que ser una dirección G… válida.";
    if (!StrKey.isValidEd25519PublicKey(form.venueWallet.trim())) return "La wallet del espacio tiene que ser una dirección G… válida.";
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setCreated(null);

    const problem = validate();
    if (problem || !image) {
      setError(problem ?? "Elegí la imagen de la obra.");
      return;
    }

    const data = new FormData();
    for (const [key, value] of Object.entries(form)) data.set(key, value.trim());
    data.set("cierre", new Date(form.cierre).toISOString());
    data.set("imagen", image);

    setBusy(true);
    try {
      const response = await fetch("/api/obras", { method: "POST", body: data });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        slug?: string;
        auctionId?: number;
        hash?: string;
      };
      if (response.status === 401) {
        router.push("/admin/entrar?volver=/admin/cargar");
        return;
      }
      if (!response.ok || body.slug === undefined || body.auctionId === undefined || !body.hash) {
        throw new Error(body.error || "No pudimos crear la subasta. Probá de nuevo.");
      }
      setCreated({ slug: body.slug, auctionId: body.auctionId, hash: body.hash, titulo: form.titulo.trim() });
      setForm((current) => ({ ...current, titulo: "", slug: "", descripcion: "", alt: "", medidas: "", tecnica: "" }));
      setSlugTouched(false);
      setImage(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos crear la subasta. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  const minPrice = parseUsdc(form.precio);
  const percent = Number(form.porcentaje);

  return (
    <section className="cartela p-5">
      <h1 className="font-serif text-3xl"><T>Cargar una obra</T></h1>
      <p className="mt-2 text-sm text-tinta-2">
        <T>Al guardar, se crea la subasta en el contrato de Stellar Testnet y la obra aparece en la muestra.</T>
      </p>

      {created && (
        <div role="status" className="mt-5 rounded-sm border border-exito/30 bg-exito/5 p-4">
          <p className="font-medium text-exito">
            <T>Listo:</T> «{created.titulo}» <T>ya está en la muestra (subasta</T> #{created.auctionId}).
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link className={secondaryLinkClass} href={`/obra/${created.slug}`}><T>Ver ficha</T></Link>
            <Link className={secondaryLinkClass} href="/qr"><T>Hoja de QR</T></Link>
            <a className={secondaryLinkClass} href={txUrl(created.hash)} target="_blank" rel="noreferrer">
              <T>Ver transacción</T>
            </a>
          </div>
        </div>
      )}

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 grid gap-6" noValidate>
        <fieldset className="grid gap-4" disabled={busy}>
          <legend className="etiqueta mb-1"><T>La obra</T></legend>
          <label className="text-sm font-medium">
            <T>Título</T>
            <input className={inputClass} required maxLength={120} value={form.titulo} onChange={(e) => update("titulo", e.target.value)} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              <T>Artista</T>
              <input className={inputClass} required maxLength={80} value={form.artista} onChange={(e) => update("artista", e.target.value)} />
            </label>
            <label className="text-sm font-medium">
              <T>Año</T>
              <input className={inputClass} required inputMode="numeric" value={form.anio} onChange={(e) => update("anio", e.target.value)} />
            </label>
            <label className="text-sm font-medium">
              <T>Técnica</T>
              <TranslatedAttributes><input className={inputClass} required maxLength={120} placeholder="Óleo sobre tela" value={form.tecnica} onChange={(e) => update("tecnica", e.target.value)} /></TranslatedAttributes>
            </label>
            <label className="text-sm font-medium">
              <T>Medidas</T>
              <input className={inputClass} required maxLength={60} placeholder="60 × 80 cm" value={form.medidas} onChange={(e) => update("medidas", e.target.value)} />
            </label>
          </div>
          <label className="text-sm font-medium">
            <T>Descripción</T>
            <textarea className={`${inputClass} min-h-24 py-2`} maxLength={2000} value={form.descripcion} onChange={(e) => update("descripcion", e.target.value)} />
          </label>
          <label className="text-sm font-medium">
            <T>Imagen (JPG, PNG o WebP)</T>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={`${inputClass} py-2`}
              onChange={(e) => void chooseImage(e.target.files?.[0])}
            />
          </label>
          {preparingImage && <p className="text-sm text-tinta-2"><T>Preparando la imagen…</T></p>}
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element -- local blob: preview, next/image cannot optimize it
            <img src={preview} alt="" className="max-h-64 w-full rounded-sm bg-cal-2 object-contain" />
          )}
          <label className="text-sm font-medium">
            <T>Descripción de la imagen para lectores de pantalla (opcional)</T>
            <input className={inputClass} maxLength={300} value={form.alt} onChange={(e) => update("alt", e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="grid gap-4" disabled={busy}>
          <legend className="etiqueta mb-1"><T>La subasta</T></legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              <T>Precio base (USDC)</T>
              <input className={inputClass} required inputMode="decimal" placeholder="50" value={form.precio} onChange={(e) => update("precio", e.target.value)} />
            </label>
            <label className="text-sm font-medium">
              <T>Incremento mínimo (USDC)</T>
              <input className={inputClass} required inputMode="decimal" placeholder="5" value={form.incremento} onChange={(e) => update("incremento", e.target.value)} />
            </label>
            <label className="text-sm font-medium">
              <T>Porcentaje para la artista</T>
              <input className={inputClass} required inputMode="numeric" value={form.porcentaje} onChange={(e) => update("porcentaje", e.target.value)} />
            </label>
            <label className="text-sm font-medium">
              <T>Cierre</T>
              <input type="datetime-local" className={inputClass} required min={minCierre} value={form.cierre} onChange={(e) => update("cierre", e.target.value)} />
            </label>
          </div>
          {minPrice && Number.isInteger(percent) && percent >= 0 && percent <= 100 && (
            <p className="text-sm text-tinta-2">
              {/* Same rounding as settle(): the venue share rounds down and the remainder goes to the artist. */}
              <T>Con el precio base, la artista cobra</T> {formatUsdc(minPrice - (minPrice * BigInt(100 - percent)) / BigInt(100))} USDC{" "}
              <T>y el espacio</T> {formatUsdc((minPrice * BigInt(100 - percent)) / BigInt(100))} USDC.
            </p>
          )}
          <label className="text-sm font-medium">
            <T>Wallet de la artista (G…)</T>
            <input className={`${inputClass} font-mono text-sm`} required spellCheck={false} autoCapitalize="characters" value={form.artistWallet} onChange={(e) => update("artistWallet", e.target.value)} />
          </label>
          <label className="text-sm font-medium">
            <T>Wallet del espacio (G…)</T>
            <input className={`${inputClass} font-mono text-sm`} required spellCheck={false} autoCapitalize="characters" value={form.venueWallet} onChange={(e) => update("venueWallet", e.target.value)} />
          </label>
          <label className="text-sm font-medium">
            <T>Slug (dirección de la ficha)</T>
            <input
              className={`${inputClass} font-mono text-sm`}
              required
              spellCheck={false}
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                update("slug", e.target.value);
              }}
            />
            <span className="mt-1 block text-xs font-normal text-tinta-2">/obra/{form.slug || "…"}</span>
          </label>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-sm border border-malbec/30 bg-malbec/5 px-3 py-2 text-sm text-malbec">
            <T>{error}</T>
          </p>
        )}

        <button
          type="submit"
          disabled={busy || preparingImage}
          className="min-h-12 rounded-full bg-malbec px-6 font-medium text-cal transition-colors hover:bg-malbec-2 disabled:opacity-60"
        >
          <T>{busy ? "Creando la subasta en Stellar…" : "Crear subasta y publicar obra"}</T>
        </button>
      </form>
    </section>
  );
}
