// HTML template for Instagram posts (1080x1350). One visual system, themed
// per competition: deep gradient backdrop, faint pitch line-art, dot grid,
// glass panels and a single accent color per tournament.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchWinners } from '../outcome.js';

// Fonts are bundled (assets/fonts) and inlined as data URIs so rendering
// never depends on Google Fonts being reachable. All three are variable
// fonts covering the full weight range.
const FONTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', 'fonts');
const fontUri = (file) =>
  `data:font/woff2;base64,${fs.readFileSync(path.join(FONTS_DIR, file)).toString('base64')}`;
export const FONT_CSS = `
  @font-face {
    font-family: 'Archivo Expanded';
    font-weight: 100 1000;
    src: url(${fontUri('archivo-expanded.woff2')}) format('woff2');
  }
  @font-face {
    font-family: 'Archivo';
    font-weight: 100 1000;
    src: url(${fontUri('archivo.woff2')}) format('woff2');
  }
  @font-face {
    font-family: 'Space Grotesk';
    font-weight: 100 1000;
    src: url(${fontUri('spacegrotesk.woff2')}) format('woff2');
  }
`;

export const THEMES = {
  ligapro: {
    bg0: '#050d2e', bg1: '#0a1a54', bg2: '#040820',
    accent: '#ffd60a', accentSoft: 'rgba(255, 214, 10, 0.16)',
    ink: '#f4f7ff', inkDim: 'rgba(226, 233, 255, 0.55)',
    tag: 'LIGAPRO · SERIE A',
  },
  libertadores: {
    bg0: '#0c0c10', bg1: '#17161d', bg2: '#060608',
    accent: '#e9c464', accentSoft: 'rgba(233, 196, 100, 0.14)',
    ink: '#f7f4ec', inkDim: 'rgba(240, 234, 218, 0.5)',
    tag: 'CONMEBOL LIBERTADORES',
  },
  sudamericana: {
    bg0: '#061224', bg1: '#0a2547', bg2: '#040b17',
    accent: '#ff5964', accentSoft: 'rgba(255, 89, 100, 0.14)',
    ink: '#f2f7ff', inkDim: 'rgba(214, 228, 248, 0.55)',
    tag: 'CONMEBOL SUDAMERICANA',
  },
  copaecuador: {
    bg0: '#071026', bg1: '#0e1e44', bg2: '#050a19',
    accent: '#ffd100', accentSoft: 'rgba(255, 209, 0, 0.14)',
    ink: '#f4f7ff', inkDim: 'rgba(222, 231, 250, 0.55)',
    tag: 'COPA ECUADOR', tricolor: true,
  },
  supercopa: {
    bg0: '#120e20', bg1: '#241a3e', bg2: '#0a0714',
    accent: '#c4b5fd', accentSoft: 'rgba(196, 181, 253, 0.14)',
    ink: '#f6f4ff', inkDim: 'rgba(226, 220, 248, 0.55)',
    tag: 'SUPERCOPA ECUADOR',
  },
  amistoso: {
    bg0: '#07171a', bg1: '#0d2b2f', bg2: '#040f11',
    accent: '#2dd4bf', accentSoft: 'rgba(45, 212, 191, 0.13)',
    ink: '#f0fbfa', inkDim: 'rgba(212, 240, 236, 0.55)',
    tag: 'PARTIDO AMISTOSO',
  },
  otra: {
    bg0: '#0e0e18', bg1: '#1b1b2e', bg2: '#07070d',
    accent: '#8f93ff', accentSoft: 'rgba(143, 147, 255, 0.14)',
    ink: '#f3f3ff', inkDim: 'rgba(222, 222, 245, 0.55)',
    tag: 'COMPETICIÓN INTERNACIONAL',
  },
};

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ESPN disambiguates names like "Libertad (Ecuador)" — drop the parenthetical.
export const cleanName = (s) => String(s ?? '').replace(/\s*\([^)]*\)\s*$/, '');

// Faint pitch line-art: halfway line, center circle, penalty boxes.
export function pitchSvg(stroke) {
  return `
  <svg class="pitch" viewBox="0 0 1080 1350" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g stroke="${stroke}" stroke-width="2">
      <circle cx="540" cy="675" r="240"/>
      <circle cx="540" cy="675" r="6" fill="${stroke}"/>
      <line x1="-60" y1="675" x2="1140" y2="675"/>
      <rect x="240" y="-160" width="600" height="300" rx="2"/>
      <rect x="360" y="-160" width="360" height="160" rx="2"/>
      <path d="M 420 140 A 130 130 0 0 0 660 140"/>
      <rect x="240" y="1210" width="600" height="300" rx="2"/>
      <rect x="360" y="1350" width="360" height="160" rx="2"/>
      <path d="M 420 1210 A 130 130 0 0 1 660 1210"/>
    </g>
  </svg>`;
}

function teamBlock(team, logoUri, { winner = null } = {}) {
  const dimmed = winner === false;
  return `
    <div class="team ${dimmed ? 'team-dim' : ''}">
      <div class="crest">
        ${logoUri ? `<img src="${logoUri}" alt=""/>` : `<div class="crest-fallback">${esc(team.abbrev || '?')}</div>`}
      </div>
      <div class="team-name">${esc(cleanName(team.shortName))}</div>
    </div>`;
}

// One scorer line: "ESTRADA 12' 45'" (+ "(AG)" for own goals). Minutes come
// from ESPN already suffixed with the apostrophe.
function scorerLines(scorers) {
  return (scorers || [])
    .slice(0, 4)
    .map(
      (s) =>
        `<div class="scorer">${esc(s.name)}${s.og ? ' <span class="og">(AG)</span>' : s.pen ? ' <span class="og">(P)</span>' : ''} <b>${s.minutes
          .map((m) => esc(m))
          .join(' ')}</b></div>`
    )
    .join('');
}

// Last-five form as G/E/P pills, oldest → newest.
const FORM_LETTER = { W: 'G', D: 'E', L: 'P' };
function formPills(form) {
  if (!form || form.length === 0) return '';
  const pills = form
    .map((r) => `<span class="pill pill-${r.toLowerCase()}">${FORM_LETTER[r]}</span>`)
    .join('');
  return `<div class="form">${pills}</div>`;
}

// Strip under the matchup, one column aligned under each crest. Empty columns
// still render so a single-sided list keeps its side.
function extrasRow(left, right) {
  if (!left && !right) return '';
  return `
    <div class="extras-row">
      <div class="ex">${left}</div>
      <div class="ex-mid"></div>
      <div class="ex">${right}</div>
    </div>`;
}

/**
 * Build the poster HTML.
 * @param {object} p
 * @param {'fixture'|'result'} p.postType
 * @param {object} p.match          normalized match
 * @param {string} p.homeLogo       data URI
 * @param {string} p.awayLogo       data URI
 * @param {string} p.dayLine        e.g. "DOMINGO 12 DE JULIO"
 * @param {string} p.timeLine       e.g. "17:00"
 * @param {object} [p.extras]       { scorers: {home,away}, form: {home,away} }
 */
export function renderPostHtml({ postType, match, homeLogo, awayLogo, dayLine, timeLine, extras }) {
  const theme = THEMES[match.competitionType] || THEMES.otra;
  const isResult = postType === 'result';
  const headline = isResult ? 'FINAL DEL<br/>PARTIDO' : 'PRÓXIMO<br/>PARTIDO';

  // Outcome comes from the scoreline (see src/outcome.js), never straight from
  // ESPN's laggy winner flags, so the image can't print "EMPATE" on a game the
  // scoreline already decided.
  const { homeWon, awayWon, draw: isDraw } = matchWinners(match);
  const draw = isResult && isDraw;

  // Result posters list goalscorers; fixture posters show last-five form.
  const extrasHtml = isResult
    ? extrasRow(scorerLines(extras?.scorers?.home), scorerLines(extras?.scorers?.away))
    : extrasRow(formPills(extras?.form?.home), formPills(extras?.form?.away));

  const center = isResult
    ? `
      <div class="center">
        <div class="score">
          <span class="s ${homeWon ? 'won' : ''}">${esc(match.home.score ?? '-')}</span>
          <span class="sep"></span>
          <span class="s ${awayWon ? 'won' : ''}">${esc(match.away.score ?? '-')}</span>
        </div>
        <div class="center-tag">${
          match.penalties
            ? `PENALES ${esc(match.penalties.home)} - ${esc(match.penalties.away)}`
            : draw
              ? 'EMPATE'
              : 'RESULTADO FINAL'
        }</div>
      </div>`
    : `
      <div class="center">
        <div class="vs">VS</div>
        <div class="kickoff ${timeLine ? '' : 'tbd'}">${esc(timeLine ?? 'POR CONFIRMAR')}</div>
      </div>`;

  // The footer label already says "ESTADIO", so drop a redundant prefix.
  const venueDisplay = match.venue ? match.venue.replace(/^estadio\s+/i, '') : null;
  const venueLine = venueDisplay ? esc(venueDisplay.toUpperCase()) : 'POR CONFIRMAR';
  const cityLine = [match.city, match.country]
    .filter(Boolean)
    .map((s) => esc(String(s).toUpperCase()))
    .join(' · ');

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
  .edge-tricolor {
    background: linear-gradient(180deg, #ffd100 0 34%, #0057b8 34% 67%, #ef3340 67% 100%);
  }

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
    font-size: 108px; font-weight: 900; line-height: 1.02;
    letter-spacing: 0.01em; text-transform: uppercase;
  }
  .rule {
    margin-top: 44px; height: 1.5px; width: 100%;
    background: linear-gradient(90deg, ${theme.accent} 0, rgba(255,255,255,0.10) 55%, transparent);
  }

  main { position: relative; z-index: 2; flex: 1; display: flex; align-items: center; }
  .stack { width: 100%; display: flex; flex-direction: column; gap: 46px; }
  .matchup { width: 100%; display: flex; align-items: center; justify-content: space-between; }

  .extras-row { display: flex; align-items: flex-start; justify-content: space-between; }
  .extras-row .ex {
    width: 300px; flex-shrink: 0;
    display: flex; flex-direction: column; align-items: center; gap: 12px;
  }
  .extras-row .ex-mid { flex: 1; }
  .scorer {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 23px; font-weight: 500; letter-spacing: 0.1em;
    text-transform: uppercase; color: ${theme.inkDim};
    white-space: nowrap;
  }
  .scorer b { font-weight: 600; color: ${theme.accent}; }
  .scorer .og { font-size: 18px; letter-spacing: 0.08em; }
  .form { display: flex; gap: 10px; }
  .pill {
    width: 40px; height: 40px; border-radius: 13px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Space Grotesk', sans-serif; font-size: 19px; font-weight: 700;
  }
  .pill-w { background: ${theme.accentSoft}; color: ${theme.accent}; border: 1px solid ${theme.accent}55; }
  .pill-d { border: 1px solid rgba(255,255,255,0.22); color: ${theme.inkDim}; background: transparent; }
  .pill-l { background: rgba(255,255,255,0.045); color: rgba(255,255,255,0.34); border: 1px solid rgba(255,255,255,0.09); }
  .team { display: flex; flex-direction: column; align-items: center; gap: 34px; width: 300px; flex-shrink: 0; }
  .team-dim { opacity: 0.55; }
  .crest {
    width: 258px; height: 258px; border-radius: 36px;
    background: linear-gradient(165deg, rgba(255,255,255,0.085), rgba(255,255,255,0.02));
    border: 1px solid rgba(255,255,255,0.13);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 34px 70px rgba(0,0,0,0.42);
  }
  .crest img { width: 176px; height: 176px; object-fit: contain; filter: drop-shadow(0 14px 26px rgba(0,0,0,0.45)); }
  .crest-fallback { font-family: 'Archivo Expanded', sans-serif; font-size: 64px; font-weight: 800; opacity: 0.6; }
  .team-name {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 31px; font-weight: 600; letter-spacing: 0.14em;
    text-transform: uppercase; text-align: center; line-height: 1.3;
  }

  .center {
    display: flex; flex-direction: column; align-items: center; gap: 26px;
    flex: 1; min-width: 0;
    /* Keep the score/VS optically aligned with the crest centers, which sit
       above the team-name captions. */
    margin-bottom: 74px;
  }
  .vs {
    font-family: 'Archivo Expanded', sans-serif;
    font-size: 74px; font-weight: 900; letter-spacing: 0.06em;
    color: ${theme.accent};
    text-shadow: 0 0 60px ${theme.accentSoft};
  }
  .kickoff {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 30px; font-weight: 600; letter-spacing: 0.22em;
    padding: 13px 28px; border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.16);
    background: rgba(255,255,255,0.05);
    white-space: nowrap;
  }
  .kickoff.tbd { font-size: 22px; letter-spacing: 0.16em; padding: 12px 22px; }
  .score { display: flex; align-items: center; justify-content: center; gap: 26px; }
  .score .s {
    font-family: 'Archivo Expanded', sans-serif;
    font-size: 148px; font-weight: 900; line-height: 1;
    opacity: 0.45;
    min-width: 110px; text-align: center;
  }
  .score .s.won { opacity: 1; color: ${theme.accent}; text-shadow: 0 0 70px ${theme.accentSoft}; }
  .score:has(.won) .s:not(.won) { opacity: 0.45; }
  .score:not(:has(.won)) .s { opacity: 1; }
  .score .sep { width: 34px; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.28); }
  .center-tag {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 20px; font-weight: 600; letter-spacing: 0.3em;
    color: ${theme.inkDim};
    white-space: nowrap; text-align: center;
    /* re-center: trailing tracking space of the last letter */
    padding-left: 0.3em;
  }

  footer { position: relative; z-index: 2; }
  .foot-rule { height: 1px; background: rgba(255,255,255,0.14); margin-bottom: 44px; }
  .foot-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 40px; }
  .foot-row > .venue-box { flex: 1; min-width: 0; }
  .foot-row > .datebox { flex-shrink: 0; }
  .venue-label {
    font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 500;
    letter-spacing: 0.3em; color: ${theme.inkDim}; margin-bottom: 14px;
  }
  .venue {
    font-family: 'Archivo Expanded', sans-serif; font-size: 34px; font-weight: 800;
    letter-spacing: 0.04em; line-height: 1.25; max-width: 640px;
  }
  .venue.long { font-size: 27px; }
  .venue small { display: block; font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 500; letter-spacing: 0.24em; color: ${theme.inkDim}; margin-top: 10px; }
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
    <div class="edge ${theme.tricolor ? 'edge-tricolor' : ''}"></div>

    <header>
      <div class="chip">${esc(theme.tag)}</div>
      <h1>${headline}</h1>
      <div class="rule"></div>
    </header>

    <main>
      <div class="stack">
        <div class="matchup">
          ${teamBlock(match.home, homeLogo, { winner: isResult ? homeWon || (draw ? null : false) : null })}
          ${center}
          ${teamBlock(match.away, awayLogo, { winner: isResult ? awayWon || (draw ? null : false) : null })}
        </div>
        ${extrasHtml}
      </div>
    </main>

    <footer>
      <div class="foot-rule"></div>
      <div class="foot-row">
        <div class="venue-box">
          <div class="venue-label">ESTADIO</div>
          <div class="venue ${venueLine.length > 26 ? 'long' : ''}">${venueLine}${cityLine ? `<small>${cityLine}</small>` : ''}</div>
        </div>
        <div class="datebox">
          <div class="date-day">${esc(dayLine)}</div>
          <div class="date-sub">${isResult ? 'PARTIDO FINALIZADO' : timeLine ? `${esc(timeLine)} · ECUADOR` : 'HORA POR CONFIRMAR'}</div>
        </div>
      </div>
    </footer>
  </div>
</body></html>`;
}
