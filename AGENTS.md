# RematArte — contexto para agentes

Subastas de arte en vivo con USDC en Stellar (hackathon Sin Coordenadas, Eje I Arte).
Leé primero `README.md`: problema, idea, alcance del MVP y requisitos de entrega.

## Lo esencial

- **MVP**: una muestra, cada obra con QR → ficha → oferta en USDC depositada en un
  contrato Soroban; reembolso instantáneo al ser superado; liquidación con reparto
  fijo artista/espacio. Todo en **Stellar Testnet**.
- **Stack**: contrato Rust + `soroban-sdk` en `contracts/`; web React/Next mobile-first
  en `web/` con `@stellar/stellar-sdk` y Stellar Wallets Kit; token USDC vía SAC;
  lectura por Stellar RPC.
- **Skills de Stellar** en `.devin/skills/` y `.cursor/skills/`:
  `smart-contracts` (Soroban), `dapp` (SDK + wallets), `assets` (USDC/SAC),
  `data` (RPC/Horizon), `standards` (SEPs). Usá `smart-contracts` para tocar
  `contracts/` y `dapp` para `web/`. `agentic-payments`, `cross-chain` y
  `zk-proofs` están instaladas pero quedan fuera del MVP.
- **Skills de la comunidad**: `soroban-common-mistakes` para revisar el contrato
  antes de cada deploy.
- **Skills para la web (G2)**: `nextjs-senior` (App Router, límite servidor/cliente),
  `deploy-to-vercel`, `webapp-testing` (Playwright en viewport mobile),
  `frontend-design` y `web-design-guidelines` (diseño y accesibilidad de la UI).
- **MCP**: `stellar-raven` (docs + ecosistema en vivo) ya configurado en
  `.devin/mcp_config.json` y `.cursor/mcp.json`; requiere OAuth una vez.
- **Nunca** hardcodear secret keys ni commitear `.env`. Testnet usa Friendbot.
- Español en UI y pitch; código y commits en inglés/español consistente con el repo.

## Comandos (G1 — contrato y Testnet)

- Tests del contrato: `cd contracts && cargo test --lib` (en Windows GNU el `cargo test` completo falla al linkear el `cdylib`: `export ordinal too large`).
- Build WASM: `cd contracts && stellar contract build`.
- USDC de prueba + identidades Testnet: `bash scripts/setup-usdc.sh` (idempotente).
- Deploy: `bash scripts/deploy.sh` → escribe `web/data/deploy.testnet.json` (solo IDs públicos). `DRY_RUN=1` para ver comandos; `CIERRE_MINUTOS=N` para cierres de prueba.
- Prueba end-to-end en Testnet: `bash scripts/smoke.sh`. Wallets de demo: `bash scripts/demo-wallets.sh 3`. Bindings TS: `bash scripts/bindings.sh`.
