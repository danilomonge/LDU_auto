// HTML template for Instagram posts (1080x1350). One visual system, themed
// per competition: deep gradient backdrop, faint pitch line-art, dot grid,
// glass panels and a single accent color per tournament.

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

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ESPN disambiguates names like "Libertad (Ecuador)" — drop the parenthetical.
const cleanName = (s) => String(s ?? '').replace(/\s*\([^)]*\)\s*$/, '');

// Faint pitch line-art: halfway line, center circle, penalty boxes.
function pitchSvg(stroke) {
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

/**
 * Build the poster HTML.
 * @param {object} p
 * @param {'fixture'|'result'} p.postType
 * @param {object} p.match          normalized match
 * @param {string} p.homeLogo       data URI
 * @param {string} p.awayLogo       data URI
 * @param {string} p.dayLine        e.g. "DOMINGO 12 DE JULIO"
 * @param {string} p.timeLine       e.g. "17:00"
 */
export function renderPostHtml({ postType, match, homeLogo, awayLogo, dayLine, timeLine }) {
  const theme = THEMES[match.competitionType] || THEMES.otra;
  const isResult = postType === 'result';
  const headline = isResult ? 'FINAL DEL<br/>PARTIDO' : 'PRÓXIMO<br/>PARTIDO';

  const homeWon = match.home.winner;
  const awayWon = match.away.winner;
  const draw = isResult && !homeWon && !awayWon;

  const center = isResult
    ? `
      <div class="center">
        <div class="score">
          <span class="s ${homeWon ? 'won' : ''}">${esc(match.home.score ?? '-')}</span>
          <span class="sep"></span>
          <span class="s ${awayWon ? 'won' : ''}">${esc(match.away.score ?? '-')}</span>
        </div>
        <div class="center-tag">${draw ? 'EMPATE' : 'RESULTADO FINAL'}</div>
      </div>`
    : `
      <div class="center">
        <div class="vs">VS</div>
        <div class="kickoff">${esc(timeLine)}</div>
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
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Archivo+Expanded:wght@600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<style>
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
  .matchup { width: 100%; display: flex; align-items: center; justify-content: space-between; }
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
  }
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
  .venue-label {
    font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 500;
    letter-spacing: 0.3em; color: ${theme.inkDim}; margin-bottom: 14px;
  }
  .venue {
    font-family: 'Archivo Expanded', sans-serif; font-size: 34px; font-weight: 800;
    letter-spacing: 0.04em; line-height: 1.25; max-width: 640px;
  }
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
      <div class="matchup">
        ${teamBlock(match.home, homeLogo, { winner: isResult ? homeWon || (draw ? null : false) : null })}
        ${center}
        ${teamBlock(match.away, awayLogo, { winner: isResult ? awayWon || (draw ? null : false) : null })}
      </div>
    </main>

    <footer>
      <div class="foot-rule"></div>
      <div class="foot-row">
        <div>
          <div class="venue-label">ESTADIO</div>
          <div class="venue">${venueLine}${cityLine ? `<small>${cityLine}</small>` : ''}</div>
        </div>
        <div class="datebox">
          <div class="date-day">${esc(dayLine)}</div>
          <div class="date-sub">${isResult ? 'PARTIDO FINALIZADO' : `${esc(timeLine)} · ECUADOR`}</div>
        </div>
      </div>
    </footer>
  </div>
</body></html>`;
}
