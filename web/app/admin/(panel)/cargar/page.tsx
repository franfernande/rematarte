import type { Metadata } from "next";
import { CargarForm } from "@/components/cargar/cargar-form";
import { adminPublicKey } from "@/lib/admin-stellar";

export const metadata: Metadata = { title: "Cargar obra" };

export default function CargarPage() {
  const venueWallet = process.env.ESPACIO_WALLET?.trim() || adminPublicKey() || "";
  const artistWallet = process.env.ARTISTA_WALLET_DEFAULT?.trim() || "";
  return <CargarForm defaults={{ venueWallet, artistWallet }} />;
}
