import { VentasPanel } from "@/components/ventas/ventas-panel";
import { getDeploy, getObras } from "@/lib/data";

export default function VentasPage() {
  const obras = getObras();
  const deploy = getDeploy();

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-5 pb-14 pt-8 sm:pt-12">
      <VentasPanel obras={obras} subastas={deploy.subastas} />
    </div>
  );
}
