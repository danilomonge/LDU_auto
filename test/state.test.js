// Unit tests for post planning: node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { planPosts, fingerprint } from '../src/state.js';

const NOW = new Date('2026-07-06T12:00:00Z');

function match(id, dateIso, { state = 'pre', completed = false, hs = null, as = null, hWin = false, aWin = false } = {}) {
  return {
    id,
    date: dateIso,
    state,
    completed,
    competitionType: 'ligapro',
    venue: 'Estadio X', city: 'Quito', country: 'Ecuador',
    home: { id: '4816', name: 'LDU', shortName: 'LDU', score: hs, winner: hWin },
    away: { id: '1', name: 'Rival', shortName: 'Rival', score: as, winner: aWin },
    lduIsHome: true,
  };
}

test('first run: posts next fixture + latest result only, baselines the rest', () => {
  const matches = [
    match('old1', '2026-06-01T00:00Z', { state: 'post', completed: true, hs: '1', as: '0', hWin: true }),
    match('old2', '2026-07-05T00:00Z', { state: 'post', completed: true, hs: '0', as: '1', aWin: true }),
    match('next', '2026-07-10T00:00Z'),
    match('later', '2026-07-20T00:00Z'),
  ];
  const { posts, state } = planPosts(matches, null, NOW);
  assert.deepEqual(
    posts.map((p) => `${p.type}:${p.match.id}`).sort(),
    ['fixture:next', 'result:old2'],
  );
  assert.ok(state.results.old1.baselined);
});

test('steady state: no changes → no posts, state byte-identical', () => {
  const matches = [match('next', '2026-07-10T00:00Z')];
  const r1 = planPosts(matches, null, NOW);
  const before = JSON.stringify(r1.state);
  const r2 = planPosts(matches, JSON.parse(before), NOW);
  assert.equal(r2.posts.length, 0);
  assert.equal(JSON.stringify(r2.state), before);
});

test('rescheduled fixture is re-announced', () => {
  const m1 = [match('next', '2026-07-10T00:00Z')];
  const { state } = planPosts(m1, null, NOW);
  const m2 = [match('next', '2026-07-11T00:00Z')]; // moved a day
  const { posts } = planPosts(m2, state, NOW);
  assert.deepEqual(posts.map((p) => p.type), ['fixture']);
});

test('newly completed match posts a result once', () => {
  const pre = [match('m1', '2026-07-07T00:00Z'), match('m2', '2026-07-12T00:00Z')];
  const { state: s1 } = planPosts(pre, null, NOW);
  const after = [
    match('m1', '2026-07-07T00:00Z', { state: 'post', completed: true, hs: '3', as: '1', hWin: true }),
    match('m2', '2026-07-12T00:00Z'),
  ];
  const later = new Date('2026-07-07T02:00:00Z');
  const r = planPosts(after, s1, later);
  assert.deepEqual(r.posts.map((p) => `${p.type}:${p.match.id}`).sort(), ['fixture:m2', 'result:m1']);
  const r2 = planPosts(after, r.state, later);
  assert.equal(r2.posts.length, 0);
});

test('old never-seen results are baselined, not posted', () => {
  const { state: s1 } = planPosts([match('next', '2026-07-10T00:00Z')], null, NOW);
  const withHistory = [
    match('ancient', '2026-01-15T00:00Z', { state: 'post', completed: true, hs: '2', as: '0', hWin: true }),
    match('next', '2026-07-10T00:00Z'),
  ];
  const { posts, state } = planPosts(withHistory, s1, NOW);
  assert.equal(posts.length, 0);
  assert.ok(state.results.ancient.baselined);
});

test('live match produces nothing until completed', () => {
  const { state: s1 } = planPosts([match('m1', '2026-07-06T11:00Z')], null, new Date('2026-07-05T00:00Z'));
  const live = [match('m1', '2026-07-06T11:00Z', { state: 'in', hs: '1', as: '0' })];
  const { posts } = planPosts(live, s1, NOW);
  assert.equal(posts.length, 0);
});

// A cup fixture (TheSportsDB) can slot in before an already-announced league
// fixture (ESPN). When the cup match passes and the pointer returns to the
// league match, it must NOT be re-announced — each real "next match" is
// announced exactly once.
test('cup fixture jumping ahead never re-announces the league fixture', () => {
  const league = match('liga', '2026-07-12T17:00Z');
  const { state: s1, posts: p1 } = planPosts([league], null, NOW);
  assert.deepEqual(p1.map((p) => `${p.type}:${p.match.id}`), ['fixture:liga']);

  // Copa Ecuador match appears later, kicking off before the league one.
  const cup = { ...match('cup', '2026-07-09T01:00Z'), competitionType: 'copaecuador' };
  const { state: s2, posts: p2 } = planPosts([cup, league], s1, NOW);
  assert.deepEqual(p2.map((p) => `${p.type}:${p.match.id}`), ['fixture:cup']);

  // Cup match finished → league match is "next" again → no duplicate post.
  const cupDone = {
    ...cup,
    state: 'post', completed: true,
    home: { ...cup.home, score: '1', winner: false },
    away: { ...cup.away, score: '1', winner: true },
  };
  const after = new Date('2026-07-09T06:00:00Z');
  const { posts: p3 } = planPosts([cupDone, league], s2, after);
  assert.deepEqual(p3.map((p) => `${p.type}:${p.match.id}`), ['result:cup']);
});

test('a previously announced fixture is re-announced only if rescheduled', () => {
  const league = match('liga', '2026-07-12T17:00Z');
  const cup = { ...match('cup', '2026-07-09T01:00Z'), competitionType: 'copaecuador' };
  const { state: s1 } = planPosts([league], null, NOW);
  const { state: s2 } = planPosts([cup, league], s1, NOW);
  // While the cup match is still next, the league game gets moved.
  const moved = match('liga', '2026-07-13T00:00Z');
  const after = new Date('2026-07-09T06:00:00Z');
  const { posts } = planPosts([moved], s2, after);
  assert.deepEqual(posts.map((p) => `${p.type}:${p.match.id}`), ['fixture:liga']);
});

test('legacy single-slot announcedFixture state migrates without re-posting', () => {
  const league = match('liga', '2026-07-12T17:00Z');
  const legacy = {
    results: {},
    announcedFixture: {
      id: 'liga',
      fingerprint: fingerprint(league),
      name: 'LDU vs Rival',
      date: league.date,
    },
  };
  const { posts, state } = planPosts([league], legacy, NOW);
  assert.equal(posts.length, 0);
  assert.ok(state.fixtures.liga);
  assert.equal(state.announcedFixture, undefined);
});

test('long-past announced fixtures are pruned from state', () => {
  const old = match('old', '2026-05-01T00:00Z');
  const league = match('liga', '2026-07-12T17:00Z');
  const { state: s1 } = planPosts([old], null, new Date('2026-04-25T00:00Z'));
  const { state } = planPosts([league], s1, NOW);
  assert.equal(state.fixtures.old, undefined);
  assert.ok(state.fixtures.liga);
});

// Full interleaving of both sources across a week: every REAL next match is
// announced exactly once and in kickoff order; nothing re-posts when the
// "next" pointer swings between ESPN (league) and TheSportsDB (cup) matches.
test('lifecycle: league + cup interleave without duplicate or missing posts', () => {
  const liga12 = match('liga12', '2026-07-12T17:00Z');
  const liga15 = match('liga15', '2026-07-15T22:00Z');
  const seq = [];
  const run = (matches, state, at) => {
    const r = planPosts(matches, state, new Date(at));
    seq.push(...r.posts.map((p) => `${p.type}:${p.match.id}`));
    return r.state;
  };

  // Mon: only league fixtures exist → Sunday's match is announced.
  let st = run([liga12, liga15], null, '2026-07-06T12:00Z');
  // Tue: TheSportsDB publishes a cup match for Friday → new true next.
  const copa = { ...match('copa', '2026-07-10T01:00Z'), competitionType: 'copaecuador' };
  st = run([copa, liga12, liga15], st, '2026-07-07T12:00Z');
  // Re-run with identical data → must be silent.
  st = run([copa, liga12, liga15], st, '2026-07-08T12:00Z');
  // Fri during the cup match (live): Sunday is "next" again → still silent.
  const copaLive = { ...copa, state: 'in' };
  st = run([copaLive, liga12, liga15], st, '2026-07-10T01:30Z');
  // Fri late: cup finished → one result post, no fixture repost.
  const copaDone = {
    ...copa, state: 'post', completed: true,
    home: { ...copa.home, score: '1', winner: false },
    away: { ...copa.away, score: '1', winner: true },
  };
  st = run([copaDone, liga12, liga15], st, '2026-07-10T03:30Z');
  // Sun: league match finished → result + Wednesday announced as new next.
  const liga12Done = {
    ...liga12, state: 'post', completed: true,
    home: { ...liga12.home, score: '2', winner: true },
    away: { ...liga12.away, score: '0', winner: false },
  };
  st = run([copaDone, liga12Done, liga15], st, '2026-07-12T19:10Z');
  // Re-run → silent.
  st = run([copaDone, liga12Done, liga15], st, '2026-07-12T20:10Z');

  assert.deepEqual(seq, [
    'fixture:liga12',
    'fixture:copa',
    'result:copa',
    'result:liga12',
    'fixture:liga15',
  ]);
});

test('fingerprint changes with score, state and date', () => {
  const a = fingerprint(match('x', '2026-07-10T00:00Z'));
  const b = fingerprint(match('x', '2026-07-10T00:00Z', { state: 'post', completed: true, hs: '1', as: '0' }));
  const c = fingerprint(match('x', '2026-07-11T00:00Z'));
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});
