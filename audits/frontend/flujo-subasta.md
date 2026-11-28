# Auditoría frontend — flujo de subasta

## 1) Resumen

El recorrido ya tiene una identidad fuerte de muestra y explica bien escrow, reembolso y reparto.
En desktop la ficha funciona: obra a la izquierda y panel de puja visible a la derecha.
En mobile, en cambio, la acción principal queda demasiado abajo para una persona que entró escaneando un QR.
Los mayores riesgos de comprensión están en montos redondeados, countdown ambiguo, estados finales incorrectos cuando no hay venta y poco contraste de datos críticos.
La fase de mejora debería mover el presupuesto de animación desde entradas decorativas hacia cambios de puja, superación, extensión del cierre y confirmación de transacción.

## 2) Estado actual

La home presenta el concepto, cuatro pasos del recorrido y una grilla de obras con estado de subasta en vivo (`web/app/page.tsx:30`, `web/app/page.tsx:84`, `web/app/page.tsx:102`). Cada tarjeta muestra obra, artista, fase, monto actual o base, ganador abreviado y countdown compacto mediante `AuctionBadge` (`web/components/auction/auction-badge.tsx:37`).

La ficha muestra primero la obra enmarcada y su cartela; el panel de subasta va después en el flujo mobile y como barra lateral sticky en desktop (`web/app/obra/[slug]/page.tsx:68`, `web/app/obra/[slug]/page.tsx:92`). El panel lee la subasta por polling cada 4 segundos, calibra la hora contra el ledger y mantiene eventos on-chain (`web/lib/use-auction.ts:31`, `web/lib/use-auction.ts:49`, `web/lib/use-auction.ts:113`).

El panel ya diferencia fases `open`, `closing`, `ended` y `settled` (`web/components/auction/auction-panel.tsx:20`), muestra precio base o puja actual/ganadora (`web/components/auction/auction-panel.tsx:165`), countdown (`web/components/auction/countdown.tsx:39`), formulario de oferta (`web/components/auction/bid-form.tsx:115`), reclamo de reembolso pendiente (`web/components/auction/pending-refund.tsx:49`), liquidación (`web/components/auction/settle-card.tsx:53`) e historial (`web/components/auction/bid-history.tsx:29`).

Las transacciones informan texto de preparación, firma, envío, éxito o error (`web/components/auction/bid-form.tsx:77`, `web/components/auction/bid-form.tsx:84`, `web/components/auction/transaction-status.tsx:17`). Hay aviso específico cuando te superaron y el reembolso ya volvió (`web/components/auction/auction-panel.tsx:190`) y una tarjeta de acción cuando el reembolso quedó pendiente (`web/components/auction/pending-refund.tsx:50`).

La animación actual es principalmente entrada de tarjetas/paneles, latido del punto en vivo y un flash de fondo de 1,5 segundos cuando cambia la puja (`web/app/page.tsx:121`, `web/components/auction/auction-panel.tsx:102`, `web/components/auction/auction-panel.tsx:165`). `prefers-reduced-motion` ya está contemplado globalmente (`web/app/globals.css:86`).

### Inventario de estados posibles y cómo se ven hoy

| Estado | Cómo se ve hoy |
|---|---|
| Cargando ficha/panel por primera vez | Skeleton genérico de imagen y cartela (`web/app/obra/[slug]/page.tsx:41`); skeleton interno del panel (`web/components/auction/auction-panel.tsx:43`). |
| Error inicial de lectura | Cartela con “No pudimos leer la subasta” y botón Reintentar (`web/components/auction/auction-panel.tsx:112`). |
| Error de actualización con datos viejos | Alerta roja arriba del formulario y botón Reintentar chico (`web/components/auction/auction-panel.tsx:179`). |
| Obra sin subasta publicada | En home, texto “Subasta todavía no publicada” (`web/app/page.tsx:139`); en ficha, cartela estática sin acción (`web/app/obra/[slug]/page.tsx:93`). |
| Abierta sin ofertas | “Precio base”, “Todavía no hay ofertas”, formulario precargado con mínimo (`web/components/auction/auction-panel.tsx:131`); historial vacío invita a ser primera persona (`web/components/auction/bid-history.tsx:42`). |
| Abierta con oferta de otra persona | “Puja actual”, “Va ganando G…”, formulario con nuevo mínimo (`web/components/auction/auction-panel.tsx:134`). |
| Abierta con vos ganando | “Vas ganando vos” (`web/components/auction/auction-panel.tsx:140`). |
| Abierta, te superaron con reembolso automático | Aviso verde persistente: “Te superaron. Tus X USDC ya volvieron…” (`web/components/auction/auction-panel.tsx:190`). |
| Abierta, reembolso pendiente | Tarjeta ocre con monto y botón “Reclamar” (`web/components/auction/pending-refund.tsx:50`). |
| Últimos 5 minutos | Etiqueta “Últimos minutos”, punto ocre, countdown ocre y explicación anti-sniping (`web/components/auction/countdown.tsx:36`). |
| Cierre extendido | Mensaje pequeño “El cierre se extendió” durante unos 5 segundos (`web/components/auction/countdown.tsx:11`, `web/components/auction/countdown.tsx:46`). |
| Nueva puja recibida por polling | Flash sutil de fondo ocre alrededor del monto durante 1,5 segundos (`web/components/auction/auction-panel.tsx:92`, `web/components/auction/auction-panel.tsx:165`). |
| Tx de oferta/reclamo/liquidación | Texto “Preparando…”, “Confirmá en tu wallet…”, “Enviando a la red…”, éxito verde o error rojo (`web/components/auction/bid-form.tsx:77`, `web/components/auction/bid-form.tsx:84`, `web/components/auction/transaction-status.tsx:17`). |
| Connect cancelado | El estado vuelve a idle sin mensaje residual (`web/components/auction/bid-form.tsx:79`). |
| Cerrada con ganador, sin liquidar | “Subasta cerrada”, “Puja ganadora”, tarjeta con botón abierto “Liquidar subasta” (`web/components/auction/settle-card.tsx:53`). |
| Cerrada sin ofertas, sin liquidar | Countdown “Subasta cerrada”, panel principal todavía dice “Todavía no hay ofertas”, tarjeta sí aclara “terminó sin ofertas” (`web/components/auction/auction-panel.tsx:134`, `web/components/auction/settle-card.tsx:65`). |
| Liquidada con venta | “Vendida”, ganador, barra de reparto artista/espacio y link al explorador (`web/components/auction/settle-card.tsx:98`). |
| Liquidada sin venta | La tarjeta sigue titulada “Obra vendida” aunque aclara que no se movieron fondos (`web/components/auction/settle-card.tsx:100`, `web/components/auction/settle-card.tsx:125`). |
| Historial vacío | Texto claro: “Todavía nadie ofertó…” (`web/components/auction/bid-history.tsx:42`). |
| Historial con eventos | Lista cronológica ascendente con números romanos, tiempo relativo y link por movimiento (`web/components/auction/bid-history.tsx:45`). |

Verificación visual realizada: Chromium/Playwright en `390×844` y `1280×900`, home y `/obra/atardecer-en-uspallata`. En mobile el panel empieza en `y=802`, el formulario en `y=1073` y el botón de ofertar en `y=1330` dentro de una ventana de 844 px; en desktop el panel empieza en `y=165` y el botón queda visible sin scroll. También se verificó que `abc` y una oferta menor al mínimo producen errores inline correctos, pero el input queda con `outline-style: none` al enfocar.

## 3) Hallazgos ordenados por severidad

### Alta

1. **La acción de ofertar queda fuera del primer viewport mobile.**
   - Ubicación: `web/app/obra/[slug]/page.tsx:68`, `web/app/obra/[slug]/page.tsx:92`, `web/app/obra/[slug]/page.tsx:100`.
   - Problema concreto: en mobile se renderiza primero toda la obra y la cartela; recién después aparece el panel. En la medición real de 390×844, el formulario empieza en `y=1073` y el botón en `y=1330`.
   - Impacto: la persona que escaneó un QR para pujar no ve precio, mínimo ni CTA sin hacer scroll; en una subasta en vivo eso cuesta tiempo y confianza.
   - Recomendación: en pantallas chicas mostrar un resumen de subasta pegado arriba o un CTA sticky inferior con precio/countdown que lleve al formulario; alternativamente reordenar con CSS para que el panel preceda a la galería en mobile y mantener la obra primero solo en desktop.

2. **Los montos se redondean a 2 decimales aunque la app acepta y el contrato usa 7.**
   - Ubicación: `web/lib/format.ts:7`, `web/lib/format.ts:13`, `web/lib/format.ts:17`.
   - Problema concreto: `maximumFractionDigits: 2` puede mostrar `0` o redondear una puja/incremento pequeño que sí es válido en stroops.
   - Impacto: la persona puede ver un precio o reembolso distinto del valor real depositado; en dinero, aunque sea Testnet, la interfaz pierde credibilidad.
   - Recomendación: formatear hasta 7 decimales recortando ceros finales, sin cambiar `parseUsdc`; usar `tabular-nums` en importes y separar visualmente unidad USDC.

3. **Una liquidación sin ofertas se presenta como venta.**
   - Ubicación: `web/components/auction/auction-panel.tsx:20`, `web/components/auction/settle-card.tsx:98`, `web/components/auction/settle-card.tsx:100`, `web/components/auction/settle-card.tsx:125`.
   - Problema concreto: la fase `settled` siempre usa “Vendida” y la tarjeta “Obra vendida”, aunque `amount === 0` y el texto posterior diga que no se movieron fondos.
   - Impacto: el estado final contradice la cadena y puede hacer creer que hubo una compra inexistente.
   - Recomendación: derivar el rótulo de `highestBid`/evento: “Vendida” solo si hubo ganador; si no, “Liquidada sin venta” y quitar el color/emphasis de éxito comercial.

4. **Datos críticos en texto chico no llegan a contraste AA.**
   - Ubicación: tokens en `web/app/globals.css:10`, `web/app/globals.css:14`; usos en `web/components/auction/bid-form.tsx:121`, `web/components/auction/bid-form.tsx:174`, `web/components/auction/countdown.tsx:41`, `web/components/auction/auction-badge.tsx:57`, `web/components/auction/auction-badge.tsx:67`.
   - Problema concreto: `piedra` sobre `papel` mide aproximadamente 3.57:1 y sobre `cal` 3.25:1; `ocre` sobre `papel` mide 3.04:1. Se usan en mínimos, saldos, tiempos, ganadores y etiquetas de 11–12 px.
   - Impacto: en el celu, con luz de sala o sol, la información más operativa de la subasta se vuelve difícil de leer.
   - Recomendación: oscurecer `piedra`/`ocre` para texto o cambiar esos usos a `tinta-2`; reservar ocre para acentos grandes, íconos y bordes. Verificar contraste real después del cambio de tipografía.

5. **El countdown de menos de una hora es ambiguo.**
   - Ubicación: `web/lib/format.ts:41`, `web/lib/format.ts:50`, `web/components/auction/countdown.tsx:41`.
   - Problema concreto: `4:05` no dice si son 4 minutos y 5 segundos, 4 horas o una hora del día; se muestra como texto corrido sin unidades.
   - Impacto: justo en la ventana anti-sniping, donde cada segundo cambia la decisión, la persona puede interpretar mal el cierre.
   - Recomendación: usar unidades visibles (`4 min 05 s`) o segmentos con rótulos `min`/`s`; mantener actualización de 1 segundo sin alterar la hora calibrada por ledger.

6. **Los skeletons no reservan la altura real y provocan un salto grande.**
   - Ubicación: `web/app/obra/[slug]/page.tsx:43`, `web/app/obra/[slug]/page.tsx:47`, `web/components/auction/auction-panel.tsx:43`.
   - Problema concreto: el skeleton de la cartela lateral usa `h-96` (~384 px), pero el panel renderizado mide alrededor de 940–960 px de alto.
   - Impacto: cuando llegan los datos, la página salta y el botón/lectura que la persona estaba por tocar se corre.
   - Recomendación: replicar la estructura real del panel (monto, countdown, input, atajos, CTA, historial) o reservar una altura mínima cercana; reducir el historial skeleton si hace falta, pero no cambiar el flujo de polling.

### Media

7. **El feedback de nueva puja es demasiado sutil y no es accesible.**
   - Ubicación: `web/components/auction/auction-panel.tsx:92`, `web/components/auction/auction-panel.tsx:102`, `web/components/auction/auction-panel.tsx:165`.
   - Problema concreto: solo cambia el fondo por 1,5 segundos; no hay `aria-live` en el monto, transición numérica ni indicación persistente de qué cambió.
   - Impacto: si la persona está mirando el input o scrolleando, no entiende que fue superada o que el mínimo cambió.
   - Recomendación: anunciar “Nueva oferta de X” con `aria-live="polite"`, animar el número con transform/opacity y dejar una insignia temporal más visible; si el superado sos vos, combinar con el aviso de reembolso.

8. **El historial ordena lo más viejo primero y entierra el evento más importante.**
   - Ubicación: `web/components/auction/auction-utils.ts:11`, `web/components/auction/bid-history.tsx:45`.
   - Problema concreto: `sortEventsChronologically` ordena ascendente; con muchas ofertas, la última puja/reembolso queda al final y fuera de pantalla.
   - Impacto: la persona no ve rápidamente el último movimiento ni si su reembolso ocurrió.
   - Recomendación: mostrar primero el evento más reciente y, si se quiere conservar la metáfora de registro, numerarlo como secuencia sin depender del orden visual.

9. **El estado de transacción informa, pero no guía visualmente el proceso.**
   - Ubicación: `web/components/auction/bid-form.tsx:77`, `web/components/auction/bid-form.tsx:84`, `web/components/auction/bid-form.tsx:87`, `web/components/auction/transaction-status.tsx:17`.
   - Problema concreto: todos los estados de trabajo son la misma caja gris con texto; no hay spinner, pasos ni diferenciación visual entre “firmar” y “esperar red”.
   - Impacto: en una passkey o wallet externa la persona no sabe si debe actuar todavía o solo esperar; puede cerrar o reintentar antes de tiempo.
   - Recomendación: agregar un stepper compacto `firmar → enviar → confirmar`, spinner solo durante trabajo, y errores con acción clara de reintento. No tocar la firma ni el orden real de la transacción.

10. **El texto anti-sniping sugiere una suma de 5 minutos, pero la regla reubica el cierre a 5 minutos desde la nueva oferta.**
    - Ubicación: `web/app/obra/[slug]/page.tsx:111`, `web/components/auction/countdown.tsx:45`, referencia de la regla en `web/lib/format.ts:4`.
    - Problema concreto: “el cierre se corre 5 minutos más” se lee como `endTime += 300`; el contrato usa `now + 300`.
    - Impacto: una oferta a los 10 segundos no extiende el cierre 5 minutos completos desde el cierre viejo, y la diferencia importa en la puja final.
    - Recomendación: cambiar la copia a “el cierre queda 5 minutos después de esa oferta” y usar la misma redacción en ficha, countdown y documentación visible.

11. **Cuando la subasta cerró sin ofertas, el panel principal sigue hablando en presente.**
    - Ubicación: `web/components/auction/auction-panel.tsx:131`, `web/components/auction/auction-panel.tsx:134`.
    - Problema concreto: para cualquier fase sin ofertas muestra “Todavía no hay ofertas”, incluso si `phase` es `ended` o `settled`.
    - Impacto: parece que todavía se puede ser la primera persona en ofertar aunque la ventana ya cerró.
    - Recomendación: derivar el texto de fase: “Terminó sin ofertas” / “No hubo venta” cuando corresponda.

12. **El input elimina el outline de foco y solo cambia el borde.**
    - Ubicación: `web/components/auction/bid-form.tsx:135`.
    - Problema concreto: la clase `outline-none` deja el foco computado como `none 0px`; el único indicador es un cambio de color de borde de 1 px.
    - Impacto: quien navega con teclado o usa zoom pierde el foco en el control más importante.
    - Recomendación: quitar `outline-none` y definir `focus-visible:ring-2` o una sombra/outline acorde al sistema, manteniendo el borde malbec.

13. **Las tarjetas de obra son clicables pero no tienen affordance visible en touch.**
    - Ubicación: `web/app/page.tsx:122`, `web/app/page.tsx:130`, `web/app/page.tsx:147`.
    - Problema concreto: todo el bloque es un `Link`, pero no hay “Ver ficha/ofertar” ni flecha/estado activo; el lift solo aparece en hover.
    - Impacto: en celu la persona puede no entender que la obra abre una ficha o que ahí se oferta.
    - Recomendación: agregar un CTA textual discreto dentro de la cartela (“Ver puja”) y estado `:active` visible; conservar el link completo.

14. **La home explica el proceso antes de mostrar la muestra completa.**
    - Ubicación: `web/app/page.tsx:84`, `web/app/page.tsx:102`, `web/app/page.tsx:117`.
    - Problema concreto: en mobile la sección de cuatro pasos separa el hero de la grilla de obras; las fichas reales quedan muy abajo.
    - Impacto: quien entra directo a la muestra tarda en descubrir qué obras están en vivo.
    - Recomendación: mover la grilla antes del recorrido o comprimir el recorrido en mobile; el hero ya resume el mecanismo.

15. **Algunas acciones quedan por debajo del área táctil cómoda de 44 px.**
    - Ubicación: `web/components/auction/auction-panel.tsx:182`, `web/components/auction/bid-history.tsx:58`.
    - Problema concreto: “Reintentar” usa `min-h-8` y cada “Ver en el explorador” también `min-h-8` (~32 px).
    - Impacto: acciones pequeñas y repetidas son difíciles de tocar en mobile, especialmente durante una puja.
    - Recomendación: subir a `min-h-11` o convertir explorador en acceso secundario de toda la fila con padding suficiente.

### Baja

16. **Los números de puja no usan consistencia tabular.**
    - Ubicación: `web/components/auction/auction-panel.tsx:167`, `web/components/auction/settle-card.tsx:116`, `web/components/auction/auction-badge.tsx:44`.
    - Problema concreto: los importes se componen con serif decorativa y sin `tabular-nums`; al cambiar dígitos puede variar el ancho.
    - Impacto: la comparación de montos y el movimiento de una nueva puja son menos legibles.
    - Recomendación: aplicar `tabular-nums` o una variante numérica consistente en importes y countdown.

17. **El aviso de éxito de una oferta no se invalida cuando cambia el estado posterior.**
    - Ubicación: `web/components/auction/bid-form.tsx:91`, `web/components/auction/bid-form.tsx:96`, `web/components/auction/bid-form.tsx:97`.
    - Problema concreto: “Tu oferta… está depositada” queda visible indefinidamente; si otro la supera en el siguiente polling, el mensaje viejo convive con el aviso de reembolso.
    - Impacto: la persona puede interpretar que sigue ganando o que la plata sigue depositada.
    - Recomendación: limpiar o reemplazar el estado de éxito cuando cambian `highestBidder`/`highestBid`, conservando el hash en el historial.

18. **Los links repetidos de explorador cargan visualmente el historial.**
    - Ubicación: `web/components/auction/bid-history.tsx:58`.
    - Problema concreto: cada movimiento repite “Ver en el explorador” en una línea adicional.
    - Impacto: una historia corta ocupa mucho alto y empuja la información de reparto/cierre todavía más abajo en mobile.
    - Recomendación: compactar con un ícono/texto “Explorer” al final de la primera línea o hacer toda la fila expandable; mantener accesible el link.

19. **La foto real no declara dimensiones ni usa optimización de Next.**
    - Ubicación: `web/components/obra-arte.tsx:96`, `web/components/obra-arte.tsx:100`.
    - Problema concreto: `<img>` no tiene `width`/`height`; el contenedor con aspect ratio evita gran parte del CLS, pero no hay `next/image` ni control de carga para fotos reales.
    - Impacto: fotos pesadas de obras reales pueden tardar o degradar la experiencia mobile.
    - Recomendación: migrar a `next/image` con `fill`/`sizes` dentro del contenedor 4:5 y definir comportamiento de carga según posición.

20. **La animación está concentrada en entradas decorativas, no en los momentos de decisión.**
    - Ubicación: `web/app/page.tsx:121`, `web/components/auction/auction-panel.tsx:153`, `web/components/auction/auction-panel.tsx:165`.
    - Problema concreto: tarjetas y panel usan fade/slide al cargar; en cambio nueva puja, superación, extensión y confirmación tienen señal mínima o efímera.
    - Impacto: la interfaz se siente pulida visualmente pero no necesariamente más comprensible durante la subasta.
    - Recomendación: recortar animaciones de entrada repetidas y rediseñar 4 microinteracciones específicas: nueva oferta, fuiste superado, cierre extendido y transición de tx a confirmada.

## 4) Propuesta concreta para la fase de mejora

Reparto pensado para 4 personas sin pisar archivos. Cada paquete es chico y puede mergearse independientemente si se respeta la propiedad.

### Persona A — jerarquía mobile y recorrido de la muestra

Archivos permitidos: `web/app/obra/[slug]/page.tsx`, `web/app/page.tsx`.

1. En ficha mobile, agregar resumen/CTA sticky o reordenar visualmente el panel antes de la galería; medir que el CTA aparezca en el primer viewport de 390×844.
2. En home, mover o comprimir “Cuatro pasos” para que la grilla de obras aparezca antes.
3. Agregar affordance “Ver puja” a cada tarjeta y estado activo táctil.
4. Ajustar skeleton de la ruta para acercarse a la altura real.

### Persona B — estados en vivo, countdown e historial

Archivos permitidos: `web/components/auction/auction-panel.tsx`, `web/components/auction/countdown.tsx`, `web/components/auction/bid-history.tsx`, `web/components/auction/auction-utils.ts`.

1. Corregir textos de fases sin ofertas y settled sin venta en el panel.
2. Hacer accesible y visible el cambio de puja: `aria-live`, insignia temporal y microanimación del monto.
3. Reescribir countdown final con unidades claras (`min`/`s`) sin tocar la hora calibrada.
4. Invertir el orden visual del historial a más reciente primero y compactar links de explorador con hit area ≥44 px.
5. Corregir la copia anti-sniping en el countdown.

### Persona C — formulario, transacciones y estados finales

Archivos permitidos: `web/components/auction/bid-form.tsx`, `web/components/auction/transaction-status.tsx`, `web/components/auction/pending-refund.tsx`, `web/components/auction/settle-card.tsx`.

1. Mejorar foco visible del input y la ayuda de formato decimal antes del error.
2. Convertir el estado de tx en stepper compacto firma/envío/confirmación, con spinner y errores accionables.
3. Invalidar o actualizar el éxito de oferta cuando cambia el ganador/monto posterior.
4. Corregir tarjeta de liquidación sin venta y hacer consistente el lenguaje de reclamo/liquidación.
5. Mantener intactos los wrappers de firma y llamadas a `placeBid`, `claimRefund` y `settleAuction`.

### Persona D — tokens, formato numérico y assets

Archivos permitidos: `web/app/globals.css`, `web/lib/format.ts`, `web/components/auction/auction-badge.tsx`, `web/components/obra-arte.tsx`.

1. Ajustar colores de texto secundario para AA y definir cuándo `ocre` es decoración vs texto.
2. Cambiar `formatUsdc` para mostrar precisión real hasta 7 decimales sin alterar `parseUsdc` ni `STROOPS_PER_USDC`.
3. Aplicar `tabular-nums`/tratamiento numérico consistente en badge y exportar una clase/token si conviene.
4. Mejorar estados de error/loading de `AuctionBadge` sin romper su polling.
5. Migrar fotos reales a `next/image` o al menos declarar dimensiones/comportamiento de carga.

## 5) Riesgos: qué no tocar porque rompe la lógica on-chain

- **Precisión y conversión de USDC:** no cambiar `STROOPS_PER_USDC` ni la aritmética de `parseUsdc` (`web/lib/format.ts:3`, `web/lib/format.ts:17`). El cambio debe ser solo de presentación.
- **Mínimo de la próxima oferta:** `minNextBid` implementa regla del contrato (`web/lib/format.ts:30`). Cualquier redondeo visual no puede permitir enviar menos.
- **Fases y anti-sniping:** `auctionPhase` y `ANTI_SNIPING_SECONDS` reflejan la regla de 300 segundos (`web/lib/format.ts:4`, `web/lib/format.ts:34`). No inventar otra ventana ni sumar 300 al `endTime` en UI.
- **Hora de red:** `useAuction` calibra con `readLedgerTime` y recalibra cada 30 segundos (`web/lib/use-auction.ts:7`, `web/lib/use-auction.ts:49`). No reemplazar por `Date.now()` simple: el countdown y `ended` dependen de la hora del ledger.
- **Polling/eventos:** la deduplicación por `eventKey`, la ventana de eventos y la actualización forzada posterior a tx están en `useAuction` (`web/lib/use-auction.ts:68`, `web/lib/use-auction.ts:103`). No convertir eventos en fuente de verdad del monto actual ni revertir su merge sin entenderlo.
- **Firma y envío:** los wrappers solo cambian mensajes alrededor de `signTransaction`; no alterar el orden `signAndSend`, ni omitir errores del contrato (`web/components/auction/bid-form.tsx:84`, `web/components/auction/settle-card.tsx:37`, `web/components/auction/pending-refund.tsx:29`).
- **Reembolso pendiente:** la distinción entre reembolso automático y pendiente es una garantía del contrato; no simplificarla como si todo hubiera vuelto siempre (`web/components/auction/auction-panel.tsx:78`, `web/components/auction/pending-refund.tsx:14`).
- **Settlement permissionless:** el botón puede firmar cualquier cuenta, pero la transacción sigue siendo necesaria; no convertirlo en una acción local ni ocultar errores de `AlreadySettled`/`AuctionNotEnded` (`web/components/auction/settle-card.tsx:27`).
