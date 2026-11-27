# Plan de tareas — RematArte

Plan de trabajo para el MVP descrito en el [README](../README.md). Todo en **Stellar Testnet**.

Las tareas están separadas en **3 grupos**. Cada grupo es **dueño exclusivo** de sus carpetas y archivos: nadie de otro grupo los edita. Lo que un grupo necesita de otro está fijado en [Interfaces entre grupos](#interfaces-entre-grupos), así cada uno arranca sin esperar ni pisarse.

## Grupos y responsables

| Grupo | Responsable | Es dueño de | Tareas |
|---|---|---|---|
| **G1 — Contrato y deploy** | _(completar)_ | `contracts/`, `scripts/`, `web/data/deploy.testnet.json` | A1–A8 |
| **G2 — Web** | _(completar)_ | `web/` (excepto los archivos de G1 y G3 listados acá) | B1–B8 |
| **G3 — Producto, contenido y entrega** | _(completar)_ | `docs/` (excepto este plan), `web/data/obras.json`, `web/public/obras/`, `README.md` | C1–C7 |

Archivos compartidos (`docs/plan.md`, `AGENTS.md`, `.gitignore`): se cambian solo avisando al resto en el grupo.

## Reglas de trabajo

1. **Una rama por tarea**, con el prefijo del grupo: `g1/a3-bid`, `g2/b4-ficha`, `g3/c2-obras`.
2. **PR a `main`**; solo se mergea si toca archivos del propio grupo. Si hace falta tocar algo de otro grupo, se le pide al dueño.
3. **Para tomar una tarea**, el responsable marca `[~]` en su línea de este plan (en su rama). `[x]` cuando está mergeada.
4. **Las interfaces no se cambian sin acuerdo de los tres.** Si cambian, se actualiza esta sección en el mismo PR.
5. **Nunca** commitear secret keys ni `.env*` (ya están en `.gitignore`).
6. Si alguien termina y quiere ayudar a otro grupo, lo coordina con el dueño y trabaja en una rama de ese grupo.

## Decisiones tomadas

| # | Decisión | Elegido |
|---|---|---|
| D1 | Un contrato por obra o uno por muestra | **Un contrato para toda la muestra**, con `auction_id` por obra. |
| D2 | USDC de Circle o USDC de prueba propio | **El contrato recibe el token como parámetro.** Para la demo, **USDC de prueba propio** (asset clásico `USDC` + SAC) para poder darle saldo al jurado con un botón. |
| D3 | Wallet en el celular | **Stellar Wallets Kit**: Freighter para el equipo, **Albedo** (web, sin instalar) para el jurado. Passkeys fuera. |
| D4 | Dónde viven los datos de la obra | **Off-chain** en `web/data/obras.json`. On-chain solo lo económico. |

## Prioridades

- **Imprescindible**: A1–A7, B1–B7, C2–C4, C7.
- **Deseable**: A8, B8, C1, C5, C6.

---

## Interfaces entre grupos

### I1. API del contrato (G1 implementa → G2 consume)

Montos en `i128` con **7 decimales** (1 USDC = `10_000_000`). Tiempos en `u64`, segundos Unix (`env.ledger().timestamp()`).

```rust
#[contracttype]
pub struct Auction {
    pub id: u32,
    pub artist: Address,
    pub venue: Address,
    pub artist_bps: u32,              // 0..=10000; el espacio recibe 10000 - artist_bps
    pub min_price: i128,
    pub min_increment: i128,
    pub end_time: u64,
    pub highest_bidder: Option<Address>,
    pub highest_bid: i128,            // 0 si no hay ofertas
    pub settled: bool,
}

fn __constructor(env, admin: Address, token: Address);
fn create_auction(env, artist: Address, venue: Address, artist_bps: u32,
                  min_price: i128, min_increment: i128, end_time: u64) -> Result<u32, Error>; // solo admin; ids desde 0
fn bid(env, auction_id: u32, bidder: Address, amount: i128) -> Result<(), Error>;
fn settle(env, auction_id: u32) -> Result<(), Error>;          // cualquiera, después de end_time
fn claim_refund(env, bidder: Address) -> Result<i128, Error>;
fn get_auction(env, auction_id: u32) -> Result<Auction, Error>;
fn list_auctions(env) -> Vec<Auction>;
fn pending_refund(env, bidder: Address) -> i128;
fn token(env) -> Address;
```

Oferta mínima válida: `highest_bid == 0 ? min_price : highest_bid + min_increment`.

**Anti-sniping:** si una oferta entra cuando faltan menos de 300 s para `end_time`, el contrato lo extiende a `now + 300` (nunca lo acorta). El front siempre debe releer `end_time` con `get_auction` después de cada oferta.

**Errores** (códigos fijos, no renumerar):

| Código | Error |
|---|---|
| 1 | `AuctionNotFound` |
| 2 | `AuctionEnded` |
| 3 | `AuctionNotEnded` |
| 4 | `BidTooLow` |
| 5 | `AlreadySettled` |
| 6 | `InvalidSplit` |
| 7 | `InvalidAmount` |
| 8 | `InvalidEndTime` |
| 9 | `NothingToClaim` |

**Eventos** (`#[topic]` = topic, el resto va en data):

| Evento | Topics | Data |
|---|---|---|
| `bid` | `auction_id`, `bidder` | `amount` |
| `refund` | `auction_id`, `bidder` | `amount`, `pending: bool` (true si quedó como reembolso pendiente) |
| `settled` | `auction_id` | `winner: Option<Address>`, `amount`, `artist_amount`, `venue_amount` |

### I2. Datos de las obras — `web/data/obras.json` (G3 escribe → G1 y G2 leen)

```json
[
  {
    "slug": "atardecer-en-uspallata",
    "titulo": "Atardecer en Uspallata",
    "artista": "Nombre Apellido",
    "tecnica": "Óleo sobre tela",
    "medidas": "60 × 80 cm",
    "anio": 2025,
    "descripcion": "Texto corto para la ficha.",
    "imagen": "/obras/atardecer-en-uspallata.jpg",
    "precioMinimoUsdc": 50,
    "incrementoMinimoUsdc": 5,
    "porcentajeArtista": 80,
    "cierre": "2026-11-28T20:00:00-03:00"
  }
]
```

- Imágenes en `web/public/obras/<slug>.jpg` (G3).
- **G3 sube primero un placeholder con 3 obras de ejemplo** para que G1 y G2 no esperen; después lo reemplaza por las reales.

### I3. Resultado del deploy — `web/data/deploy.testnet.json` (G1 genera → G2 lee)

Solo IDs **públicos**; se commitea.

```json
{
  "network": "testnet",
  "rpcUrl": "https://soroban-testnet.stellar.org",
  "networkPassphrase": "Test SDF Network ; September 2015",
  "auctionContractId": "C...",
  "usdc": { "code": "USDC", "issuer": "G...", "sacId": "C..." },
  "subastas": { "atardecer-en-uspallata": 0 }
}
```

Mientras no exista, G2 trabaja con un mock local con la misma forma.

### I4. Variables de entorno de la web (G2)

| Variable | Dónde | Uso |
|---|---|---|
| `USDC_DISTRIBUTOR_SECRET` | solo servidor (Vercel + `web/.env.local`) | API route que entrega USDC de prueba en el onboarding |

G1 le pasa ese secret a G2 por privado (nunca por el repo). G2 documenta las variables en `web/.env.example` sin valores.

---

## G1 — Contrato y deploy

Dueño de `contracts/`, `scripts/`, `web/data/deploy.testnet.json`. Usar la skill `smart-contracts` (`development.md`, `testing.md`, `security.md`).

- [x] **A1. Scaffold**: `stellar contract init` en `contracts/`; `soroban-sdk` acorde al protocolo de Testnet (verificar con `getVersionInfo`); target `wasm32v1-none`; build con `stellar contract build`.
- [x] **A2. Storage**
  - `instance`: `Admin`, `Token`, `NextId`.
  - `persistent`: `Auction(id)`, `PendingRefund(Address)`.
  - Extender TTL en cada escritura y al inicio de los entry points.
- [x] **A3. Funciones** según [I1](#i1-api-del-contrato-g1-implementa--g2-consume)
  - `create_auction`: `admin.require_auth()`; valida `artist_bps <= 10000`, montos `> 0`, `end_time` futuro.
  - `bid`: `bidder.require_auth()`; subasta abierta; monto `>=` oferta mínima; `transfer(bidder → contrato)` y **en la misma tx** reembolso al postor superado.
  - `settle`: tras `end_time`; reparto `artist_bps` / resto al espacio (el redondeo va a la artista); sin ofertas → cerrada sin venta; no se liquida dos veces.
- [x] **A4. Errores y eventos** exactamente como en I1.
- [x] **A5. Seguridad** (checklist de `security.md`)
  - Reembolso robusto: si el postor superado no puede recibir (p. ej. borró la trustline), `try_transfer` falla → sumar a `PendingRefund` y emitir `refund` con `pending: true`. Nadie puede bloquear la subasta.
  - Aritmética con overflow checks; rechazar montos negativos.
  - Admin leído desde storage; sin reinicialización.
- [x] **A6. Tests unitarios** (`register_stellar_asset_contract_v2`, `set_timestamp`)
  - Oferta menor al mínimo / al incremento → `BidTooLow`.
  - Superar una oferta reembolsa al anterior en la misma tx (balances exactos).
  - Oferta después del cierre → `AuctionEnded`.
  - `settle` antes del cierre → `AuctionNotEnded`; reparto exacto; doble `settle` → `AlreadySettled`.
  - Cierre sin ofertas.
  - Falta de auth en `bid` y `create_auction`.
  - Reembolso pendiente + `claim_refund`.
- [x] **A7. Script de deploy Testnet** (`scripts/deploy.sh`)
  - Identidades `admin`, `artista`, `espacio`, `postor1`, `postor2`, `usdc-issuer`, `usdc-distribuidor` con `stellar keys generate --fund`.
  - Emitir USDC de prueba al distribuidor y desplegar el SAC con `stellar contract asset deploy`.
  - Deploy del contrato y `create_auction` por cada obra de `obras.json` (convertir USDC a 7 decimales y `cierre` a Unix).
  - Escribir `web/data/deploy.testnet.json` (I3). Pasar `USDC_DISTRIBUTOR_SECRET` a G2 por privado.
  - Fondear `postor1` y `postor2` con USDC para usarlas como wallets de demo de respaldo.
- [x] **A8. (Deseable) Anti-sniping**: si entra una oferta cuando faltan < 300 s, `end_time` pasa a `now + 300` (ver I1).

## G2 — Web

Dueño de `web/` (excepto `web/data/obras.json`, `web/public/obras/` y `web/data/deploy.testnet.json`). Usar las skills `dapp` (`react.md`, `data-fetching.md`) y `data`.

- [x] **B1. Scaffold**: Next.js (App Router) + TypeScript + Tailwind, mobile-first, UI en español. `@stellar/stellar-sdk` y Stellar Wallets Kit v2 (`npx jsr add @creit-tech/stellar-wallets-kit`). Mock de `deploy.testnet.json` y de `obras.json` si todavía no existen.
- [x] **B2. `web/lib/stellar.ts`**: lee `deploy.testnet.json`; cliente del contrato vía `stellar contract bindings typescript` (cuando G1 tenga el WASM) o `contract.Client.from` con la interfaz I1.
- [x] **B3. Lectura sin wallet**: la ficha lee `get_auction` por simulación (sin conectar nada); polling corto y feed de ofertas con `getEvents` (eventos de I1).
- [x] **B4. Páginas**
  - `/` — la muestra (grilla de obras con estado).
  - `/obra/[slug]` — foto, título, artista, técnica, countdown, puja actual o precio mínimo, "ofertá desde X", historial y botón de ofertar.
  - `/empezar` — onboarding (B6).
  - `/qr` — hoja imprimible con un QR por obra apuntando a `/obra/[slug]`.
- [ ] **B5. Ofertar en 2 toques**: monto precargado con la oferta mínima → firmar → `signAndSend` → estado + link al explorador. Errores: wallet no conectada, firma rechazada, red equivocada, saldo de XLM/USDC insuficiente, cuenta sin fondear, tx expirada, doble envío.
- [ ] **B6. Onboarding del jurado** (`/empezar`): conectar wallet → fondear con Friendbot → crear trustline USDC → "Recibir USDC de prueba" (API route que firma con `USDC_DISTRIBUTOR_SECRET`, con tope por cuenta).
- [ ] **B7. Deploy en Vercel** (HTTPS para que los QR abran en el celu) con `USDC_DISTRIBUTOR_SECRET` configurada. Pasar la URL a G3.
- [ ] **B8. (Deseable) Liquidación visible**: botón "Liquidar" tras el cierre y comprobante del reparto artista/espacio con link a stellar.expert.

## G3 — Producto, contenido y entrega

Dueño de `docs/` (excepto este plan), `web/data/obras.json`, `web/public/obras/`, `README.md`.

- [ ] **C1. Validar el problema**: entrevistas con 2–3 artistas / rematadores de Mendoza sobre el impago del ganador → `docs/validacion.md` (citas y aprendizajes).
- [ ] **C2. Contenido de la muestra**: primero el placeholder de I2; después 3–5 obras reales con permiso de sus autores, fotos, datos, precio mínimo y reparto acordado. Avisar a G1 cuando cambie (hay que re-crear subastas).
- [ ] **C3. QRs**: imprimir desde `/qr` y probar con celulares reales (Android e iOS).
- [ ] **C4. Prueba con alguien de afuera** (requisito): escanea, hace onboarding y oferta. Documentar qué entendió, qué trabó y qué cambiamos en `docs/validacion.md`. Pasar los hallazgos a G1/G2.
- [ ] **C5. Pitch**: problema → idea → demo → por qué Stellar (`docs/pitch.md` o slides).
- [ ] **C6. Guion de demo y video**: QR → ofertar → otro postor supera → reembolso instantáneo → liquidación con reparto (`docs/demo.md`).
- [ ] **C7. Entrega en Apex**: repo, URL de la app, contract ID en Testnet, video y notas de validación. Actualizar el README con URL e IDs.

---

## Entregas entre grupos

| De → A | Qué | Desbloquea |
|---|---|---|
| G3 → G1, G2 | Placeholder de `obras.json` (I2) | A7, B4 |
| G1 → G2 | WASM / bindings del contrato | B2 (cliente tipado) |
| G1 → G2 | `deploy.testnet.json` (I3) + `USDC_DISTRIBUTOR_SECRET` por privado | B3, B5, B6 contra Testnet real |
| G2 → G3 | URL de Vercel | C3, C4 |
| G3 → G1, G2 | Hallazgos de la prueba con usuarios | Ajustes finales |

## Riesgos y mitigaciones

| Riesgo | Mitigación | Grupo |
|---|---|---|
| Fricción del onboarding (XLM, trustline, USDC) | B6 automatizado + wallets de demo pre-fondeadas | G2, G1 |
| Reembolso bloqueado por trustline borrada | `try_transfer` + reembolso pendiente (A5) | G1 |
| Wallet en mobile | Probar Freighter mobile y Albedo apenas exista B5 | G2 |
| Testnet o RPC lentos durante la demo | Video grabado de respaldo (C6) | G3 |
| Fuga de claves | Secret keys solo en `stellar keys` local y variables de entorno | Todos |
