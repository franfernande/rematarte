# Auditoría frontend — calidad mobile

## 1) Resumen

La app compila y lintea sin errores, no tiene overflow horizontal en 390×844 y las rutas principales responden correctamente.
La experiencia visual de marca ya es reconocible, pero en mobile la acción principal de ofertar queda demasiado abajo en la ficha de obra.
Hay problemas sistémicos de contraste en textos chicos, foco insuficiente en el input de oferta y varios objetivos táctiles menores a 44 px.
El onboarding informa “En curso” antes de que la persona haga algo y el modal de acceso no bloquea el scroll del fondo ni contempla safe-area.
La base técnica está sana; la fase de mejora puede concentrarse en jerarquía mobile, accesibilidad y microinteracciones sin tocar la lógica on-chain.

## 2) Estado actual

### Salud técnica

- `npm run lint` en `web/`: exit 0, sin errores ni warnings.
- `npm run build` en `web/`: exit 0. Next.js 16.4.6 + Turbopack, Cache Components y Partial Prefetching habilitados; compilación en 2.1 s, TypeScript en 4.7 s y generación estática en 2.9 s.
- Rutas del build: `/` estática, `/_not-found` estática, `/api/faucet` dinámica, `/empezar` con prerender parcial, `/obra/[slug]` con las 3 obras configuradas prerenderizadas, `/qr` con prerender parcial.
- Se intentó levantar un segundo `next dev` y Next lo rechazó por ya existir uno en el workspace; se detuvo el viejo PID 31924, se levantó uno limpio en `http://localhost:3001` y al terminar se apagó el PID 28508. Puertos 3000/3001 verificados apagados.
- Consola de navegador: sin excepciones de aplicación ni `pageerror` en las 10 navegaciones. Solo mensajes normales de React DevTools/HMR en desarrollo; en la ruta inexistente aparece el error esperado de recurso 404.
- Playwright midió `lang="es"`, un `<main>`, exactamente un `<h1>` por página y `horizontalOverflow=false` en todas las rutas y ambos viewports.

### Capturas

Todas las capturas están en `audits/frontend/screens/` y fueron tomadas con Chromium headless después de esperar hidratación/red; el chrome de desarrollo de Next se ocultó solo para la foto.

| Captura | Observación visual |
|---|---|
| `home-mobile.png` (390×844) | Hero tipográfico fuerte y CTAs dentro del viewport; la obra aparece recién cortada al final. En el header mobile solo quedan logo y “Entrar”. |
| `obra-mobile.png` | La obra y la cartela ocupan casi todo el viewport; el panel de subasta apenas empieza abajo y el monto/CTA de oferta quedan fuera de la primera pantalla. |
| `empezar-mobile.png` | Se entiende el paso 1, pero aparece como “En curso” antes de interactuar; el paso 2 muestra un CTA grande deshabilitado sin explicación suficiente. |
| `qr-mobile.png` | El aviso de localhost y el botón Imprimir son claros; el QR propiamente dicho queda debajo del primer viewport y la fecha del cierre quiebra mal (“p. / m.”). |
| `404-mobile.png` | La página devuelve 404 real y copy útil, pero se ve muy escueta, con un enlace chico y una gran franja vacía antes del footer. |
| `home-desktop.png` (1280×800) | Composición editorial equilibrada: título, CTAs y obra enmarcada visibles sin overflow. |
| `obra-desktop.png` | El layout de dos columnas funciona: puja actual, cierre, input y botón “Conectar y ofertar” están visibles en la primera pantalla. CLS medido: 0.032. |
| `empezar-desktop.png` | El panel lateral “Aviso de sala” y “Estado real” ayuda, pero también allí el paso 1 aparece “En curso” sin acción iniciada. |
| `qr-desktop.png` | La cartela se entiende bien y el QR tiene buen tamaño; la URL impresa es muy pequeña y quebrada en dos líneas. |
| `404-desktop.png` | Mantiene el 404 correcto, pero la composición queda demasiado vacía para una pantalla de error de producto. |
| `login-modal-mobile.png` (extra) | El bottom sheet entra completo en 390×844, pero el fondo sigue siendo scrolleable y el footer del sheet no usa safe-area. |

### Estados de carga y rendimiento percibido

- Hay skeletons en `web/app/obra/[slug]/page.tsx:41`, `web/components/auction/auction-panel.tsx:43`, `web/app/qr/page.tsx:88` y `web/app/empezar/loading.tsx:1`.
- La ficha `/obra/[slug]` usa `<Suspense>` en `web/app/obra/[slug]/page.tsx:35`; el panel de subasta muestra skeleton mientras llega RPC.
- CLS medido fue 0.000 en casi todas las capturas; `/obra` desktop llegó a 0.032, bajo el umbral crítico pero suficiente para notar un salto chico cuando la data reemplaza al skeleton.
- Las obras actuales son SVG inline de mock, así que no hubo imágenes reales en `document.images`. El camino para fotos reales existe en `web/components/obra-arte.tsx:97` pero todavía no quedó demostrado con assets reales.
- Las fuentes se cargan con `next/font` en `web/app/layout.tsx:2`; no se observaron errores de fuentes. Las mediciones LCP en dev no son concluyentes para producción.

## 3) Hallazgos ordenados por severidad

### Alta

1. **La acción principal de ofertar queda fuera de la primera pantalla mobile.**  
   Evidencia: `web/app/obra/[slug]/page.tsx:69` monta primero toda la sección visual de la obra y `web/app/obra/[slug]/page.tsx:92` recién después monta el `<aside>` de subasta; en una columna mobile ese orden empuja precio, input y CTA debajo del fold. En `obra-mobile.png` el panel aparece solo como borde al final.  
   Impacto: la persona que escanea el QR tiene que scrollear bastante antes de entender cuánto vale la puja o dónde ofertar; baja conversión en el momento exacto de mayor intención.  
   Recomendación: en mobile mostrar antes de la obra una cartela compacta con fase, puja actual, cierre y CTA/ancla al formulario, o convertir el panel en bottom sheet/sticky summary; mantener el aside lateral en desktop.

2. **Los textos chicos de sistema no llegan a contraste AA sobre la paleta actual.**  
   Evidencia: `.etiqueta` usa `--color-piedra` en `web/app/globals.css:59`–`65`; los estados en vivo usan ocre en `web/components/auction/auction-panel.tsx:159`–`166` y las cartelas QR repiten la etiqueta en `web/components/qr/qr-card.tsx:28`. Medición de contraste: piedra/papel 3.57, piedra/cal 3.25, ocre/papel 3.04, ocre/cal 2.77; AA normal exige 4.5.  
   Impacto: en celulares, sol o pantallas con brillo bajo se pierden justamente los rótulos que explican fase, estado y precio.  
   Recomendación: oscurecer `piedra`/`ocre` para texto o usar `tinta-2` en etiquetas, reservando ocre para íconos/grandes acentos; ajustar el token una sola vez y revisar todas las instancias.

3. **El foco del input de oferta queda prácticamente invisible.**  
   Evidencia: `web/components/auction/bid-form.tsx:125`–`136` define el input con `outline-none` y solo `focus:border-malbec` como reemplazo. En la prueba real con foco activo el computed style fue `outline: none 0px` y el borde siguió `rgb(214, 205, 191)` (línea), sin cambio perceptible.  
   Impacto: una persona con teclado o switch control no sabe dónde está el foco en el formulario más importante de la app.  
   Recomendación: usar `focus-visible:ring-2 focus-visible:ring-malbec focus-visible:ring-offset-2` o un halo/borde con cambio de contraste comprobado; no depender solo del color de borde.

4. **Varios objetivos táctiles quedan por debajo de 44 px.**  
   Evidencia medida en mobile: el logo `web/app/layout.tsx:53` mide 90×26 px; “Salir” de wallet usa `min-h-9` en `web/components/connect-wallet-button.tsx:55`–`59` (36 px); los enlaces del historial usan `min-h-8` en `web/components/auction/bid-history.tsx:58`–`64` (32 px); “Reintentar” dentro del error usa `min-h-8` en `web/components/auction/auction-panel.tsx:182`; el CTA de 404 es un link inline en `web/app/not-found.tsx:10` (24 px de alto medido).  
   Impacto: errores de pulgares, sobre todo en historial/estados de error y al cerrar sesión.  
   Recomendación: establecer una regla de diseño `min-h-11`/`min-w-11` también para links accionables, con padding interno en vez de cambiar solo tipografía.

### Media

5. **En mobile desaparece la navegación principal sin reemplazo.**  
   Evidencia: “La muestra” y “Empezar” llevan `hidden sm:inline-block` en `web/app/layout.tsx:57`–`68`; en 390 px el header solo muestra logo y Entrar.  
   Impacto: la persona no tiene una forma persistente de volver a la muestra o retomar onboarding salvo encuentre CTAs contextuales; en una app pensada para QR/celu aumenta la desorientación.  
   Recomendación: agregar navegación mobile compacta (menú, bottom nav o dos accesos tipo chip) sin competir con el CTA de wallet.

6. **No hay skip link para saltar la navegación.**  
   Evidencia: el header sticky está en `web/app/layout.tsx:51`–`72` y `<main>` en `web/app/layout.tsx:73` no recibe un enlace de salto; Playwright reportó `hasSkipLink=false` en todas las páginas.  
   Impacto: teclado y lectores de pantalla repiten navegación/cabecera en cada ruta.  
   Recomendación: agregar un link visible al foco hacia `#contenido` y poner `id="contenido"` en `<main>`.

7. **El paso disponible de onboarding se etiqueta como “En curso” aunque nadie empezó.**  
   Evidencia: `statusFor` devuelve `"en curso"` para cualquier paso disponible en `web/components/onboarding/onboarding-stepper.tsx:111`–`115`; por eso la captura inicial muestra “En curso” en el paso 1. Además los pasos bloqueados renderizan CTAs grandes deshabilitados en `web/components/onboarding/onboarding-stepper.tsx:269`–`317` y `347`–`353`.  
   Impacto: la interfaz miente sobre el progreso y hace parecer que algo está procesando; los botones apagados invitan a tocar sin explicar por qué no responden.  
   Recomendación: separar estados “Siguiente”/“Disponible” de “En curso”, y colapsar o atenuar las acciones bloqueadas con texto explícito (“primero entrá con tu huella”).

8. **El bottom sheet de acceso no bloquea el fondo ni contempla safe-area/altura acotada.**  
   Evidencia: el contenedor fixed está en `web/components/wallet/login-dialog.tsx:108` y la cartela en `web/components/wallet/login-dialog.tsx:117`–`123`; no hay `overflow`/`max-h` interno, `overscroll-behavior`, `inert` ni bloqueo de scroll del body. En la prueba `document.scrollHeight` seguía siendo 4823 con el modal abierto.  
   Impacto: el fondo se desplaza detrás del sheet, en pantallas bajas los botones pueden quedar fuera y el gesto/home indicator de iOS puede tapar el final.  
   Recomendación: aplicar scroll-lock temporal, `inert` al fondo, `max-h-[calc(100dvh-24px)] overflow-y-auto overscroll-contain` y padding inferior con `env(safe-area-inset-bottom)`.

9. **La actualización on-chain móvil depende de polling fijo cada 4 s mientras la pestaña está visible.**  
   Evidencia: intervalo default `4000` en `web/lib/use-auction.ts:31` y ciclo activo en `web/lib/use-auction.ts:122`–`127`.  
   Impacto: consumo de batería/datos durante toda la visita, incluso si la persona no está mirando el panel o la subasta cierra en días; también multiplica llamadas RPC en una sala con muchos celulares.  
   Recomendación: implementar backoff adaptativo o intervalos según fase/cercanía del cierre, manteniendo refresco rápido después de ofertar y en los últimos minutos. No eliminar la actualización, porque es funcional al producto.

10. **Los skeletons no reservan exactamente la geometría final.**  
    Evidencia: el skeleton de ficha usa un bloque `aspect-[4/5]` y una cartela genérica en `web/app/obra/[slug]/page.tsx:41`–`49`, mientras el layout real agrega marco, halo y cartela superpuesta en `web/app/obra/[slug]/page.tsx:70`–`89`; el skeleton del panel tiene alturas aproximadas en `web/components/auction/auction-panel.tsx:43`–`54`. CLS medido en `/obra` desktop: 0.032.  
    Impacto: no rompe la experiencia, pero el salto de contenido se percibe justo en la primera carga de la ficha.  
    Recomendación: medir la altura real mobile/desktop del panel y ajustar skeletons por breakpoint; reservar espacio para input + CTA + historial mínimo.

11. **Las fotos reales futuras no tienen dimensiones explícitas ni estrategia de carga.**  
    Evidencia: `web/components/obra-arte.tsx:97`–`102` renderiza `<img>` con `className` pero sin `width`, `height`, `loading` ni `fetchpriority`.  
    Impacto: cuando lleguen fotos reales puede aparecer CLS, descarga innecesaria de imágenes below-fold o retardo del LCP en la primera obra.  
    Recomendación: migrar a `next/image` con `fill` dentro del contenedor `aspect-[4/5]`, `sizes` mobile-first, `priority` solo en la obra hero y lazy en el resto.

### Baja

12. **La página 404 cumple el status pero no sostiene la calidad visual ni táctil del resto.**  
    Evidencia: `web/app/not-found.tsx:5`–`12` es un bloque plano con enlace inline; en las capturas queda una franja vacía grande antes del footer.  
    Impacto: quien llega desde un QR roto recibe una experiencia de dead-end justo cuando necesita recuperación.  
    Recomendación: convertir “Ver toda la muestra” en botón de 48 px, agregar una segunda acción a `/empezar` y una composición acorde a la estética de sala.

13. **La cartela QR mobile deja el código debajo del fold y la fecha quiebra de forma torpe.**  
    Evidencia: la fecha se imprime inline en `web/components/qr/qr-card.tsx:36`–`42` y la URL usa `break-all` en `web/components/qr/qr-card.tsx:57`; la captura mobile muestra “p.” y “m.” separadas y no alcanza a verse el QR.  
    Impacto: para uso mobile de control previo es difícil verificar rápidamente que cada cartela tenga el QR correcto.  
    Recomendación: usar espacios duros/formato corto para fecha, mostrar una miniatura del QR antes en mobile o reordenar figure/texto sin afectar el layout de impresión A4.

14. **La escala de bordes es inconsistente entre piezas del mismo recorrido.**  
    Evidencia: `.cartela` no define radio en `web/app/globals.css:68`–`72`; auction usa `rounded-sm` en `web/components/auction/bid-form.tsx:116`, onboarding usa tarjetas `rounded-2xl` en `web/components/onboarding/step-card.tsx:87` y botones siempre `rounded-full`.  
    Impacto: no afecta funcionalidad, pero mobile amplifica la sensación de piezas pegadas de sistemas distintos.  
    Recomendación: definir tokens semánticos (`radius-panel`, `radius-control`, `radius-media`) y aplicarlos por rol, no por ocurrencia local.

15. **Los íconos de tipo de wallet tienen `aria-label` sin `role="img"` dentro de un conjunto que ya comunica estado.**  
    Evidencia: `web/components/connect-wallet-button.tsx:11`, `:20` y `:27`.  
    Impacto: puede producir anuncios duplicados o inconsistentes según lector de pantalla; el tipo de wallet es información secundaria junto a la address.  
    Recomendación: decidir una sola estrategia: `aria-hidden` si son decorativos, o `role="img"` + label si aportan información real.

16. **Las animaciones de entrada se repiten por tarjeta en vez de ser un momento orquestado.**  
    Evidencia: `animate-aparecer` está en cada obra de la grilla en `web/app/page.tsx:121`–`127` y el keyframe global en `web/app/globals.css:22`–`28`; el pulso vivo usa `animate-latido` en `web/app/globals.css:29`–`32`.  
    Impacto: en mobile puede sentirse como una cascada genérica y distraer de la puja; el estado vivo sí justifica el pulso.  
    Recomendación: conservar una entrada única del hero/panel y hacer que las cards aparezcan sin stagger complejo; mantener `prefers-reduced-motion` como hoy.

## 4) Propuesta concreta para la fase de mejora

Reparto sugerido en 4 personas, con archivos separados para evitar conflictos. Ninguna tarea requiere instalar dependencias.

### Persona A — Fundaciones visuales y shell

Archivos: `web/app/globals.css`, `web/app/layout.tsx`, `web/components/obra-arte.tsx`.

1. Oscurecer/ajustar tokens de texto `piedra` y `ocre` o crear variantes `text-muted`/`text-live` con contraste AA.
2. Definir tokens semánticos de radios y foco (`focus-ring`) y documentarlos en clases compartidas.
3. Agregar skip link, `id="contenido"` y navegación mobile compacta en el header.
4. Migrar fotos reales a `next/image` con `fill`, `sizes`, lazy/priority diferenciados.

### Persona B — Ficha de obra mobile-first

Archivos: `web/app/obra/[slug]/page.tsx`, `web/components/auction/auction-panel.tsx` solamente para estructura visual del panel, y un nuevo componente opcional bajo `web/components/auction/`.

1. Crear resumen mobile de subasta arriba de la obra: fase, puja actual, cierre y CTA que ancle al formulario.
2. Mantener el aside desktop actual; no cambiar props ni datos on-chain.
3. Ajustar skeletons a las dimensiones reales del panel para reducir CLS.
4. Diseñar un sticky bottom CTA solo para mobile si el resumen no alcanza.

### Persona C — Acceso, wallet y onboarding

Archivos: `web/components/wallet/login-dialog.tsx`, `web/components/connect-wallet-button.tsx`, `web/components/onboarding/*`, `web/app/empezar/loading.tsx`.

1. Implementar scroll-lock/inert, safe-area y scroll interno del bottom sheet.
2. Reetiquetar estados del stepper: separar “Disponible/Siguiente” de “En curso”.
3. Reordenar/atenuar CTAs bloqueados y explicar la dependencia entre pasos.
4. Llevar “Salir” y otros controles a 44 px; resolver aria de íconos de wallet.
5. Mejorar skeleton de `/empezar` para que coincida con las tarjetas reales.

### Persona D — Formulario de oferta, historial, QR y 404

Archivos: `web/components/auction/bid-form.tsx`, `web/components/auction/bid-history.tsx`, `web/components/auction/transaction-status.tsx`, `web/components/qr/*`, `web/app/qr/page.tsx`, `web/app/qr/qr-print.css`, `web/app/not-found.tsx`.

1. Agregar foco visible robusto al input de oferta.
2. Llevar links de historial/reintentos/404 a objetivos de 44 px.
3. Mejorar la composición de 404 con acciones principales.
4. Ajustar fecha/URL/miniatura QR mobile sin romper impresión A4.
5. Pulir microinteracciones de éxito/error con transform/opacity, sin cambiar estados de transacción.

## 5) Riesgos: qué no tocar porque rompe la lógica on-chain

- **No cambiar la interfaz ni el orden de firma** de `signTransaction` en `web/components/wallet-provider.tsx` ni los consumidores de `placeBid`, `claimRefund`, `settle` o trustline. Una mejora visual puede reordenar textos, no la secuencia transaccional.
- **No marcar una oferta/reembolso/liquidación como exitosa antes de confirmación** ni reemplazar estados de `TransactionStatus` por animaciones optimistas; la confianza del producto depende de reflejar la red.
- **No alterar `web/lib/auction.ts`, `web/lib/use-auction.ts` ni el parseo de eventos** sin pruebas contra Testnet: fase, anti-sniping, historial, reembolso pendiente y liquidación dependen de esos datos.
- **No cambiar `auctionId`, `deploy.testnet.json`, issuer/SAC ni conversiones de stroops** en componentes visuales; usar siempre `formatUsdc`, `parseUsdc` y `minNextBid` existentes.
- **No modificar el objetivo de 200 USDC ni el orden Friendbot → trustline → faucet** de `web/lib/onboarding.ts` como parte de rediseño; el login passkey ya usa `prepareAccount` para dejar la cuenta lista.
- **No romper las URLs absolutas `/obra/<slug>?ref=qr`** generadas en `web/app/qr/page.tsx:50`: las cartelas impresas quedarían obsoletas.
- **No quitar el polling/adaptarlo a un intervalo largo fijo** sin estrategia para los últimos 5 minutos: el anti-sniping exige frescura al acercarse el cierre.
