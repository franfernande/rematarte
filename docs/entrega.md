# Entrega en Apex — checklist operativo

Hackathon **Sin Coordenadas | Argentina** — entrega el **sábado 28/11 a las 23:59 (hora de Argentina)** en Apex. Objetivo recomendado del equipo: tener todo subido y probado a más tardar a las **22:30**, dejando margen para problemas de red, video o formulario.

No conocemos los campos exactos del formulario de Apex. No los inventamos: `[COMPLETAR: campos del formulario de Apex]` apenas el equipo tenga acceso.

## Qué se sube

| Ítem | Estado / valor | Responsable | Hora objetivo |
|---|---|---|---|
| Repo | https://github.com/franfernande/rematarte | [COMPLETAR: responsable] | 22:30 |
| URL de la app | `[COMPLETAR: URL de Vercel]` | [COMPLETAR: responsable] | 22:30 |
| Contract ID | `CDX6G3F5DS2NUFFXZJ5XQSFHPTG6EKXY5GONXKLFLPNW6U7SVEPZ2RLJ` | [COMPLETAR: responsable] | 22:30 |
| Video | `[COMPLETAR: link al video]` | [COMPLETAR: responsable] | 22:30 |
| Notas de validación | `[COMPLETAR: link o archivo final de validación]` | [COMPLETAR: responsable] | 22:30 |
| Pitch / slides | `[COMPLETAR: link a pitch o slides]` | [COMPLETAR: responsable] | 22:30 |
| Descripción corta | Usar los textos de más abajo | [COMPLETAR: responsable] | 22:30 |

## Antes de subir, verificar

| Verificación | Cómo se comprueba | Responsable | Listo |
|---|---|---|---|
| La app abre bien en un celular | Abrir la URL de Vercel desde un celular real, no solo DevTools | [COMPLETAR: responsable] | [ ] |
| El QR abre la ficha correcta | Escanear un QR impreso o mostrado en pantalla y confirmar slug/obra | [COMPLETAR: responsable] | [ ] |
| Prueba con externo documentada | Persona ajena al equipo completa o intenta una oferta; guardar fecha, qué entendió, qué trabó y resultado | [COMPLETAR: responsable] | [ ] |
| README con IDs reales | Contract ID, SAC, issuer, hashes del smoke y URL final presentes en `README.md` | [COMPLETAR: responsable] | [ ] |
| Sin secrets en el repo | Buscar strkeys `S...`, `.env`, secrets de distribuidor o wallets antes de entregar | [COMPLETAR: responsable] | [ ] |
| Contrato visible en explorer | Abrir https://stellar.expert/explorer/testnet/contract/CDX6G3F5DS2NUFFXZJ5XQSFHPTG6EKXY5GONXKLFLPNW6U7SVEPZ2RLJ | [COMPLETAR: responsable] | [ ] |
| Prueba en cadena verificable | Abrir los 4 links de transacciones del smoke test desde el README | [COMPLETAR: responsable] | [ ] |
| Obras reales cargadas | `web/data/obras.json` existe solo con obras reales consentidas; si no, el equipo decide conscientemente si usa mocks | [COMPLETAR: responsable] | [ ] |
| Build web en verde | `cd web && npm run build` y `npm run lint` | [COMPLETAR: responsable] | [ ] |
| Tests del contrato en verde | `cd contracts && cargo test --lib` | [COMPLETAR: responsable] | [ ] |

## Descripción para Apex — 1 línea

RematArte ayuda a artistas, talleres y espacios culturales de Mendoza a rematar obra en muestras con QR: la oferta queda depositada en Stellar, se reembolsa si es superada y se liquida sola.

## Descripción para Apex — aproximadamente 100 palabras

RematArte resuelve un problema concreto de artistas, talleres y espacios culturales de Mendoza que rematan obra en muestras informales: quien gana muchas veces no paga y la artista queda persiguiendo una transferencia. Cada obra tiene un QR que abre una ficha mobile con la puja actual. Ofertar significa depositar USDC en un contrato inteligente de Stellar: si otra persona supera la oferta, el contrato devuelve el dinero en la misma transacción o lo deja reclamable. Al cierre, la liquidación reparte automáticamente el pago entre artista y espacio según el porcentaje acordado, con extensión anti-sniping y eventos verificables en cadena. El MVP tiene un contrato Soroban desplegado en Testnet y una prueba end-to-end verificada en stellar.expert.

## Notas para completar a mano

- `[COMPLETAR: URL de Vercel]`
- `[COMPLETAR: link al video]`
- `[COMPLETAR: link o archivo final de validación]`
- `[COMPLETAR: link a pitch o slides]`
- `[COMPLETAR: responsable]` en cada fila operativa
- `[COMPLETAR: campos del formulario de Apex]`
