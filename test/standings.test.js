import test from 'node:test';
import assert from 'node:assert/strict';
import { extractScorers, extractForm, normalizeStandings, selectStandingsStage } from '../src/espn.js';
import { planStandingsPost, standingsFingerprint } from '../src/state.js';
import { selectRows } from '../src/templates/standings.js';
import { buildStandingsCaption } from '../src/captions.js';

const HOME = '4816';
const AWAY = '2686';

const goal = (teamId, name, clock, typeText = 'Goal') => ({
  type: { text: typeText },
  clock: { displayValue: clock },
  team: { id: teamId },
  participants: [{ athlete: { displayName: name } }],
});

test('extractScorers groups repeat scorers and keeps both sides apart', () => {
  const { home, away } = extractScorers(
    [
      goal(HOME, 'Michael Estrada', "12'"),
      goal(HOME, 'Michael Estrada', "45'+2'"),
      goal(AWAY, 'Janner Corozo', "70'"),
    ],
    HOME,
    AWAY
  );
  assert.deepEqual(home, [{ name: 'Estrada', minutes: ["12'", "45'+2'"], og: false, pen: false }]);
  assert.equal(away.length, 1);
  assert.equal(away[0].name, 'Corozo');
});

test('extractScorers keeps penalties separate from open-play goals', () => {
  const { home } = extractScorers(
    [
      goal(HOME, 'Michael Estrada', "12'"),
      goal(HOME, 'Michael Estrada', "55'", 'Penalty - Scored'),
    ],
    HOME,
    AWAY
  );
  assert.deepEqual(home, [
    { name: 'Estrada', minutes: ["12'"], og: false, pen: false },
    { name: 'Estrada', minutes: ["55'"], og: false, pen: true },
  ]);
});

test('extractScorers ignores non-scoring events, misses and shootouts', () => {
  const { home, away } = extractScorers(
    [
      { type: { text: 'Substitution' }, team: { id: HOME }, participants: [] },
      { type: { text: 'Yellow Card' }, team: { id: AWAY }, participants: [] },
      goal(HOME, 'A B', "88'", 'Penalty - Missed'),
      goal(HOME, 'A B', "120'", 'Penalty - Shootout'),
      goal(AWAY, 'C D', "90'", 'Penalty - Scored'),
    ],
    HOME,
    AWAY
  );
  assert.equal(home.length, 0);
  assert.deepEqual(away, [{ name: 'D', minutes: ["90'"], og: false, pen: true }]);
});

test('extractScorers flags own goals', () => {
  const { home } = extractScorers([goal(HOME, 'X Y', "15'", 'Own Goal')], HOME, AWAY);
  assert.equal(home[0].og, true);
});

test('extractForm reverses to oldest-first and drops junk', () => {
  const { home, away } = extractForm(
    [
      { team: { id: HOME }, events: [{ gameResult: 'W' }, { gameResult: 'L' }, { gameResult: 'D' }] },
      { team: { id: AWAY }, events: [{ gameResult: 'w' }, { gameResult: '?' }] },
      { team: { id: '999' }, events: [{ gameResult: 'W' }] },
    ],
    HOME,
    AWAY
  );
  assert.deepEqual(home, ['D', 'L', 'W']);
  assert.deepEqual(away, ['W']);
});

const entry = (rank, id, points = 30 - rank, played = 17) => ({
  rank,
  team: { id: String(id), name: `Team ${id}`, shortName: `T${id}`, abbrev: `T${id}`, logo: null },
  played, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: '+1',
  points,
});

const tableWithLduAt = (rank, size = 16) => ({
  seasonName: '2026 LigaPro',
  stageName: 'First Stage',
  entries: Array.from({ length: size }, (_, i) =>
    entry(i + 1, i + 1 === rank ? HOME : 100 + i)
  ),
});

test('selectRows: top 8 straight when LDU is inside it', () => {
  const rows = selectRows(tableWithLduAt(3).entries);
  assert.equal(rows.length, 8);
  assert.ok(rows.every((r) => !r.gap));
  assert.equal(rows[2].team.id, HOME);
});

test('selectRows: top 6 + gap + LDU neighborhood when LDU is lower', () => {
  const rows = selectRows(tableWithLduAt(12).entries);
  assert.equal(rows.length, 10); // 6 + gap + 3
  assert.equal(rows[6].gap, true);
  assert.deepEqual(rows.slice(7).map((r) => r.rank), [11, 12, 13]);
});

test('selectRows: LDU last — neighborhood clamps to table end', () => {
  const rows = selectRows(tableWithLduAt(16).entries);
  assert.deepEqual(rows.slice(7).map((r) => r.rank), [14, 15, 16]);
});

// --- Standings normalization: stage selection + freshness ------------------

const rawStage = (name, rows) => ({
  name,
  standings: {
    seasonDisplayName: '2026 LigaPro Ecuador',
    entries: rows.map(([rank, id, points, played]) => ({
      team: {
        id: String(id), displayName: `Team ${id}`,
        shortDisplayName: `T${id}`, abbreviation: `T${id}`, logos: [],
      },
      stats: [
        { name: 'rank', value: rank },
        { name: 'points', value: points },
        { name: 'gamesPlayed', value: played },
        { name: 'wins', value: 0 }, { name: 'ties', value: 0 }, { name: 'losses', value: 0 },
        { name: 'pointsFor', value: 0 }, { name: 'pointsAgainst', value: 0 },
        { name: 'pointDifferential', displayValue: '+0' },
      ],
    })),
  },
});

test('normalizeStandings reads a single-stage LigaPro table', () => {
  const data = { children: [rawStage('First Stage', [[1, 17086, 49, 20], [6, HOME, 28, 20]])] };
  const s = normalizeStandings(data);
  assert.equal(s.stageName, 'First Stage');
  assert.equal(s.entries[0].team.id, '17086');
  assert.equal(s.entries.find((e) => e.team.id === HOME).played, 20);
});

test('normalizeStandings picks the stage that actually contains LDU', () => {
  // An unrelated group is listed first; the real LigaPro table (with LDU) is
  // second. Blindly taking the first stage would show the wrong table.
  const data = { children: [
    rawStage('Some Other Group', [[1, 900, 30, 12], [2, 901, 20, 12]]),
    rawStage('First Stage', [[1, 17086, 49, 20], [6, HOME, 28, 20]]),
  ] };
  const s = normalizeStandings(data);
  assert.equal(s.stageName, 'First Stage');
  assert.ok(s.entries.some((e) => e.team.id === HOME));
  assert.equal(selectStandingsStage(data.children).name, 'First Stage');
});

test('normalizeStandings returns null when no stage has entries', () => {
  assert.equal(normalizeStandings({ children: [] }), null);
  assert.equal(normalizeStandings({}), null);
  assert.equal(selectStandingsStage([]), null);
});

test('planStandingsPost defers while the ESPN table still lags the posted result', () => {
  const state = {};
  const table = tableWithLduAt(6);
  table.entries.forEach((e) => { e.played = 19; }); // table not yet caught up
  // We have seen 20 completed LigaPro matches, table only shows 19 → stale.
  assert.equal(planStandingsPost(table, state, true, 20), false);
  assert.equal(state.standings, undefined, 'must not record a deferred (stale) table');
  // Table catches up to the 20th match → now it may post.
  table.entries.forEach((e) => { e.played = 20; });
  assert.equal(planStandingsPost(table, state, true, 20), true);
});

test('planStandingsPost posts once per table state, only after a result', () => {
  const standings = tableWithLduAt(3);
  const state = {};
  assert.equal(planStandingsPost(standings, state, false), false);
  assert.equal(planStandingsPost(null, state, true), false);
  assert.equal(planStandingsPost(standings, state, true), true);
  // Same table again (re-run, rescheduled result) → no duplicate.
  assert.equal(planStandingsPost(standings, state, true), false);
  // Table moved → posts again.
  const moved = tableWithLduAt(3);
  moved.entries[0].points += 3;
  moved.entries[0].played += 1;
  assert.notEqual(standingsFingerprint(moved), standingsFingerprint(standings));
  assert.equal(planStandingsPost(moved, state, true), true);
});

test('buildStandingsCaption states LDU position, points and the leader', () => {
  const caption = buildStandingsCaption(tableWithLduAt(3));
  assert.match(caption, /fecha 17/);
  assert.match(caption, /LDU: 3\.º con 27 puntos/);
  assert.match(caption, /Líder: T100/);
  assert.match(caption, /#TablaDePosiciones/);
  // Deterministic: same table → byte-identical caption.
  assert.equal(caption, buildStandingsCaption(tableWithLduAt(3)));
});

test('buildStandingsCaption omits the leader line when LDU leads', () => {
  const caption = buildStandingsCaption(tableWithLduAt(1));
  assert.match(caption, /LDU: 1\.º/);
  assert.doesNotMatch(caption, /Líder:/);
});
