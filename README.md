# LDU Auto — generador automático de posts de Instagram

Genera y publica automáticamente posts de Instagram para **Liga Deportiva
Universitaria de Quito**: anuncio del próximo partido y resultado final de cada
partido, con un diseño minimalista/futurista propio para cada competición
(LigaPro, Libertadores, Sudamericana, Copa Ecuador, Supercopa Ecuador,
amistosos y otras competiciones).

## Cómo funciona

1. **Datos** — API pública de ESPN (gratuita, sin clave): fechas, estadios,
   ciudades, logos oficiales de ambos equipos, marcadores y estado del partido,
   en todas las competiciones configuradas ([src/config.js](src/config.js)).
2. **Detección de cambios** — [data/state.json](data/state.json) guarda qué se
   anunció y qué resultados ya se publicaron. En cada ejecución solo se generan
   posts si hay estado nuevo: un nuevo "próximo partido", un cambio de
   fecha/hora, o un partido recién finalizado.
3. **Render** — cada post es una plantilla HTML
   ([src/templates/post.js](src/templates/post.js)) renderizada a PNG
   1080×1350 con Playwright/Chromium. Tema visual por competición.
4. **Publicación** — Instagram Graph API oficial. Las imágenes se commitean al
   repo y se publican usando su URL pública `raw.githubusercontent.com`.
5. **Automatización** — GitHub Actions corre cada 30 minutos
   ([.github/workflows/ldu-posts.yml](.github/workflows/ldu-posts.yml)).

## Uso local

```bash
npm install
npx playwright install chromium

npm run samples    # renderiza posts de demo (14: fixture+resultado × 7 competiciones)
npm run generate   # pipeline real: ESPN → diff de estado → PNG + caption
```

Los posts quedan en `output/posts/` (PNG + caption `.txt`) y se encolan en
`data/pending.json` hasta ser publicados.

## Configuración de la publicación en Instagram

Requisitos: cuenta de Instagram **Business o Creator** vinculada a una página
de Facebook, y una app en [developers.facebook.com](https://developers.facebook.com)
con el permiso `instagram_content_publish`.

Secrets del repositorio (Settings → Secrets and variables → Actions):

| Secret | Valor |
| --- | --- |
| `IG_USER_ID` | ID de la cuenta profesional de Instagram |
| `IG_ACCESS_TOKEN` | Token de acceso de larga duración |

Variable opcional `IMAGE_BASE_URL` si prefieres servir las imágenes desde otro
host (por defecto se usa la URL raw del propio repo — el repo debe ser
**público** para que Instagram pueda descargar las imágenes).

Sin estos secrets el workflow sigue funcionando: genera y commitea los posts,
y los deja en cola para publicarse cuando se configuren las credenciales.

## Estructura

```
src/
  config.js          equipo, ligas ESPN, tipos de competición y hashtags
  espn.js            cliente ESPN + normalización de partidos
  state.js           estado persistente y planificación de posts
  templates/post.js  plantilla HTML 1080×1350 con temas por competición
  render.js          HTML → PNG con Playwright
  captions.js        captions en español por tipo de post y resultado
  publish.js         publicación vía Instagram Graph API
  samples.js         partidos de demo para previsualizar diseños
  index.js           orquestador (generate | publish | samples)
```
