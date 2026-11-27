# RematArte

**Subastas de arte en vivo con respaldo real en Stellar.**
Cada obra de la muestra tiene un QR. Lo escaneás, ves la obra, la puja actual y ofertás en USDC. Tu oferta queda depositada en un contrato: si te superan, te devuelven la plata al instante; si ganás, la artista y el espacio cobran solos. Nadie persigue al ganador para que pague.

> *«La obra cuelga en la pared. La puja vive en la cadena.»*

---

## Contexto

Proyecto para la hackathon **Sin Coordenadas | Argentina** — [bases y requisitos](https://sincoordenada-argentina.netlify.app/#reto). Organizan BAF × Stellar junto a ToraBlock y FLAT. Tres días, de la idea a algo que funciona.

**Eje I · Arte** — proyectos que ayudan a crear, mostrar, vender o financiar obra.

**Entrega:** sábado 28 de noviembre, 23:59 (hora de Argentina) en **Apex**.

## El problema

Hoy muchos remates de arte en Mendoza se hacen por comentarios de Instagram o a mano alzada. Es habitual que quien gana después no pague: la artista o el taller queda esperando una transferencia que quizá nunca llega, o teniendo que salir a cobrarle a alguien. La promesa de compra no vale nada; solo vale la plata en la cuenta.

## La idea

RematArte convierte cada obra de una muestra en una subasta con respaldo real:

1. **Cada obra tiene su QR.** La persona está frente a una pintura o escultura que le gustó, escanea el código y abre la ficha — sin instalar nada.
2. **La ficha muestra lo esencial:** foto, título, artista, técnica, hora de cierre, y el estado de la puja. Si nadie ofertó, ve el precio mínimo. Si ya hay ofertas, ve la actual y desde cuánto puede ofertar.
3. **Ofertar es depositar.** Al confirmar, los USDC quedan retenidos en un contrato inteligente en Stellar. No es una promesa: es plata que ya está.
4. **Si te superan, recuperás lo tuyo al instante.** La oferta superada se devuelve en la misma transacción, sin pedirla y sin esperar al cierre.
5. **Al cerrar, el contrato liquida solo.** Paga a la artista y al espacio cultural con un reparto que quedó fijado antes de empezar. La entrega física de la obra se coordina aparte.

El beneficio para la artista: **la oferta ganadora ya está paga**. Para el público: pujar es tan simple como escanear un QR y confirmar desde el celu.

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
contracts/        # Contrato Soroban de la subasta (Rust)
web/              # Frontend: fichas de obra, QR, wallet, ofertas
docs/             # Pitch, guion de demo, notas de validación con usuarios
AGENTS.md         # Contexto rápido para cualquier agente de código
.devin/skills/    # Skills de Stellar (Devin)
.devin/mcp_config.json  # MCP Stellar Raven (Devin)
.cursor/skills/   # Mismas skills de Stellar (Cursor)
.cursor/mcp.json  # MCP Stellar Raven (Cursor)
```

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
