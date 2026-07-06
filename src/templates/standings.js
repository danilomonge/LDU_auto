// HTML template for the "Tabla de posiciones" post (1080x1350). Same visual
// system as the match posters (LigaPro theme): deep gradient, faint pitch
// line-art, dot grid, one accent color — with a compact standings table where
// LDU's row is the single highlighted element.

import { FONT_CSS, THEMES, esc, cleanName, pitchSvg } from './post.js';
import { TEAM_ID } from '../config.js';

const STAGE_NAMES = [
  [/first/i, 'PRIMERA ETAPA'],
  [/second/i, 'SEGUNDA ETAPA'],
];

function stageLabel(name) {
  for (const [re, label] of STAGE_NAMES) if (re.test(name || '')) return label;
  return String(name || '').toUpperCase();
}

/**
 * Pick which rows to show: the top 8 when LDU is among them, otherwise the
 * top 6 plus LDU with its immediate neighbors (a `gap: true` marker row is
 * inserted where the table is elided).
 */
export function selectRows(entries, teamId = TEAM_ID) {
  const idx = entries.findIndex((e) => e.team.id === teamId);
  if (idx < 8) return entries.slice(0, 8);
  const top = entries.slice(0, 6);
  const from = Math.min(Math.max(idx - 1, 6), entries.length - 3);
  return [...top, { gap: true }, ...entries.slice(from, from + 3)];
}

function rowHtml(entry, logoUri, theme) {
  if (entry.gap) {
    return `<div class="gap-row"><span></span><span></span><span></span></div>`;
  }
  const isLdu = entry.team.id === TEAM_ID;
  return `
    <div class="row ${isLdu ? 'row-ldu' : ''}">
      <div class="pos">${esc(entry.rank)}</div>
      <div class="crest-cell">
        ${logoUri ? `<img src="${logoUri}" alt=""/>` : `<span class="crest-fb">${esc((entry.team.abbrev || '?').slice(0, 3))}</span>`}
      </div>
      <div class="club">${esc(cleanName(entry.team.shortName))}</div>
      <div class="num">${esc(entry.played)}</div>
      <div class="num">${esc(entry.goalDiff)}</div>
      <div class="pts">${esc(entry.points)}</div>
    </div>`;
}

/**
 * Build the standings poster HTML.
 * @param {object} p
 * @param {object} p.standings   normalized standings (fetchStandings)
 * @param {object} p.logos       map team id → logo data URI
 * @param {string} p.dayLine     e.g. "LUN 7 · JULIO"
 */
export function renderStandingsHtml({ standings, logos, dayLine }) {
  const theme = THEMES.ligapro;
  const rows = selectRows(standings.entries);
  const ldu = standings.entries.find((e) => e.team.id === TEAM_ID);
  const round = ldu?.played ?? Math.max(...standings.entries.map((e) => e.played));

  return `<!doctype html>
<html><head><meta charset="utf-8"/>
<style>
  ${FONT_CSS}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1350px; }
  .poster {
    position: relative; width: 1080px; height: 1350px; overflow: hidden;
    background:
      radial-gradient(1400px 900px at 85% -10%, ${theme.accentSoft}, transparent 60%),
      radial-gradient(1100px 800px at 0% 110%, ${theme.accentSoft}, transparent 55%),
      linear-gradient(160deg, ${theme.bg1} 0%, ${theme.bg0} 46%, ${theme.bg2} 100%);
    color: ${theme.ink};
    font-family: 'Archivo', sans-serif;
    display: flex; flex-direction: column;
    padding: 96px 84px 76px;
  }
  .pitch { position: absolute; inset: 0; opacity: 0.055; }
  .dots {
    position: absolute; inset: 0;
    background-image: radial-gradient(rgba(255,255,255,0.14) 1.1px, transparent 1.1px);
    background-size: 34px 34px;
    -webkit-mask-image: linear-gradient(200deg, rgba(0,0,0,0.9), transparent 55%);
    mask-image: linear-gradient(200deg, rgba(0,0,0,0.9), transparent 55%);
  }
  .edge { position: absolute; left: 0; top: 0; bottom: 0; width: 10px; background: ${theme.accent}; }

  header { position: relative; z-index: 2; }
  .chip {
    display: inline-flex; align-items: center; gap: 14px;
    border: 1.5px solid ${theme.accent}; border-radius: 999px;
    padding: 14px 30px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 25px; font-weight: 600; letter-spacing: 0.32em;
    color: ${theme.accent};
  }
  .chip::before { content: ''; width: 9px; height: 9px; border-radius: 50%; background: ${theme.accent}; }
  h1 {
    margin-top: 54px;
    font-family: 'Archivo Expanded', 'Archivo', sans-serif;
    font-size: 88px; font-weight: 900; line-height: 1.04;
    letter-spacing: 0.01em; text-transform: uppercase;
  }
  .rule {
    margin-top: 44px; height: 1.5px; width: 100%;
    background: linear-gradient(90deg, ${theme.accent} 0, rgba(255,255,255,0.10) 55%, transparent);
  }

  main { position: relative; z-index: 2; flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .table { width: 100%; }
  .thead, .row, .gap-row {
    display: grid;
    grid-template-columns: 64px 68px 1fr 96px 100px 116px;
    align-items: center; column-gap: 8px;
  }
  .thead {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 19px; font-weight: 600; letter-spacing: 0.26em;
    color: ${theme.inkDim};
    padding: 0 26px 20px;
  }
  .thead .num, .thead .pts { text-align: center; }
  .row {
    height: 78px; border-radius: 18px; padding: 0 26px;
  }
  .row + .row, .gap-row + .row, .row + .gap-row { margin-top: 8px; }
  .pos {
    font-family: 'Archivo Expanded', sans-serif;
    font-size: 27px; font-weight: 800; color: ${theme.inkDim};
  }
  .crest-cell { display: flex; align-items: center; }
  .crest-cell img { width: 46px; height: 46px; object-fit: contain; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.4)); }
  .crest-fb {
    font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 700;
    letter-spacing: 0.08em; opacity: 0.55;
  }
  .club {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 27px; font-weight: 600; letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    padding-right: 12px;
  }
  .num {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 26px; font-weight: 500; text-align: center; color: ${theme.inkDim};
    font-variant-numeric: tabular-nums;
  }
  .pts {
    font-family: 'Archivo Expanded', sans-serif;
    font-size: 30px; font-weight: 800; text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .row-ldu {
    background: linear-gradient(90deg, ${theme.accentSoft}, rgba(255,255,255,0.03));
    border: 1px solid rgba(255, 214, 10, 0.38);
    box-shadow: 0 18px 44px rgba(0,0,0,0.35);
  }
  .row-ldu .pos, .row-ldu .pts { color: ${theme.accent}; }
  .row-ldu .num { color: ${theme.ink}; opacity: 0.8; }
  .gap-row { height: 30px; padding: 0 26px; }
  .gap-row span {
    grid-column: 1; width: 4px; height: 4px; border-radius: 50%;
    background: rgba(255,255,255,0.25); justify-self: start; margin-left: 8px;
  }
  .gap-row span:nth-child(2) { grid-column: 2; margin-left: 0; }
  .gap-row span:nth-child(3) { grid-column: 3; }
  .gap-row { grid-template-rows: 1fr; }
  .gap-row span { align-self: center; }

  footer { position: relative; z-index: 2; }
  .foot-rule { height: 1px; background: rgba(255,255,255,0.14); margin-bottom: 44px; }
  .foot-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 40px; }
  .comp-label {
    font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 500;
    letter-spacing: 0.3em; color: ${theme.inkDim}; margin-bottom: 14px;
  }
  .comp {
    font-family: 'Archivo Expanded', sans-serif; font-size: 34px; font-weight: 800;
    letter-spacing: 0.04em; line-height: 1.25;
  }
  .comp small { display: block; font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 500; letter-spacing: 0.24em; color: ${theme.inkDim}; margin-top: 10px; }
  .datebox { text-align: right; flex-shrink: 0; }
  .date-day {
    font-family: 'Archivo Expanded', sans-serif; font-size: 34px; font-weight: 800;
    color: ${theme.accent}; letter-spacing: 0.04em;
  }
  .date-sub { font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 500; letter-spacing: 0.24em; color: ${theme.inkDim}; margin-top: 10px; }
</style></head>
<body>
  <div class="poster">
    ${pitchSvg('#ffffff')}
    <div class="dots"></div>
    <div class="edge"></div>

    <header>
      <div class="chip">${esc(theme.tag)}</div>
      <h1>Tabla de<br/>posiciones</h1>
      <div class="rule"></div>
    </header>

    <main>
      <div class="table">
        <div class="thead">
          <div>#</div><div></div><div>CLUB</div><div class="num">PJ</div><div class="num">DG</div><div class="pts">PTS</div>
        </div>
        ${rows.map((r) => rowHtml(r, r.gap ? null : logos[r.team.id], theme)).join('')}
      </div>
    </main>

    <footer>
      <div class="foot-rule"></div>
      <div class="foot-row">
        <div>
          <div class="comp-label">COMPETENCIA</div>
          <div class="comp">LIGAPRO ECUADOR<small>${esc(stageLabel(standings.stageName))}</small></div>
        </div>
        <div class="datebox">
          <div class="date-day">FECHA ${esc(round)}</div>
          <div class="date-sub">${esc(dayLine)}</div>
        </div>
      </div>
    </footer>
  </div>
</body></html>`;
}
