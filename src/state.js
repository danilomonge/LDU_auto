// Persistent state: which posts were generated / published.
// Lives in data/state.json (committed by the workflow).

import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from './config.js';

export function fingerprint(match) {
  return [match.state, match.home.score ?? '', match.away.score ?? '', match.date].join('|');
}

export function loadState() {
  try {
    return JSON.parse(fs.readFileSync(PATHS.state, 'utf8'));
  } catch {
    return null; // first run
  }
}

export function saveState(state) {
  fs.mkdirSync(path.dirname(PATHS.state), { recursive: true });
  fs.writeFileSync(PATHS.state, JSON.stringify(state, null, 2));
}

export function loadPending() {
  try {
    return JSON.parse(fs.readFileSync(PATHS.pending, 'utf8'));
  } catch {
    return [];
  }
}

export function savePending(pending) {
  fs.mkdirSync(path.dirname(PATHS.pending), { recursive: true });
  fs.writeFileSync(PATHS.pending, JSON.stringify(pending, null, 2));
}

/**
 * Decide which posts to generate, mirroring fan-account behavior:
 * - "Próximo partido": always the single next upcoming match. Re-posted only
 *   when it changes (new match becomes next, or kickoff was rescheduled).
 * - "Final del partido": once per newly-completed match. On the very first
 *   run only the most recent result is posted; older ones are baselined.
 * Returns { posts: [{match, type}], state } with state already updated.
 */
export function planPosts(matches, state, now = new Date()) {
  const first = state === null;
  if (first) state = {};
  state.results ||= {};
  const posts = [];

  const nextFixture = matches
    .filter((m) => m.state === 'pre' && new Date(m.date) > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  if (nextFixture) {
    const fp = fingerprint(nextFixture);
    const prev = state.announcedFixture;
    if (!prev || prev.id !== nextFixture.id || prev.fingerprint !== fp) {
      posts.push({ match: nextFixture, type: 'fixture' });
      state.announcedFixture = {
        id: nextFixture.id,
        fingerprint: fp,
        name: `${nextFixture.home.shortName} vs ${nextFixture.away.shortName}`,
        date: nextFixture.date,
      };
    }
  }

  // Only results that finished recently are announced; anything older that we
  // have never seen (e.g. ESPN backfilling a competition's history) is
  // baselined silently instead of being spammed to the feed.
  const MAX_RESULT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  const completed = matches
    .filter((m) => m.completed)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  for (const m of completed) {
    if (state.results[m.id]) continue;
    const isLatest = m.id === completed[completed.length - 1]?.id;
    const tooOld = now - new Date(m.date) > MAX_RESULT_AGE_MS;
    if ((first && !isLatest) || tooOld) {
      state.results[m.id] = { baselined: true, date: m.date };
      continue;
    }
    posts.push({ match: m, type: 'result' });
    state.results[m.id] = {
      posted: true,
      date: m.date,
      score: `${m.home.score}-${m.away.score}`,
      name: `${m.home.shortName} vs ${m.away.shortName}`,
    };
  }

  // Note: nothing volatile (e.g. timestamps) is stored, so a no-op run leaves
  // the state file byte-identical and the workflow commits nothing.
  return { posts, state };
}
