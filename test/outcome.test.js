// Contract for the shared, score-first outcome helper (src/outcome.js) — the
// single source of truth behind both the caption wording and the poster image.
import test from 'node:test';
import assert from 'node:assert/strict';
import { matchWinners, lduOutcome, toScore } from '../src/outcome.js';

const match = ({ hs, as, hWin = false, aWin = false, penalties, lduIsHome = true }) => ({
  home: { score: hs, winner: hWin },
  away: { score: as, winner: aWin },
  lduIsHome, penalties,
});

test('toScore parses real numbers and rejects blanks', () => {
  assert.equal(toScore('0'), 0);
  assert.equal(toScore(2), 2);
  assert.equal(toScore(' 3 '), 3);
  assert.equal(toScore(null), null);
  assert.equal(toScore(undefined), null);
  assert.equal(toScore(''), null);
});

test('matchWinners decides from the scoreline, ignoring stale winner flags', () => {
  assert.deepEqual(matchWinners(match({ hs: '0', as: '1' })), { homeWon: false, awayWon: true, draw: false });
  assert.deepEqual(matchWinners(match({ hs: '2', as: '1' })), { homeWon: true, awayWon: false, draw: false });
  assert.deepEqual(matchWinners(match({ hs: '1', as: '1' })), { homeWon: false, awayWon: false, draw: true });
});

test('matchWinners breaks a level score with penalties', () => {
  assert.deepEqual(
    matchWinners(match({ hs: '1', as: '1', penalties: { home: 5, away: 4 } })),
    { homeWon: true, awayWon: false, draw: false }
  );
  assert.deepEqual(
    matchWinners(match({ hs: '2', as: '2', penalties: { home: 2, away: 4 } })),
    { homeWon: false, awayWon: true, draw: false }
  );
});

test('matchWinners falls back to winner flags only when no score exists', () => {
  assert.deepEqual(matchWinners(match({ hs: null, as: null, aWin: true })), { homeWon: false, awayWon: true, draw: false });
  assert.deepEqual(matchWinners(match({ hs: null, as: null })), { homeWon: false, awayWon: false, draw: true });
});

test('lduOutcome maps the winners to LDU perspective for either side', () => {
  assert.equal(lduOutcome(match({ hs: '0', as: '1', lduIsHome: true })), 'loss'); // Leones
  assert.equal(lduOutcome(match({ hs: '0', as: '1', lduIsHome: false })), 'win');
  assert.equal(lduOutcome(match({ hs: '1', as: '1' })), 'draw');
  assert.equal(lduOutcome(match({ hs: '1', as: '1', lduIsHome: true, penalties: { home: 4, away: 2 } })), 'win');
});
