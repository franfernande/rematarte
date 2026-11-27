# Scripts de deploy Testnet

Scripts de G1 para preparar USDC de prueba y desplegar RematArte en Stellar Testnet. Requieren `stellar` CLI 30, `node`, `curl` y `bash`. No usan `jq` ni archivos `.env`.

## 1. Preparar identidades y USDC

```bash
bash scripts/setup-usdc.sh
```

Es idempotente: crea o reutiliza las identidades `admin`, `artista`, `espacio`, `postor1`, `postor2`, `usdc-issuer` y `usdc-distribuidor`; abre trustlines; emite USDC de prueba y despliega el SAC. Imprime solo claves públicas, contract ids y balances.

## 2. Probar el deploy sin ejecutar

```bash
DRY_RUN=1 bash scripts/deploy.sh
```

Imprime los comandos que ejecutaría, incluido `create_auction` por cada obra. No envía transacciones ni escribe `web/data/deploy.testnet.json`.

## 3. Deploy real

Ejecutarlo solo cuando el contrato haya pasado la auditoría de G1:

```bash
bash scripts/deploy.sh
```

Usa `web/data/obras.json` si existe; si no, `scripts/obras.sample.json`. Escribe `web/data/deploy.testnet.json` con la forma I3.

Variables opcionales:

```bash
CIERRE_MINUTOS=90 bash scripts/deploy.sh   # todas las subastas cierran en 90 minutos
OBRAS_FILE=web/data/obras.json bash scripts/deploy.sh
```

El secret del distribuidor nunca se imprime desde los scripts. Para pasarlo a G2 por privado, una persona puede ejecutar manualmente:

```bash
stellar keys secret usdc-distribuidor
```
