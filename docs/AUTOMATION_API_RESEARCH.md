# Automation API research

Fecha de revision: 2026-07-06.

Objetivo: encontrar contenido adicional que se pueda automatizar para LDU Auto,
sin degradar la confiabilidad del feed ni publicar rumores o material con
riesgo de derechos.

## Estado actual del repo

El proyecto hoy usa la API publica no oficial de ESPN para:

- calendario de LDU por competicion;
- proximo partido;
- resultado final;
- estadio, ciudad, logos, marcador y estado del partido;
- publicacion en Instagram mediante Graph API.

Actualizacion 2026-07-07: parte de esta investigacion ya se implemento. El
repo ahora usa tambien `summary?event=<id>` para goleadores/racha y el endpoint
`https://site.api.espn.com/apis/v2/sports/soccer/ecu.1/standings` para la tabla
de LigaPro. La fila historica sobre `/ecu.1/standings` se conserva como nota de
la prueba original, no como descripcion del codigo actual.

Eso ya cubre el contenido mas seguro: fixture y resultado. Lo que falta es
contexto: tabla, racha, incidencias, previa, resumen y monitoreo de noticias.

## ESPN: endpoints probados

Base usada por el repo:

```txt
https://site.api.espn.com/apis/site/v2/sports/soccer
```

Endpoints probados con IDs reales de LDU:

| Endpoint | Resultado | Uso recomendado |
| --- | --- | --- |
| `/ecu.1/teams/4816/schedule` | OK, ya se usa. Trajo 17 eventos de LigaPro. | Mantener como fuente principal de fixture/resultados. |
| `/ecu.1/teams/4816` | OK. Trajo info de equipo y record `8-3-6`. | Tarjetas de record general o contexto de temporada. |
| `/ecu.1/scoreboard?dates=20260712` | OK. Trajo 3 partidos del dia. | "Hoy en LigaPro", agenda del dia o contexto de jornada. |
| `/ecu.1/summary?event=401859599` | OK. Trajo `keyEvents`, `boxscore`, `lastFiveGames`, `headToHeadGames`, `rosters`, `news`, `videos`, `standings`. | Mejor oportunidad ESPN-only. |
| `/ecu.1/summary?event=401859608` | OK para fixture futuro. Trajo previa parcial: forma, H2H, rosters, standings. | Previa automatica 24h antes. |
| `/ecu.1/news?limit=10` | OK, pero solo 4 noticias recientes y en ingles; poca relacion directa con LDU. | Solo monitoreo secundario, no autopost. |
| `/ecu.1/teams/4816/news?limit=10` | HTTP 200, pero cuerpo vacio. | No sirve para noticias de LDU. |
| `/ecu.1/standings` | HTTP 200, pero cuerpo vacio en la prueba. | Usar standings desde `summary?event=` o fallback externo. |
| `/ecu.1/teams` | OK. | Validacion de rivales/equipos. |
| `/conmebol.libertadores/news?limit=5` | OK, noticias de torneo, pero no necesariamente LDU. | Solo curacion/manual. |

Ejemplo util de `summary?event=401859599`: el evento de gol vino como
`Mateo Viera (Macara) Goal at 20'`, con `type: goal`, minuto, equipo y
participante. Esto alcanza para posts de "incidencias" o resumen breve sin
inventar datos.

### Automatizaciones ESPN recomendadas

1. **Resumen de incidencias post-partido**
   - Fuente: `summary?event=<id>`, campo `keyEvents`.
   - Contenido: goles, tarjetas, cambios relevantes, minuto.
   - Riesgo: bajo. Son datos estructurados del partido.
   - Frecuencia: despues del resultado, si hay al menos un gol o roja.

2. **Previa con racha y posicion**
   - Fuente: `summary?event=<id>` para fixture futuro.
   - Contenido: ultimos 5 de LDU, ultimos 5 del rival, posicion/puntos si
     `standings` viene poblado.
   - Riesgo: medio-bajo. Requiere normalizar bien `boxscore.form`.
   - Frecuencia: 12-24 horas antes del partido.

3. **Tabla / contexto de jornada**
   - Fuente primaria: `summary?event=<id>.standings`.
   - Fallback: ESPN web/FOX Sports solo como referencia visual/manual, no como
     scraping inicial.
   - Contenido: posicion de LDU, puntos, diferencia de gol, distancia a puestos
     clave.
   - Riesgo: medio. ESPN `/standings` directo vino vacio; conviene testear por
     competicion y usar fallback.

4. **Agenda LigaPro del dia**
   - Fuente: `/scoreboard?dates=YYYYMMDD`.
   - Contenido: partidos de la fecha, horarios Ecuador, destacar partido de
     Liga.
   - Riesgo: bajo.

5. **Radar de noticias ESPN**
   - Fuente: `/news?limit=N` por liga/torneo.
   - Contenido: links o stories con atribucion.
   - Riesgo: medio. La cobertura de Ecuador fue escasa y en ingles; no conviene
     autopostear como si fuera noticia local de LDU.

## APIs externas evaluadas

### API-Football

Fuente oficial: `https://www.api-football.com/coverage`

Hallazgos:

- Declara 1235 ligas/copas.
- Para Ecuador lista Copa Ecuador, Liga Pro, Liga Pro Serie B y Supercopa de
  Ecuador.
- La pagina de coverage muestra categorias de datos como fixtures, players,
  standings, events, lineups, statistics, predictions, odds y top scorers.
- No es una API de noticias; es una API de datos deportivos.

Encaje para este repo:

- Mejor candidato si se quiere pagar por datos mas completos de LigaPro.
- Serviria para top scorers, alineaciones, eventos, estadisticas, tabla y
  validacion cruzada de ESPN.
- Requiere secreto nuevo (`API_FOOTBALL_KEY`) y mapping de IDs de LDU/rivales.

Recomendacion: **buena opcion pagada para datos; no resuelve noticias**.

### Sportmonks

Fuentes oficiales:

- `https://www.sportmonks.com/football-api/`
- `https://www.sportmonks.com/football-api/football-news-api/`

Hallazgos:

- Football API ofrece schedules, historicos, eventos, lineups, live scores,
  standings, odds, predicciones, entrenadores/arbitros y widgets.
- El plan gratis sirve para probar con ligas muy concretas, no necesariamente
  Ecuador.
- El News API existe como add-on, pero su cobertura de pre-match/news esta
  enfocada en Champions League, Premier League, Bundesliga, La Liga, Serie A y
  Ligue 1; el post-match news cubre Premier League, Serie A, La Liga,
  Eredivisie, Champions League y EUROs.

Encaje para este repo:

- Potente para datos si su coverage confirma Ecuador en el plan contratado.
- Para noticias de LDU/LigaPro no parece adecuado por cobertura declarada.

Recomendacion: **solo considerarlo si se va a pagar por data premium y se
confirma coverage de Ecuador en trial**.

### football-data.org

Fuentes oficiales:

- `https://www.football-data.org/coverage`
- `https://www.football-data.org/documentation/api`

Hallazgos:

- API seria y simple con token `X-Auth-Token`.
- Free tier no incluye Ecuador; lista Champions League, ligas europeas,
  Championship, Serie A Brasil, Mundial y Euro.
- La documentacion advierte que ciertos recursos pueden estar restringidos por
  autenticacion o plan.

Encaje para este repo:

- No es buena fuente para LDU/LigaPro.
- Podria servir para torneos europeos, pero no aporta al objetivo central.

Recomendacion: **descartar para LDU Auto**.

### NewsAPI.org

Fuente oficial: `https://newsapi.org/docs/endpoints/everything`

Hallazgos:

- `/v2/everything` permite busqueda por query, frases exactas, operadores
  booleanos, dominios, fechas, idioma y orden.
- Dev/free tiene 100 requests/dia, articulos con 24h de delay, busqueda hasta
  un mes atras y uso solo para desarrollo/testing.
- Planes productivos son caros.
- No ofrece contenido completo; devuelve URL, titulo, descripcion, imagen y
  metadatos.

Encaje para este repo:

- Bueno para monitorear links de fuentes confiables con query como:
  `("Liga de Quito" OR "LDU Quito" OR "Liga Deportiva Universitaria")`.
- El costo/terminos lo vuelven menos atractivo para autopublicacion productiva.

Recomendacion: **bueno para prototipo/manual review; no como autopost productivo
gratis**.

### GNews

Fuentes oficiales:

- `https://docs.gnews.io/endpoints/search-endpoint`
- `https://gnews.io/pricing`

Hallazgos:

- Endpoint `/api/v4/search` con query, idioma, pais, fecha, orden, paginacion y
  campos `title`, `description`, `content`.
- Free: 100 requests/dia, max 10 articulos por request, 12h delay, 30 dias de
  historico, uso de desarrollo/testing.
- Plan Essential cuesta mucho menos que NewsAPI y ofrece disponibilidad en
  tiempo real, historico desde 2020 y full content.
- No soporta filtro por fuente en pricing/FAQ actual; se puede filtrar localmente
  por dominio despues de recibir resultados.

Encaje para este repo:

- Mejor candidato de noticias generalistas si se quiere monitorear LDU.
- Requiere whitelist local de dominios y deduplicacion por URL.
- Aun asi, recomendaria cola de revision antes de publicar.

Recomendacion: **mejor opcion externa para radar de noticias con costo bajo**.

## Recomendacion final

Prioridad 1: **ESPN-only, sin nuevas credenciales**.

Implementar primero:

1. `event-summary` post: incidencias post-partido desde `summary?event=`.
2. `match-preview` post: racha, posicion y H2H desde `summary?event=` de fixture.
3. `table-snapshot` opcional: posicion de LDU si `standings` viene poblado.
4. `matchday-agenda` opcional: scoreboard del dia.

Esto suma contenido util y confiable sin depender de rumores ni APIs pagadas.

Prioridad 2: **radar de noticias con revision humana**.

Agregar una integracion opcional con GNews o NewsAPI:

- secreto `NEWS_API_KEY`;
- proveedor configurable `NEWS_PROVIDER=gnews|newsapi`;
- query fija y conservadora;
- whitelist de dominios;
- dedupe por URL;
- guardar candidatos en `data/news-pending.json`;
- no publicar automaticamente al feed hasta que exista una capa de aprobacion.

Prioridad 3: **API-Football si se paga por datos**.

Usarla para robustecer:

- alineaciones;
- estadisticas de partido;
- top scorers;
- tabla;
- eventos en vivo;
- validacion cruzada de ESPN.

No la usaria para noticias, porque su fortaleza es data deportiva.

## Contenido que NO automatizaria todavia

- Rumores de fichajes sin revision humana.
- Lesiones/sanciones desde fuentes generales sin confirmacion.
- Reposteos de texto completo de noticias.
- Imagenes de articulos de terceros sin verificar derechos.
- Videos/highlights de ESPN u otros medios como asset propio.

## Siguiente implementacion sugerida

Si se decide avanzar, el cambio mas limpio seria:

1. Crear `src/espnSummary.js` para `fetchMatchSummary(match)`.
2. Extender `state.js` con claves:
   - `summaries[eventId]`
   - `previews[eventId]`
   - `tableSnapshots[eventId]`
3. Agregar nuevos post types en `captions.js` y `templates/post.js`.
4. Empezar por un solo formato: **post-partido de incidencias**.
5. Tests:
   - parser de `keyEvents`;
   - dedupe por estado;
   - caption corta y sin inventar datos;
   - sample render.

Este camino es el mas seguro: aprovecha datos ya disponibles, no mete secretos
nuevos y produce contenido que si tiene sentido para la hinchada de Liga.
