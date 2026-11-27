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
  `contracts/` y `dapp` para `web/`.
- **MCP**: `stellar-raven` (docs + ecosistema en vivo) ya configurado en
  `.devin/mcp_config.json` y `.cursor/mcp.json`; requiere OAuth una vez.
- **Nunca** hardcodear secret keys ni commitear `.env`. Testnet usa Friendbot.
- Español en UI y pitch; código y commits en inglés/español consistente con el repo.
