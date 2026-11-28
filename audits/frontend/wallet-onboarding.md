# Auditoría frontend — wallet y onboarding

## 1) Resumen

El recorrido ya resuelve lo más difícil: entrada sin instalar nada, passkeys con PRF, fallback por dispositivo, wallets externas y preparación automática en Testnet.
La experiencia actual mezcla dos modelos mentales sin explicarlos: passkey/dispositivo se prepara solo, mientras Albedo/Varial exige completar manualmente Friendbot, trustline y faucet.
Los mayores riesgos son de confianza: una preparación fallida puede terminar en “¡Listo!” y una oferta iniciada como “Conectar y ofertar” puede enviarse detrás del modal de éxito sin una confirmación final clara.
En mobile el sheet no implementa todavía las garantías básicas de un modal (scroll propio, bloqueo del fondo, safe area, cancelación razonable e inert/aislamiento del resto de la página).
La próxima fase debería priorizar claridad de estados y consentimiento antes de invertir en tipografía o animaciones decorativas; el motion útil está en transiciones de paso, firma, espera y éxito.

## 2) Estado actual

### Recorrido completo, paso a paso

1. **Entrada por QR o home.** La ficha `/obra/[slug]` y la muestra se pueden mirar sin wallet; la conexión aparece en el header y también dentro del formulario de oferta (`web/app/layout.tsx:69`, `web/components/auction/bid-form.tsx:178-184`).
2. **`connect()` abre el diálogo.** El provider resetea estado, abre `LoginDialog` y marca `connecting=true` antes de que la persona elija una opción (`web/components/wallet-provider.tsx:172-184`).
3. **Elección de cuenta.** Si WebAuthn/PRF parece disponible, el camino principal es crear una cuenta o entrar con huella/Face ID; si no, se ofrece cuenta local en este dispositivo. Siempre aparece una salida a wallet externa (`web/components/wallet/login-dialog.tsx:146-201`).
4. **Passkey nueva o existente.** `createPasskeyWallet`/`loginPasskeyWallet` derivan una keypair Stellar desde PRF y guardan solo la sesión pública en `localStorage` (`web/lib/passkey-wallet.ts:164-225`, `web/lib/passkey-wallet.ts:228-249`).
5. **Cuenta en este dispositivo.** El fallback crea o reutiliza una keypair guardada completa en el navegador (`web/lib/passkey-wallet.ts:251-270`).
6. **Preparación automática para passkey/dispositivo.** `finishLocalLogin` llama a `prepareAccount`: activación Friendbot, trustline USDC y faucet hasta 200 USDC; el modal muestra tres pasos (`web/components/wallet-provider.tsx:199-237`, `web/lib/onboarding.ts:238-288`, `web/components/wallet/login-dialog.tsx:33-37`).
7. **Camino externo.** Albedo/Varial se abren con Stellar Wallets Kit; cuando conecta, el modal propio se cierra y no hay preparación automática (`web/components/wallet-provider.tsx:287-309`, `web/lib/wallet.ts:11-23`).
8. **Onboarding manual en `/empezar`.** La página server valida `obra` y delega al stepper client (`web/app/empezar/page.tsx:17-22`). El stepper muestra: entrar, activar cuenta, habilitar USDC, recibir 200 USDC y listo (`web/components/onboarding/onboarding-stepper.tsx:228-388`).
9. **Lectura de estado real.** El sidebar consulta Horizon y muestra cuenta activa, trustline y saldo, con botón de relectura (`web/components/onboarding/onboarding-stepper.tsx:392-446`, `web/lib/onboarding.ts:93-111`).
10. **Vuelta a la obra.** Al terminar el paso 4 aparecen links a la muestra y, si venía en querystring, a `/obra/[slug]` (`web/components/onboarding/onboarding-stepper.tsx:364-388`).

### Estados relevantes ya implementados

| Estado | Qué hace hoy |
|---|---|
| Sin wallet | Paso 1 visible como “EN CURSO”; pasos 2–4 con CTA deshabilitado (`web/components/onboarding/onboarding-stepper.tsx:106-116`, `web/components/onboarding/onboarding-stepper.tsx:248-354`). |
| Elección de login | Sheet mobile con passkey/dispositivo y wallet externa (`web/components/wallet/login-dialog.tsx:146-201`). |
| Passkey cancelada | Error “Cancelaste la huella o el PIN.” con “Probar de nuevo” y “Cerrar” (`web/lib/passkey-wallet.ts:290-298`, `web/components/wallet/login-dialog.tsx:255-285`). |
| PRF/navegador no soportado | Fuerza fallback de dispositivo en la próxima elección (`web/components/wallet-provider.tsx:241-256`). |
| Preparación automática | Steps fund/trustline/usdc con puntos animados (`web/components/wallet/login-dialog.tsx:205-227`). |
| Error de preparación | `finishLocalLogin` lo captura, arma un mensaje y aun así muestra `success` (`web/components/wallet-provider.tsx:209-236`). |
| External cerrado | Si el kit devuelve exactamente “The user closed the modal.” vuelve a `choice` sin error (`web/components/wallet-provider.tsx:48-54`, `web/components/wallet-provider.tsx:300-305`). |
| Friendbot/manual | Mensajes de paso, error inline y relectura de estado (`web/components/onboarding/onboarding-stepper.tsx:137-206`). |
| Faucet rate-limited | API devuelve 429 con `Retry-After`, pero el cliente solo muestra el texto general (`web/app/api/faucet/route.ts:163-167`, `web/lib/onboarding.ts:197-217`). |
| Éxito completo | Paso 4 muestra saldo grande y paso 5 habilita volver a muestra/obra (`web/components/onboarding/onboarding-stepper.tsx:330-388`). |

### Verificación realizada

Revisión estática de los archivos indicados y prueba renderizada con Chromium/Playwright en viewport mobile `390×844` y landscape/short `640×360` contra `/empezar` en el servidor local entonces activo. No se enviaron transacciones ni se modificó código. Hallazgos dinámicos concretos: con el modal abierto la página de fondo siguió scrolleando (`window.scrollY` pasó de 348 a 648 con wheel); en landscape el sheet medía `y=-9.15`, alto `397.5` y bottom `388.35` dentro de viewport `360`, sin `overflowY` interno (`visible`); al cancelar una passkey mockeada, las únicas acciones de error fueron “Probar de nuevo” y “Cerrar”.

## 3) Hallazgos ordenados por severidad

### Alta

1. **El cierre del login confunde éxito, preparación incompleta y navegación.**
   - Ubicación: `web/components/wallet-provider.tsx:186-189`, `web/components/wallet-provider.tsx:209-236`, `web/components/wallet/login-dialog.tsx:230-251`.
   - Problema concreto: si `prepareAccount` falla en Friendbot, trustline o faucet, el catch convierte el problema en `finalMessage`, pero igualmente cambia a `stage="success"`; la vista de éxito oculta el detalle de progreso/error y muestra el titular “¡Listo!”. Además, aunque todo salga bien, el botón “Entrar a la muestra” solo ejecuta `onClose`: no navega a la muestra ni completa `/empezar`.
   - Impacto: la persona puede creer que ya tiene cuenta, trustline y saldo cuando falta alguno; o tocar una CTA que promete llevarla a la muestra y quedarse en el mismo lugar. Descubre el problema recién al intentar ofertar, en el momento de mayor presión.
   - Recomendación: agregar un estado `partial`/`warning` visualmente distinto de éxito, conservar los steps con el paso fallido y usar CTA “Completar en Empezar” o “Reintentar preparación”. Reservar “¡Listo!” para `fund+trustline+usdc` verificados; en éxito real, la CTA debe navegar al destino correcto o llamarse simplemente “Continuar”.

2. **La primera oferta puede firmarse y enviarse detrás del modal de login.**
   - Ubicación: `web/components/auction/bid-form.tsx:72-98`, `web/components/wallet-provider.tsx:233-238`, `web/lib/passkey-wallet.ts:275-288`.
   - Problema concreto: `connect()` se resuelve apenas `finishLocalLogin` termina, antes de que la persona cierre o confirme el modal de éxito. Si el flujo venía de “Conectar y ofertar”, `handleSubmit` continúa inmediatamente con `placeBid`; con passkey/dispositivo la keypair ya está en memoria y `signWithLocalKeypair` firma sin una nueva confirmación visible.
   - Impacto: aunque sea Testnet, la persona puede no entender que ya depositó USDC; el momento de consentimiento económico queda mezclado con el alta de cuenta.
   - Recomendación: separar “conectar/preparar” de “ofertar”: después del primer alta volver a una pantalla de revisión y exigir un segundo toque explícito. Como mínimo, resolver `connect()` solo después del cierre/acknowledgement del success y no continuar la transacción original automáticamente.

3. **El camino externo abre dos modales superpuestos.**
   - Ubicación: `web/components/wallet-provider.tsx:287-309`, `web/components/wallet/login-dialog.tsx:205-227`, `web/lib/wallet.ts:13-22`.
   - Problema concreto: al elegir wallet externa el diálogo propio queda abierto en `working` (“Abriendo Albedo o Freighter…”) mientras `kit.authModal()` monta otro selector encima. Además el copy promete “Albedo o Freighter”, pero los módulos configurados son Albedo y Varial.
   - Impacto: el camino pensado para jurado/usuarios sin passkey se siente inestable y jerárquicamente confuso; también complica foco, lectores de pantalla y cierre por Escape al tener dos capas modales.
   - Recomendación: convertir la elección externa en una transición de un solo modal: ocultar/minimizar el contenido propio mientras el kit esté activo o integrar el estado del kit dentro del mismo shell. Garantizar un único `aria-modal` visible y corregir naming a “Albedo o Varial”/“otra wallet”.

4. **El sheet mobile no tiene scroll propio, safe area ni bloqueo del fondo.**
   - Ubicación: `web/components/wallet/login-dialog.tsx:66-101`, `web/components/wallet/login-dialog.tsx:108-123`.
   - Problema concreto: el efecto gestiona teclado pero no `overflow` del body ni `inert`; el contenedor no tiene `max-height`, `overflow-y`, `overscroll-behavior` ni padding con `env(safe-area-inset-bottom)`. En prueba, el fondo siguió scrolleando y en landscape el sheet salió por arriba/abajo del viewport.
   - Impacto: en celulares bajos, landscape o con barras del navegador, botones como “Usar Albedo o Freighter” pueden quedar inaccesibles; la página moviéndose detrás rompe la sensación de modal y puede esconder el contexto.
   - Recomendación: implementar drawer/sheet con `max-h: calc(100dvh - safe-area)`, scroll interno, `overscroll-behavior: contain`, padding inferior de safe-area y scroll lock del documento. Evaluar `<dialog>` nativo o una primitiva accesible ya probada.

5. **Durante estados ocupados no hay cancelación, Escape ni feedback de timeout.**
   - Ubicación: `web/components/wallet/login-dialog.tsx:63-80`, `web/components/wallet/login-dialog.tsx:108-115`, `web/components/wallet/login-dialog.tsx:132-143`, `web/lib/onboarding.ts:117-127`.
   - Problema concreto: en `working`/`preparing` se bloquea Escape, el backdrop y el botón cerrar desaparece. No hay “cancelar”, elapsed time ni distinción entre esperar al usuario, esperar Friendbot/faucet y esperar red.
   - Impacto: si Testnet o la wallet demora, la persona queda atrapada en un modal sin saber si debe actuar; puede cerrar la pestaña o repetir acciones.
   - Recomendación: diferenciar fases cancelables (lectura, faucet, Friendbot) de no cancelables (firma/envío ya iniciado), mostrar copy específico y agregar timeouts con reintento. Si no se puede cancelar una etapa, explicarlo y dar salida segura sin romper la promesa de `connect()`.

6. **Passkey/dispositivo y wallet externa siguen dos modelos mentales distintos sin avisarlo.**
   - Ubicación: automático en `web/components/wallet-provider.tsx:199-237`; manual externo en `web/components/wallet-provider.tsx:287-309` y `web/components/onboarding/onboarding-stepper.tsx:254-362`.
   - Problema concreto: passkey/dispositivo ejecuta Friendbot+trustline+faucet automáticamente; external solo conecta y después la persona debe descubrir y ejecutar los pasos 2–4. El stepper no explica esta bifurcación.
   - Impacto: una persona con Albedo/Varial tiene más fricción y puede abandonar creyendo que “conectar” alcanzaba; una persona con passkey ve un checklist de cuatro pasos que en realidad ya se completó solo.
   - Recomendación: elegir una narrativa única. Opción A: preparar también wallets externas con consentimiento explícito. Opción B: mantener la diferencia pero anunciarla (“con huella lo hacemos por vos; con wallet externa te quedan 3 pasos”) y convertir el stepper en checklist de estado/resume, no en instrucciones universales.

### Media

7. **Cerrar el login sin conectar se muestra como error del paso 1.**
   - Ubicación: `web/components/wallet-provider.tsx:186-189`, `web/components/onboarding/onboarding-stepper.tsx:118-135`.
   - Problema concreto: `closeDialog` resuelve `null` y `handleConnect` transforma ese resultado en “No entraste todavía…” con estado de error.
   - Impacto: una cancelación voluntaria se percibe como fallo del usuario o de la app; el rojo agrega alarma innecesaria.
   - Recomendación: modelar cancelación como estado neutro (“Seguís sin entrar”) sin `error` ni rojo; guardar error solo para fallas reales.

8. **El stepper dice “cuatro pasos” pero muestra cinco tarjetas numeradas, y su estado de trabajo es engañoso.**
   - Ubicación: `web/components/onboarding/onboarding-stepper.tsx:219-225`, `web/components/onboarding/onboarding-stepper.tsx:228-388`, `web/components/onboarding/onboarding-stepper.tsx:111-116`, `web/components/onboarding/step-card.tsx:26-33`, `web/components/onboarding/step-card.tsx:96-98`, `web/components/wallet-provider.tsx:172-184`.
   - Problema concreto: la promesa es “Cuatro pasos”, pero “Listo para ofertar” también lleva número 5. `statusFor` devuelve “en curso” para el primer paso disponible aunque nadie haya iniciado nada; y `connect()` pone `connecting=true` apenas se abre el modal, por lo que la tarjeta puede mostrar spinner/“Procesando” mientras la persona todavía solo está mirando las opciones.
   - Impacto: la persona no sabe cuánto falta ni si la app ya está trabajando; la métrica de progreso pierde credibilidad y el fondo compite visualmente con el modal.
   - Recomendación: separar 4 acciones de una confirmación final sin número, o cambiar el copy a cinco pasos. Renombrar el estado disponible a “Siguiente”/“Te toca”, agregar progreso visible “1 de 4” y distinguir “modal abierto” de “operación realmente en curso”.

9. **El estado de error del login cierra caminos de recuperación.**
   - Ubicación: `web/components/wallet/login-dialog.tsx:255-285`, `web/lib/passkey-wallet.ts:290-298`.
   - Problema concreto: tras cancelar o fallar passkey solo quedan “Probar de nuevo” y “Cerrar”; desaparecen la opción externa y, salvo fallback forzado, la opción de dispositivo. El texto de PRF habla de “extensión PRF necesaria”, jerga técnica.
   - Impacto: una persona que canceló por miedo o cuyo autenticador no sirve tiene que entender que debe cerrar y volver a empezar para ver alternativas.
   - Recomendación: mantener siempre las alternativas en error (“probar otra vez”, “usar otra wallet”, “crear cuenta en este dispositivo” cuando aplique) y escribir causa+siguiente acción en español llano.

10. **La tranquilidad de “no es plata real” llega demasiado tarde o no llega.**
    - Ubicación: ausencia en la elección de login `web/components/wallet/login-dialog.tsx:146-201`; aviso solo lateral en `web/components/onboarding/onboarding-stepper.tsx:392-400`; helper de depósito en `web/components/auction/bid-form.tsx:155-162`.
    - Problema concreto: el modal pide huella/cuenta y habla de USDC antes de explicar claramente que todo ocurre en Testnet con saldo de prueba. Si la persona entra desde una obra, puede nunca pasar por el aside de `/empezar`.
    - Impacto: para alguien que nunca usó cripto, “depositar USDC” y una passkey suenan a riesgo financiero real; aumenta abandono.
    - Recomendación: poner un chip persistente en login y formulario de oferta: “Modo prueba: USDC sin valor real”. Explicar en una línea quién paga comisiones y que no se debita nada de una cuenta bancaria.

11. **Errores técnicos crudos pueden aparecer en la interfaz.**
    - Ubicación: `web/lib/onboarding.ts:338-340`, `web/lib/passkey-wallet.ts:290-298`, `web/components/wallet-provider.tsx:306-307`.
    - Problema concreto: el fallback concatena `error.message` directamente; passkey/external hacen lo mismo para errores desconocidos. Mensajes de Horizon, navegador o wallet pueden salir en inglés o con internals.
    - Impacto: el objetivo de español sin jerga se rompe justo en el momento de fallo; la persona no sabe qué hacer.
    - Recomendación: mapear errores desconocidos a una acción humana (“No pudimos conectarnos…”) y dejar el detalle en consola/logging. Extender la tabla de errores frecuentes antes de exponer raw text.

12. **Mientras se lee Testnet, valores por defecto se muestran como si fueran reales.**
    - Ubicación: estado inicial en `web/components/onboarding/onboarding-stepper.tsx:43-50`, lectura en `web/components/onboarding/onboarding-stepper.tsx:63-104`, render en `web/components/onboarding/onboarding-stepper.tsx:409-423`.
    - Problema concreto: antes de completar la primera lectura, `emptyOnboardingAccountState` produce “Cuenta activa: Todavía no”, “USDC habilitado: Todavía no” y “0 USDC”; el único indicador de carga es un punto ocre pequeño.
    - Impacto: la UI puede afirmar falsamente que la cuenta no existe o no tiene fondos durante varios segundos, induciendo pasos repetidos.
    - Recomendación: no renderizar esos valores hasta la primera respuesta; usar skeleton/“Leyendo estado…” por fila y mantener el último estado conocido con timestamp si hubo lectura previa.

13. **La passkey se crea con un nombre de usuario aleatorio y técnico.**
    - Ubicación: `web/lib/passkey-wallet.ts:168-179`.
    - Problema concreto: `user.name` es `visitante-<randomBase64url>` aunque `displayName` sea “Visitante de RematArte”. Muchos autenticadores muestran `name` en la UI del sistema.
    - Impacto: la persona ve una credencial irreconocible y sospechosa; si crea más de una, no sabe cuál corresponde a la muestra.
    - Recomendación: usar un nombre reconocible y estable a nivel UX (por ejemplo “RematArte · visitante”) conservando `user.id` aleatorio como handle único. Verificar en iOS/Android/Windows qué campo se muestra.

14. **El fallback de dispositivo comunica la pérdida, pero no ofrece ninguna red de seguridad.**
    - Ubicación: `web/lib/passkey-wallet.ts:251-270`, `web/components/wallet/login-dialog.tsx:157-160`.
    - Problema concreto: la secret completa vive en `localStorage` y el único resguardo es un párrafo pequeño durante la elección. No hay recordatorio posterior, copia de dirección, recuperación ni sugerencia de external.
    - Impacto: si la persona borra datos del navegador o vuelve desde otro dispositivo, pierde acceso a saldo/ofertas/reembolsos de prueba; el soporte no podrá recuperarla.
    - Recomendación: hacer persistente el aviso en success/header para cuentas `device`, ofrecer “usar wallet externa” como alternativa visible y documentar que es solo demo. No cambiar el modelo de almacenamiento sin revisión de seguridad.

15. **El fondo del modal no queda inerte y hay un botón invisible de cierre en el árbol de accesibilidad.**
    - Ubicación: backdrop en `web/components/wallet/login-dialog.tsx:108-116`; trap manual en `web/components/wallet/login-dialog.tsx:74-101`.
    - Problema concreto: el overlay completo es un `<button>` invisible focusable con `aria-label`, además del botón visible de cerrar. No se aplica `inert`/`aria-hidden` al resto de la página; el trap solo intercepta Tab cuando el foco está en extremos del diálogo.
    - Impacto: lectores de pantalla pueden encontrar un control invisible duplicado y contenido de fondo; foco programático o navegación virtual puede escapar del modal.
    - Recomendación: hacer el backdrop no focusable (`tabIndex={-1}`/`aria-hidden` o elemento no interactivo), aplicar `inert` a siblings o usar una primitiva modal que lo resuelva, y probar con teclado/lector.

16. **El rate limit del faucet conoce el tiempo de espera, pero la UI lo descarta.**
    - Ubicación: API en `web/app/api/faucet/route.ts:163-167`; cliente en `web/lib/onboarding.ts:197-217`.
    - Problema concreto: el servidor devuelve `retryAfterSeconds` y header `Retry-After`, pero `requestUsdcFaucet` solo conserva el mensaje de error.
    - Impacto: la persona reintenta a ciegas, recibe otro 429 y cree que el faucet está roto.
    - Recomendación: propagar `retryAfterSeconds` al error de cliente, mostrar “podés reintentar en N s” y deshabilitar el botón con countdown hasta ese momento.

17. **Los CTAs deshabilitados parecen acciones principales disponibles.**
    - Ubicación: clases compartidas en `web/components/onboarding/onboarding-stepper.tsx:23-26`; usos en `web/components/onboarding/onboarding-stepper.tsx:268-278`, `web/components/onboarding/onboarding-stepper.tsx:308-318`, `web/components/onboarding/onboarding-stepper.tsx:346-359`.
    - Problema concreto: los botones de pasos futuros mantienen fondo malbec grande aunque estén deshabilitados; la opacidad no basta en mobile y compiten con el único paso realmente accionable. Además el primer “Entrar” ocupa menos ancho que los demás.
    - Impacto: la persona toca botones muertos y no entiende si la app responde; la jerarquía de la lista se vuelve ruidosa.
    - Recomendación: para pasos bloqueados usar estilo outline/muted o reemplazar CTA por texto “Se habilita después del paso N”; mantener un solo CTA primario fuerte por viewport y ancho consistente en mobile.

18. **Estados y metadatos del onboarding usan colores de texto pequeño por debajo de AA.**
    - Ubicación: tokens en `web/app/globals.css:10-16`, `.etiqueta` en `web/app/globals.css:59-65`; badges en `web/components/onboarding/step-card.tsx:96-98`, saldo/estado lateral en `web/components/onboarding/onboarding-stepper.tsx:405-425`.
    - Problema concreto: `piedra` sobre papel mide ~3.57:1 y `ocre` ~3.04:1; se usan en labels de 11–12 px, estados y textos auxiliares.
    - Impacto: “Pendiente”, “En curso”, avisos y estado real se vuelven difíciles de leer con luz de sala o en pantallas de gama baja.
    - Recomendación: adoptar los tokens semánticos más oscuros ya propuestos en la auditoría visual y verificar contraste en badges específicos del stepper; no depender solo del color para estados.

19. **El texto “Se abre tu wallet para confirmar” no describe el camino passkey/dispositivo.**
    - Ubicación: `web/components/onboarding/onboarding-stepper.tsx:315-318`, firma local en `web/lib/passkey-wallet.ts:275-288`.
    - Problema concreto: para passkey/dispositivo la firma puede ocurrir localmente sin que se abra una wallet visible; para external sí aparece una wallet.
    - Impacto: la persona espera una ventana que nunca aparece o no entiende por qué el paso avanzó solo.
    - Recomendación: adaptar copy según `walletKind`: “Lo firmamos con la cuenta de este dispositivo/passkey” vs “Se abre tu wallet para confirmar”.

### Baja

20. **El foco inicial cae en “Cerrar” y los cambios de etapa no tienen una estrategia de foco propia.**
    - Ubicación: `web/components/wallet/login-dialog.tsx:71-72`, `web/components/wallet/login-dialog.tsx:132-143`, `web/components/wallet/login-dialog.tsx:205-287`.
    - Problema concreto: al abrirse se enfoca el primer botón dentro del diálogo, que es el cierre; al pasar a working/success/error el contenido cambia pero el foco no se mueve a un encabezado/acción principal ni se define restauración según contexto.
    - Impacto: usuarios de teclado empiezan en una acción de salida y pueden perder el hilo cuando aparece un error o éxito.
    - Recomendación: enfocar el contenedor del diálogo o el CTA primario según etapa; en error enfocar/acentuar la acción de recuperación y mantener `aria-live` como respaldo.

21. **El handle visual sugiere arrastrar para cerrar, pero el sheet no responde a gestos.**
    - Ubicación: `web/components/wallet/login-dialog.tsx:124`.
    - Problema concreto: la barra superior tipo bottom-sheet es solo decorativa; no hay drag/swipe ni feedback.
    - Impacto: en mobile la persona intenta deslizar y nada ocurre, justo en un componente que debería sentirse nativo.
    - Recomendación: implementar swipe-to-close solo cuando no esté busy, o quitar el handle. Si se implementa, agregar alternativa por botón/Escape y respetar reduced motion.

22. **Los íconos que indican tipo de wallet no exponen texto accesible confiable.**
    - Ubicación: `web/components/connect-wallet-button.tsx:8-31`, uso en `web/components/connect-wallet-button.tsx:49-54`.
    - Problema concreto: los SVG usan `aria-label` pero no `role="img"` ni texto visually-hidden; según lector/browser ese nombre puede no anunciarse. Visualmente solo se ve un ícono y dirección cortada.
    - Impacto: la persona no sabe si entró con passkey, dispositivo o external; eso importa porque los siguientes pasos y la persistencia son distintos.
    - Recomendación: agregar texto visible o `sr-only` (“Cuenta con huella”, “Cuenta en este dispositivo”, “Wallet externa”) y tooltip/details al tocar.

23. **Las microinteracciones actuales no explican cambio de estado.**
    - Ubicación: animación genérica del diálogo en `web/components/wallet/login-dialog.tsx:122`, lista de progreso en `web/components/wallet/login-dialog.tsx:205-227`, tarjeta con solo `transition-colors` en `web/components/onboarding/step-card.tsx:87-90`.
    - Problema concreto: se usa el mismo `aparecer` para entrar; los steps cambian instantáneamente de running/done/error y el check de éxito aparece sin coreografía. `latido` es infinito y no diferencia espera activa de simple decoración.
    - Impacto: la interfaz se mueve, pero el movimiento no enseña qué cambió ni cuándo la persona debe actuar.
    - Recomendación: diseñar 4 microinteracciones específicas: sheet sube desde abajo una sola vez, step running→done con check/scale corto, error con pequeño desplazamiento de la tarjeta afectada, success final con confirmación única. Animar solo transform/opacity y respetar reduced motion.

## 4) Propuesta concreta para la fase de mejora

Reparto pensado para 4 personas sin pisar archivos dentro de esta área. La coordinación clave es acordar antes los nombres de estados/copy; la lógica criptográfica y on-chain queda fuera.

### Persona A — shell accesible del modal y microinteracciones

Archivos permitidos: `web/components/wallet/login-dialog.tsx` y, si hace falta, un nuevo helper propio en `web/components/wallet/` (sin tocar provider).

1. Convertir el sheet en modal usable: `max-height` con `dvh`, scroll interno, safe-area, scroll lock, `overscroll-behavior`, backdrop no focusable e `inert`/estrategia de aislamiento.
2. Definir foco inicial y foco por etapa (choice/working/success/error/partial) y probar Tab/Escape en desktop+mobile.
3. Implementar animaciones específicas de entrada/salida del sheet y transiciones running→done/error/success con `prefers-reduced-motion`.
4. Resolver swipe-to-close real o quitar el handle; añadir cancelación visual cuando la etapa lo permita.

### Persona B — sesión, consentimiento y camino externo

Archivos permitidos: `web/components/wallet-provider.tsx`, `web/lib/passkey-wallet.ts`, `web/lib/wallet.ts`, `web/components/connect-wallet-button.tsx`.

1. Separar éxito parcial de éxito completo y hacer que `connect()` no habilite una transacción antes del acknowledgement de la persona.
2. Rediseñar el handoff externo para que exista un solo modal visible; alinear copy Albedo/Varial y estado de retorno cuando se cierra el kit.
3. Mejorar copy de passkey/cancelación/PRF sin tocar derivación ni storage; revisar nombre mostrado en WebAuthn.
4. Agregar indicador accesible del tipo de wallet en `ConnectWalletButton` y aviso persistente para cuenta `device`.
5. Pruebas manuales: passkey cancelada, PRF no disponible, external cerrado, restauración de sesión.

### Persona C — stepper `/empezar`, progreso y claridad de estados

Archivos permitidos: `web/components/onboarding/onboarding-stepper.tsx`, `web/components/onboarding/step-card.tsx`, `web/app/empezar/page.tsx`, `web/app/empezar/loading.tsx`.

1. Corregir modelo de progreso: cuatro acciones + confirmación final no numerada, o copy de cinco pasos; renombrar “en curso” a “siguiente/te toca”.
2. Convertir cancelación en estado neutro, no error rojo; mejorar foco/scroll hacia el siguiente paso después de conectar external.
3. Implementar skeleton por fila para la primera lectura de estado y no mostrar falsos “Todavía no”/`0 USDC`.
4. Rediseñar CTAs bloqueados y jerarquía mobile; texto condicional según `walletKind` para firma.
5. Agregar chip persistente “modo prueba” y progreso “N de 4”.

### Persona D — errores, faucet y datos de recuperación

Archivos permitidos: `web/lib/onboarding.ts`, `web/app/api/faucet/route.ts` y nuevos archivos de prueba/documentación de errores si el equipo decide crearlos.

1. Tipar errores de onboarding con categoría + `retryAfterSeconds` opcional; no concatenar raw `error.message` en UI.
2. Propagar countdown del faucet hasta el cliente; ajustar API solo si hace falta enriquecer la respuesta de error.
3. Ampliar mapeo de errores frecuentes de Friendbot/Horizon/wallet con mensajes en español llano y acción siguiente.
4. Definir una matriz manual de prueba para: Friendbot 429/5xx, trustline cancelada, `op_low_reserve`, faucet 429, faucet sin configurar, RPC/Horizon caído.
5. Coordinarse con Persona C para consumir el error tipado sin editar sus archivos.

## 5) Riesgos: qué NO tocar porque rompe la lógica on-chain o de recuperación

- **No cambiar salts ni derivación PRF.** `SALT_INPUT`, `SEED_SUFFIX` y `deriveKeypair` determinan qué cuenta Stellar sale de una passkey (`web/lib/passkey-wallet.ts:20-24`, `web/lib/passkey-wallet.ts:69-84`). Cambiarlos crea otra cuenta y hace inaccesible la anterior.
- **No cambiar claves/schema de almacenamiento sin migración.** `rematarte.local-wallet` y `rematarte.device-wallet-secret` sostienen sesiones y fallback (`web/lib/passkey-wallet.ts:20-21`, `web/lib/passkey-wallet.ts:141-162`, `web/lib/passkey-wallet.ts:251-270`).
- **No debilitar la validación de network passphrase.** `signWithLocalKeypair` evita firmar fuera de Testnet (`web/lib/passkey-wallet.ts:275-288`).
- **No alterar la construcción/firma/envío de trustline.** `createUsdcTrustline` usa el asset configurado y la passphrase del deploy (`web/lib/onboarding.ts:156-183`); la mejora visual no debe cambiar operaciones ni orden.
- **No mover `USDC_DISTRIBUTOR_SECRET` al cliente ni saltear rate limit.** Vive solo en servidor y el rate limit evita abuso del faucet (`web/app/api/faucet/route.ts:93-101`, `web/app/api/faucet/route.ts:163-167`, `web/app/api/faucet/route.ts:191-197`).
- **No cambiar el objetivo de 200 USDC ni conversiones de stroops.** `ONBOARDING_TARGET_STROOPS` y las conversiones deben permanecer coherentes con 7 decimales (`web/lib/onboarding.ts:15`, `web/lib/onboarding.ts:79-91`).
- **No reordenar `prepareAccount` como efecto colateral visual.** La secuencia fund→trustline→usdc es dependiente: sin cuenta no hay trustline y sin trustline no hay pago (`web/lib/onboarding.ts:238-288`).
- **No convertir la oferta en silent-auto-submit al arreglar el modal.** `placeBid`/`signAndSend` deben quedar detrás de una acción económica explícita; no tocar `web/lib/auction.ts:332-356` durante esta fase salvo tests de regresión.
- **No cargar Stellar Wallets Kit en servidor.** El import dinámico existe porque el kit lee `window/localStorage` al importar (`web/lib/wallet.ts:10-12`); moverlo rompe SSR/hidratación.
- **No quitar avisos de Testnet ni hacerlos ambiguos.** Aunque se mejore el copy, la interfaz debe seguir dejando claro que no hay plata real (`web/components/onboarding/onboarding-stepper.tsx:392-400`).
