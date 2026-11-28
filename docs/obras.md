# Relevamiento de obras reales (C2)

Objetivo: conseguir **3 a 5 obras reales** para la muestra/demo, con consentimiento de cada artista, fotos usables en mobile y datos económicos acordados. No crear `web/data/obras.json` hasta tener las obras reales: en cuanto ese archivo existe, la web deja de usar los mocks y `scripts/deploy.sh` lo toma para crear subastas nuevas.

## 1. Ficha que hay que pedir por obra

Pedí exactamente estos campos de la interfaz I2. Los nombres no se traducen ni se renombran.

| Campo | Qué pedir | Validación real |
|---|---|---|
| `slug` | Identificador corto de la obra | Minúsculas, números y guiones; formato `^[a-z0-9]+(?:-[a-z0-9]+)*$`; sin repetidos |
| `titulo` | Título de la obra | Texto no vacío |
| `artista` | Nombre público de la artista/autoría | Texto no vacío |
| `tecnica` | Técnica/material | Texto no vacío |
| `medidas` | Medidas tal como se muestran en sala | Texto no vacío |
| `anio` | Año de creación | Número entero |
| `descripcion` | Texto corto para ficha mobile | String; la web lo admite vacío, pero conviene pedir 1–3 líneas reales |
| `imagen` | Ruta pública de la foto | Debe empezar con `/`; usar `/obras/<slug>.jpg` |
| `precioMinimoUsdc` | Base mínima de la puja en USDC | Número positivo, máximo 7 decimales para el deploy |
| `incrementoMinimoUsdc` | Paso mínimo entre ofertas | Número positivo, máximo 7 decimales para el deploy |
| `porcentajeArtista` | Porcentaje para la artista | Entero entre 0 y 100 para el deploy; el resto va al espacio |
| `cierre` | Fecha/hora de cierre | ISO 8601 con offset `-03:00`, por ejemplo `2026-11-28T20:00:00-03:00`; si no se usa `CIERRE_MINUTOS`, tiene que estar en el futuro al deploy |

Reglas de conjunto: el archivo es un array JSON; para el deploy no puede estar vacío; no puede haber slugs repetidos; la web valida el formato en `web/lib/data.ts` y el build falla si algo no cumple.

## 2. Consentimiento de la artista

Texto corto sugerido para enviar y guardar respuesta afirmativa:

> Autorizo a mostrar la obra `[COMPLETAR: título]` en la demo de Artemi durante la hackathon Sin Coordenadas, incluyendo foto, título, técnica, medidas, año, descripción y mi nombre público. Entiendo que la subasta se publica en Stellar Testnet con USDC de prueba y que no constituye una venta real ni genera obligación de entregar la obra `[COMPLETAR si el equipo decide venta real]`.

Guardar como evidencia: captura o copia de la autorización, fecha, nombre de contacto y aclaración final sobre venta real o no. No inventar autorizaciones ni subir datos de una obra sin consentimiento explícito.

## 3. Fotos

- Formato recomendado: JPG con orientación vertical u horizontal corregida.
- Tamaño recomendado para mobile: lado largo alrededor de 1600 px y archivo liviano; como guía práctica, apuntar a menos de 500 KB por imagen.
- Recorte: que la obra ocupe casi todo el cuadro, con buena luz y sin datos personales o carteles innecesarios.
- Nombre obligatorio dentro del repo: `web/public/obras/<slug>.jpg`.
- En `obras.json`, el campo `imagen` correspondiente debe ser `/obras/<slug>.jpg`.

Si una obra no tiene buena foto, es mejor pedir otra antes de publicarla: la ficha mobile depende casi por completo de esa imagen.

## 4. Cómo acordar precio mínimo, incremento y reparto

1. Preguntar a la artista un precio mínimo razonable para la demo y dejarlo como `precioMinimoUsdc`.
2. Elegir un `incrementoMinimoUsdc` que haga visible la puja pero no la corte demasiado rápido; como regla de demo, pequeño respecto del precio mínimo.
3. Acordar `porcentajeArtista` por escrito. El contrato convierte ese número a base 10000 (`80` = 8000 bps); el complemento va al espacio y el redondeo va a la artista.
4. Acordar un mismo `cierre` para toda la muestra si la demo es simultánea, usando hora de Argentina con `-03:00`. Si falta mucho para el deploy, se puede usar `CIERRE_MINUTOS` en el script, pero el JSON igualmente debe tener un cierre válido.

## 5. Pasos para publicar las obras reales

1. En una rama, armar `web/data/obras.json` con las fichas reales y agregar las fotos en `web/public/obras/<slug>.jpg`. Todavía no mergear.
2. Avisar a G1 para correr el deploy con ese archivo **antes de mergear**:

   ```bash
   OBRAS_FILE=web/data/obras.json bash scripts/deploy.sh
   ```

   Como el archivo ya existe en la rama, `bash scripts/deploy.sh` también lo toma; `OBRAS_FILE` existe en `scripts/deploy.sh`. El deploy crea un contrato nuevo, corre `create_auction` por cada obra y regenera `web/data/deploy.testnet.json` con el mapping `slug -> auction id`.
3. En el **mismo PR** tienen que ir juntos: `web/data/obras.json`, `web/public/obras/*.jpg`, el `web/data/deploy.testnet.json` regenerado y el contract ID nuevo actualizado en `README.md` y `docs/entrega.md`. No mergear `obras.json` solo: si no, la web muestra obras reales pero sigue apuntando al contrato viejo con los slugs de ejemplo.
4. Verificar el build con los dos archivos de datos reales:

   ```bash
   cd web
   npm run build
   ```

5. Recién ahí mergear y avisar a G2 para redeploy en Vercel; si cambiaron slugs, reimprimir los QRs.

Más detalles operativos en `scripts/README.md` y `scripts/deploy.sh`.

## 6. Plantilla JSON de una obra

Reemplazá todos los valores; no copiar tal cual:

```json
{
  "slug": "completar-slug",
  "titulo": "COMPLETAR título",
  "artista": "COMPLETAR nombre público",
  "tecnica": "COMPLETAR técnica",
  "medidas": "COMPLETAR medidas",
  "anio": 2025,
  "descripcion": "COMPLETAR descripción corta para la ficha.",
  "imagen": "/obras/completar-slug.jpg",
  "precioMinimoUsdc": 50,
  "incrementoMinimoUsdc": 5,
  "porcentajeArtista": 80,
  "cierre": "2026-11-28T20:00:00-03:00"
}
```

`web/data/obras.json` final debe ser un array con 3–5 objetos como este, no un objeto suelto.
