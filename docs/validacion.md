# Validación — RematArte

Kit operativo para **C1 — entrevistas** y **C4 — prueba con alguien de afuera**.

> Estado actual: todavía no hay entrevistas ni pruebas reales cargadas. Todo lo que dependa de salir a validar está marcado como `[COMPLETAR: ...]`. No reemplazar esos marcadores con supuestos: solo con observaciones, citas o datos reales.

## Antes de salir

- [ ] URL pública de la web: `[COMPLETAR: URL de Vercel cuando G2 la tenga]`.
- [ ] QR o link de la obra usada en la prueba: `[COMPLETAR: slug o URL exacta]`.
- [ ] Wallet que va a usar la persona: `[COMPLETAR: celu propio con wallet / wallet de demo]`.
- [ ] Wallet exacta soportada por la versión web a probar: `[COMPLETAR: Albedo / Varial / otra que confirme G2]`.
- [ ] Si se usa respaldo: identidad `demo1`, `demo2` o `demo3` (cada una tiene 500 USDC de prueba según el estado técnico actual). No compartir secret keys.
- [ ] Red: Stellar **Testnet**. El USDC usado es de prueba y no representa plata real.
- [ ] Contrato de subastas: `CDX6G3F5DS2NUFFXZJ5XQSFHPTG6EKXY5GONXKLFLPNW6U7SVEPZ2RLJ`.
- [ ] USDC de prueba: issuer `GDNQJIVKZNQTS4ZGH2W6VJPK4SQP4JIJR4YMWK7UHNOGQNYWN3F2BF3D`, SAC `CA7IN3NREHPGR2UPBIJX52T4KCXVZVMOCUWC2OBK3T6JXJDSR77WAQGV`.
- [ ] Subastas desplegadas de ejemplo: ids `0`, `1`, `2` (son obras de muestra, no reales).
- [ ] Referencia pública del contrato: [stellar.expert testnet](https://stellar.expert/explorer/testnet/contract/CDX6G3F5DS2NUFFXZJ5XQSFHPTG6EKXY5GONXKLFLPNW6U7SVEPZ2RLJ).

---

## 1. Hipótesis a validar

### H1 — El impago o la demora del ganador es un problema real

- **Hipótesis:** en remates informales de arte en Mendoza, quienes venden obra enfrentan con frecuencia ganadores que no pagan, pagan tarde o hay que perseguir.
- **Se confirma si:** al menos la mitad de las personas entrevistadas con experiencia directa cuenta un caso propio o cercano en los últimos dos años.
- **Se refuta si:** la mayoría dice que el cobro posterior a un remate informal casi nunca es un problema.
- **Resultado:** `[COMPLETAR: confirmada / refutada / incompleta + evidencia]`.

### H2 — La oferta depositada vale más que la fricción de usar wallet

- **Hipótesis:** artistas, talleres o espacios preferirían vender con la oferta ya depositada, incluso si eso implica usar una wallet, siempre que el proceso sea simple.
- **Se confirma si:** más de la mitad de las personas entrevistadas dice que lo probaría en una muestra real después de escuchar la explicación sin jerga.
- **Se refuta si:** la mayoría lo rechaza por la wallet, por USDC, por desconfianza o por complejidad.
- **Resultado:** `[COMPLETAR: confirmada / refutada / incompleta + evidencia]`.

### H3 — Una persona visitante puede ofertar desde el celu en menos de 5 minutos

- **Hipótesis:** una persona que no participó del desarrollo puede ir de escanear un QR a tener una oferta confirmada en menos de 5 minutos y sin ayuda del equipo.
- **Se confirma si:** la mayoría de las pruebas externas se completa en menos de 5 minutos, sin intervención del equipo; solo cuentan las pruebas hechas con el recorrido real de onboarding, no con una wallet de respaldo ya fondeada.
- **Se refuta si:** la mayoría necesita ayuda, abandona o supera los 5 minutos por fricción del producto.
- **Resultado:** `[COMPLETAR: confirmada / refutada / incompleta + evidencia]`.

### H4 — Se entiende qué pasa con la plata

- **Hipótesis:** después de ofertar, una persona puede explicar con sus palabras que su oferta quedó depositada, que se la devuelven si la superan y que al cierre se paga a la artista y al espacio.
- **Se confirma si:** la mayoría de las personas que participaron de la prueba explica correctamente los tres momentos sin ayuda.
- **Se refuta si:** la mayoría cree que la plata “desaparece”, no entiende el reembolso o no entiende cuándo se cobra la venta.
- **Resultado:** `[COMPLETAR: confirmada / refutada / incompleta + evidencia]`.

---

## 2. C1 — Guía de entrevista (10–15 minutos)

### A quién entrevistar

Artistas, talleres, rematadores o espacios culturales de Mendoza con experiencia vendiendo obra por remates, muestras, Instagram, comentarios, mano alzada o encargos informales.

### Consentimiento verbal (leer tal cual)

> Hola, soy `[COMPLETAR: nombre de quien entrevista]`, del equipo RematArte. Estamos probando una herramienta para mejorar el cobro de remates de arte y queremos aprender de tu experiencia, no venderte nada. La conversación dura unos 10–15 minutos. No vamos a publicar tu nombre ni citarte con identificación sin tu permiso. ¿Te parece bien empezar? ¿Podemos tomar notas y, si alguna frase nos resulta útil, citarla de forma anónima?

- Consentimiento: `[COMPLETAR: sí/no, notas sí/no, cita anónima sí/no]`.

### Reglas para no contaminar respuestas

- Primero preguntar por experiencias reales; recién después explicar RematArte.
- No decir “blockchain”, “contrato inteligente”, “escrow” ni “Stellar” durante la primera parte.
- No preguntar “¿no te molesta que no paguen?”: dejar que el problema aparezca solo.
- Anotar frases textuales entre comillas, aunque sean cortas.

### Preguntas

#### Perfil (1–2 min)

1. ¿A qué te dedicás y cómo te relacionás con la venta o muestra de obra?
2. ¿En qué tipo de ventas o remates participaste últimamente?

#### Experiencia real (5–7 min)

3. **Clave.** Contame cómo fue la última venta o remate de obra en la que participaste: cómo se organizó, cómo ofertó la gente y cómo se cobró.
4. **Clave.** Desde que alguien dijo “lo compro” o ganó, ¿qué pasó hasta que la plata estuvo cobrada?
5. **Clave.** ¿Qué partes de ese proceso te resultaron más difíciles, lentas o inciertas?
6. **Clave.** ¿Tuviste o viste alguna situación en la que una venta se demoró, se complicó o no se concretó? Contame la última que recuerdes.
7. Si pasó: ¿qué hiciste? ¿Cuánto tiempo, gestión o plata te costó resolverlo?
8. ¿Qué hacen hoy para reducir ese riesgo? ¿Seña, anticipo, transferencia inmediata, efectivo, tarjeta, conocer al comprador, otra cosa?
9. ¿Qué tipo de comprobante o garantía te da confianza para entregar una obra?

#### Reacción al concepto (4–5 min)

Leer estas dos frases, sin agregar explicación técnica:

> Es una forma de rematar obra donde cada oferta queda depositada al momento de ofertar. Si alguien ofrece más, la plata de la oferta anterior vuelve sola; al cierre, la artista y el espacio cobran automáticamente la parte acordada.

10. **Clave.** ¿Qué te parece? ¿Qué te gusta y qué te preocupa?
11. **Clave.** ¿Lo probarías en una próxima muestra o remate? ¿Por qué sí o por qué no?
12. ¿Cómo te cae la idea de usar una wallet desde el celu? ¿Qué te preocuparía?
13. ¿Cómo te cae la idea de recibir el pago en USDC? ¿Qué te preocuparía?
14. ¿Qué pensás sobre posibles comisiones o costos del sistema, aunque todavía no hablemos de números?
15. La entrega física de la obra se coordinaría aparte. ¿Eso te parece aceptable o es un problema?
16. ¿Qué tendría que pasar para que confíes lo suficiente como usarlo con una obra real?
17. ¿A quién más deberíamos entrevistar?

### Cierre

> Gracias. Si después queremos mostrar una cita tuya de forma anónima en la presentación, ¿podemos escribirte para confirmarla? `[COMPLETAR: sí/no + contacto permitido]`

---

## 3. Plantilla por entrevista (copiar una por persona)

### Entrevista `[COMPLETAR: número o código]`

- Fecha: `[COMPLETAR: fecha]`.
- Entrevistador/a: `[COMPLETAR: nombre]`.
- Rol de la persona: `[COMPLETAR: artista / taller / rematador / espacio / otro]`.
- Ciudad/zona: `[COMPLETAR: ciudad o zona]`.
- Canal: `[COMPLETAR: presencial / llamada / videollamada / mensajes]`.
- Relación con ventas/remates: `[COMPLETAR: experiencia directa breve]`.
- Consentimiento registrado: `[COMPLETAR: notas sí/no, cita anónima sí/no]`.

#### Respuestas clave

1. Último remate o venta: cómo se organizó y cómo se cobró  
   `[COMPLETAR: respuesta resumida]`
2. Qué pasó entre “lo compro” y el cobro efectivo  
   `[COMPLETAR: respuesta resumida]`
3. Problemas, demoras o ventas caídas  
   `[COMPLETAR: respuesta resumida]`
4. Costo de perseguir o resolver el cobro  
   `[COMPLETAR: respuesta resumida]`
5. Métodos actuales para reducir riesgo  
   `[COMPLETAR: respuesta resumida]`
6. Reacción al concepto de oferta depositada  
   `[COMPLETAR: respuesta resumida]`
7. Objeciones: wallet, USDC, comisiones, entrega física  
   `[COMPLETAR: respuesta resumida]`
8. ¿Lo probaría? ¿Por qué?  
   `[COMPLETAR: respuesta resumida]`

#### Citas textuales

- `[COMPLETAR: cita textual 1]`
- `[COMPLETAR: cita textual 2]`
- `[COMPLETAR: cita textual 3]`

#### Lectura contra hipótesis

| Hipótesis | Qué aportó esta entrevista | Confirma / refuta / no aplica |
|---|---|---|
| H1 — impago o demora | `[COMPLETAR: evidencia]` | `[COMPLETAR: resultado]` |
| H2 — aceptación aunque use wallet | `[COMPLETAR: evidencia]` | `[COMPLETAR: resultado]` |
| H3 — oferta en menos de 5 minutos | No aplica en C1; se valida en C4. | no aplica |
| H4 — entiende qué pasa con la plata | No aplica en C1; se valida en C4. | no aplica |

#### Hallazgos para llevar a “Hallazgos → cambios”

- `[COMPLETAR: hallazgo 1 o “sin hallazgo accionable”]`
- `[COMPLETAR: hallazgo 2 o “sin hallazgo accionable”]`

---

## 4. C4 — Protocolo de prueba con alguien de afuera

### Perfil buscado

- Una persona que **no haya participado del desarrollo** ni conocido el proyecto antes de la prueba.
- Idealmente visitante de una muestra o público general interesado en arte.
- Idealmente sin experiencia cripto. Si tiene experiencia, registrarla; no excluirla, pero no mezclar el resultado como si fuera equivalente.
- Idealmente usa su propio celular. La wallet de demo queda como respaldo si el recorrido real falla o no se puede instalar/crear una wallet en el momento.

### Roles del equipo

- Facilitador/a: `[COMPLETAR: nombre]`.
- Observador/a que anota tiempos y frases: `[COMPLETAR: nombre o “misma persona que facilita”]`.
- Segunda wallet para superar la oferta: `[COMPLETAR: identidad o cuenta usada]`.

### Consentimiento (leer tal cual)

> Estamos probando una aplicación para remates de arte y queremos observar cómo la usa alguien que no la conoce. No es una evaluación de vos: si algo no se entiende, el problema es del producto. Todo funciona en una red de prueba y no se usa plata real. Vamos a tomar notas de tiempos, errores y comentarios; no publicamos tu nombre. ¿Estás de acuerdo? ¿Podemos tomar capturas de pantalla o notas sin datos personales?

- Consentimiento: `[COMPLETAR: sí/no, capturas sí/no, notas sí/no]`.

### Setup previo del equipo

Hacerlo **antes** de llamar a la persona:

- [ ] Web disponible en: `[COMPLETAR: URL exacta]`.
- [ ] QR impreso o visible apuntando a: `[COMPLETAR: URL exacta de la ficha]`.
- [ ] Obra/subasta usada: `[COMPLETAR: slug y auction_id]`.
- [ ] Wallet de la persona definida: `[COMPLETAR: propia / demo1 / demo2 / demo3]`.
- [ ] Segunda wallet lista para superar la oferta: `[COMPLETAR: postor o demo usada]`.
- [ ] Monto sugerido de la oferta inicial: `[COMPLETAR: monto mostrado por la app]`.
- [ ] Forma de verificar el reembolso si la web todavía no lo muestra claramente: `[COMPLETAR: wallet / explorador / pantalla interna]`.
- [ ] Cronómetro listo.

### Reglas durante la prueba

- No explicar el producto antes de empezar.
- Usar esta única consigna:

  > Imaginá que estás en una muestra y ves esta obra. Escaneá este QR o abrí este link y hacé lo que harías si te interesara ofertar. Pensá en voz alta todo lo que puedas.

- No ayudar. Si la persona se traba, esperar 2 minutos antes de intervenir.
- Si hay que ayudar, anotar exactamente: en qué paso, qué se le dijo y por qué.
- No corregir interpretaciones hasta el final.
- Registrar frases textuales entre comillas.
- Si se usa una wallet de demo ya fondeada, marcar el paso “recibir USDC de prueba” como no aplica y no contar esa prueba como validación completa del onboarding.

### Tareas observadas

1. Escanear el QR o abrir el link y llegar a la ficha.
2. Explicar qué está viendo: obra, precio mínimo u oferta actual, incremento y cierre.
3. Conectar o crear wallet.
4. Recibir USDC de prueba.
5. Ofertar el monto mínimo sugerido.
6. Entender si la oferta quedó confirmada.
7. Que otra wallet supere la oferta y verificar que la plata de la persona volvió o quedó disponible para reclamar.

### Qué observar

- Dónde duda o se queda quieta la pantalla.
- Qué palabra usa para la wallet, el depósito, USDC y el reembolso.
- Si entiende que ofertar implica depositar.
- Si le preocupa no poder recuperar la plata.
- Errores de red, wallet, saldo, trustline, firma o interfaz. Anotar el texto exacto del error si aparece.
- Si la oferta entra faltando menos de 300 segundos, el contrato extiende el cierre a 300 segundos desde ese momento; registrar si esa extensión se entiende o confunde.
- Tiempos por paso y cantidad de intervenciones.

### Preguntas de cierre

1. **Clave.** Cuando ofertaste, ¿qué creés que pasó con tu plata?
2. **Clave.** Si otra persona ofrece más, ¿qué creés que pasa con tu plata?
3. **Clave.** Si ganás, ¿qué creés que pasa con esa plata al cierre?
4. ¿Qué parte te dio más desconfianza?
5. ¿Qué parte fue más fácil de lo esperado?
6. ¿Qué cambiarías antes de usarlo en una muestra real?
7. ¿Usarías algo así para una compra real? ¿Por qué?
8. En una escala de 1 a 5, ¿qué tan claro te quedó el recorrido?  
   1 = no entendí; 3 = entendí con ayuda; 5 = lo puedo explicar solo.

---

## 5. Plantilla de registro de prueba (copiar una por persona)

### Prueba `[COMPLETAR: número o código]`

- Fecha: `[COMPLETAR: fecha]`.
- Lugar/canal: `[COMPLETAR: presencial / remoto]`.
- Perfil: `[COMPLETAR: visitante, relación con arte, experiencia cripto sí/no/poca]`.
- Dispositivo: `[COMPLETAR: Android/iOS/modelo si se sabe]`.
- Wallet usada: `[COMPLETAR: propia/demo + tipo si se sabe]`.
- URL/QR usado: `[COMPLETAR: URL exacta]`.
- Obra/subasta: `[COMPLETAR: slug y auction_id]`.
- Duración total: `[COMPLETAR: mm:ss]`.
- Resultado global: `[COMPLETAR: completó solo / completó con ayuda / abandonó]`.

#### Tiempos y resultado por paso

| Paso | Tiempo | Resultado | Qué observamos |
|---|---:|---|---|
| Escanear QR/abrir ficha | `[COMPLETAR: mm:ss]` | `[COMPLETAR: solo/ayuda/no logró]` | `[COMPLETAR: observación]` |
| Entender la ficha | `[COMPLETAR: mm:ss]` | `[COMPLETAR: correcto/parcial/incorrecto]` | `[COMPLETAR: observación]` |
| Conectar o crear wallet | `[COMPLETAR: mm:ss]` | `[COMPLETAR: solo/ayuda/no logró]` | `[COMPLETAR: observación]` |
| Recibir USDC de prueba | `[COMPLETAR: mm:ss]` | `[COMPLETAR: solo/ayuda/no logró/no aplica]` | `[COMPLETAR: observación]` |
| Ofertar | `[COMPLETAR: mm:ss]` | `[COMPLETAR: solo/ayuda/no logró]` | `[COMPLETAR: observación]` |
| Entender confirmación | `[COMPLETAR: mm:ss]` | `[COMPLETAR: correcto/parcial/incorrecto]` | `[COMPLETAR: observación]` |
| Ser superada y verificar reembolso | `[COMPLETAR: mm:ss]` | `[COMPLETAR: correcto/parcial/incorrecto]` | `[COMPLETAR: observación]` |

#### Errores y trabas exactas

- `[COMPLETAR: error o traba 1, con texto exacto si hubo]`
- `[COMPLETAR: error o traba 2, con texto exacto si hubo]`
- `[COMPLETAR: error o traba 3, con texto exacto si hubo]`

#### Citas textuales

- `[COMPLETAR: cita textual 1]`
- `[COMPLETAR: cita textual 2]`
- `[COMPLETAR: cita textual 3]`

#### Respuestas de cierre

- Qué pasa con la plata al ofertar: `[COMPLETAR: respuesta resumida + si fue correcta]`.
- Qué pasa si la superan: `[COMPLETAR: respuesta resumida + si fue correcta]`.
- Qué pasa si gana y cierra la subasta: `[COMPLETAR: respuesta resumida + si fue correcta]`.
- Mayor desconfianza: `[COMPLETAR: respuesta]`.
- Qué cambiaría: `[COMPLETAR: respuesta]`.
- Claridad 1–5: `[COMPLETAR: número]`.

#### Lectura contra hipótesis

| Hipótesis | Qué aportó esta prueba | Confirma / refuta / no aplica |
|---|---|---|
| H3 — oferta en menos de 5 minutos | `[COMPLETAR: evidencia]` | `[COMPLETAR: resultado]` |
| H4 — entiende qué pasa con la plata | `[COMPLETAR: evidencia]` | `[COMPLETAR: resultado]` |

---

## 6. Hallazgos → cambios

Severidad sugerida:

- **Bloqueante:** la persona no puede completar la oferta o entender el reembolso.
- **Alta:** completa solo con ayuda o interpreta mal qué pasa con la plata.
- **Media:** completa, pero con dudas, demoras o desconfianza evitable.
- **Baja:** mejora de claridad, copy o detalle visual.

| ID | Fuente | Hallazgo real | Severidad | Hipótesis afectada | Cambio decidido/hecho | Grupo | Commit/PR | Estado |
|---|---|---|---|---|---|---|---|---|
| V-001 | `[COMPLETAR: C1/C4]` | `[COMPLETAR: qué trabó o qué se aprendió]` | `[COMPLETAR: bloqueante/alta/media/baja]` | `[COMPLETAR: H1/H2/H3/H4/varias]` | `[COMPLETAR: cambio decidido o hecho]` | `[COMPLETAR: G1/G2/G3]` | `[COMPLETAR: hash de commit o número/link de PR]` | `[COMPLETAR: pendiente/hecho/descartado]` |
| V-002 | `[COMPLETAR: C1/C4]` | `[COMPLETAR: qué trabó o qué se aprendió]` | `[COMPLETAR: bloqueante/alta/media/baja]` | `[COMPLETAR: H1/H2/H3/H4/varias]` | `[COMPLETAR: cambio decidido o hecho]` | `[COMPLETAR: G1/G2/G3]` | `[COMPLETAR: hash de commit o número/link de PR]` | `[COMPLETAR: pendiente/hecho/descartado]` |
| V-003 | `[COMPLETAR: C1/C4]` | `[COMPLETAR: qué trabó o qué se aprendió]` | `[COMPLETAR: bloqueante/alta/media/baja]` | `[COMPLETAR: H1/H2/H3/H4/varias]` | `[COMPLETAR: cambio decidido o hecho]` | `[COMPLETAR: G1/G2/G3]` | `[COMPLETAR: hash de commit o número/link de PR]` | `[COMPLETAR: pendiente/hecho/descartado]` |

---

## 7. Resumen para el pitch (5 líneas)

- Entrevistamos a `[COMPLETAR: cantidad]` artistas, talleres, rematadores o espacios culturales de Mendoza.
- `[COMPLETAR: cantidad]` contaron casos de impago, cobro demorado o ventas caídas; la frase más clara fue: “`[COMPLETAR: cita textual]`”.
- `[COMPLETAR: cantidad]` dijo que probaría una herramienta donde la oferta ya queda depositada; la objeción principal fue `[COMPLETAR: objeción]`.
- Probamos la app con `[COMPLETAR: cantidad]` personas externas; `[COMPLETAR: cantidad]` logró ofertar y el tiempo promedio hasta la oferta fue `[COMPLETAR: mm:ss]`.
- Lo que más trabó fue `[COMPLETAR: hallazgo]` y por eso cambiamos `[COMPLETAR: cambio concreto]`.
