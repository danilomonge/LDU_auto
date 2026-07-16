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
 * - "Próximo partido": always the single next upcoming match across ALL
 *   sources (ESPN + TheSportsDB cups). Announced fixtures are remembered per
 *   match id, so when a cup game slots in before an already-announced league
 *   game (or a source blips out and back), the pointer moving between them
 *   never re-posts a fixture — only a genuine reschedule does.
 * - "Final del partido": once per newly-completed match. On the very first
 *   run only the most recent result is posted; older ones are baselined.
 * Returns { posts: [{match, type}], state } with state already updated.
 */
export function planPosts(matches, state, now = new Date()) {
  const first = state === null;
  if (first) state = {};
  state.results ||= {};
  state.fixtures ||= {};
  // Migrate the legacy single-slot shape (pre cup-support states).
  if (state.announcedFixture) {
    const p = state.announcedFixture;
    state.fixtures[p.id] ||= { fingerprint: p.fingerprint, name: p.name, date: p.date };
    delete state.announcedFixture;
  }
  const posts = [];

  // A past kickoff can never be "next" again (a real reschedule changes the
  // fingerprint anyway), so long-past entries only bloat the state file.
  const MAX_FIXTURE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  for (const [id, f] of Object.entries(state.fixtures)) {
    if (now - new Date(f.date) > MAX_FIXTURE_AGE_MS) delete state.fixtures[id];
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
      postedAt: now.toISOString(),
      score: `${m.home.score}-${m.away.score}`,
      name: `${m.home.shortName} vs ${m.away.shortName}`,
    };
  }

  // The fixture announcement is queued AFTER any results so the feed reads
  // chronologically: "final del partido" first, "próximo partido" on top.
  //
  // Two guards, covering different gaps:
  //  - While an LDU match is live (state 'in'), it has already dropped out
  //    of the 'pre' filter below, so without this the pointer would jump
  //    straight to the match AFTER it and announce that one mid-game.
  //  - A live match can also be missed entirely (a match can go straight
  //    'pre' → 'post' between two hourly polls, e.g. after workflow
  //    downtime), so the state-based guard alone isn't robust. Require a
  //    real wall-clock margin since the last result POSTED (not kickoff),
  //    giving that post room to actually land — retries, workflow delays,
  //    Graph API hiccups — before the feed moves on to the next fixture.
  const FIXTURE_MARGIN_MS = 2 * 60 * 60 * 1000;
  const hasLiveMatch = matches.some((m) => m.state === 'in');
  const resultRecentlyPosted = Object.values(state.results).some(
    (r) => r.posted && r.postedAt && now - new Date(r.postedAt) < FIXTURE_MARGIN_MS
  );
  const nextFixture = (hasLiveMatch || resultRecentlyPosted) ? undefined : matches
    .filter((m) => m.state === 'pre' && new Date(m.date) > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  if (nextFixture) {
    const fp = fingerprint(nextFixture);
    const prev = state.fixtures[nextFixture.id];
    if (!prev || prev.fingerprint !== fp) {
      posts.push({ match: nextFixture, type: 'fixture' });
      state.fixtures[nextFixture.id] = {
        fingerprint: fp,
        name: `${nextFixture.home.shortName} vs ${nextFixture.away.shortName}`,
        date: nextFixture.date,
      };
    }
  }

  // Note: volatile fields (postedAt) are only written when a post is planned,
  // so a no-op run leaves the state file byte-identical and the workflow
  // commits nothing.
  return { posts, state };
}

export function standingsFingerprint(standings) {
  return standings.entries
    .map((e) => `${e.rank}:${e.team.id}:${e.points}:${e.played}`)
    .join('|');
}

/**
 * Decide whether to post the league table. Posted only right after an LDU
 * LigaPro result went out (the natural "tabla tras la fecha" moment) and only
 * if the table actually changed since the last standings post — re-runs and
 * rescheduled result posts never duplicate it.
 * Mutates state; returns true when a standings post should be generated.
 */
export function planStandingsPost(standings, state, resultJustPosted) {
  if (!standings || !resultJustPosted) return false;
  const fp = standingsFingerprint(standings);
  if (state.standings?.fingerprint === fp) return false;
  state.standings = { fingerprint: fp };
  return true;
}
