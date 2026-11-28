import type { Metadata } from "next";
import { VentasPanel } from "@/components/ventas/ventas-panel";
import { getObras, getSubastas } from "@/lib/data";

export const metadata: Metadata = { title: "Ventas y contactos" };

export default async function VentasPage() {
  const [obras, subastas] = await Promise.all([getObras(), getSubastas()]);
  return <VentasPanel obras={obras} subastas={subastas} />;
}
