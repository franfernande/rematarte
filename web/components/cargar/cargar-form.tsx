"use client";

import { T, TranslatedAttributes } from "@/components/language-switch";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { StrKey } from "@stellar/stellar-sdk";
import { useWallet } from "@/components/wallet-provider";
import { idleTransaction, TransactionStatus, type TransactionView } from "@/components/auction/transaction-status";
import { ADMIN_ADDRESS, createAuction } from "@/lib/create-auction";
import { parseUsdc } from "@/lib/format";

type FormState = {
  titulo: string;
  artista: string;
  tecnica: string;
  medidas: string;
  anio: string;
  descripcion: string;
  precio: string;
  incremento: string;
  porcentaje: string;
  cierre: string;
  artistWallet: string;
  venueWallet: string;
  slug: string;
};

type CreatedObra = {
  slug: string;
  auctionId: number;
};

const inputClass =
  "mt-1 min-h-11 w-full rounded-sm border border-linea bg-papel px-3 text-tinta outline-none transition-colors " +
  "placeholder:text-piedra focus:border-malbec disabled:opacity-60";
const buttonClass =
  "min-h-11 rounded-sm px-5 font-medium transition-colors disabled:opacity-60";
const secondaryLinkClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-tinta/20 px-5 text-sm font-medium text-tinta " +
  "transition-colors hover:border-tinta hover:bg-cal-2";

const ERROR_REQUIRED = "Completá todos los datos de la obra.";
const ERROR_IMAGE_REQUIRED = "Elegí una imagen JPG, PNG o WebP.";
const ERROR_IMAGE_SIZE = "La imagen no puede pasar de 5 MB.";
const ERROR_IMAGE_TYPE = "La imagen tiene que ser JPG, PNG o WebP.";
const ERROR_SLUG = "El slug va en minúsculas y con guiones.";
const ERROR_AMOUNTS = "Revisá el precio base y el incremento en USDC.";
const ERROR_PERCENT = "El porcentaje de la artista va de 0 a 100.";
const ERROR_CLOSE_DATE = "La fecha de cierre tiene que ser futura.";
const ERROR_WALLETS = "Las wallets tienen que ser direcciones G... válidas.";
const ERROR_GENERIC = "No pudimos crear la subasta. Probá de nuevo.";
const ERROR_SAVE = "La subasta se creó, pero no pudimos guardar la ficha.";

const initialForm: FormState = {
  titulo: "",
  artista: "",
  tecnica: "",
  medidas: "",
  anio: String(new Date().getFullYear()),
  descripcion: "",
  precio: "",
  incremento: "",
  porcentaje: "80",
  cierre: "",
  artistWallet: "",
  venueWallet: ADMIN_ADDRESS,
  slug: "",
};

const textFields: Array<{ key: keyof FormState; label: string }> = [
  { key: "titulo", label: "Título" },
  { key: "artista", label: "Artista" },
  { key: "tecnica", label: "Técnica" },
  { key: "medidas", label: "Medidas" },
  { key: "anio", label: "Año" },
  { key: "precio", label: "Precio base USDC" },
  { key: "incremento", label: "Incremento mínimo USDC" },
  { key: "porcentaje", label: "% para la artista" },
  { key: "artistWallet", label: "Wallet de la artista (G...)" },
  { key: "venueWallet", label: "Wallet del espacio" },
  { key: "slug", label: "Slug" },
];

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function buildPayload(form: FormState, image: File, auctionId: number, hash: string): FormData {
  const data = new FormData();
  const fields = {
    ...form,
    precioMinimoUsdc: form.precio,
    incrementoMinimoUsdc: form.incremento,
    auctionId: String(auctionId),
    hash,
  };

  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  data.set("imagen", image);
  return data;
}

export function CargarForm() {
  const { address, connecting, connect, signTransaction } = useWallet();
  const [form, setForm] = useState<FormState>(initialForm);
  const [image, setImage] = useState<File | null>(null);
  const [transaction, setTransaction] = useState<TransactionView>(idleTransaction);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedObra | null>(null);
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : ""), [image]);
  const isAdmin = address === ADMIN_ADDRESS;

  function updateField(key: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "titulo" ? { slug: slugify(value) } : {}),
    }));
  }

  function validate(): string | null {
    if (!form.titulo || !form.artista || !form.tecnica || !form.medidas || !form.descripcion) return ERROR_REQUIRED;
    if (!image) return ERROR_IMAGE_REQUIRED;
    if (image.size > 5 * 1024 * 1024) return ERROR_IMAGE_SIZE;
    if (!/^image\/(jpeg|png|webp)$/.test(image.type)) return ERROR_IMAGE_TYPE;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) return ERROR_SLUG;
    if (!parseUsdc(form.precio) || !parseUsdc(form.incremento)) return ERROR_AMOUNTS;

    const percent = Number(form.porcentaje);
    if (!(percent >= 0 && percent <= 100)) return ERROR_PERCENT;

    const close = new Date(form.cierre);
    if (Number.isNaN(close.getTime()) || close.getTime() <= Date.now()) return ERROR_CLOSE_DATE;
    if (!StrKey.isValidEd25519PublicKey(form.artistWallet) || !StrKey.isValidEd25519PublicKey(form.venueWallet)) {
      return ERROR_WALLETS;
    }
    return null;
  }

  async function saveObra(auctionId: number, hash: string) {
    if (!image) throw new Error(ERROR_IMAGE_REQUIRED);
    const response = await fetch("/api/obras", {
      method: "POST",
      body: buildPayload(form, image, auctionId, hash),
    });
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(`${json.error || ERROR_SAVE} ID de subasta: ${auctionId}`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreated(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    try {
      setTransaction({ state: "working", message: "Confirmá en tu wallet…" });
      const minPrice = parseUsdc(form.precio);
      const minIncrement = parseUsdc(form.incremento);
      if (!minPrice || !minIncrement || !address) throw new Error(ERROR_AMOUNTS);

      const endTime = Math.floor(new Date(form.cierre).getTime() / 1000);
      const result = await createAuction({
        artist: form.artistWallet,
        venue: form.venueWallet,
        artistBps: Math.round(Number(form.porcentaje) * 100),
        minPrice,
        minIncrement,
        endTime,
        signer: address,
        signTransaction,
      });

      setTransaction({ state: "working", message: "Enviando a la red…" });
      await saveObra(result.auctionId, result.hash);
      setTransaction({
        state: "success",
        message: "La subasta quedó creada y la obra guardada.",
        hash: result.hash,
      });
      setCreated({ slug: form.slug, auctionId: result.auctionId });
    } catch (cause) {
      setTransaction(idleTransaction);
      setError(cause instanceof Error ? cause.message : ERROR_GENERIC);
    } finally {
      setBusy(false);
    }
  }

  if (!address) {
    return (
      <section className="cartela panel-sala">
        <p className="etiqueta"><T>Cargar obra</T></p>
        <h1 className="mt-2 font-serif text-4xl leading-tight"><T>Entrá con la wallet del espacio</T></h1>
        <p className="mt-3 text-tinta-2">
          <T>Esta página crea subastas reales en Testnet, por eso primero tenés que entrar.</T>
        </p>
        <button
          type="button"
          className={`${buttonClass} mt-5 bg-malbec text-cal`}
          disabled={connecting}
          onClick={() => void connect()}
        >
          <T>{connecting ? "Entrando…" : "Entrar"}</T>
        </button>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="cartela panel-sala">
        <h1 className="font-serif text-3xl"><T>Esta página es solo para el espacio</T></h1>
        <p className="mt-3 text-tinta-2">
          <T>La wallet conectada no es la administradora del contrato. En esta demo local no hay getter público de admin,
          así se compara con la dirección pública de despliegue.</T>
        </p>
      </section>
    );
  }

  return (
    <section className="cartela p-5">
      <p className="etiqueta"><T>Espacio</T></p>
      <h1 className="mt-2 font-serif text-3xl"><T>Cargar una obra</T></h1>
      <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 grid gap-4">
        {textFields.map((field) => (
          <label key={field.key} className="text-sm font-medium">
            <T>{field.label}</T>
            <input
              className={inputClass}
              value={form[field.key]}
              onChange={(event) => updateField(field.key, event.target.value)}
            />
          </label>
        ))}

        <label className="text-sm font-medium">
          <T>Descripción</T>
          <textarea
            className={`${inputClass} min-h-24`}
            value={form.descripcion}
            onChange={(event) => updateField("descripcion", event.target.value)}
          />
        </label>

        <label className="text-sm font-medium">
          <T>Fecha y hora de cierre</T>
          <input
            type="datetime-local"
            className={inputClass}
            value={form.cierre}
            onChange={(event) => updateField("cierre", event.target.value)}
          />
        </label>

        <label className="text-sm font-medium">
          <T>Imagen</T>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={inputClass}
            onChange={(event) => setImage(event.target.files?.[0] ?? null)}
          />
        </label>

        <T>{preview && (
          <TranslatedAttributes><Image
            src={preview}
            alt="Vista previa de la obra"
            width={800}
            height={560}
            unoptimized
            className="max-h-56 w-full rounded-sm object-contain"
          /></TranslatedAttributes>
        )}</T>

        <T>{error && (
          <p role="alert" className="rounded-sm border border-malbec/30 bg-malbec/5 px-3 py-2 text-sm text-malbec">
            <T>{error}</T>
          </p>
        )}</T>

        <button type="submit" disabled={busy} className={`${buttonClass} bg-malbec text-cal disabled:opacity-60`}>
          <T>{busy ? "Creando…" : "Crear subasta y guardar obra"}</T>
        </button>
        <TransactionStatus transaction={transaction} />

        {created && (
          <div className="rounded-sm border border-exito/30 bg-exito/5 p-4">
            <p className="font-medium text-exito"><T>Obra creada. Subasta</T> {created.auctionId}.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link className={secondaryLinkClass} href={`/obra/${created.slug}`}>
                <T>Ver ficha</T>
              </Link>
              <Link className={secondaryLinkClass} href="/qr">
                <T>Ver hoja de QR</T>
              </Link>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}
