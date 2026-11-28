# Artemi — web (G2)

Next.js (App Router) + TypeScript + Tailwind v4, mobile-first. Tareas B1–B8 de [`docs/plan.md`](../docs/plan.md).

## Correr en local

Requiere Node 22 o más.

```bash
cd web
npm install
cp .env.example .env.local   # completar USDC_DISTRIBUTOR_SECRET (lo pasa G1 por privado)
npm run dev                  # http://localhost:3000
```

`npm run build` y `npm run lint` antes de abrir el PR.

## Pruebas de punta a punta

Playwright en viewport de celular (Pixel 7) contra Testnet real. Por defecto apuntan a producción; `E2E_BASE_URL` cambia el destino (por ejemplo, `http://localhost:3000` con `npm run dev` o un preview de Vercel).

```bash
npx playwright install chromium   # una vez
npm run test:e2e
```

- `muestra.spec.ts`: portada, ficha en vivo de cada obra, 404 y hoja de QR. Solo lectura.
- `oferta.spec.ts`: el formulario precarga la oferta mínima y valida montos. No envía nada.
- `onboarding.spec.ts`: crea una cuenta descartable en el dispositivo y espera los 200 USDC de prueba (usa la faucet una vez por corrida), y prueba que la faucet rechace otros orígenes y direcciones inválidas.
- `pujas.spec.ts`: dos cuentas ofertan en la misma obra y la primera ve el reembolso. **Hace ofertas reales**: bloquea USDC de prueba en la subasta y le sube el precio, así que solo corre con `E2E_BIDS=1` (y `E2E_BID_SLUG=<slug>` para elegir la obra; por defecto, la última).

Corren de a una porque comparten subastas en vivo.

## Deploy (B7)

Producción: **https://artemi.vercel.app** (proyecto `artemi` en Vercel, Root Directory `web`, preset Next.js). Ese dominio es público; las URLs generadas por cada deploy piden login de Vercel.

- `USDC_DISTRIBUTOR_SECRET` se carga solo en Vercel, por quien la tenga y desde un checkout vinculado: `vercel env add USDC_DISTRIBUTOR_SECRET production --sensitive` (la CLI pide el valor; no va en la línea de comando ni en el repo). Después hay que volver a desplegar. Sin la variable, `/api/faucet` responde 503 y el resto anda igual.
- El repo todavía no está conectado por Git (la app de Vercel no tiene acceso a `franfernande/artemi`). Cuando lo tenga: `vercel git connect` y cada push a `main` despliega solo.
- Mientras tanto, se despliega a mano desde un checkout limpio de `main`, en la raíz del repo: `vercel link --project artemi` y `vercel deploy --prod`. `vercel link` crea un `.env.local` con un token temporal: borralo antes de desplegar.
- Los QR se imprimen desde https://artemi.vercel.app/qr.

## Datos

`lib/data.ts` lee y valida los JSON acordados en el plan:

| Archivo | Dueño | Interfaz |
|---|---|---|
| `data/obras.json` | G3 | I2 |
| `data/deploy.testnet.json` | G1 | I3 |

`deploy.testnet.json` ya está en el repo (deploy de G1 en Testnet). Mientras G3 no suba `obras.json`, se usa `data/mocks/obras.json`, con los mismos slugs que las subastas desplegadas (`scripts/obras.sample.json`), y la portada muestra un aviso de datos de prueba. Si un JSON no respeta el formato, el build falla con el campo que está mal.

## Contrato

- `lib/contract/auction.ts`: cliente tipado generado de los bindings de G1 (`scripts/bindings.sh`). No se instala como paquete porque fija `@stellar/stellar-sdk` 16 y la web usa la 17. Si G1 cambia el contrato, regenerar los bindings y correr `npm run bindings:sync`.
- `lib/stellar.ts`: config de red leída de `data/deploy.testnet.json` (RPC, Horizon, contrato, USDC de prueba).
- `lib/auction.ts`: lecturas por simulación sin wallet (`readAuction`, `readAuctions`, `readEvents`, `readEventsSince`, `readPendingRefund`, `readUsdcBalance`, `readLedgerTime`), escrituras firmadas (`placeBid`, `settleAuction`, `claimRefund`) y `toFriendlyError` (errores 1–9 y de wallet/red en español).
- `lib/use-auction.ts`: hook `useAuction(id, { intervalMs?, events? })` con polling sin superposición, eventos incrementales y reloj alineado al ledger (para el anti-sniping).
- `lib/format.ts` y `lib/auction-types.ts`: montos con `bigint` (7 decimales), fases de la subasta y links a stellar.expert.

## Páginas

- `/`: la muestra, con cada obra enmarcada y su estado en vivo (puja actual o precio base).
- `/obra/[slug]`: la ficha, adonde lleva el QR. Panel en vivo con cuenta regresiva y aviso de anti-sniping, oferta en 2 toques, aviso de "te superaron", registro de la puja, liquidación con reparto y reclamo de reembolso pendiente. Debajo, el reparto explicado, el cierre previsto y el link al contrato.
- `/empezar`: prepara la cuenta paso a paso (activar en Testnet, habilitar USDC, recibir 200 USDC de prueba).
- `/api/faucet`: entrega USDC de prueba (ver más abajo).
- `/qr`: cartelas imprimibles en A4 con QR. Imprimirlas desde la URL pública (en localhost muestra un aviso).

Los colores y las tipografías son los de la identidad de G3 (`docs/slides/`), definidos como tokens en `app/globals.css` (`cal`, `papel`, `tinta`, `piedra`, `linea`, `malbec`, `ocre`).

## Wallet

`components/wallet-provider.tsx` expone `useWallet()` con `address`, `walletKind`, `connect`, `disconnect` y `signTransaction`. `connect()` abre el diálogo de login (`components/wallet/login-dialog.tsx`):

- **Huella, Face ID o PIN (passkey con PRF)**: deriva una wallet Stellar de la passkey (`lib/passkey-wallet.ts`); la misma passkey devuelve siempre la misma cuenta. La clave vive solo en memoria.
- **Cuenta en este dispositivo**: si el navegador no soporta passkeys (o la web se abre desde una IP, como el preview en `127.0.0.1`), la wallet queda guardada en el navegador. Es Testnet.
- **Albedo o Freighter/Varial**: vía Stellar Wallets Kit v2 (desde JSR, ver `.npmrc`).

Después de entrar con passkey o dispositivo, `prepareAccount` (`lib/onboarding.ts`) deja la cuenta lista sola: Friendbot, trustline y 200 USDC de prueba.

La cuenta "en este dispositivo" guarda su secret key en `localStorage`: sirve solo para Testnet y cualquier script que corra en la página podría leerla.

## USDC de prueba (`/api/faucet`)

`POST /api/faucet` con `{ "address": "G…" }` completa el saldo hasta 200 USDC de prueba desde la cuenta distribuidora de G1. Usa `USDC_DISTRIBUTOR_SECRET`, que solo existe en el servidor (`web/.env.local` y variables de Vercel, nunca `NEXT_PUBLIC_`); si falta, responde 503.

- Una entrega por cuenta: el pago va en la misma transacción que una entrada `manageData` (`u:<cuenta>`) en la distribuidora. La marca es pública y no hace falta una base de datos. Cada marca bloquea 0,5 XLM de reserva en la distribuidora.
- Si la cuenta ya recibió USDC, responde `{ funded: false, alreadyClaimed: true }` sin mover fondos, y el onboarding da el paso por hecho con el saldo que quede.
- Rechaza pedidos de otro origen y limita a un envío por minuto por cuenta y a 20 por minuto por IP (en la sala, todos comparten la IP del Wi-Fi). Ese límite vive en memoria por instancia y es solo un freno; el tope real es la marca.
