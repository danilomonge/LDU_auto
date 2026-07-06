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

test('fingerprint changes with score, state and date', () => {
  const a = fingerprint(match('x', '2026-07-10T00:00Z'));
  const b = fingerprint(match('x', '2026-07-10T00:00Z', { state: 'post', completed: true, hs: '1', as: '0' }));
  const c = fingerprint(match('x', '2026-07-11T00:00Z'));
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});
