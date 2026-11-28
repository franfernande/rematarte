# Pitch de 3 minutos — Artemi

**Frase de una línea:** Artemi convierte cada obra de una muestra en una subasta con respaldo real: ofertar es depositar, perder es recuperar la plata al instante y ganar significa que el pago ya está depositado y se liquida solo.

> «La obra cuelga en la pared. La puja vive en la cadena.»

**Equipo:** Fran Fernández, Antonio Chocobar y Sebastián Villarreal.  
**Repo:** <https://github.com/franfernande/artemi>  
**Evento:** Hackathon Sin Coordenadas | Argentina (BAF × Stellar, ToraBlock, FLAT), Eje I Arte.

## Antes de presentar

- [ ] URL pública y QR funcionando en celulares del equipo.
- [ ] Demo ensayada según `docs/demo.md`.
- [ ] Datos de validación cargados en `docs/validacion.md` y volcados a este pitch.
- [ ] Video de respaldo listo.
- [ ] Slide de hashes y contrato en stellar.expert listo.

## Guion cronometrado — 180 segundos

### 0:00–0:20 — Problema real: la promesa no paga la obra (20 s)

**Texto hablado:**

> En Mendoza, muchos remates de arte se hacen por Instagram o a mano alzada. Después, quien gana no siempre paga: la artista o el taller queda persiguiendo una transferencia. La promesa de compra no vale nada; solo vale la plata en la cuenta.

**Si hay evidencia validada para citar en voz alta, insertarla acá:** `[COMPLETAR: dato de docs/validacion.md — cifra, testimonio o caso concreto de impago en remates informales]`.

### 0:20–0:35 — Para quién es y por qué es Arte (15 s)

**Texto hablado:**

> Es para artistas, talleres y espacios culturales de Mendoza que venden obra durante una muestra. Nace de obra física y de una comunidad concreta: sin el eje Arte, este proyecto no tiene sentido.

**Apoyo opcional:** `[COMPLETAR: nombre de artistas, talleres o espacios reales solo si el equipo tiene permiso para mencionarlos]`.

### 0:35–0:55 — La idea en cuatro pasos (20 s)

**Texto hablado:**

> Son cuatro pasos. Escaneás el QR y abrís la ficha. Ofertar es depositar USDC, no prometer. Si te superan, el contrato te devuelve lo tuyo en la misma transacción. Al cerrar, liquida solo con el reparto fijo entre artista y espacio. Para la artista, la oferta ganadora ya está paga.

### 0:55–1:55 — Demo en vivo (60 s)

**Texto hablado guía — ajustar al recorrido final; ver `docs/demo.md`:**

> Cada obra tiene su QR: lo escaneás y entrás a la ficha sin instalar nada. Ahí se ve la obra, cuánto falta y desde qué monto se puede ofertar. La primera persona oferta desde su wallet: ofertar no es prometer, es depositar. Otra persona la supera, y el punto clave es que si te superan no tenés que pedir nada: tu plata vuelve en la misma transacción. Mientras esta subasta sigue abierta, mostramos otra subasta preparada antes, ya cerrada pero sin liquidar: cualquiera puede liquidarla. Al liquidar, el contrato reparte con el porcentaje fijado, y en la cadena se verifica cuánto cobró la artista y cuánto cobró el espacio.

**Condición para presentarla así:** la web pública, el onboarding y los QR tienen que estar terminados. Recorrido final: ver `docs/demo.md`. `[COMPLETAR: URL pública de la demo y QR final cuando existan]`.

**Respaldo:** wallets `demo1..demo3` con 500 USDC de prueba cada una. Si se graba video de respaldo, agregarlo acá: `[COMPLETAR: link al video de respaldo cuando exista]`.

### 1:55–2:10 — Por qué Stellar (15 s)

**Texto hablado:**

> Stellar da lo que una planilla no da: USDC, confirmación en segundos con fees mínimos y un contrato verificable que custodia, devuelve y reparte en un solo flujo.

### 2:10–2:35 — Ejecución técnica con evidencia (25 s)

**Texto hablado:**

> Ya está en Testnet, con veintiún tests en verde. En la subasta tres se rechazó una oferta baja, se devolvieron exactamente diez USDC de prueba al postor superado, el anti-sniping extendió el cierre y el reparto fue nueve coma seis USDC de prueba para la artista y dos coma cuatro para el espacio. Los hashes quedan en pantalla para verificarlos.

**Explicación para jurado mixto, si preguntan:**

- **Escrow** significa que la plata queda retenida por el contrato mientras dura la puja, no por nosotros.
- **Reembolso atómico** significa que la devolución al postor superado ocurre dentro de la misma transacción de la nueva oferta.
- **Anti-sniping** significa que una oferta cuando faltan menos de 300 segundos corre el cierre a 300 segundos después de esa oferta (`now + 300`), sin acortarlo nunca.
- **Reembolso pendiente** significa que si una devolución no puede completarse, la subasta no se bloquea: el monto queda registrado y la persona lo reclama con `claim_refund`.

### 2:35–2:45 — Validación (10 s)

**Texto hablado plantilla — completar solo con datos reales:**

> Hablamos con `[COMPLETAR: cantidad de artistas y espacios entrevistados]` artistas y espacios de Mendoza y `[COMPLETAR: cantidad que contó casos de impago]` nos contaron casos de impago. Lo probamos con `[COMPLETAR: cantidad de personas externas]` personas de afuera: `[COMPLETAR: cantidad que ofertó sola]` ofertaron solas en `[COMPLETAR: tiempo promedio mm:ss]`. Lo que más trabó fue `[COMPLETAR: hallazgo]` y por eso cambiamos `[COMPLETAR: cambio]`.

**Fuente para completar:** la sección “Resumen para el pitch” de `docs/validacion.md`.

### 2:45–2:55 — Próximos pasos honestos (10 s)

**Texto hablado:**

> Después de la hackathon: mainnet con USDC de Circle, build verificable SEP-55, onboarding con passkeys y más muestras. Es el camino siguiente, no algo hecho.

### 2:55–3:00 — Cierre (5 s)

**Texto hablado:**

> La obra cuelga en la pared. La puja vive en la cadena.

## Mapa criterio → dónde lo cubrimos

| Criterio (25% c/u) | Bloque del guion | Evidencia o mensaje central |
|---|---|---|
| Problema real | 0:00–0:20 | Impago del ganador en remates informales de Mendoza; reforzar con `[COMPLETAR: dato de docs/validacion.md — cifra, testimonio o caso concreto de impago en remates informales]`. |
| Conexión con los ejes | 0:20–0:55 | Nace de muestras, obra física, artistas y espacios culturales; sin Arte no existe el caso de uso. |
| Producto y validación | 0:35–1:55 y 2:35–2:45 | Flujo QR → ficha → depósito → reembolso → liquidación; demo planificada; validación pendiente marcada sin inventar. |
| Ejecución técnica | 1:55–2:35 | Contrato en Testnet, 21 tests, anti-sniping, reembolso pendiente, smoke test con hashes verificables. Como la ejecución técnica es el primer desempate, conviene mostrar los hashes en slide y no solo mencionarlos. |

## Evidencia técnica para mostrar en slides

**Deploy Testnet**

- Contrato: [`CDX6G3F5DS2NUFFXZJ5XQSFHPTG6EKXY5GONXKLFLPNW6U7SVEPZ2RLJ`](https://stellar.expert/explorer/testnet/contract/CDX6G3F5DS2NUFFXZJ5XQSFHPTG6EKXY5GONXKLFLPNW6U7SVEPZ2RLJ)
- WASM hash: `53ffb83a703f879cef1c2c9b4e41907399ddc0145779bb58aadadb99edbb9860` — verificado byte a byte contra el build local.
- USDC de prueba propio: asset clásico `USDC`, issuer `GDNQJIVKZNQTS4ZGH2W6VJPK4SQP4JIJR4YMWK7UHNOGQNYWN3F2BF3D`.
- SAC del USDC de prueba: `CA7IN3NREHPGR2UPBIJX52T4KCXVZVMOCUWC2OBK3T6JXJDSR77WAQGV`.
- Subastas de ejemplo ids `0`, `1` y `2`: obras de muestra, no reales.
- Los mismos IDs públicos están en `web/data/deploy.testnet.json`.

**Smoke test real en Testnet — subasta 3**

Resultado observado:

- Una oferta baja fue rechazada con `BidTooLow`.
- `postor1` ofertó 10 USDC de prueba, fue superado y recuperó exactamente 10 USDC en la misma transacción de la oferta de `postor2`.
- El anti-sniping extendió el cierre de `1795801044` a `1795801289`.
- `settle` repartió 9,6 USDC de prueba a la artista y 2,4 al espacio; el contrato quedó en 0.
- Un segundo `settle` fue rechazado.

Transacciones verificables:

| Acción | Hash en stellar.expert Testnet |
|---|---|
| `create_auction` | [`1149ae4cfa9b6af3cbdb8753a2b49c936443f4f58691bb7253bbdc74fcce3fa6`](https://stellar.expert/explorer/testnet/tx/1149ae4cfa9b6af3cbdb8753a2b49c936443f4f58691bb7253bbdc74fcce3fa6) |
| Oferta de `postor1` por 10 USDC | [`d590324ba04324225b8c3141fc9b5fedf7900d30f3b3651e563d5ebe8c5ddf9c`](https://stellar.expert/explorer/testnet/tx/d590324ba04324225b8c3141fc9b5fedf7900d30f3b3651e563d5ebe8c5ddf9c) |
| Oferta de `postor2` por 12 USDC, con reembolso a `postor1` | [`490b3cf06e07543f3524a0f9195843fac1567c545db56a062c27761e68eaef1e`](https://stellar.expert/explorer/testnet/tx/490b3cf06e07543f3524a0f9195843fac1567c545db56a062c27761e68eaef1e) |
| `settle` con reparto artista/espacio | [`f2b18805b61449fe56fa073be19ef92315a9b3facbf21369fd65a10ce4f07ac2`](https://stellar.expert/explorer/testnet/tx/f2b18805b61449fe56fa073be19ef92315a9b3facbf21369fd65a10ce4f07ac2) |

## Preguntas probables del jurado y respuestas cortas

### 1. ¿Por qué no Mercado Pago o una transferencia?

Porque una transferencia después de ganar vuelve a ser una promesa. Mercado Pago puede mover plata, pero no resuelve por sí solo una custodia condicional, el reembolso automático al superado y el reparto final verificable en una sola ejecución.

### 2. ¿Y si el ganador no retira la obra?

El contrato garantiza el pago, no la logística física. La entrega o retiro de la obra se coordina aparte con el espacio; antes de un producto real hay que definir reglas claras de retiro, plazos y qué pasa si no retira.

### 3. ¿La artista necesita saber de cripto?

Para la demo, no: recibe USDC en una cuenta y no administra el contrato. Para producción, la experiencia tiene que esconder más complejidad; por eso el onboarding con passkeys está en próximos pasos y no se presenta como hecho.

### 4. ¿Quién custodia la plata durante la subasta?

No la custodia el equipo ni el espacio: la custodia el contrato Soroban desplegado en Testnet. Las únicas salidas previstas son reembolso al postor, reclamo de reembolso pendiente o liquidación artista/espacio.

### 5. ¿Qué pasa si alguien oferta en el último segundo?

Si faltan menos de 300 segundos, el contrato extiende el cierre a 300 segundos después de esa oferta (`now + 300`). En el smoke test el cierre se movió de `1795801044` a `1795801289`; la regla evita que todo se decida por una puja imposible de contestar.

### 6. ¿Qué pasa si el contrato no puede devolverle la plata al postor superado?

La subasta no se bloquea. El monto queda registrado como reembolso pendiente y esa persona lo reclama después con `claim_refund`; el evento `refund` marca `pending: true` para que la interfaz pueda mostrarlo.

### 7. ¿Por qué usan USDC de prueba y no USDC de Circle?

Porque el MVP corre en Testnet y necesitamos fondear wallets del jurado sin riesgo. El contrato recibe el token como parámetro: en mainnet se usaría el SAC de USDC de Circle, sin reescribir la lógica de la subasta.

### 8. ¿Qué comisiones hay?

En el MVP no hay comisión de plataforma: el reparto configurado es entre artista y espacio. Stellar cobra fees de red mínimos; en el smoke test de 12 USDC de prueba el reparto fue 9,6 para la artista y 2,4 para el espacio.

### 9. ¿Cómo se pasa de USDC a pesos?

Queda fuera del MVP. Para uso real hace falta resolver un off-ramp local y sus costos; `[COMPLETAR: opción concreta de conversión a pesos y costos si el equipo la investiga]`.

### 10. ¿Puede el admin quedarse con la plata?

En el contrato actual no hay una función para que el admin retire fondos de una subasta. La plata solo sigue los caminos de reembolso, reclamo pendiente o liquidación; igualmente, antes de mainnet corresponde auditoría y build verificable SEP-55.

## Recomendaciones para las slides

1. **Artemi** — frase de una línea + lema + QR grande de entrada a la demo.
2. **El problema: ganar no es pagar** — remate informal por Instagram/mano alzada + `[COMPLETAR: dato de docs/validacion.md — cifra, testimonio o caso concreto de impago en remates informales]`.
3. **Para quién** — artistas, talleres y espacios culturales de Mendoza durante una muestra real.
4. **Cómo funciona en 4 pasos** — QR/ficha → ofertar es depositar → reembolso instantáneo → liquidación con reparto fijo.
5. **Demo en vivo** — un solo QR, puja actual, botón de oferta y aviso “ver `docs/demo.md`”.
6. **Por qué Stellar y qué ya funciona** — USDC + escrow/reembolso/reparto + contrato Testnet + 21 tests.
7. **Prueba verificable** — smoke test subasta 3 con los cuatro hashes y link al contrato en stellar.expert.
8. **Validación y próximos pasos** — `[COMPLETAR: hallazgos reales de validación]` + mainnet Circle USDC, SEP-55, passkeys y más muestras.

## Checklist de marcadores pendientes

- `[COMPLETAR: dato de docs/validacion.md — cifra, testimonio o caso concreto de impago en remates informales]`
- `[COMPLETAR: nombre de artistas, talleres o espacios reales solo si el equipo tiene permiso para mencionarlos]`
- `[COMPLETAR: URL pública de la demo y QR final cuando existan]`
- `[COMPLETAR: link al video de respaldo cuando exista]`
- `[COMPLETAR: cantidad de artistas y espacios entrevistados]`
- `[COMPLETAR: cantidad que contó casos de impago]`
- `[COMPLETAR: cantidad de personas externas]`
- `[COMPLETAR: cantidad que ofertó sola]`
- `[COMPLETAR: tiempo promedio mm:ss]`
- `[COMPLETAR: hallazgo]`
- `[COMPLETAR: cambio]`
- `[COMPLETAR: hallazgos reales de validación]`
- `[COMPLETAR: opción concreta de conversión a pesos y costos si el equipo la investiga]`
