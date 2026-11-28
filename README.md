# Artemi

**Subastas de arte en vivo con respaldo real en Stellar.**
Cada obra de la muestra tiene un QR. Lo escaneás, ves la obra, la puja actual y ofertás en USDC. Tu oferta queda depositada en un contrato: si te superan, te devuelven la plata al instante; si ganás, la artista y el espacio cobran solos. Nadie persigue al ganador para que pague.

> *«La obra cuelga en la pared. La puja vive en la cadena.»*

---

## Estado / Demo

- **App:** https://artemi-arte.vercel.app
- **Red:** Stellar Testnet.
- **Contrato de subastas:** [`CDX6G3F5DS2NUFFXZJ5XQSFHPTG6EKXY5GONXKLFLPNW6U7SVEPZ2RLJ`](https://stellar.expert/explorer/testnet/contract/CDX6G3F5DS2NUFFXZJ5XQSFHPTG6EKXY5GONXKLFLPNW6U7SVEPZ2RLJ)
- **USDC de prueba:** asset clásico `USDC`, issuer `GDNQJIVKZNQTS4ZGH2W6VJPK4SQP4JIJR4YMWK7UHNOGQNYWN3F2BF3D`, SAC [`CA7IN3NREHPGR2UPBIJX52T4KCXVZVMOCUWC2OBK3T6JXJDSR77WAQGV`](https://stellar.expert/explorer/testnet/contract/CA7IN3NREHPGR2UPBIJX52T4KCXVZVMOCUWC2OBK3T6JXJDSR77WAQGV).
- **Prueba en cadena:** el smoke test real de la subasta 3 verificó oferta rechazada por baja, reembolso exacto al postor superado, anti-sniping, liquidación con reparto y rechazo de una segunda liquidación.
  - [create_auction](https://stellar.expert/explorer/testnet/tx/1149ae4cfa9b6af3cbdb8753a2b49c936443f4f58691bb7253bbdc74fcce3fa6)
  - [oferta de postor1 por 10 USDC](https://stellar.expert/explorer/testnet/tx/d590324ba04324225b8c3141fc9b5fedf7900d30f3b3651e563d5ebe8c5ddf9c)
  - [oferta de postor2 por 12 USDC y reembolso a postor1](https://stellar.expert/explorer/testnet/tx/490b3cf06e07543f3524a0f9195843fac1567c545db56a062c27761e68eaef1e)
  - [settle con reparto artista/espacio](https://stellar.expert/explorer/testnet/tx/f2b18805b61449fe56fa073be19ef92315a9b3facbf21369fd65a10ce4f07ac2)

---

## Contexto

Proyecto para la hackathon **Sin Coordenadas | Argentina** — [bases y requisitos](https://sincoordenada-argentina.netlify.app/#reto). Organizan BAF × Stellar junto a ToraBlock y FLAT. Tres días, de la idea a algo que funciona.

**Eje I · Arte** — proyectos que ayudan a crear, mostrar, vender o financiar obra.

**Entrega:** sábado 28 de noviembre, 23:59 (hora de Argentina) en **Apex**.

## El problema

Hoy muchos remates de arte en Mendoza se hacen por comentarios de Instagram o a mano alzada. Es habitual que quien gana después no pague: la artista o el taller queda esperando una transferencia que quizá nunca llega, o teniendo que salir a cobrarle a alguien. La promesa de compra no vale nada; solo vale la plata en la cuenta.

## La idea

Artemi convierte cada obra de una muestra en una subasta con respaldo real:

1. **Cada obra tiene su QR.** La persona está frente a una pintura o escultura que le gustó, escanea el código y abre la ficha — sin instalar nada.
2. **La ficha muestra lo esencial:** foto, título, artista, técnica, hora de cierre, y el estado de la puja. Si nadie ofertó, ve el precio mínimo. Si ya hay ofertas, ve la actual y desde cuánto puede ofertar.
3. **Ofertar es depositar.** Al confirmar, los USDC quedan retenidos en un contrato inteligente en Stellar. No es una promesa: es plata que ya está.
4. **Si te superan, recuperás lo tuyo al instante.** La oferta superada se devuelve en la misma transacción, sin pedirla y sin esperar al cierre.
5. **Al cerrar, el contrato liquida solo.** Paga a la artista y al espacio cultural con un reparto que quedó fijado antes de empezar. La entrega física de la obra se coordina aparte.

El beneficio para la artista: **la oferta ganadora ya está paga**. Para el público: pujar es tan simple como escanear un QR y confirmar desde el celu.

## Cómo funciona por dentro

El contrato guarda cada subasta como un `auction_id` dentro de un solo contrato de muestra. Al ofertar, los USDC quedan depositados en escrow en el contrato; si había una oferta anterior, el reembolso se intenta en la misma transacción. Si ese reembolso no puede completarse, no bloquea la puja: queda como reembolso pendiente y la persona lo retira con `claim_refund`.

Cuando llega el cierre, cualquiera puede ejecutar `settle`: el contrato reparte la oferta ganadora entre artista y espacio según el porcentaje fijado al crear la subasta, y el redondeo va a la artista. Una oferta en los últimos 300 segundos extiende el cierre a `now + 300` (anti-sniping). Las ofertas, reembolsos y liquidaciones emiten eventos `bid`, `refund` y `settled` para que la web y cualquier auditor puedan leerlos. La interfaz completa está en [`docs/plan.md`](docs/plan.md).

## Por qué Stellar

- **USDC nativo**: la puja se respalda con un activo real, no con un número en una base de datos.
- **Liquidación programable**: un solo contrato retiene ofertas, devuelve a quien pierde y reparte al final — sin intermediario custodiando la plata.
- **Rápido y barato**: confirmación en segundos y fees insignificantes, condición necesaria para devolver ofertas al instante en una sala llena de gente.
- **Verificable**: cualquiera puede auditar en la cadena que la puja se pagó y cómo se repartió.

## Alcance del MVP (hackathon)

Una sola muestra, pocas obras, todo real en Stellar Testnet:

- Contrato Soroban (Rust): una subasta por obra — ofertar, devolver al superado, liquidar con reparto fijo artista/espacio.
- Frontend web mobile-first: ficha de obra por QR, conexión de wallet (Freighter / Stellar Wallets Kit), oferta en 2 toques.
- USDC de prueba vía Stellar Asset Contract (SAC) en Testnet + Friendbot.
- QRs impresos que apuntan a cada ficha.

**Queda afuera** (por decisión, para llegar a tiempo): catálogo de artistas, múltiples muestras simultáneas, perfiles de usuario, NFT/certificado de autoría, pujas automáticas, mainnet.

## Requisitos de la competencia y cómo los cubrimos

| Requisito / criterio | Cómo lo cubrimos |
|---|---|
| App funcional | Web mobile con fichas por QR, wallet conectada y ofertas reales end-to-end |
| Algo real en Stellar | Contrato Soroban en Testnet que custodia USDC, reembolsa y liquida on-chain |
| Prueba con alguien de afuera | Test con un visitante/participante de la muestra; documentar qué entendió y qué trabó |
| Problema real (25%) | Impago del ganador en remates informales; validarlo hablando con artistas/rematadores locales |
| Conexión con los ejes (25%) | Nace del arte: vende obra real de una muestra real de Mendoza; sin el eje no tiene sentido |
| Producto y validación (25%) | El jurado puede escanear un QR y pujar en segundos; sin fricción de "conectar wallet" para mirar |
| Ejecución técnica (25%) | Escrow + reembolso atómico + reparto programado en un solo contrato; desempate juega a favor |
| Entrega en Apex | Antes del sábado 28, 23:59 |

## Stack propuesto

- **Contrato**: Rust + `soroban-sdk`, deploy en Stellar Testnet, token USDC vía SAC.
- **Frontend**: React/Next.js mobile-first, `@stellar/stellar-sdk`, Stellar Wallets Kit (Freighter), generador de QR (`/obra/:id`).
- **Datos**: Stellar RPC para estado de la puja y eventos del contrato.
- **Identidades de demo**: cuentas Testnet (artista, espacio, postores) fondeadas con Friendbot.

## Estructura del repo

```
contracts/auction/          # Contrato Soroban de la subasta (Rust)
contracts/bindings/auction/ # Bindings TypeScript generados desde el WASM
scripts/                    # Setup de USDC, deploy, smoke test, wallets demo y bindings
web/                        # Frontend Next.js: fichas de obra, QR, wallet y ofertas
web/data/                   # deploy.testnet.json (I3); obras.json (I2) cuando haya obras reales
docs/                       # Plan, pitch, demo, validación, entrega y relevamiento de obras
AGENTS.md                   # Contexto rápido para cualquier agente de código
.devin/skills/              # Skills de Stellar (Devin)
.devin/mcp_config.json      # MCP Stellar Raven (Devin)
.cursor/skills/             # Mismas skills de Stellar (Cursor)
.cursor/mcp.json            # MCP Stellar Raven (Cursor)
```

## Cómo correrlo

### Tests del contrato

```bash
cd contracts
cargo test --lib
```

Usá `cargo test --lib`: en Windows con toolchain GNU, `cargo test` sin `--lib` falla al linkear el cdylib (`export ordinal too large`); en Linux/macOS funcionan los dos.

### Deploy y scripts de Testnet

```bash
bash scripts/setup-usdc.sh
DRY_RUN=1 bash scripts/deploy.sh
bash scripts/deploy.sh
bash scripts/smoke.sh
bash scripts/demo-wallets.sh 3
bash scripts/bindings.sh
```

Los detalles, variables opcionales y orden recomendado están en [`scripts/README.md`](scripts/README.md). No ejecutes `stellar keys secret` salvo que una persona del equipo lo haga manualmente para copiar una clave a un lugar seguro.

### Web

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

La variable `USDC_DISTRIBUTOR_SECRET` se completa solo en `.env.local`/Vercel con el valor que G1 pasa por privado. Los comandos exactos y el modo de datos mock/real están en [`web/README.md`](web/README.md).

## Trabajar con agentes de código

El repo incluye contexto de Stellar para que cualquier agente (Devin, Cursor, Claude Code, Codex) escriba código correcto desde el arranque. `AGENTS.md` resume el proyecto; las skills viven en `.devin/skills/` (Devin) y espejadas en `.cursor/skills/` (Cursor). Fuente oficial: [skills.stellar.org](https://skills.stellar.org) y [raven.stellar.org](https://raven.stellar.org).

### Skills instaladas

Paquete oficial completo ([`stellar/stellar-dev-skill`](https://github.com/stellar/stellar-dev-skill)):

| Skill | Para qué la usamos |
|---|---|
| `smart-contracts` | Escribir, testear y desplegar el contrato Soroban de la subasta (storage, auth, eventos, seguridad, testing) |
| `dapp` | Frontend: conectar wallets (Wallets Kit con Albedo y Varial, ex Freighter), firmar y enviar transacciones, invocar el contrato |
| `assets` | USDC clásico + trustlines + puente SAC para que el contrato use el token |
| `data` | Leer estado y eventos del contrato vía Stellar RPC |
| `standards` | Elegir los SEP correctos (SEP-41 tokens, etc.) y referencias del ecosistema |
| `agentic-payments` | Fuera del MVP: cobros x402/MPP a agentes de IA |
| `cross-chain` | Fuera del MVP: traer USDC desde otras cadenas (CCTP, Axelar, LayerZero) |
| `zk-proofs` | Fuera del MVP: verificación de pruebas ZK on-chain |

Skills de la comunidad (listadas en [skills.stellar.org](https://skills.stellar.org); no las revisa ni mantiene la SDF):

| Skill | Para qué la usamos | Fuente |
|---|---|---|
| `soroban-common-mistakes` | Revisar el contrato de la subasta contra 23 errores comunes (auth, TTL, aritmética, panics) antes de desplegar | [mariaelisaaraya/stellar-security-guide](https://github.com/mariaelisaaraya/stellar-security-guide) (MIT) |

Skills generales para la web (G2):

| Skill | Para qué la usamos | Fuente |
|---|---|---|
| `nextjs-senior` | App Router, límite servidor/cliente y API routes (B1–B6) | [blessedux/agent-skills](https://github.com/blessedux/agent-skills) |
| `deploy-to-vercel` | Deploy en Vercel (B7) | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) |
| `webapp-testing` | Tests con Playwright en viewport mobile | [anthropics/skills](https://github.com/anthropics/skills) (Apache 2.0) |
| `frontend-design` | Dirección visual de las fichas de obra (B4) | [anthropics/skills](https://github.com/anthropics/skills) (Apache 2.0) |
| `web-design-guidelines` | Revisión de UX y accesibilidad (B4, B5) | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) |

### MCP: Stellar Raven

`stellar-raven` ya viene configurado para Devin (`.devin/mcp_config.json`) y Cursor (`.cursor/mcp.json`). Expone docs oficiales, datos vivos del ecosistema y playbooks — sin API keys, solo un login en el navegador **por usuario**:

- **Devin**: `devin mcp login stellar-raven`
- **Cursor**: aceptar el servidor cuando aparece en Settings → MCP y firmar en el navegador
- **Otro agente**: agregar `https://raven.stellar.org/mcp` como servidor HTTP y autenticar con OAuth

## Documentación

- [`docs/plan.md`](docs/plan.md): plan de trabajo, decisiones D1–D4 e interfaces I1–I4.
- [`docs/validacion.md`](docs/validacion.md): notas de validación con usuarios y artistas.
- [`docs/pitch.md`](docs/pitch.md): pitch para el jurado.
- [`docs/demo.md`](docs/demo.md): guion de la demo.
- [`docs/entrega.md`](docs/entrega.md): checklist de entrega en Apex.
- [`docs/obras.md`](docs/obras.md): relevamiento y publicación de obras reales.

## Recursos

- Bases del reto: <https://sincoordenada-argentina.netlify.app/#reto>
- Material del kickoff (Drive): <https://drive.google.com/drive/folders/1PUKdQU-0-7CXeK-QeihJsStx8dhk8s43>
- Stellar Skills: <https://skills.stellar.org> — repo `stellar/stellar-dev-skill`
- Stellar Raven (MCP): <https://raven.stellar.org>
- Docs Stellar: <https://developers.stellar.org> · Stellar Lab: <https://lab.stellar.org> · Testnet Friendbot: `https://friendbot.stellar.org`

## Equipo

- **Fran Fernández** — [@franfernande](https://github.com/franfernande)
- **Antonio Chocobar** — [@Antony27c](https://github.com/Antony27c)
- **Sebastián Villarreal** — [@Shugar03](https://github.com/Shugar03)
