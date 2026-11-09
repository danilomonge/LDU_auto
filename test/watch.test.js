import test from 'node:test';
import assert from 'node:assert/strict';
import { nextCheckDelay, WATCH } from '../src/watch.js';

const KICKOFF = '2026-11-22T20:00Z';
const at = (minutes) => new Date(new Date(KICKOFF).getTime() + minutes * 60e3);
const sec = (minutes) => minutes * 60;
const stateWith = (extra = {}) => ({
  fixtures: { m1: { fingerprint: 'pre|||' + KICKOFF, name: 'LDU vs Aucas', date: KICKOFF } },
  results: {},
  ...extra,
});

test('nothing to watch far from any kickoff', () => {
  assert.equal(nextCheckDelay(stateWith(), [], at(-13 * 60)), null);
  assert.equal(nextCheckDelay({ fixtures: {}, results: {} }, [], at(0)), null);
  assert.equal(nextCheckDelay(null, [], at(0)), null);
});

// GitHub's cron can leave 4-9h between scheduled runs: any run in the lead
// window arms a wake-up for when the match should be over.
test('ahead of kickoff, the next check lands at the expected final whistle', () => {
  const settle = WATCH.settleMs / 60e3;
  assert.equal(nextCheckDelay(stateWith(), [], at(-60)), sec(60 + settle));
  assert.equal(nextCheckDelay(stateWith(), [], at(30)), sec(settle - 30));
});

test('a wake-up never sleeps past one GitHub job; a far kickoff re-arms', () => {
  assert.equal(nextCheckDelay(stateWith(), [], at(-12 * 60)), WATCH.maxSleepMs / 1000);
});

test('a wake-up just before the whistle still waits the minimum gap', () => {
  const settle = WATCH.settleMs / 60e3;
  assert.equal(nextCheckDelay(stateWith(), [], at(settle - 1)), WATCH.minSleepMs / 1000);
});

test('after the final whistle, polls until the result is recorded', () => {
  const poll = WATCH.pollMs / 1000;
  assert.equal(nextCheckDelay(stateWith(), [], at(120)), poll);
  const done = stateWith({ results: { m1: { posted: true, date: KICKOFF } } });
  assert.equal(nextCheckDelay(done, [], at(120)), null);
  assert.equal(nextCheckDelay(done, [], at(100)), null); // posted before the expected whistle
});

test('keeps polling while the result is still queued for publishing', () => {
  const recorded = stateWith({ results: { m1: { posted: true, date: KICKOFF } } });
  const poll = WATCH.pollMs / 1000;
  assert.equal(nextCheckDelay(recorded, [{ eventId: 'm1', type: 'result' }], at(150)), poll);
  assert.equal(nextCheckDelay(recorded, [{ eventId: 'other', type: 'fixture' }], at(150)), null);
});

test('keeps polling while the standings post is owed', () => {
  const owed = stateWith({
    results: { m1: { posted: true, date: KICKOFF } },
    standingsOwedSince: at(130).toISOString(),
  });
  assert.equal(nextCheckDelay(owed, [], at(150)), WATCH.pollMs / 1000);
});

// Postponed, date-only kickoffs, or a result ESPN never lists: the watch is a
// bounded window, never an endless chain of runs.
test('gives up once the window after kickoff has passed', () => {
  const end = WATCH.giveUpMs / 60e3;
  assert.equal(nextCheckDelay(stateWith(), [], at(end - 1)), WATCH.pollMs / 1000);
  assert.equal(nextCheckDelay(stateWith(), [], at(end)), null);
});

test('the soonest check across fixtures wins; bad dates are ignored', () => {
  const state = stateWith();
  state.fixtures.m0 = { name: 'Earlier', date: at(-200).toISOString() }; // awaiting its result
  state.fixtures.bad = { name: 'Broken', date: 'not a date' };
  assert.equal(nextCheckDelay(state, [], at(-60)), WATCH.pollMs / 1000);
});
