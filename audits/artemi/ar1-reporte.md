# AR1 — sección Artistas

## Archivos modificados

- `web/app/artistas/page.tsx`
- `web/app/artistas/[slug]/page.tsx`
- `web/components/artistas/artista-marca.tsx`
- `web/components/artistas/artista-utils.ts`
- `web/components/artistas/artist-card.tsx`
- `web/components/artistas/artist-work-card.tsx`
- Capturas: `audits/artemi/ar1-artistas-{mobile,desktop,wide}.png` y `audits/artemi/ar1-artista-{mobile,desktop,wide}.png`

## Comparación punto por punto con `ref-artistas.png`

- Igual: etiqueta pequeña en versalitas bordó «QUIÉNES CREAN», título grande serif bordó «Artistas de la muestra» alineado a la izquierda y frase «Conocé a quienes están detrás de cada obra.» a la derecha en escritorio, cerrando con una línea fina bordó.
- Igual: grilla editorial de 3 columnas en escritorio dentro de `.contenedor`, sin tarjetas cerradas, fondos individuales, sombras ni esquinas redondeadas.
- Igual en estructura de cada perfil: retrato rectangular 4:3, nombre serif grande bordó, disciplina en negrita, bio breve, enlace subrayado bordó «Ver obras →» y dos miniaturas lado a lado que enlazan a `/obra/<slug>`.
- Igual: línea horizontal fina bordó al final del bloque; en mobile los perfiles se apilan y las miniaturas quedan en dos columnas.
- Igual en implementación, aunque invisible hoy: las líneas verticales bordó entre columnas empiezan en los datos del artista y no atraviesan retratos. Como hay una sola artista, no existen columnas vecinas y por eso no se ve ninguna.
- Difiere por datos: la referencia muestra tres artistas con retratos y obras reales; el sitio solo tiene «Artista de ejemplo». Elegí mantener esa única columna a la izquierda ocupando 1/3 del sistema de grilla, en vez de centrarla, para conservar la composición editorial de la referencia y no simular contenido inexistente.
- Difiere por datos: el retrato es un bloque crema oscuro con iniciales «AE» y la leyenda explícita «Retrato pendiente»; no se inventó fotografía.
- Difiere por datos: las dos miniaturas visibles usan la misma imagen porque todas las obras mock apuntan hoy a `/mocks/obra.svg`; no se deforman ni se estiran.
- Difiere intencionalmente: la leyenda «Propuesta visual · perfiles e imágenes de ejemplo» de la referencia es anotación del modelo y no se llevó a la UI. La referencia dice «Arte mí», pero la identidad correcta usada es «Artemi».

## Tratamiento provisional y contenido faltante

- Disciplina: derivada como «Pintura» porque las tres técnicas existentes son óleo, acrílico y acuarela. Si las técnicas fueran mixtas o no hubiera obras, se mostraría «Disciplina pendiente».
- El schema actual de `artistas` ya tiene `imagen?: string` con ruta `/...`, suficiente para retrato; falta cargar retratos reales en `artistas.json`.
- El schema no tiene disciplina. Cuando haya datos reales conviene agregar `disciplina` como string breve obligatorio o controlado (por ejemplo `z.string().min(1).max(60)`; idealmente un vocabulario acotado si la muestra lo define).
- Faltan más fichas reales de artistas, retratos, disciplinas curatoriales, biografías finales e imágenes reales/distintas de las obras.

## Verificación

- `npx tsc --noEmit`: pasó.
- `npm run lint`: pasó.
- `npm run build`: no ejecutado por instrucción del coordinador.
- Playwright contra el dev server compartido en `http://localhost:3000`: una captura por ruta y viewport, sin repetir capturas.
  - `/artistas`: 390×844, 1280×800, 1920×1080.
  - `/artistas/artista-de-ejemplo`: 390×844, 1280×800, 1920×1080.
- En las seis capturas: sin desbordamiento horizontal (`scrollWidth === clientWidth`), todas las imágenes completas y sin errores de consola.
- Accesibilidad revisada en código: navegación con `<Link>`, foco visible heredado, alt en imágenes, placeholder con `role="img"` y nombre accesible, contraste bordó/crema y jerarquía de encabezados.
