import { AcequiaDivisor } from "@/components/brand/acequia";
import { T, TranslatedAttributes } from "@/components/language-switch";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArtistaRetrato } from "@/components/artistas/artista-marca";
import { Agenda } from "@/components/agenda";
import { getArtistas } from "@/lib/data";
import mantones from "@/public/muestra/fader/mantones.webp";

export default function InicioPage() {
  const artistas = getArtistas();
  return (
    <>
      <section className="sala-portada portada-vinedo" aria-labelledby="inicio-titulo">
        <div aria-hidden="true" className="vinedo-paisaje" />
        <div className="contenedor grid items-center gap-8 py-10 sm:py-16 lg:grid-cols-[.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="sala-folio"><T>Galería digital de Mendoza</T></p>
            <h1 id="inicio-titulo" className="sala-titulo"><T>Mendoza, de cerca</T></h1>
            <p className="sala-descripcion"><T>Hay historias que se entienden mejor frente a un cuadro. En Artemi podés recorrer una muestra, conocer a quienes pintaron estas tierras y seguir la puja desde la sala o desde casa.</T></p>
            <div className="sala-enlaces"><Link href="/muestra" className="sala-boton"><T>Recorré la muestra</T></Link><a href="#agenda" className="sala-texto"><T>Próximos eventos</T></a></div>
          </div>
          <figure><TranslatedAttributes><Image src={mantones} preload alt="Figuras reunidas entre mantones bordados con flores y flecos." sizes="(min-width: 1024px) 48vw, 94vw" className="h-auto w-full" /></TranslatedAttributes><figcaption className="pie-lamina"><span><cite>Los mantones de Manila</cite>, Fernando Fader, 1914.</span><a className="underline" href="https://www.bellasartes.gob.ar/coleccion/obra/1757/">Museo Nacional de Bellas Artes</a></figcaption></figure>
        </div>
      </section>
      <section id="muestra" className="contenedor scroll-mt-28 py-14">
        <h2 className="landing-heading"><T>Artistas para descubrir</T></h2>
            <AcequiaDivisor />
        <div className="mt-7 grid gap-7 md:grid-cols-3">{artistas.map(artista => <article data-entrada key={artista.slug} className="border-t border-malbec pt-4"><ArtistaRetrato artista={artista} className="mb-4" /><p className="etiqueta"><T>{artista.obras.length ? "En la muestra" : artista.proximas?.length ? "Próximamente" : "Archivo de artistas"}</T></p><h3 className="mt-3 font-serif text-4xl">{artista.nombre}</h3><p className="my-3 max-w-prose leading-relaxed text-tinta-2"><T>{artista.bio}</T></p><Link href={`/artistas/${artista.slug}`} className="sala-texto"><T>Ver perfil</T><span className="sr-only"> · {artista.nombre}</span></Link></article>)}</div>
      </section>
      <section id="agenda" className="scroll-mt-28 border-y border-linea bg-papel">
        <div className="contenedor landing-band"><div><p className="sala-folio"><T>Agenda cultural</T></p><h2 className="landing-heading mt-3"><T>Qué viene en Mendoza</T></h2><p className="mt-4 max-w-sm text-tinta-2"><T>Una selección de actividades de la región. Cada enlace lleva al programa del organizador.</T></p></div><Suspense fallback={<p><T>Cargando agenda…</T></p>}><Agenda /></Suspense></div>
      </section>
      <section className="contenedor landing-band"><h2 className="landing-heading"><T>Cómo funciona Artemi</T></h2><ol className="landing-steps">
        <li><h3><T>Recorré la sala</T></h3><p><T>Abrí la muestra desde acá o escaneá el QR al lado del cuadro. Podés ampliar la imagen, leer su historia y consultar la ficha sin conectar una cuenta.</T></p></li>
        <li><h3><T>Seguí una oferta</T></h3><p><T>En la ficha vas a ver el monto y el tiempo que queda. En esta demo, cada oferta se respalda con USDC de prueba depositados en el contrato.</T></p></li>
        <li><h3><T>Mirá el resultado</T></h3><p><T>Si una oferta supera a otra, el contrato devuelve el depósito anterior o lo deja disponible para reclamar. Al liquidar, reparte la oferta ganadora entre artista y espacio.</T></p></li>
      </ol></section>
      <section className="bg-exito text-papel"><div className="contenedor landing-band"><h2 className="landing-heading"><T>Por qué usamos Stellar</T></h2><div className="space-y-4"><p className="font-serif text-3xl leading-tight"><T>Una oferta queda respaldada desde el momento en que se hace.</T></p><p><T>El contrato de subasta en Stellar guarda el depósito y ejecuta las reglas de devolución y reparto. Desde cada ficha podés abrir el comprobante público y revisar el movimiento.</T></p><p><T>Artemi funciona en Stellar Testnet. Los saldos son de prueba y sirven para ensayar el recorrido completo.</T></p></div></div></section>
      <section className="contenedor grid gap-10 py-16 md:grid-cols-2">
        <div><h2 className="landing-heading"><T>Modelo de negocio</T></h2><p className="mt-4"><T>La demo reparte cada liquidación entre la cuenta de artista y la del espacio, según el porcentaje acordado para esa obra. La comisión de Artemi en esta versión es cero.</T></p><p className="mt-3"><T>Para una etapa comercial proponemos que los espacios paguen un servicio por muestra que incluya catálogo, cartelas QR y seguimiento de entregas. Es una propuesta en evaluación, sin tarifa vigente.</T></p></div>
        <div><h2 className="landing-heading"><T>Modelo legal</T></h2><p className="mt-4"><T>Esta muestra exhibe reproducciones con su autoría, procedencia y condiciones de uso. La demo permite probar ofertas. Los cuadros de los museos permanecen en sus colecciones.</T></p><p className="mt-3"><T>Para una venta real habría que definir quién vende, la autorización para ofrecer y reproducir cada pieza, las condiciones de entrega, los reclamos y el tratamiento de datos de contacto.</T></p><div className="mt-2 flex flex-wrap gap-x-5"><a className="sala-texto" href="https://www.argentina.gob.ar/normativa/nacional/ley-11723-42755/actualizacion"><T>Derechos de autor</T></a><a className="sala-texto" href="https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/actualizacion"><T>Datos personales</T></a></div></div>
      </section>
    </>
  );
}
