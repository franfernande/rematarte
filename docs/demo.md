# Guion de demo y video — Artemi

Objetivo: que cualquiera del equipo pueda hacer la demo en vivo dentro del pitch (60–90 segundos) y grabar el video de respaldo (~2 minutos) sin improvisar.

La regla de oro: **nada de secret keys en pantalla, en este documento, en el repo ni en canales del equipo**. Las claves viven en el keystore local de `stellar keys` y solo se exportan en la máquina de la persona que va a importar la wallet.

## Estado real al escribir este guion

- El contrato está desplegado en Stellar Testnet: [`CDX6G3F5DS2NUFFXZJ5XQSFHPTG6EKXY5GONXKLFLPNW6U7SVEPZ2RLJ`](https://stellar.expert/explorer/testnet/contract/CDX6G3F5DS2NUFFXZJ5XQSFHPTG6EKXY5GONXKLFLPNW6U7SVEPZ2RLJ).
- WASM hash verificado: `53ffb83a703f879cef1c2c9b4e41907399ddc0145779bb58aadadb99edbb9860`.
- USDC de prueba propio: issuer `GDNQJIVKZNQTS4ZGH2W6VJPK4SQP4JIJR4YMWK7UHNOGQNYWN3F2BF3D`, SAC `CA7IN3NREHPGR2UPBIJX52T4KCXVZVMOCUWC2OBK3T6JXJDSR77WAQGV`.
- Hay tres subastas de muestra creadas desde `scripts/obras.sample.json`: `atardecer-en-uspallata` → `0`, `vinedos-al-sur` → `1`, `cerro-en-calma` → `2`. No son obras reales.
- El smoke test real ya demostró en Testnet oferta, reembolso, anti-sniping y liquidación; los hashes están en [Plan B](#plan-b-respaldo-con-transacciones-reales).
- La web todavía está en construcción: no hay URL pública de Vercel ni páginas finales `/obra/[slug]`, `/empezar`, `/qr`. Tampoco está el `web/data/obras.json` real, así que la web usa mocks. Todo lo que dependa de eso queda marcado con la etiqueta visible `COMPLETAR`.
- Repo: <https://github.com/franfernande/artemi>.

## 1. Elenco y dispositivos

Asignar los roles entre Fran Fernández, Antonio Chocobar y Sebastián Villarreal; acá no se asume quién hace cada cosa.

| Rol | Persona | Dispositivo | Wallet / identidad | Qué hace en la demo |
|---|---|---|---|---|
| Quien presenta | `[COMPLETAR: quién presenta]` | Compu principal conectada al proyector | No necesita wallet | Maneja el pitch, abre la app y stellar.expert |
| Postor A | `[COMPLETAR: quién hace de postor A]` | Celu A | `demo1` importada en Freighter/Varial | Hace la primera oferta |
| Postor B | `[COMPLETAR: quién hace de postor B]` | Celu B | `demo2` importada en Freighter/Varial | Supera la oferta de A |
| Artista | `[COMPLETAR: quién muestra el cobro de artista]` | Compu principal o celu de apoyo | Identidad `artista`; recomendado mostrarla en stellar.expert. Si se usa wallet, importarla en Freighter/Varial en un solo dispositivo | Recibe su parte en la liquidación |
| Espacio | `[COMPLETAR: quién muestra el cobro del espacio]` | Compu principal o celu de apoyo | Identidad `espacio`; recomendado mostrarla en stellar.expert. Si se usa wallet, importarla en Freighter/Varial en un solo dispositivo | Recibe su parte en la liquidación |
| Soporte técnico | `[COMPLETAR: quién hace soporte]` | Compu secundaria con el repo y `stellar` CLI | `postor1`, `postor2`, `admin`; `demo3` como respaldo | Resuelve desvíos, usa el plan B y evita improvisación |
| Jurado / visitante opcional | `[COMPLETAR: si el jurado/visitante participa en vivo]` | Su propio celu | Albedo vía onboarding o `demo3` precargada | Prueba escanear y ofertar si sobra tiempo |

Notas de wallet:

- La decisión de producto es Stellar Wallets Kit; para el jurado se prevé Albedo porque no requiere instalar nada. La web actual lista Albedo y Varial (ex Freighter), así que el ensayo tiene que hacerse con la wallet que realmente aparezca al conectar.
- `demo1`, `demo2` y `demo3` existen como respaldo y quedaron preparadas con 500 USDC de prueba cada una. Si hace falta recrearlas o completarlas, se usa:
  ```bash
  bash scripts/demo-wallets.sh
  ```
- Para ver solo la dirección pública de una identidad:
  ```bash
  stellar keys public-key demo1
  ```

### Cómo importar una wallet de demo en Freighter/Varial sin exponer secrets

Lo hace una persona en su propia máquina, nunca con el proyector compartiendo pantalla:

1. Verificá que la identidad exista:
   ```bash
   stellar keys public-key demo1
   ```
2. En la terminal de esa máquina, ejecutá manualmente:
   ```bash
   stellar keys secret demo1
   ```
   Ese comando sí muestra el secret. No lo copies a ningún documento, chat, issue, captura ni variable commiteada.
3. En Freighter/Varial, usá la opción de importar cuenta con secret key. `[COMPLETAR: pasos exactos según la versión instalada en el celu del equipo]`.
4. Pegá el secret solo en la wallet, guardá la cuenta con un nombre claro (`Artemi demo1`) y limpiá el portapapeles si el sistema lo permite.
5. Seleccioná red Testnet y verificá saldo de XLM y USDC antes de la demo.
6. Repetí con `demo2` en el segundo celu. Si hay un celu de respaldo, repetí también con `demo3`; si no hay, `demo3` queda solo como respaldo para soporte/onboarding, no como reemplazo inmediato en vivo.

## 2. Preparación previa — checklist T-30 minutos

### 2.1. La restricción importante: anti-sniping

El contrato tiene anti-sniping: si entra una oferta cuando faltan menos de 300 segundos para el cierre, el cierre se extiende a `now + 300`. Por eso **no se puede ofertar en vivo y liquidar la misma subasta en 60–90 segundos**: cualquier oferta cerca del cierre la corre cinco minutos.

La demo en vivo usa entonces **dos subastas**:

1. **Subasta viva**: sigue abierta durante el pitch. Sirve para escanear, ofertar y mostrar el reembolso instantáneo. No usar la subasta viva final para ensayos completos: cada ensayo deja una puja máxima nueva. Ensayar con una subasta de ensayo aparte y reservar la final sin ofertas.
2. **Subasta de liquidación**: se crea y recibe una oferta antes del pitch. Cuando empieza la demo ya está cerrada pero todavía no liquidada. Sirve para ejecutar `settle` en vivo y mostrar el reparto.

Idealmente son dos obras/fichas distintas: la viva se muestra como abierta al público; la de liquidación se usa solo para mostrar el cierre y el reparto. No improvisar una sola subasta corta: va a fallar por anti-sniping.

### 2.2. Opciones para preparar las subastas

#### Opción A — redeploy completo controlado

Sirve si G1 y G2 tienen tiempo de regenerar todo y redeployar la web antes de la demo. No es un paso para improvisar dentro de T-30: a esa altura lo ideal es solo verificar que contrato, JSON, web y QR ya quedaron alineados.

```bash
CIERRE_MINUTOS=<n> bash scripts/deploy.sh
```

Eso crea un contrato nuevo, crea las subastas con el mismo `end_time` y regenera `web/data/deploy.testnet.json`. `<n>` tiene que ser un entero positivo. Hay que avisar a G2 y redeployar la web: aunque la URL pública no cambie, los IDs on-chain sí cambian.

Trade-off: `CIERRE_MINUTOS` pone el mismo cierre para todas las obras. Es cómodo para ensayos, pero no separa una subasta viva de una subasta de liquidación. Para la demo final conviene usar un `OBRAS_FILE` con cierres pensados para cada rol o preparar la subasta de liquidación aparte.

El uso general de los scripts está en `scripts/README.md`. Variables reales soportadas por `scripts/deploy.sh`:

```bash
OBRAS_FILE=<archivo-json> bash scripts/deploy.sh
CIERRE_MINUTOS=<n> bash scripts/deploy.sh
DRY_RUN=1 bash scripts/deploy.sh
```

Si se cambian slugs, precios, porcentajes o cierres, hay que coordinar con G1 y G2 antes de ejecutar nada. Después de cualquier redeploy hay que actualizar el contract id, los links y los datos públicos de este guion y de la entrega.

#### Opción B — crear una subasta extra en el contrato actual

Evita redeployar el contrato, pero tiene una trampa operativa: la web lee `web/data/deploy.testnet.json` (I3) y las fichas de `web/data/obras.json` (I2). Una subasta extra no aparece hasta que G1 agregue el mapping `slug → id`, G3/G2 confirmen que ese slug existe en los datos de obras y G2 redeployee la web. Si no se actualizan esos datos, esta opción solo sirve por CLI, no para la demo visual.

Comando base verificado contra `scripts/smoke.sh`, para ejecutar desde la raíz del repo y en Git Bash si la compu usa Windows (valores de ejemplo para ensayo: 10 USDC mínimo, incremento 1 USDC, 80% artista, cierre en 20 minutos). Los montos del contrato van en unidades enteras de 7 decimales: 1 USDC = `10000000`; por eso 10 USDC = `100000000`:

```bash
CONTRACT_ID=$(node -e 'console.log(require("./web/data/deploy.testnet.json").auctionContractId)')
ARTIST_ADDR=$(stellar keys public-key artista)
VENUE_ADDR=$(stellar keys public-key espacio)
END_TIME=$(( $(date +%s) + 1200 ))

stellar contract invoke \
  --contract-id "$CONTRACT_ID" \
  --source-account admin \
  --network testnet \
  --auto-sign \
  -- create_auction \
  --artist "$ARTIST_ADDR" \
  --venue "$VENUE_ADDR" \
  --artist_bps 8000 \
  --min_price 100000000 \
  --min_increment 10000000 \
  --end_time "$END_TIME"
```

El stdout devuelve el `auction_id`. Guardarlo en la misma terminal, por ejemplo:

```bash
SETTLE_AUCTION_ID=<id-devuelto>
```

Los bloques siguientes asumen que `CONTRACT_ID` y `SETTLE_AUCTION_ID` siguen cargados en esa terminal. `[COMPLETAR: ajustar montos, porcentaje y cierre a la obra real antes de la demo final]`.

### 2.3. Timeline recomendado para que la liquidación entre en la demo

`T0` es el momento en que empieza la demo dentro del pitch.

| Momento | Acción |
|---|---|
| T-30 min | Confirmar URL, dispositivos, wallets, QR, stellar.expert y video de respaldo. |
| T-15 min | Confirmar que la subasta viva existe, está abierta y tiene precio mínimo correcto. |
| T-12 min | Crear o identificar la subasta de liquidación. Si se crea para este fin, usar un cierre inicial de unos 4 minutos. |
| T-11 min | Hacer la oferta ganadora de preparación. Como entra dentro de los últimos 5 minutos, el anti-sniping deja el cierre aproximadamente en `T-6`. |
| T-6 a T-3 | Verificar que la subasta de liquidación ya pasó `end_time`, todavía tiene `settled=false` y tiene una oferta ganadora. Desde acá nadie más la toca hasta el `settle` de la demo. |
| T0 | Empezar la demo: la subasta viva se usa para ofertas; la subasta de liquidación se usa solo para `settle`. |
| T+90 s | Terminar. No seguir transacciones en vivo si ya se mostró el reparto. |

Para preparar la oferta ganadora por CLI se usan los mismos flags de `scripts/smoke.sh`. Se usa `postor1` para no tocar los saldos prolijos de `demo1` y `demo2` antes de la demo visible:

```bash
POSTOR1_ADDR=$(stellar keys public-key postor1)

stellar contract invoke \
  --contract-id "$CONTRACT_ID" \
  --source-account postor1 \
  --network testnet \
  --auto-sign \
  -- bid \
  --auction_id "$SETTLE_AUCTION_ID" \
  --bidder "$POSTOR1_ADDR" \
  --amount 100000000
```

Para leer la subasta sin enviar transacción:

```bash
stellar contract invoke \
  --contract-id "$CONTRACT_ID" \
  --source-account admin \
  --network testnet \
  --send=no \
  -- get_auction \
  --auction_id "$SETTLE_AUCTION_ID"
```

Si la web tiene botón de liquidación, se usa la interfaz. Si no, soporte puede liquidar por CLI:

```bash
stellar contract invoke \
  --contract-id "$CONTRACT_ID" \
  --source-account admin \
  --network testnet \
  --auto-sign \
  -- settle \
  --auction_id "$SETTLE_AUCTION_ID"
```

El comando anterior es respaldo técnico, no parte visible del pitch salvo que falle la web.

### 2.4. Checklist físico y técnico

- [ ] URL de la app abierta en compu y celus: `[COMPLETAR: URL de Vercel]`.
- [ ] QR impreso probado con Android e iOS: `[COMPLETAR: QR final generado desde /qr cuando exista]`.
- [ ] Ruta de ficha probada: `[COMPLETAR: /obra/[slug] implementada por G2]`.
- [ ] Onboarding probado si participa el jurado: `[COMPLETAR: /empezar implementada por G2]`.
- [ ] Botón de oferta probado: `[COMPLETAR: flujo B5 implementado por G2]`.
- [ ] Liquidación visible probada si existe: `[COMPLETAR: botón/liquidación B8 implementado por G2]`.
- [ ] `bash scripts/demo-wallets.sh` ejecutado recientemente; `demo1`, `demo2`, `demo3` con XLM, trustline y 500 USDC.
- [ ] En la compu de soporte, `stellar keys public-key <nombre>` responde sin error para `admin`, `postor1`, `postor2`, `artista` y `espacio`. Si falta alguna identidad, trustline o saldo de respaldo, soporte corre `bash scripts/setup-usdc.sh` antes de T-30, no durante el pitch.
- [ ] Freighter/Varial en red Testnet en los dos celus.
- [ ] Wallet A conectada como `demo1`; wallet B como `demo2`; si hay celu de respaldo, `demo3` ya importada y en Testnet.
- [ ] Las wallets `demo1` y `demo2` conservan la trustline USDC. No borrarla: si el reembolso no puede completarse, queda como reembolso pendiente y rompe el momento “vuelve al instante”.
- [ ] Pestaña abierta del contrato en stellar.expert: <https://stellar.expert/explorer/testnet/contract/CDX6G3F5DS2NUFFXZJ5XQSFHPTG6EKXY5GONXKLFLPNW6U7SVEPZ2RLJ>.
- [ ] Pestañas de respaldo abiertas con las transacciones del smoke test (ver Plan B).
- [ ] Subasta viva abierta y subasta de liquidación cerrada pero no liquidada.
- [ ] Video de respaldo descargado localmente en la compu principal: `[COMPLETAR: archivo final del video]`.
- [ ] Celus cargados, sin bloqueo automático durante la demo, en modo no molestar y con brillo alto.
- [ ] Nadie comparte pantalla mientras importa secrets ni muestra frases de recuperación.

### 2.5. Tarjeta de control para completar el día de la demo

Completar esta tabla antes de entrar. Si un valor no está escrito acá, no se improvisa durante el pitch.

| Dato | Valor acordado |
|---|---|
| Slug y `auction_id` de la subasta viva | `[COMPLETAR: slug y auction id de la subasta viva]` |
| Slug y `auction_id` de la subasta de liquidación | `[COMPLETAR: slug y auction id de la subasta de liquidación]` |
| Oferta de postor A | `[COMPLETAR: monto de la oferta de postor A]` |
| Oferta de postor B | `[COMPLETAR: monto de la oferta de postor B]` |
| Cierre de la subasta viva | `[COMPLETAR: cierre de la subasta viva]` |
| Cierre de la subasta de liquidación | `[COMPLETAR: cierre de la subasta de liquidación]` |
| URL directa de cada ficha | `[COMPLETAR: URL de Vercel]` |

Regla de montos: postor A usa la oferta mínima válida que precargue la ficha; postor B usa la nueva mínima válida después de la oferta de A (`highest_bid + min_increment`). No elegir números al aire en vivo. Si el jurado va a probar después, que lo haga en otra subasta o después del pitch: una oferta externa puede cambiar la puja y disparar el anti-sniping en el momento coreografiado.

## 3. Guion paso a paso de la demo en vivo (60–90 s)

Antes de empezar: la compu principal ya tiene abierta la ficha de la obra o el QR listo para escanear. Los dos postores ya tienen la wallet desbloqueada. No se explica la preparación; solo se muestra el recorrido del público.

| Tiempo | Quién | Acción | Qué se ve en pantalla | Frase a decir |
|---|---|---|---|---|
| 0:00–0:08 | Quien presenta | Muestra la obra y el QR impreso. `[COMPLETAR: obra real y permiso para mostrarla]` `[COMPLETAR: QR final generado desde /qr cuando exista]` | Obra física o imagen + QR junto a la obra | “Cada obra tiene su QR. Lo escaneás y entrás a la ficha sin instalar nada.” |
| 0:08–0:15 | Postor A o quien presenta | Escanea el QR y abre la ficha. `[COMPLETAR: URL de Vercel]` `[COMPLETAR: /obra/[slug] implementada por G2]` | Ficha con foto, título, artista, cierre, puja actual o precio mínimo | “Acá se ve la obra, cuánto falta y desde qué monto se puede ofertar.” |
| 0:15–0:27 | Postor A | Oferta en dos toques con `demo1`. `[COMPLETAR: flujo B5 implementado por G2]` | Monto precargado, firma de wallet, confirmación | “Ofertar no es prometer: es depositar. Los USDC quedan respaldados en el contrato.” |
| 0:27–0:40 | Postor B | Supera la oferta con `demo2` | Nueva puja más alta; la ficha se actualiza | “Ahora entra otra oferta.” |
| 0:40–0:52 | Quien presenta | Muestra wallet de A y/o la transacción de B en stellar.expert | El saldo de A vuelve; la transacción de B incluye el reembolso | “El punto clave: si te superan, no tenés que pedir nada. Tu plata vuelve en la misma transacción.” |
| 0:52–1:02 | Quien presenta | Cambia a la subasta de liquidación, ya cerrada | Estado cerrado, ganador, botón o acción de liquidar. `[COMPLETAR: botón/liquidación B8 implementado por G2]` | “Mientras esta subasta sigue abierta, acá hay otra que ya cerró: cualquiera puede liquidarla. No hace falta perseguir al ganador.” |
| 1:02–1:12 | Soporte o quien presenta | Ejecuta liquidación | Confirmación de `settle` | “Al liquidar, el contrato reparte lo recaudado con el porcentaje fijado antes de empezar.” |
| 1:12–1:25 | Quien presenta | Abre la transacción de liquidación en stellar.expert | Transferencias a `artista` y `espacio` | “Acá se verifica en la cadena cuánto cobró la artista y cuánto cobró el espacio.” |
| 1:25–1:30 | Quien presenta | Cierra la idea | App o transacción final | “La obra cuelga en la pared. La puja vive en la cadena.” |

Precisiones para no meterse en problemas:

- El reembolso al postor superado **no es una transacción separada**: ocurre dentro de la transacción de la nueva oferta. Si no aparece como otra tx, es lo esperado. La excepción es el reembolso pendiente (`claim_refund`) si la cuenta no puede recibir; por eso las wallets de demo no tienen que perder la trustline.
- Después de cada oferta, la ficha tiene que releer `end_time`: si la oferta entró en los últimos cinco minutos, el anti-sniping puede extender el cierre.
- Si el botón de liquidación todavía no existe en la web, no fingirlo. Soporte ejecuta el respaldo por CLI o se usa el video/smoke test.
- Si alguna pantalla tarda, no repetir toques ni firmar dos veces. Pasar al plan B.
- El hash de una transacción en vivo tiene que venir del link de la app, de la wallet o de stellar.expert. Nadie lo escribe a mano durante el pitch.
- Si el jurado pregunta por ofertas de último segundo: “Si entra una oferta cuando faltan menos de cinco minutos, el cierre se corre a cinco minutos desde esa oferta”. No prometer liquidar esa misma subasta dentro del pitch.

## 4. Plan B: respaldo con transacciones reales

Estas transacciones ya existen en Testnet y prueban el flujo completo del smoke test sobre la subasta 3. Abrirlas antes de la demo en pestañas separadas.

| Prueba | Hash | Link |
|---|---|---|
| Creación de la subasta de smoke | `1149ae4cfa9b6af3cbdb8753a2b49c936443f4f58691bb7253bbdc74fcce3fa6` | <https://stellar.expert/explorer/testnet/tx/1149ae4cfa9b6af3cbdb8753a2b49c936443f4f58691bb7253bbdc74fcce3fa6> |
| Oferta de postor1 por 10 USDC | `d590324ba04324225b8c3141fc9b5fedf7900d30f3b3651e563d5ebe8c5ddf9c` | <https://stellar.expert/explorer/testnet/tx/d590324ba04324225b8c3141fc9b5fedf7900d30f3b3651e563d5ebe8c5ddf9c> |
| Oferta de postor2 por 12 USDC con reembolso exacto a postor1 | `490b3cf06e07543f3524a0f9195843fac1567c545db56a062c27761e68eaef1e` | <https://stellar.expert/explorer/testnet/tx/490b3cf06e07543f3524a0f9195843fac1567c545db56a062c27761e68eaef1e> |
| Liquidación con reparto de 9,6 USDC a artista y 2,4 USDC a espacio | `f2b18805b61449fe56fa073be19ef92315a9b3facbf21369fd65a10ce4f07ac2` | <https://stellar.expert/explorer/testnet/tx/f2b18805b61449fe56fa073be19ef92315a9b3facbf21369fd65a10ce4f07ac2> |

En ese mismo smoke test, la oferta de postor2 también verificó el anti-sniping: el cierre pasó de `1795801044` a `1795801289`. Antes, una oferta baja fue rechazada con `BidTooLow`; después del reparto, un segundo `settle` fue rechazado con `AlreadySettled`.

Si antes de la entrega se vuelve a desplegar el contrato, estos hashes quedan como evidencia del deploy actual al escribir este guion, no del contrato nuevo. En ese caso conviene repetir el smoke test y reemplazar los hashes del respaldo:

```bash
bash scripts/smoke.sh
```

Tarda varios minutos porque crea una subasta, espera el cierre extendido por anti-sniping y verifica la liquidación.

Frase de respaldo:

> “Esto mismo ya quedó ejecutado en Testnet. Acá se ve una oferta, después otra que la supera y devuelve la primera en la misma transacción, y finalmente la liquidación con el reparto.”

### Fallas previstas y respuesta

| Falla | Señal | Qué hacer | Qué decir |
|---|---|---|---|
| Testnet o RPC lento | La ficha no actualiza o la confirmación tarda | Esperar unos segundos una sola vez; si no vuelve, abrir la tx de smoke correspondiente | “La red de prueba está lenta; este mismo flujo ya quedó confirmado acá.” |
| Wallet no conecta en el celu | No aparece cuenta o no firma | Pasar al celu de respaldo con `demo3` si ya está importada; si no está lista o también falla, usar video o smoke test | “Tenemos una wallet de respaldo precargada justamente para esto.” |
| Wallet en red equivocada | La cuenta no tiene saldo o la app avisa red incorrecta | Cambiar la wallet a Testnet, recargar la ficha y reintentar una sola vez; si sigue, usar respaldo | “Estamos en Testnet; la red correcta es parte del checklist.” |
| QR no abre | Cámara no lee o el link no responde | Usar la ficha ya abierta en la compu o tipear la URL directa | “Voy directo a la ficha para no perder tiempo; el QR apunta a esta misma página.” |
| La subasta viva quedó extendida por anti-sniping | `end_time` se movió cinco minutos | No intentar liquidarla. Usar la subasta de liquidación preparada | “Eso es el anti-sniping funcionando: evita ofertas de último segundo.” |
| La subasta de liquidación todavía no cerró | `settle` devuelve `AuctionNotEnded` | No insistir. Mostrar el settle del smoke test | “Ya tenemos una liquidación real confirmada; la uso para no improvisar.” |
| Se terminó el tiempo | 90 segundos cumplidos | Cortar con la frase final y dejar stellar.expert abierto | “Queda todo verificable en la cadena; les dejo el contrato y las transacciones.” |
| Falla el onboarding del jurado | Friendbot/trustline/USDC demora | Usar `demo3` precargada o mostrar el recorrido sin participación directa | “El onboarding es asistido; para la demo usamos una wallet ya preparada.” |

## 5. Guion del video de respaldo (~2 minutos)

Grabar solo cuando existan la URL pública y las pantallas finales. Si se graba antes, dejar explícito que es un ensayo técnico. En todos los casos incluir el subtítulo “Demo en Stellar Testnet con USDC de prueba”.

| Escena | Tiempo | Plano / imagen | Voz en off | Subtítulo sugerido |
|---|---:|---|---|---|
| 1 | 0:00–0:10 | Plano general de la obra en la pared con el QR al lado. `[COMPLETAR: obra real y permiso para mostrarla]` | “Cuando un remate informal depende de una transferencia posterior, la artista puede quedar esperando un pago que no llega.” | “El problema: la promesa de compra no garantiza el cobro” |
| 2 | 0:10–0:20 | Acercamiento al QR; una mano lo escanea con el celu | “Con Artemi, cada obra tiene un QR. Lo escaneás y entrás a su ficha.” | “Escaneás el QR de la obra” |
| 3 | 0:20–0:32 | Pantalla del celu con ficha: obra, artista, cierre y puja. `[COMPLETAR: /obra/[slug] implementada por G2]` | “La ficha muestra la puja actual, el mínimo para participar y cuándo cierra.” | “Puja y cierre visibles” |
| 4 | 0:32–0:48 | Primer plano de la wallet: monto precargado y firma | “Ofertar es depositar. Los USDC quedan retenidos por un contrato en Stellar, no son solo una promesa.” | “Ofertar es depositar” |
| 5 | 0:48–1:04 | Segundo celu supera la oferta; corte a la wallet del primero | “Si otro postor te supera, recuperás lo tuyo en la misma transacción. Sin pedirlo y sin esperar al cierre.” | “Reembolso instantáneo al ser superado” |
| 6 | 1:04–1:16 | Ficha cerrada y acción de liquidar. `[COMPLETAR: botón/liquidación B8 implementado por G2]` | “Cuando la subasta cierra, cualquiera puede liquidarla.” | “Liquidación sin perseguir al ganador” |
| 7 | 1:16–1:35 | stellar.expert con la transacción de liquidación | “El contrato reparte lo recaudado entre la artista y el espacio con el porcentaje fijado antes de empezar.” | “Reparto verificable on-chain” |
| 8 | 1:35–1:50 | Plano del contrato en stellar.expert y la app abierta | “Todo queda verificable: la puja, el reembolso y el reparto.” | “La puja vive en la cadena” |
| 9 | 1:50–2:00 | Vuelve el plano de la obra; cierre con título del proyecto | “Artemi: subastas de arte en vivo con respaldo real en Stellar.” | “Artemi” |

Indicaciones de grabación:

- Alternar pantalla del celu y plano físico de la obra para que no parezca solo una demo de software.
- Grabar la pantalla en limpio, sin notificaciones ni datos personales.
- No filmar importación de secrets ni frases de recuperación.
- Si se corta la espera entre oferta, cierre y liquidación, o se usa una subasta preparada para liquidar, dejarlo claro en edición con un subtítulo como “espera editada”. No simular que el anti-sniping no existe.
- Si no hay obra física real todavía, usar el plano del QR junto a una imagen impresa solo como ensayo. `[COMPLETAR: obra real y permiso para mostrarla]`.
- Formato, duración máxima y forma de subida: `[COMPLETAR: requisitos finales de Apex]`.

## 6. Checklist post-demo para la entrega en Apex

Guardar capturas reales, con fecha y red Testnet visibles cuando sea posible:

- [ ] Ficha de la obra antes de ofertar, con puja mínima/actual y cierre. `[COMPLETAR: URL de Vercel]`.
- [ ] Confirmación de la primera oferta.
- [ ] Confirmación de la oferta que supera.
- [ ] Evidencia del reembolso: saldo del primer postor y transacción de la segunda oferta en stellar.expert.
- [ ] Estado cerrado antes de liquidar.
- [ ] Transacción de liquidación en stellar.expert.
- [ ] Detalle del reparto a `artista` y `espacio`.
- [ ] Página del contrato en stellar.expert.
- [ ] Captura del QR junto a la obra.
- [ ] Captura o clip corto del onboarding del jurado si se usa. `[COMPLETAR: /empezar implementada por G2]`.
- [ ] Video final exportado. `[COMPLETAR: archivo final del video]`.
- [ ] Notas de la prueba con alguien de afuera, cuando existan, para `docs/validacion.md`. No inventar ni completar antes de hacerla.
- [ ] Datos públicos para copiar en Apex: repo <https://github.com/franfernande/artemi>, contract id `CDX6G3F5DS2NUFFXZJ5XQSFHPTG6EKXY5GONXKLFLPNW6U7SVEPZ2RLJ`, WASM hash `53ffb83a703f879cef1c2c9b4e41907399ddc0145779bb58aadadb99edbb9860`, issuer USDC `GDNQJIVKZNQTS4ZGH2W6VJPK4SQP4JIJR4YMWK7UHNOGQNYWN3F2BF3D`, SAC `CA7IN3NREHPGR2UPBIJX52T4KCXVZVMOCUWC2OBK3T6JXJDSR77WAQGV`, URL de la app `[COMPLETAR: URL de Vercel]`.

## 7. Pendientes visibles de este guion

Estos son todos los puntos que el equipo tiene que completar a mano antes de la demo final:

- `[COMPLETAR: quién presenta]`
- `[COMPLETAR: quién hace de postor A]`
- `[COMPLETAR: quién hace de postor B]`
- `[COMPLETAR: quién muestra el cobro de artista]`
- `[COMPLETAR: quién muestra el cobro del espacio]`
- `[COMPLETAR: quién hace soporte]`
- `[COMPLETAR: si el jurado/visitante participa en vivo]`
- `[COMPLETAR: pasos exactos según la versión instalada en el celu del equipo]`
- `[COMPLETAR: ajustar montos, porcentaje y cierre a la obra real antes de la demo final]`
- `[COMPLETAR: slug y auction id de la subasta viva]`
- `[COMPLETAR: slug y auction id de la subasta de liquidación]`
- `[COMPLETAR: monto de la oferta de postor A]`
- `[COMPLETAR: monto de la oferta de postor B]`
- `[COMPLETAR: cierre de la subasta viva]`
- `[COMPLETAR: cierre de la subasta de liquidación]`
- `[COMPLETAR: URL de Vercel]`
- `[COMPLETAR: QR final generado desde /qr cuando exista]`
- `[COMPLETAR: /obra/[slug] implementada por G2]`
- `[COMPLETAR: /empezar implementada por G2]`
- `[COMPLETAR: flujo B5 implementado por G2]`
- `[COMPLETAR: botón/liquidación B8 implementado por G2]`
- `[COMPLETAR: archivo final del video]`
- `[COMPLETAR: obra real y permiso para mostrarla]`
- `[COMPLETAR: requisitos finales de Apex]`
