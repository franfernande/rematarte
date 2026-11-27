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

Mientras no existan, usa los mocks de `data/mocks/` (misma forma) y la portada muestra un aviso de datos de prueba. Si un JSON no respeta el formato, el build falla con el campo que está mal.

## Wallet

`components/wallet-provider.tsx` expone `useWallet()` con `address`, `connect`, `disconnect` y `signTransaction`. Usa Stellar Wallets Kit v2 (desde JSR, ver `.npmrc`) con Albedo y Varial (ex Freighter), según la decisión D3.
