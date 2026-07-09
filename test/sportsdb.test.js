import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSportsDbEvent } from '../src/sportsdb.js';
import { fetchMatchExtras } from '../src/espn.js';
import { buildCaption } from '../src/captions.js';
import { renderPostHtml } from '../src/templates/post.js';
import { planPosts } from '../src/state.js';
import { TEAM_ID } from '../src/config.js';

// Real TheSportsDB payload shape (Copa Ecuador round of 32, decided on
// penalties: 1-1, LDU won the shootout 4-3 away).
const AP_EVENT = {
  idEvent: '2468937',
  strEvent: 'Independiente Juniors vs LDU Quito',
  strTimestamp: '2026-07-09T01:00:00',
  strTime: '01:00:00',
  dateEvent: '2026-07-09',
  idLeague: '5636',
  strLeague: 'Copa Ecuador',
  strHomeTeam: 'Independiente Juniors',
  strAwayTeam: 'LDU Quito',
  idHomeTeam: '141126',
  idAwayTeam: '138227',
  strHomeTeamBadge: 'https://r2.thesportsdb.com/images/media/team/badge/home.png',
  strAwayTeamBadge: 'https://r2.thesportsdb.com/images/media/team/badge/away.png',
  intHomeScore: '1',
  intAwayScore: '1',
  intHomeScoreExtra: '3',
  intAwayScoreExtra: '4',
  strStatus: 'AP',
  strVenue: 'Estadio Banco Guayaquil',
  strCity: 'Guayaquil',
  strCountry: 'Ecuador',
  strPostponed: 'no',
};

test('normalizes a finished penalty-shootout cup match', () => {
  const m = normalizeSportsDbEvent(AP_EVENT);
  assert.equal(m.id, 'tsdb-2468937');
  assert.equal(m.state, 'post');
  assert.equal(m.completed, true);
  assert.equal(m.competitionType, 'copaecuador');
  assert.equal(m.date, '2026-07-09T01:00:00Z');
  assert.equal(m.timeValid, true);
  assert.equal(m.lduIsHome, false);
  assert.equal(m.source, 'sportsdb');
  // LDU keeps the ESPN team id so captions/standings recognize it.
  assert.equal(m.away.id, TEAM_ID);
  assert.equal(m.away.shortName, 'LDU');
  assert.equal(m.home.name, 'Independiente Juniors');
  assert.equal(m.home.score, '1');
  assert.equal(m.away.score, '1');
  // 1-1 decided on penalties: LDU (away) is the winner.
  assert.equal(m.away.winner, true);
  assert.equal(m.home.winner, false);
  assert.deepEqual(m.penalties, { home: 3, away: 4 });
  assert.equal(m.venue, 'Estadio Banco Guayaquil');
  assert.equal(m.city, 'Guayaquil');
});

test('normalizes an upcoming cup fixture', () => {
  const m = normalizeSportsDbEvent({
    ...AP_EVENT,
    idEvent: '999',
    strStatus: 'NS',
    intHomeScore: null,
    intAwayScore: null,
    intHomeScoreExtra: null,
    intAwayScoreExtra: null,
  });
  assert.equal(m.state, 'pre');
  assert.equal(m.completed, false);
  assert.equal(m.home.score, null);
  assert.equal(m.home.winner, false);
  assert.equal(m.penalties, null);
});

test('a 00:00:00 kickoff means the time is unknown', () => {
  const m = normalizeSportsDbEvent({ ...AP_EVENT, strStatus: 'NS', strTime: '00:00:00', strTimestamp: '2026-08-01T00:00:00' });
  assert.equal(m.timeValid, false);
});

test('regular-time results assign the winner by score, without penalties', () => {
  const m = normalizeSportsDbEvent({
    ...AP_EVENT,
    strStatus: 'FT',
    intHomeScore: '0',
    intAwayScore: '2',
    intHomeScoreExtra: null,
    intAwayScoreExtra: null,
  });
  assert.equal(m.away.winner, true);
  assert.equal(m.home.winner, false);
  assert.equal(m.penalties, null);
});

test('ignores leagues that ESPN already covers (no duplicate posts)', () => {
  assert.equal(normalizeSportsDbEvent({ ...AP_EVENT, idLeague: '4686', strLeague: 'Ecuadorian Serie A' }), null);
});

test('supercopa events classify with their own theme', () => {
  const m = normalizeSportsDbEvent({ ...AP_EVENT, idLeague: '5884', strLeague: 'Supercopa Ecuador' });
  assert.equal(m.competitionType, 'supercopa');
});

test('unrecognized live/postponed statuses never trigger posts', () => {
  const live = normalizeSportsDbEvent({ ...AP_EVENT, strStatus: '1H' });
  assert.equal(live.state, 'in');
  assert.equal(live.completed, false);
});

test('fetchMatchExtras skips non-ESPN matches without hitting the network', async () => {
  const extras = await fetchMatchExtras({ source: 'sportsdb', league: 'tsdb.5636', id: 'tsdb-1' });
  assert.equal(extras, null);
});

test('result caption announces the penalty shootout win', () => {
  const m = normalizeSportsDbEvent(AP_EVENT);
  const caption = buildCaption('result', m);
  assert.match(caption, /¡Ganó Liga!/);
  assert.match(caption, /Penales: 3 - 4/);
  assert.match(caption, /COPA ECUADOR/);
});

test('result poster shows the shootout score instead of RESULTADO FINAL', () => {
  const m = normalizeSportsDbEvent(AP_EVENT);
  const html = renderPostHtml({
    postType: 'result',
    match: m,
    homeLogo: null,
    awayLogo: null,
    dayLine: 'MIÉ 8 · JULIO',
    timeLine: null,
    extras: null,
  });
  assert.match(html, /PENALES 3 - 4/);
  assert.doesNotMatch(html, /RESULTADO FINAL/);
});

test('planPosts announces a freshly finished cup match', () => {
  const m = normalizeSportsDbEvent(AP_EVENT);
  const now = new Date('2026-07-09T06:00:00Z');
  const { posts } = planPosts([m], { results: {} }, now);
  assert.deepEqual(posts.map((p) => [p.match.id, p.type]), [['tsdb-2468937', 'result']]);
});
