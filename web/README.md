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

`lib/stellar.ts` es el punto de entrada al contrato de subastas (I1). Sirve en el servidor y en el navegador; recibe la config de `getDeploy()` como parámetro.

- `auctionClient(deploy, signer?)`: cliente tipado. Sin `signer` solo simula lecturas; para ofertar se le pasa `{ publicKey: address, signTransaction }` de `useWallet()`.
- `getAuction` y `getAuctionsBySlug`: leen por simulación, sin wallet. `getAuctionsBySlug` deja afuera las subastas que no están en `subastas` (por ejemplo, la del smoke test de G1).
- `getAuctionEvents(deploy, id, cursor?)`: ofertas, reembolsos y liquidación (eventos de I1) por `getEvents`. Sin `cursor` recorre los ~7 días que guarda el RPC (de a 10.000 ledgers, en paralelo); con el `cursor` que devuelve trae solo lo nuevo.
- `minimumBid` (regla de I1), `settlementSplit` (mismo redondeo que `settle`), `auctionStatus`, `parseUsdc` / `formatUsdc` (7 decimales, con `bigint`), `contractErrorMessage` (errores 1–9 en español) y `explorerUrl` (stellar.expert).

El cliente usa los bindings que genera G1 (`scripts/bindings.sh`), copiados en `lib/contract/auction.ts`. No se instalan como paquete porque fijan `@stellar/stellar-sdk` 16 y la web usa la 17. Si G1 cambia el contrato, regenerar los bindings y correr:

```bash
npm run bindings:sync
```

## Páginas

- `/`: la muestra. Cada obra muestra la oferta actual o el precio base y cuánto falta (relee `list_auctions` cada 15 s).
- `/obra/[slug]`: la ficha, que es adonde lleva el QR. Consulta los eventos nuevos cada 4 s y, cuando entra uno, relee la subasta (así se ven las extensiones del anti-sniping). Muestra el historial con cada reembolso y enlaces a stellar.expert. Cuando la pestaña no está visible, deja de consultar.
- `/qr`: hoja para imprimir, con un QR por obra. Los QR apuntan al dominio desde el que se abre la hoja, así que hay que imprimirla desde la URL pública (en localhost muestra un aviso).

Los colores y las tipografías son los de la identidad de G3 (`docs/slides/`) y están definidos como tokens en `app/globals.css` (`cal`, `papel`, `tinta`, `piedra`, `linea`, `malbec`, `ocre`).

## Wallet

`components/wallet-provider.tsx` expone `useWallet()` con `address`, `connect`, `disconnect` y `signTransaction`. Usa Stellar Wallets Kit v2 (desde JSR, ver `.npmrc`) con Albedo y Varial (ex Freighter), según la decisión D3.
