// The rendered poster image must agree with the scoreline, not with ESPN's
// laggy `winner` booleans. At full time ESPN briefly reports a completed match
// with real scores but both winner flags false; the poster used to print
// "EMPATE" and dim both scores for what was actually a decided game.
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPostHtml } from '../src/templates/post.js';

function poster({ hs, as, hWin = false, aWin = false, penalties, lduIsHome = true }) {
  return renderPostHtml({
    postType: 'result',
    match: {
      competitionType: 'ligapro',
      home: { shortName: 'LDU', abbrev: 'LDU', score: hs, winner: hWin },
      away: { shortName: 'Leones', abbrev: 'LEO', score: as, winner: aWin },
      lduIsHome, venue: 'Estadio Rodrigo Paz Delgado', city: 'Quito', country: 'Ecuador',
      penalties,
    },
    homeLogo: null, awayLogo: null, dayLine: 'SÁB 18 · JULIO', timeLine: null,
  });
}

test('poster never shows EMPATE for a decided game when winner flags lag', () => {
  // Leones incident: LDU 0-1, both winner flags still false.
  const html = poster({ hs: '0', as: '1' });
  assert.doesNotMatch(html, />\s*EMPATE\s*</);
  assert.match(html, /RESULTADO FINAL/);
  // The scoring side's number carries the "won" highlight class.
  assert.match(html, /class="s won">1</);
  assert.doesNotMatch(html, /class="s won">0</);
});

test('poster still shows EMPATE for a genuine draw', () => {
  const html = poster({ hs: '1', as: '1' });
  assert.match(html, />\s*EMPATE\s*</);
});

test('poster shows the penalties tag, not EMPATE, for a shootout', () => {
  const html = poster({ hs: '1', as: '1', penalties: { home: 4, away: 2 } });
  assert.doesNotMatch(html, />\s*EMPATE\s*</);
  assert.match(html, /PENALES 4 - 2/);
});
