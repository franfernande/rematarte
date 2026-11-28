# Auditoría frontend — sistema visual

## 1) Resumen

La dirección visual ya tiene una identidad clara de sala de muestra: cal, papel, tinta, malbec y ocre funcionan bien como concepto.
El problema principal no es la paleta sino su implementación: dos colores usados para texto pequeño no llegan a WCAG AA.
Los tokens son primitivos, no semánticos, y la tipografía no tiene una escala formal: hay 21 variantes y varios valores arbitrarios.
Los radios y sombras son inconsistentes entre cartelas, paneles, onboarding y diálogos, justo en el punto que el usuario quiere suavizar.
Las animaciones respetan `prefers-reduced-motion`, pero son repetitivas y no forman un catálogo coreografiado de entrada, hover, nueva oferta, countdown y éxito.

## 2) Estado actual

### Fuentes y carga

- `web/app/layout.tsx:2` importa `Geist`, `Geist_Mono` e `Instrument_Serif` desde `next/font/google`.
- `web/app/layout.tsx:10-25` crea variables `--font-geist-sans`, `--font-geist-mono` y `--font-instrument-serif`; `Instrument_Serif` solo carga peso 400 normal/itálica.
- `web/app/layout.tsx:45-49` aplica las tres variables en `<html>` y `antialiased`.
- `web/app/globals.css:18-20` mapea esas variables a `--font-serif`, `--font-sans` y `--font-mono`.
- En componentes hay 32 usos de `font-serif` y 9 de `font-mono`; el cuerpo usa sans por defecto desde `web/app/globals.css:42`.

### Tokens y superficies

- `web/app/globals.css:4-16` define 12 colores primitivos: cal, papel, tinta, piedra, línea, malbec, ocre, noche y éxito.
- `web/app/globals.css:35-55` define fondo global, selección y focus visible.
- `web/app/globals.css:57-84` define tres componentes visuales: `.etiqueta`, `.cartela`, `.marco` y `.paspartu`.
- `web/app/layout.tsx:35-39` define `themeColor: "#f2ede4"`, coherente con el fondo claro.
- No hay modo oscuro ni capa semántica (`surface`, `text`, `action`, `success`, `warning`); los componentes consumen directamente los primitivos.

### Espaciado y ritmo de layout

- El espaciado sí sigue mayoritariamente la escala Tailwind de 4 px: contenedores con `px-5` (`web/app/layout.tsx:52`, `web/app/page.tsx:30`, `web/app/obra/[slug]/page.tsx:63`), paneles con `px-5 py-5`/`sm:px-6` (`web/components/auction/auction-panel.tsx:154`), cards con `p-5`/`p-6` (`web/components/onboarding/onboarding-stepper.tsx:393`, `web/app/qr/page.tsx:92`) y secciones con saltos de `py-10` a `py-16`.
- El barrido encontró 353 usos de utilidades de espaciado y 84 combinaciones base; aunque hay muchas variantes puntuales (`mt-0.5`, `pr-16`, `left-5`), casi todas son compensaciones funcionales dentro de componentes, no un problema sistémico.
- Conclusión: no conviene gastar una fase en una nueva escala de espaciado; sí conviene documentar patrones de densidad para cartela/panel/formulario.

### Inventario de bordes, radios, transiciones y animaciones

Barrido de `web/app` y `web/components` (`*.tsx`, `*.css`): 49 utilidades base únicas, 264 usos. Resumen completo por utilidad base:

| Utilidad | Usos | Referencias representativas |
|---|---:|---|
| `animate-aparecer` | 10 | `web/app/page.tsx:31`, `web/app/obra/[slug]/page.tsx:69`, `web/components/auction/auction-panel.tsx:153`, `web/components/qr/qr-card.tsx:25` |
| `animate-latido` | 8 | `web/app/page.tsx:76`, `web/components/auction/auction-badge.tsx:41`, `web/components/auction/countdown.tsx:42`, `web/components/wallet/login-dialog.tsx:208` |
| `animate-pulse` | 7 | `web/app/empezar/loading.tsx:4`, `web/app/obra/[slug]/page.tsx:46`, `web/app/qr/page.tsx:92`, `web/components/auction/auction-panel.tsx:47` |
| `animate-spin` | 1 | `web/components/onboarding/step-card.tsx:30` |
| `rounded-full` | 51 | botones y pills en `web/app/page.tsx:45`, `web/components/onboarding/onboarding-stepper.tsx:23-26`, `web/components/wallet/login-dialog.tsx:153` |
| `rounded-sm` | 18 | `web/app/obra/[slug]/page.tsx:70`, `web/components/auction/bid-form.tsx:116`, `web/components/auction/transaction-status.tsx:21`, `web/components/qr/qr-card.tsx:52` |
| `rounded-2xl` | 6 | `web/app/empezar/loading.tsx:6`, `web/components/onboarding/onboarding-stepper.tsx:393`, `web/components/onboarding/step-card.tsx:88` |
| `rounded-lg` | 4 | `web/app/qr/page.tsx:64`, `web/components/wallet/login-dialog.tsx:122`, `web/components/wallet/login-dialog.tsx:157` |
| `rounded` | 3 | skeletons QR en `web/app/qr/page.tsx:93-95` |
| `rounded-xl` | 2 | errores onboarding en `web/components/onboarding/onboarding-stepper.tsx:429`, `web/components/onboarding/step-card.tsx:103` |
| `rounded-t-3xl` | 1 | sheet mobile en `web/components/wallet/login-dialog.tsx:122` |
| `border` / `border-2` | 30 | `web/app/page.tsx:51`, `web/components/onboarding/step-card.tsx:30` |
| `border-b` / `border-b-0` | 6 | `web/app/layout.tsx:51`, `web/components/onboarding/onboarding-stepper.tsx:418` |
| `border-t` / `border-t-2` | 9 | `web/app/layout.tsx:74`, `web/app/obra/[slug]/page.tsx:87`, `web/app/page.tsx:92` |
| `border-y` | 1 | `web/app/page.tsx:84` |
| `border-dashed` | 1 | `web/app/page.tsx:111` |
| `border-linea` | 22 | `web/app/layout.tsx:74`, `web/components/auction/bid-form.tsx:116`, `web/components/qr/qr-card.tsx:52` |
| `border-linea/70` / `/80` | 4 | `web/app/layout.tsx:51`, `web/components/onboarding/onboarding-stepper.tsx:411` |
| `border-tinta` / `/20` / `/40` | 11 | `web/app/page.tsx:51`, `web/components/onboarding/onboarding-stepper.tsx:26`, `web/components/wallet/login-dialog.tsx:198` |
| `border-malbec` y opacidades `/25`,`/30`,`/35`,`/55` | 10 | `web/components/auction/bid-form.tsx:135`, `web/components/onboarding/step-card.tsx:16`, `web/components/wallet/login-dialog.tsx:257` |
| `border-ocre` y opacidades `/25`,`/40`,`/45`,`/70` | 9 | `web/app/page.tsx:111`, `web/components/auction/pending-refund.tsx:50`, `web/components/onboarding/step-card.tsx:14` |
| `border-exito` y opacidades `/20`,`/30`,`/35` | 6 | `web/components/auction/settle-card.tsx:99`, `web/components/onboarding/onboarding-stepper.tsx:331` |
| `border-t-ocre` | 1 | spinner en `web/components/onboarding/step-card.tsx:30` |
| `transition-colors` | 30 | navegación `web/app/layout.tsx:59`, CTAs `web/app/page.tsx:45`, inputs/botones `web/components/auction/bid-form.tsx:135` |
| `transition-transform` | 3 | marcos/obras en `web/app/page.tsx:63`, `web/app/page.tsx:123`, `web/app/page.tsx:126` |
| `duration-200` / `300` / `500` / `700` | 6 | `web/components/onboarding/step-card.tsx:88`, `web/app/page.tsx:63`, `web/components/auction/auction-panel.tsx:165` |
| `ease-in-out` | 1 | animación global `web/app/globals.css:23` |
| `shadow-2xl` | 1 | diálogo wallet `web/components/wallet/login-dialog.tsx:122` |
| `shadow-[0_18px_40px_-34px_rgb(0_0_0/0.45)]` | 1 | estado activo en `web/components/onboarding/step-card.tsx:14` |
| `outline-none` | 1 | input de oferta `web/components/auction/bid-form.tsx:135` |

Observaciones del inventario:

- Radios en uso: `2px` (`rounded-sm`), `4px` (`rounded`), `8px` (`rounded-lg`), `12px` (`rounded-xl`), `16px` (`rounded-2xl`), `24px` (`rounded-t-3xl`) y `999px` (`rounded-full`), además de `.cartela` sin radio.
- Bordes con 13 opacidades/colores distintos; no hay escala semántica de `linea`, `linea fuerte`, `error`, `warning`, `success`.
- Solo hay 2 animaciones propias (`aparecer`, `latido`) más utilidades Tailwind (`pulse`, `spin`).

## 3) Hallazgos ordenados por severidad

### Alta

1. **Texto pequeño por debajo de WCAG AA.**
   - Ubicaciones: definición de `--color-piedra` en `web/app/globals.css:10`, `.etiqueta` en `web/app/globals.css:59-65`; usos en `web/app/layout.tsx:80`, `web/app/page.tsx:145`, `web/components/auction/auction-badge.tsx:67`, `web/components/qr/qr-card.tsx:63` y `web/components/auction/bid-form.tsx:174`.
   - Problema concreto: `#8a8279` sobre `#fbf8f2` da 3.57:1 y sobre `#f2ede4` da 3.25:1; el texto normal pequeño necesita 4.5:1. Muchos usos son `text-xs` o `.etiqueta` de 11 px.
   - Impacto: metadatos de obras, estado de la puja, horarios y pies de cartela se ven elegantes pero son difíciles de leer en el celular, especialmente con brillo ambiente en una muestra.
   - Recomendación: oscurecer el token de texto secundario a algo cercano a `#665f58` (5.93:1 sobre papel, 5.39:1 sobre cal) y separar `linea` decorativa de `texto-tenue`; no usar `piedra` actual para texto menor de 14 px.

2. **El ocre de estado en vivo no cumple contraste para texto.**
   - Ubicaciones: `--color-ocre` en `web/app/globals.css:14`; usos como texto en `web/app/page.tsx:75-78`, `web/app/obra/[slug]/page.tsx:88`, `web/components/auction/auction-badge.tsx:40-42`, `web/components/auction/countdown.tsx:42-45`.
   - Problema concreto: `#b8863b` sobre papel da 3.04:1 y sobre cal 2.77:1. No alcanza AA para texto normal ni para las etiquetas de 11–12 px.
   - Impacto: “En vivo”, “últimos minutos” y avisos anti-sniping son información crítica para decidir si ofertar; justo los estados más importantes pierden legibilidad.
   - Recomendación: crear `--color-en-vivo` más oscuro, por ejemplo `#8a5a10` (5.58:1 sobre papel, 5.07:1 sobre cal), y reservar el ocre actual para gráficos grandes, puntos, bordes o fondos con texto tinta.

3. **El input de oferta elimina el outline sin reemplazo visible suficiente.**
   - Ubicación: `web/components/auction/bid-form.tsx:135` usa `outline-none` y solo `focus:border-malbec`.
   - Problema concreto: aunque existe un focus global en `web/app/globals.css:51-54`, `outline-none` lo anula en el campo más importante del flujo de pago; cambiar solo el color del borde es una señal débil.
   - Impacto: una persona navegando con teclado puede no percibir dónde está el foco antes de ingresar un monto en USDC.
   - Recomendación: quitar `outline-none` o reemplazarlo por un anillo explícito (`focus-visible:ring-2 focus-visible:ring-malbec focus-visible:ring-offset-2`) manteniendo el borde malbec.

### Media

4. **No existe una escala de radios; las superficies equivalentes se ven distintas.**
   - Ubicaciones: `.cartela` sin radio en `web/app/globals.css:68-71`; panel de subasta sin radio en `web/components/auction/auction-panel.tsx:153`; cartela QR sin radio en `web/components/qr/qr-card.tsx:25`; onboarding con `rounded-2xl` en `web/components/onboarding/onboarding-stepper.tsx:393`; diálogo con `rounded-t-3xl` y `sm:rounded-lg` en `web/components/wallet/login-dialog.tsx:122`.
   - Problema concreto: la misma “cartela” aparece rectangular en subasta/QR y redondeada en onboarding; el diálogo usa una tercera lógica (sheet redondeado arriba en mobile, `lg` en desktop).
   - Impacto: la app se percibe armada por partes; si el objetivo es “suavizar bordes”, hoy no hay una regla que diga cuánto ni dónde.
   - Recomendación: definir una escala semántica `--radius-xs/sm/md/lg/xl/full` y aplicarla por rol: inputs/alertas `sm`, cartelas `md`, paneles/cards `lg`, sheet mobile `xl` solo arriba, botones pills `full`.

5. **Los tokens son primitivos y se consumen directamente; eso bloquea dark mode y una tipografía/tema evolutivo.**
   - Ubicaciones: tokens en `web/app/globals.css:4-16`; consumo directo en `web/app/layout.tsx:51` (`bg-cal/85`), `web/app/page.tsx:45` (`bg-malbec`), `web/components/auction/bid-form.tsx:181` (`bg-malbec`), `web/components/onboarding/step-card.tsx:13-23` (mapas manuales de estados).
   - Problema concreto: no hay separación entre primitivo (`malbec`) y rol (`accion-principal`, `superficie`, `texto`, `advertencia`, `exito`); cada componente decide color y opacidad localmente.
   - Impacto: cambiar tipografía/tema o agregar modo oscuro obliga a tocar decenas de clases y aumenta el riesgo de inconsistencias.
   - Recomendación: mantener los primitivos, pero agregar una capa semántica en `@theme` y migrar primero acciones/estados; no intentar oscurecer la app completa en la primera iteración.

6. **La escala tipográfica no está formalizada y depende de valores arbitrarios.**
   - Ubicaciones: mapeo de fuentes en `web/app/globals.css:18-20`; `text-[3.4rem]` y `lg:text-[5.5rem]` en `web/app/page.tsx:33`; `text-[1.65rem]` en `web/app/layout.tsx:53`; `text-[3.4rem]`/`sm:text-6xl` en `web/components/auction/auction-panel.tsx:167`; `text-[0.625rem]` en `web/components/auction/auction-badge.tsx:67`; `text-[0.68rem]` en `web/components/qr/qr-card.tsx:57`.
   - Problema concreto: hay 21 variantes de tamaño en 134 usos; varias medidas clave están hardcodeadas y no forman una escala de display/título/cuerpo/caption.
   - Impacto: cambiar la tipografía pedida por el usuario puede romper jerarquías y medidas en lugar de ser un cambio de tokens; también produce rótulos casi ilegibles de 10–11 px.
   - Recomendación: crear utilidades/tokens `--text-display`, `--text-title`, `--text-subtitle`, `--text-body`, `--text-caption` y migrar primero hero, panel de subasta y cartelas.

7. **Las animaciones son correctas técnicamente pero genéricas y repetidas.**
   - Ubicaciones: definición en `web/app/globals.css:22-32`; entrada aplicada a muchas piezas (`web/app/page.tsx:31`, `web/app/page.tsx:61`, `web/app/page.tsx:121`, `web/components/auction/auction-panel.tsx:153`); latido infinito en `web/components/auction/auction-badge.tsx:41` y `web/components/auction/countdown.tsx:42`; nueva oferta como cambio de fondo en `web/components/auction/auction-panel.tsx:165`.
   - Problema concreto: `aparecer` se usa como efecto default en diez lugares; `latido` es infinito y no diferencia informativo/decorativo; no hay animaciones específicas para éxito de transacción o extensión del cierre más allá del fade genérico (`web/components/auction/countdown.tsx:47`).
   - Impacto: el movimiento no guía la atención hacia el momento importante (nueva oferta/cierre/éxito); se siente como una plantilla con fade-and-slide en todo.
   - Recomendación: convertir la animación en un catálogo pequeño, una entrada por página y acentos de una sola ejecución para nueva oferta/éxito; mantener latido solo en estados realmente vivos/closing.

8. **Sombras y opacidades de borde no tienen escala.**
   - Ubicaciones: `.cartela` en `web/app/globals.css:68-71`, `.marco` en `web/app/globals.css:74-78`, sombra arbitraria en `web/components/onboarding/step-card.tsx:14`, `shadow-2xl` en `web/components/wallet/login-dialog.tsx:122`, opacidades de borde variadas en `web/components/onboarding/step-card.tsx:13-23`.
   - Problema concreto: hay sombras de museo, una sombra activa ad hoc y una sombra de diálogo sin tokens; los bordes usan `/20`, `/25`, `/30`, `/35`, `/40`, `/45`, `/55`, `/70`, `/80` según el caso.
   - Impacto: no se entiende la jerarquía de elevación; dos superficies del mismo nivel compiten visualmente.
   - Recomendación: definir `--shadow-cartela`, `--shadow-marco`, `--shadow-overlay` y tres líneas (`linea-suave`, `linea`, `linea-fuerte`), reemplazando valores ad hoc.

### Baja

9. **No hay modo oscuro ni `color-scheme` explícito.**
   - Ubicaciones: `html` base en `web/app/globals.css:35-40`, `<html>` en `web/app/layout.tsx:45-49`, `themeColor` en `web/app/layout.tsx:35-39`.
   - Problema concreto: la app parece intencionalmente clara, pero no declara `color-scheme: light`; tampoco hay tokens para una variante oscura.
   - Impacto: navegadores en modo oscuro pueden mostrar controles/scrollbars con un tono que no conversa con la interfaz; agregar dark mode después será costoso.
   - Recomendación: declarar `color-scheme: light` ahora; si se decide dark mode, crear primero tokens semánticos y probar solo superficies, no invertir la paleta automáticamente.

10. **La identidad sans/mono es funcional pero menos propia que la dirección de arte.**
   - Ubicaciones: carga en `web/app/layout.tsx:10-25` y uso general del cuerpo desde `web/app/globals.css:42`.
   - Problema concreto: `Geist` y `Geist Mono` funcionan, pero son una señal muy reconocible de producto tecnológico/default; para una muestra de arte la voz visual recae casi todo en `Instrument Serif`.
   - Impacto: la interfaz alterna entre catálogo editorial (serif) y dashboard técnico (sans/mono); la parte cotidiana de la experiencia no acompaña el concepto mendocino/galería.
   - Recomendación: conservar una mono solo para hashes, pero evaluar una sans editorial y una serif display con más carácter (propuestas abajo).

## 4) Propuesta concreta para la fase de mejora

### 4.a Propuestas de tipografía (Google Fonts vía `next/font`)

1. **Recomendada: `Fraunces` + `Archivo` + `IBM_Plex_Mono`.**
   - Justificación: `Fraunces` tiene corte editorial/subasta y suficiente carácter para cifras grandes de la puja; `Archivo` es una sans robusta, más editorial y menos “startup default” que Geist; `IBM Plex Mono` mantiene hashes legibles con personalidad técnica sobria.
   - Uso: display/títulos/cifras en Fraunces 400–600 e itálica solo para citas cortas; cuerpo/UI en Archivo; mono para contratos y tx.

2. **Más clásica: `Cormorant_Garamond` + `Inter` + `IBM_Plex_Mono`.**
   - Justificación: muy cercana a catálogo de museo tradicional, elegante para titulares y nombres de obra; `Inter` compensa legibilidad en formularios y botones.
   - Riesgo: Cormorant puede verse frágil en mobile si se usa demasiado pequeña; limitarla a display/títulos.

3. **Editorial contemporánea: `Libre_Baskerville` + `Space_Grotesk` + `IBM_Plex_Mono`.**
   - Justificación: Baskerville da autoridad de registro/procedencia; Space Grotesk aporta una tensión contemporánea que dialoga con blockchain sin volverse fría.
   - Riesgo: Space Grotesk tiene personalidad fuerte en botones; conviene probarla primero en `/empezar` y el panel.

### 4.b Escala de radios propuesta

Definir en `@theme` como tokens reales de Tailwind v4:

```css
--radius-xs: 2px;   /* filetes internos, QR, piezas casi tipográficas */
--radius-sm: 6px;   /* inputs, alertas, chips de estado */
--radius-md: 12px;  /* cartelas y tarjetas de obra */
--radius-lg: 18px;  /* panel de subasta, step cards, superficies principales */
--radius-xl: 28px;  /* sheet mobile, solo esquinas superiores */
--radius-full: 999px; /* botones y pills */
```

Reglas de aplicación:

- `.cartela` pasa a `md` por defecto; si se quiere un efecto más museo, puede quedar `sm`, pero no mezclar `0` y `2xl` para el mismo rol.
- Inputs/alertas `sm`; panel de subasta/stepper `lg`; diálogo mobile `xl` arriba y `lg` desktop.
- `.marco` y `.paspartu` deberían permanecer casi rectos (`xs` o 0) porque representan el objeto físico del cuadro; no suavizar la obra como si fuera una card SaaS.

### 4.c Catálogo de animaciones propuesto

Todas deben animar solo `transform`/`opacity` y quedar reducidas o eliminadas con `prefers-reduced-motion` (la base ya existe en `web/app/globals.css:86-91`):

| Momento | Nombre sugerido | Movimiento | Duración | Uso |
|---|---|---|---:|---|
| Entrada de página/panel | `entrar` | opacity 0→1 + translateY(8px→0) | 320–420 ms | una vez por vista o columna, no en cada card |
| Hover de obra/card | `elevar` | translateY(-2px) + sombra/tono | 150–220 ms | respuesta a hover/focus, interrumpible |
| Nueva oferta | `pulso-oferta` | fondo ocre/10→ocre/24→transparente o brillo de cifra | 700–900 ms, una ejecución | cambio de `highestBid` en `auction-panel` |
| Countdown closing | `latido` refinado | opacity 1→0.45 en punto ocre | 1.2–1.6 s, loop solo en `closing/open live` | estado en vivo; desaparece si no aporta |
| Cierre extendido | `aviso-extension` | opacity + translateY 4px, entrada y salida | 4.5–5 s total | reemplaza el fade genérico de `countdown` |
| Éxito de tx | `confirmar` | scale .98→1 + opacity; opcional check dibujado | 240–320 ms, una ejecución | `TransactionStatus` success |
| Skeleton | `pulse` actual | opacity | existente | reservado para carga, no decorativo |

### 4.d Tokens propuestos

Mantener los primitivos como paleta, pero consumir roles:

```css
@theme {
  /* superficies */
  --color-fondo: #f2ede4;
  --color-superficie: #fbf8f2;
  --color-superficie-2: #e9e2d6;

  /* texto */
  --color-texto: #1e1b18;
  --color-texto-suave: #4a443d;
  --color-texto-tenue: #665f58; /* AA sobre fondo/papel */

  /* líneas */
  --color-linea-suave: #e1d9cd;
  --color-linea: #d6cdbf;
  --color-linea-fuerte: #a99f92;

  /* acciones/estados */
  --color-acento: #6e1a37;
  --color-acento-hover: #8f2a4c;
  --color-en-vivo: #8a5a10; /* ocre oscuro AA para texto */
  --color-en-vivo-suave: #f0e0c4;
  --color-exito: #2f6b4a;
  --color-error: #6e1a37;

  /* elección de radios/sombras */
  --shadow-cartela: 0 1px 0 rgb(0 0 0 / 0.04), 0 12px 28px -20px rgb(0 0 0 / 0.35);
  --shadow-overlay: 0 24px 64px -32px rgb(0 0 0 / 0.45);
}
```

Nota: conservar `--color-ocre` actual para acentos gráficos, puntos e ilustraciones, pero dejar de usarlo como texto pequeño.

### 4.e Tareas chicas repartibles entre 4 personas

| Persona | Tarea | Archivos que tocaría | Sin conflicto porque |
|---|---|---|---|
| 1 | Tokens base: capa semántica de colores, radios, sombras, `color-scheme`, catálogo de keyframes y reduced motion | `web/app/globals.css`, quizá `web/app/layout.tsx` solo para variables de fuente si se hace ahí | concentra todos los tokens; nadie más edita esos archivos |
| 2 | Tipografía: cambiar `next/font`, aplicar escala tipográfica en layout/home/ficha/QR | `web/app/layout.tsx`, `web/app/page.tsx`, `web/app/obra/[slug]/page.tsx`, `web/app/qr/page.tsx`, `web/components/qr/qr-card.tsx` | trabaja páginas públicas; no toca globals si persona 1 entrega primero nombres de clases/tokens |
| 3 | Sistema de subasta: aplicar radios/estados accesibles/animaciones de oferta y tx | `web/components/auction/*` únicamente | es dueño del panel y badge; no toca páginas ni globals |
| 4 | Onboarding, wallet y QR interactivo: radios, focus, estados de steps, diálogo y print button | `web/components/onboarding/*`, `web/components/wallet/*`, `web/components/connect-wallet-button.tsx`, `web/components/qr/print-button.tsx` | no toca auction ni páginas; puede validar formularios y focus |

Coordinación necesaria: persona 1 define tokens/keyframes primero; personas 2–4 solo consumen nombres acordados. Si se quiere paralelismo total, acordar antes los nombres en una tabla y no editar `globals.css` fuera de persona 1.

## 5) Riesgos: qué NO tocar porque rompe la lógica on-chain

- No cambiar las firmas ni props de `AuctionPanel`/`AuctionBadge` (`web/components/auction/auction-panel.tsx:57`, `web/components/auction/auction-badge.tsx:14`): las páginas ya las montan así.
- No alterar la lógica de `useAuction`, montos `bigint`, `minNextBid`, `parseUsdc` ni validaciones en `web/components/auction/bid-form.tsx`; una mejora visual no debe cambiar el monto enviado al contrato.
- No reordenar ni reinterpretar eventos `bid/refund/settled` en `web/components/auction/bid-history.tsx`; solo cambiar presentación.
- No tocar reglas anti-sniping ni textos funcionales de extensión en `web/components/auction/countdown.tsx` salvo microcopy visual; el cálculo depende de segundos reales.
- No cambiar `signTransaction`, `placeBid`, `settleAuction` ni `claimRefund` usados por los componentes de auction; las animaciones de éxito deben engancharse al estado ya existente, no reemplazar el flujo.
- No modificar `web/lib/auction.ts`, `web/lib/use-auction.ts`, `web/lib/format.ts` ni contratos/scripts durante la fase visual.
- No “mejorar” el QR alterando contraste, quiet zone o escala de `web/components/qr/qr-card.tsx` y `web/app/qr/qr-print.css`; cualquier cambio visual ahí exige prueba de escaneo real.
