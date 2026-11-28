# Revisión final frontend — coherencia visual y UX

Fecha: 2026-11-28. Revisión de solo lectura sobre el trabajo sin commitear de M1-M8, M10 y M11.

**Excluido por indicación del coordinador:** `web/components/wallet-provider.tsx`, `web/components/connect-wallet-button.tsx`, `web/components/wallet/login-dialog.tsx`, `web/lib/wallet.ts` y `web/lib/passkey-wallet.ts` (M9 sigue en curso). Los resultados automatizados que detectaban elementos ocultos de ese diálogo no se contaron como hallazgos.

## 1) Resumen

La base visual quedó reconocible y mucho más coherente: Fraunces/Archivo/IBM Plex Mono cargan correctamente, los colores principales de texto ya pasan AA, las rutas no tienen overflow horizontal y las animaciones quedan neutralizadas con `prefers-reduced-motion`. La navegación mobile de obra mejoró mucho: el resumen con puja y CTA aparece antes de la obra. El onboarding ya no muestra “En curso” falso ni jerga visible en el recorrido principal. El hallazgo más serio ya no es estético sino de verdad de datos: el panel muestra una puja ganadora y al mismo tiempo un historial que dice que nadie ofertó. Antes de commit conviene corregir ese fallback, el CTA del resumen mobile para subastas cerradas y varios objetivos táctiles secundarios que siguen por debajo de 44 px.

## 2) Verificación ejecutada

### Recorrido y capturas

Se recorrieron estas rutas con Chromium/Playwright, en `390×844` y `1280×800`, con capturas full-page sin el indicador de desarrollo de Next:

| Ruta | Mobile | Desktop | Estado |
|---|---|---|---|
| `/` | `audits/frontend/screens/final-home-mobile.png` | `audits/frontend/screens/final-home-desktop.png` | 200 |
| `/obra/atardecer-en-uspallata` | `audits/frontend/screens/final-obra-atardecer-mobile.png` | `audits/frontend/screens/final-obra-atardecer-desktop.png` | 200 |
| `/obra/vinedos-al-sur` | `audits/frontend/screens/final-obra-vinedos-mobile.png` | `audits/frontend/screens/final-obra-vinedos-desktop.png` | 200 |
| `/obra/cerro-en-calma` | `audits/frontend/screens/final-obra-cerro-mobile.png` | `audits/frontend/screens/final-obra-cerro-desktop.png` | 200 |
| `/empezar` | `audits/frontend/screens/final-empezar-mobile.png` | `audits/frontend/screens/final-empezar-desktop.png` | 200 |
| `/qr` | `audits/frontend/screens/final-qr-mobile.png` | `audits/frontend/screens/final-qr-desktop.png` | 200 |
| `/ruta-que-no-existe` | `audits/frontend/screens/final-404-mobile.png` | `audits/frontend/screens/final-404-desktop.png` | 404 esperado |

### Resultado de regresiones

- `cd web && npx tsc --noEmit`: **exit 0**.
- `cd web && npm run lint`: **exit 0**.
- Overflow horizontal: **no** en ninguna ruta ni viewport (`scrollWidth === clientWidth`).
- Exactamente un `<h1>` por página y `lang="es"` en todas.
- Consola: sin errores de aplicación ni `pageerror` en rutas 200. En la ruta 404 solo aparece el error esperado del recurso/documento 404.
- `prefers-reduced-motion: reduce` emulado en `/`, `/obra/atardecer-en-uspallata` y `/empezar`: 25 elementos animados inspeccionados, **0 offenders**; las duraciones quedan en 0.01 ms por el bloque global de `web/app/globals.css:161-168`.
- Foco inicial por teclado: el primer Tab expone “Saltar al contenido”, visible, de 44 px de alto y con outline malbec.
- Fuentes computadas: cuerpo `Archivo`, `<h1>` `Fraunces`, clases mono `IBM Plex Mono`.

### Lectura on-chain de apoyo

Como el historial se veía vacío con pujas activas, hice una lectura RPC de solo lectura. En el momento de la revisión el RPC reportó ledger latest `5960988` y oldest `5840030`; para las subastas 0, 1 y 2 devolvió **0 eventos** incluso recorriendo toda la retención disponible, mientras las fichas muestran pujas de 55/35/35 USDC. No pude distinguir si los eventos quedaron fuera de retención o si hay otro problema de indexación/filtro, pero sí queda demostrado que “eventos vacíos” no equivale a “sin ofertas”.

## 3) Inventario de coherencia

### Radios

Excluyendo M9, el inventario actual es: `rounded-full` 64, `rounded-sm` 21, `rounded-lg` 13, `rounded-md` 2, `rounded-xs` 2 y `rounded-2xl` 1. La escala nueva se está usando, pero `.cartela` no define radio por sí misma (`web/app/globals.css:121-126`) y las cartelas quedan mezcladas: sin radio en home/ficha, `rounded-lg` en subasta/onboarding y `rounded-md` en QR/404.

### Colores

Los colores de texto principales pasan AA sobre las superficies habituales:

- `piedra` `#665f58`: 5.93:1 sobre papel, 5.39:1 sobre cal, 4.88:1 sobre cal-2.
- `ocre` `#8a5a10`: 5.58:1 sobre papel, 5.07:1 sobre cal, 4.59:1 sobre cal-2.
- `tinta-2` `#4a443d`: 9.07:1 sobre papel, 8.24:1 sobre cal, 7.47:1 sobre cal-2.

No encontré hex hardcoded en texto de componentes. Los hex de `web/components/obra-arte.tsx` pertenecen a las ilustraciones SVG de las obras y no son problema de tokens de UI. Quedan hex de UI en las clases `.marco` y `.paspartu` (`web/app/globals.css:127-136`) y en `themeColor` (`web/app/layout.tsx:43`); es menor, pero podrían tokenizarse.

### Tipografía y tamaños arbitrarios

Las tres familias llegan correctamente por tokens. Tamaños arbitrarios actuales fuera de M9:

- Display/editorial intencional: `web/app/page.tsx:33` (`3.4rem`, `5.5rem`), `web/components/auction/auction-panel.tsx:184` (`3.4rem`), logo en `web/app/layout.tsx:63` (`1.45rem`/`1.65rem`).
- Textos auxiliares muy chicos: `web/components/auction/auction-badge.tsx:69` (`0.625rem`), `web/components/auction/transaction-status.tsx:82` (`10px`), `web/components/onboarding/step-card.tsx:114` (`0.68rem`), `web/components/qr/qr-card.tsx:57` (`0.68rem`).

### Animaciones

Inventario fuera de M9: `animate-pulse` 15, `animate-aparecer` 9, `animate-latido` 8, `animate-entrar` 6, `animate-spin` 2, `animate-pulso-oferta` 2, `animate-confirmar` 2, `animate-aviso-extension` 2, `animate-none` 1. La prueba con reduced-motion no encontró duraciones residuales.

### Jerga visible

En el render normal de `/`, `/obra/*` y `/empezar` no aparecen `Friendbot`, `XLM`, `faucet` ni `trustline`. `Stellar Testnet` queda solo en el footer técnico (`web/app/layout.tsx:95`) y en las cartelas QR (`web/components/qr/qr-card.tsx:77`), ambos aceptados por la consigna. Sí quedan `Stellar Testnet` y `XLM` en copys de error de `web/components/auction/transaction-status.tsx:28-31`, que no se ven en el camino feliz pero sí aparecerían ante una falla.

### Nombre de fases

Las mismas fases principales están nombradas igual en `auction-badge.tsx:9-12`, `auction-panel.tsx:21-24` y `mobile-bid-summary.tsx:9-12`: “Vendida”, “Cerrada sin ofertas”, “Cerrada”, “Últimos minutos”, “En vivo”. `countdown.tsx` usa “Subasta cerrada/liquidada” como estado temporal complementario y `settle-card.tsx` ya distingue venta de cierre sin ofertas. No encontré divergencia de nomenclatura de fase; el problema está en una acción del resumen mobile y en el historial, detallado abajo.

## 4) Hallazgos agrupados por archivo

### `web/components/auction/bid-history.tsx` + `web/components/auction/auction-panel.tsx`

1. **Alta — El historial puede mentir cuando no hay eventos disponibles.**
   - Evidencia: `web/components/auction/bid-history.tsx:42-43` muestra “Todavía nadie ofertó. Podés ser la primera persona.” siempre que `events` esté vacío. Al mismo tiempo `web/components/auction/auction-panel.tsx:136-149` sí tiene `highestBid`/`highestBidder` y muestra “Puja actual 55 USDC · Va ganando…”. Se ve en `final-obra-atardecer-mobile.png` y `final-obra-atardecer-desktop.png`.
   - Impacto: la interfaz contradice el estado on-chain en la parte que más confianza debería dar; una persona puede creer que su oferta sería la primera cuando ya hay una puja.
   - Arreglo sugerido: pasar `hasBid`/`highestBid` a `BidHistory` o calcularlo en el padre. Si no hay eventos pero sí puja, mostrar “Hay una puja activa, pero el registro de movimientos todavía no se pudo leer” con reintento/link al contrato; reservar “Todavía nadie ofertó” para `events.length === 0 && highestBid === 0`. En paralelo conviene investigar retención/filtro de eventos RPC, pero el copy no debe depender de esa causalidad.

### `web/components/auction/mobile-bid-summary.tsx`

2. **Media — Una subasta cerrada o vendida puede seguir ofreciendo el CTA “Ofertar”.**
   - Evidencia: `web/components/auction/mobile-bid-summary.tsx:98-115` calcula `live`, pero solo cambia a “Ver detalle” cuando la subasta cerró **sin ofertas** (`closedWithoutBids`). Si `phase` es `ended` con ganador o `settled`/`Vendida`, el encabezado dice cerrada/vendida y el botón sigue diciendo “Ofertar”.
   - Impacto: contradicción de estado justo en el primer elemento que ve la persona en mobile; el CTA la lleva a un panel donde ofertar ya no existe.
   - Arreglo sugerido: derivar el CTA de `live`: `actionLabel = live ? "Ofertar" : "Ver detalle"` y `actionPrimary = live` (o dejar primario solo para liquidar si esa es la acción deseada).

### `web/components/auction/transaction-status.tsx`

3. **Media — Los mensajes de recuperación de error vuelven a la jerga que M8/M10 eliminaron del onboarding.**
   - Evidencia: `web/components/auction/transaction-status.tsx:28` dice “Cambiá la wallet a Stellar Testnet…” y `:31` dice “Fondeá la cuenta con XLM de prueba…”.
   - Impacto: aparece justo cuando la persona ya tuvo un error; exigirle entender red/asset técnico aumenta abandono y contradice el tono actual de `/empezar`.
   - Arreglo sugerido: reemplazar por “Cambiá la wallet a la red de prueba…” y “Activá la cuenta desde Empezar…” (o “completá el paso de activación”), sin mencionar XLM.

### Objetivos táctiles: `web/app/layout.tsx`, `web/app/obra/[slug]/page.tsx`, `web/components/auction/auction-panel.tsx`, `web/components/auction/bid-form.tsx`

4. **Media — El enlace del contrato del footer queda muy por debajo del objetivo táctil.**
   - Evidencia: `web/app/layout.tsx:96-100`; medido en todas las rutas: 16 px de alto en mobile y desktop.
   - Impacto: enfoque/tap difícil en el único enlace persistente de verificación; además queda por debajo incluso del mínimo WCAG 2.2 de 24 px.
   - Arreglo sugerido: convertirlo en `inline-flex min-h-11 items-center` (o envolverlo en un contenedor con padding) sin alterar el texto.

5. **Media — El enlace “el contrato en stellar.expert” de la ficha también queda bajo.**
   - Evidencia: `web/app/obra/[slug]/page.tsx:133-140`; medido 37.8 px de alto en mobile y desktop.
   - Impacto: es un enlace secundario, pero forma parte de la promesa de verificabilidad de cada obra.
   - Arreglo sugerido: `inline-flex min-h-11 items-center` o hacerlo una fila/botón de verificación.

6. **Baja — Reintentos/enlaces de estados no felices todavía no llegan a 44 px.**
   - Evidencia: botón de reintento de actualización con `min-h-8` en `web/components/auction/auction-panel.tsx:199`; link “conseguí 200 en 1 minuto” inline sin alto mínimo en `web/components/auction/bid-form.tsx:190-192`.
   - Impacto: solo se ven ante error/saldo insuficiente, pero ahí la persona necesita más precisión, no menos.
   - Arreglo sugerido: subir ambos a `min-h-11` con `inline-flex items-center`; si el link debe quedar dentro de una oración, agregar padding vertical real sin romper la línea.

### Radios y cartelas: `web/app/page.tsx`, `web/app/obra/[slug]/page.tsx`, `web/app/not-found.tsx`, `web/components/qr/qr-card.tsx`, `web/app/globals.css`

7. **Media — Las cartelas principales no tienen una regla de radio consistente.**
   - Evidencia: `.cartela` no define radio (`web/app/globals.css:121-126`). Sin radio: cartela flotante de home (`web/app/page.tsx:70`) y tarjetas de obras (`web/app/page.tsx:130`), skeleton/cartela/ficha/sin-subasta en obra (`web/app/obra/[slug]/page.tsx:52-54`, `:94`, `:107`). Con `rounded-lg`: panel (`web/components/auction/auction-panel.tsx:160`), resumen mobile (`web/components/auction/mobile-bid-summary.tsx:44`) y onboarding (`web/components/onboarding/onboarding-stepper.tsx:497`). Con `rounded-md`: 404 (`web/app/not-found.tsx:6`) y QR (`web/components/qr/qr-card.tsx:39`).
   - Impacto: en una misma ficha la cartela de la obra se ve cortante/recta y el panel de subasta redondeado; en home las tarjetas de obra tampoco comparten la suavidad nueva. No rompe uso, pero sí la sensación de un solo sistema.
   - Arreglo sugerido: definir la regla semántica una sola vez: por ejemplo `.cartela` con `rounded-lg` para pantalla y override explícito `rounded-md` en impresión/QR si se quiere más sobrio; si `.cartela` debe quedar neutra, aplicar `rounded-lg` en home/ficha/skeletons principales.

8. **Baja — Queda un `rounded-2xl` de la escala vieja.**
   - Evidencia: skeleton mobile de ficha en `web/app/obra/[slug]/page.tsx:46`.
   - Impacto: solo carga/skeleton, pero es el único outlier del inventario y visualmente será más redondo que el componente real.
   - Arreglo sugerido: cambiar a `rounded-lg` para coincidir con `MobileBidSummary`.

### Tipografía auxiliar

9. **Baja — Algunos textos auxiliares quedan en 10-11 px en mobile.**
   - Evidencia: label “cierra” de badge en `web/components/auction/auction-badge.tsx:69` (0.625 rem), numeración de pasos de transacción en `web/components/auction/transaction-status.tsx:82` (10 px), badges de onboarding en `web/components/onboarding/step-card.tsx:114` (0.68 rem), URL del QR en `web/components/qr/qr-card.tsx:57` (0.68 rem). Además `.etiqueta` global usa 0.6875 rem (`web/app/globals.css:113-119`).
   - Impacto: el contraste ya es correcto, pero en 390 px y con luz de sala estos rótulos quedan en el piso de legibilidad; el QR es especial porque se consulta para verificar la URL.
   - Arreglo sugerido: llevar rótulos relevantes a 0.75 rem mínimo donde haya espacio; el número dentro del stepper de transacción puede quedar como excepción porque es un glifo dentro de un ícono, no texto corrido.

### Tokens de color locales

10. **Baja — `.marco`/`.paspartu` siguen con hex no tokenizados.**
    - Evidencia: `web/app/globals.css:127-136` usa `#2a211c`, `#4b3a2f` y `#f7f3ec`; `themeColor` repite `#f2ede4` en `web/app/layout.tsx:43`.
    - Impacto: no hay inconsistencia visual visible; es deuda de sistema si después se ajusta la paleta.
    - Arreglo sugerido: agregar tokens semánticos/primitivos para marco y paspartú, manteniendo los valores actuales.

## 5) Listo para commit

**Técnicamente listo:** TypeScript y ESLint pasan, no hay overflow ni errores de consola en rutas 200, las fuentes correctas están aplicadas, reduced-motion funciona y el recorrido principal se ve coherente en mobile/desktop. También está listo el grueso de onboarding (`/empezar`), QR, 404, home y la base visual.

**Mi recomendación antes de commit:** corregir al menos los hallazgos 1 y 2, porque son contradicciones de estado visibles/lógicas en el flujo central de subasta; idealmente también el grupo de objetivos táctiles (4-6) y la regla de radios (7-8), que son cambios chicos y repartibles sin tocar lógica on-chain. Los hallazgos 9-10 pueden quedar como polish posterior si el tiempo del hackathon apura. **No incluiría M9 en el commit** hasta que ese worker termine y se revise el comportamiento final del diálogo de acceso.
