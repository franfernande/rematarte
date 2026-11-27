# RematArte — web (G2)

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
- `/api/faucet`: entrega USDC de prueba hasta 200 por cuenta. Usa `USDC_DISTRIBUTOR_SECRET` solo en el servidor (nunca `NEXT_PUBLIC_`).
- `/qr`: cartelas imprimibles en A4 con QR. Imprimirlas desde la URL pública (en localhost muestra un aviso).

Los colores y las tipografías son los de la identidad de G3 (`docs/slides/`), definidos como tokens en `app/globals.css` (`cal`, `papel`, `tinta`, `piedra`, `linea`, `malbec`, `ocre`).

## Wallet

`components/wallet-provider.tsx` expone `useWallet()` con `address`, `walletKind`, `connect`, `disconnect` y `signTransaction`. `connect()` abre el diálogo de login (`components/wallet/login-dialog.tsx`):

- **Huella, Face ID o PIN (passkey con PRF)**: deriva una wallet Stellar de la passkey (`lib/passkey-wallet.ts`); la misma passkey devuelve siempre la misma cuenta. La clave vive solo en memoria.
- **Cuenta en este dispositivo**: si el navegador no soporta passkeys (o la web se abre desde una IP, como el preview en `127.0.0.1`), la wallet queda guardada en el navegador. Es Testnet.
- **Albedo o Freighter/Varial**: vía Stellar Wallets Kit v2 (desde JSR, ver `.npmrc`).

Después de entrar con passkey o dispositivo, `prepareAccount` (`lib/onboarding.ts`) deja la cuenta lista sola: Friendbot, trustline y 200 USDC de prueba.
