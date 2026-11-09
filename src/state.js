// Persistent state: which posts were generated / published.
// Lives in data/state.json (committed by the workflow).

import fs from 'node:fs';
import path from 'node:path';
import { PATHS, TEAM_ID } from './config.js';

export function fingerprint(match) {
  return [match.state, match.home.score ?? '', match.away.score ?? '', match.date].join('|');
}

// A completed match whose final score ESPN hasn't filled in yet must not be
// posted: the caption would read "LDU - - -" and an undecided scoreline
// defaults to "Empate". True only once BOTH sides carry a real number.
export function hasSettledScore(match) {
  const isNum = (v) => Number.isFinite(parseInt(v, 10));
  return isNum(match.home?.score) && isNum(match.away?.score);
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
    // Defense in depth: defer a result whose score hasn't settled yet, leaving
    // it unrecorded so a later poll posts it once ESPN fills the score in.
    if (!hasSettledScore(m)) continue;
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
  //
  // The margin is a full day: back-to-back cards ("final del partido" then
  // "próximo partido" an hour later) read as a burst, and the next-match
  // announcement carries further when it has the feed to itself.
  const FIXTURE_MARGIN_MS = 24 * 60 * 60 * 1000;
  // …but spacing must never cost us the announcement altogether. Fixtures
  // land inside the 24h window all the time (a Sunday result before a
  // Wednesday cup tie is fine; a Saturday result before a Sunday match is
  // not), and waiting the margin out there would announce the match after it
  // had already kicked off. Inside this lead time the fixture goes out
  // regardless of how recently the result did.
  const KICKOFF_LEAD_MS = 12 * 60 * 60 * 1000;
  // How long after its listed kickoff a match can still be "in play" for the
  // feed. A match resolves within hours, but date-only kickoffs (TheSportsDB
  // 00:00Z, ESPN timeValid=false) can sit up to a day before the real one.
  const MATCH_WINDOW_MS = 30 * 60 * 60 * 1000;
  const inMatchWindow = (date) => {
    const t = now - new Date(date);
    return t >= 0 && t < MATCH_WINDOW_MS;
  };
  // Bounded by the window: TheSportsDB maps postponed/abandoned to 'in', and
  // such an entry must not freeze fixture announcements for as long as the
  // feed keeps listing it.
  const hasLiveMatch = matches.some((m) => m.state === 'in' && inMatchWindow(m.date));
  // A match past kickoff with no result recorded that the feed doesn't show
  // as live or finished: still listed 'pre' (status lag; date-only kickoffs),
  // or gone from both ESPN lists — right after the final whistle ESPN drops
  // it from ?fixture=true before adding it to the results (2026-11-09:
  // "próximo partido" went out before Barcelona 1-1 LDU). It holds the
  // pointer like a live match — but, being a guess from missing data, it
  // yields to an imminent kickoff like the spacing below does.
  const listed = new Set(matches.map((m) => m.id));
  const hasOverdueMatch = [
    ...matches.filter((m) => m.state === 'pre').map((m) => [m.id, m.date]),
    ...Object.entries(state.fixtures).filter(([id]) => !listed.has(id)).map(([id, f]) => [id, f.date]),
  ].some(([id, date]) => !state.results[id] && inMatchWindow(date));
  const resultRecentlyPosted = Object.values(state.results).some(
    (r) => r.posted && r.postedAt && now - new Date(r.postedAt) < FIXTURE_MARGIN_MS
  );
  // A just-finished match whose score hasn't settled (deferred above) is still
  // "in play" as far as the feed is concerned — don't announce the next fixture
  // over it, the same way a live match holds the pointer.
  const hasUnsettledResult = completed.some(
    (m) => !state.results[m.id] &&
      now - new Date(m.date) <= MAX_RESULT_AGE_MS &&
      !hasSettledScore(m)
  );
  const upcoming = matches
    .filter((m) => m.state === 'pre' && new Date(m.date) > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  // Only the spacing yields to an imminent kickoff. The live-match and
  // unsettled-score guards stay absolute: those exist to keep the feed from
  // talking over a match still being played, which no deadline justifies.
  const kickoffImminent = upcoming && new Date(upcoming.date) - now <= KICKOFF_LEAD_MS;
  const held = hasLiveMatch || hasUnsettledResult ||
    ((resultRecentlyPosted || hasOverdueMatch) && !kickoffImminent);
  const nextFixture = held ? undefined : upcoming;

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

// How long a deferred table stays owed (see planStandingsPost).
const STANDINGS_OWED_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Decide whether to post the league table. Posted only right after an LDU
 * LigaPro result went out (the natural "tabla tras la fecha" moment) and only
 * if the table actually changed since the last standings post — re-runs and
 * rescheduled result posts never duplicate it.
 *
 * `expectedPlayed` (LDU's completed LigaPro games we can already see in the
 * feed) guards against ESPN's aggregated table lagging the match that just
 * finished: if the fetched table shows FEWER LDU games than that, it hasn't
 * absorbed the result yet, so posting it would put out a "tabla desactualizada"
 * with the wrong fecha and points. In that case — or when the table can't be
 * fetched at all — we defer: state.standingsOwedSince marks the table as owed,
 * so later runs (which have no fresh result) keep retrying until ESPN catches
 * up, for at most STANDINGS_OWED_MS. Passing null skips the check.
 *
 * Mutates state; returns true when a standings post should be generated.
 */
export function planStandingsPost(standings, state, resultJustPosted, expectedPlayed = null, now = new Date()) {
  // Past the limit the next fecha's result brings a fresh table anyway.
  if (state.standingsOwedSince && !(now - new Date(state.standingsOwedSince) < STANDINGS_OWED_MS)) {
    delete state.standingsOwedSince;
  }
  if (!resultJustPosted && !state.standingsOwedSince) return false;
  const defer = () => {
    state.standingsOwedSince ||= now.toISOString();
    return false;
  };
  if (!standings) return defer();
  if (expectedPlayed != null) {
    const ldu = standings.entries.find((e) => e.team.id === TEAM_ID);
    if (ldu && ldu.played != null && ldu.played < expectedPlayed) return defer();
  }
  delete state.standingsOwedSince;
  const fp = standingsFingerprint(standings);
  if (state.standings?.fingerprint === fp) return false;
  state.standings = { fingerprint: fp };
  return true;
}
