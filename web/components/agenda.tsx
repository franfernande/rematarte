import { T } from "@/components/language-switch";
import { connection } from "next/server";

const actividades = [
  { fecha: "2026-12-04", dia: "04", mes: "Dic", titulo: "Cierre de FLAT 2026", lugar: "MMAMM · Plaza Independencia, Ciudad de Mendoza", descripcion: "El festival cruza artes visuales y tecnología en el museo. Consultá la programación de la última jornada.", fuente: "https://prensa.ciudaddemendoza.gob.ar/2026/10/13/el-flat-2026-convierte-al-mmamm-en-un-laboratorio-de-arte-tecnologia-y-nuevos-futuros-con-una-invitada-especial-lucrecia-martel/" },
  { fecha: "2026-12-06", dia: "06", mes: "Dic", titulo: "Baptiste Herbin y Minino Garay", lugar: "Teatro Roma · San Rafael · 20:30", descripcion: "Saxo y percusión se encuentran en el escenario del Teatro Roma. La agenda municipal reúne los detalles de la función.", fuente: "https://sanrafaelturismo.gov.ar/agenda-cultural?m=12&y=2026" },
];

export async function Agenda() {
  await connection();
  const hoy = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Mendoza" }).format(new Date());
  const proximas = actividades.filter((actividad) => actividad.fecha >= hoy);
  return proximas.length ? (
    <ul className="divide-y divide-linea border-y border-linea">
      {proximas.map((actividad) => (
        <li data-entrada key={actividad.fecha} className="grid grid-cols-[3.5rem_1fr] gap-5 py-6 sm:gap-8">
          <time dateTime={actividad.fecha} className="text-center text-malbec"><span className="block font-serif text-5xl">{actividad.dia}</span><T>{actividad.mes}</T> 2026</time>
          <div><h3 className="font-serif text-3xl"><T>{actividad.titulo}</T></h3><p className="my-2 text-sm"><T>{actividad.lugar}</T></p><p className="text-tinta-2"><T>{actividad.descripcion}</T></p><a className="sala-texto" href={actividad.fuente}><T>Ver programación oficial</T></a></div>
        </li>
      ))}
    </ul>
  ) : <p><T>Consultá las próximas fechas en la</T> <a className="underline" href="https://sanrafaelturismo.gov.ar/agenda-cultural"><T>agenda cultural de San Rafael</T></a>.</p>;
}
