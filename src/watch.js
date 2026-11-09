// Match-day watch: when should the next pipeline run happen?
//
// GitHub has been firing scheduled workflows only every ~4-9h since 2026-09
// (platform-wide load shedding; cron minutes don't fix it), so results kept
// going out hours after the final whistle — 7.5h for LDU vs U. Católica on
// 2026-11-05. Around an LDU match the workflow therefore re-dispatches itself
// on a short timer (.github/workflows/ldu-wakeup.yml) instead of waiting for
// the cron. The watch is strictly bounded per match, from WATCH.leadMs before
// kickoff to WATCH.giveUpMs after it, so a postponed match, a date-only
// kickoff, or a result ESPN never lists ends the chain instead of looping.

export const WATCH = {
  // Arm a wake-up once a kickoff is this close (covers the longest cron gaps).
  leadMs: 12 * 60 * 60 * 1000,
  // Kickoff → earliest plausible final whistle: 90' + half-time + stoppage.
  settleMs: 105 * 60 * 1000,
  // Re-check cadence while a result (or its follow-up posts) is still owed.
  pollMs: 15 * 60 * 1000,
  // Stop watching a match this long after its listed kickoff.
  giveUpMs: 8 * 60 * 60 * 1000,
  // One sleep must fit inside a GitHub-hosted job (6h limit).
  maxSleepMs: 5.5 * 60 * 60 * 1000,
  // Never re-dispatch back-to-back.
  minSleepMs: 5 * 60 * 1000,
};

/**
 * Seconds until the next pipeline run should happen, or null when no
 * announced LDU match needs watching. A match is still owed while its result
 * isn't recorded, its posts are still queued for publishing, or the standings
 * table that follows a result is deferred (state.standingsOwedSince).
 */
export function nextCheckDelay(state, pending = [], now = new Date()) {
  const results = state?.results || {};
  const queued = new Set((pending || []).map((p) => p.eventId));
  let best = null;
  for (const [id, f] of Object.entries(state?.fixtures || {})) {
    const sinceKickoff = now - new Date(f.date);
    if (!Number.isFinite(sinceKickoff)) continue;
    if (sinceKickoff < -WATCH.leadMs || sinceKickoff >= WATCH.giveUpMs) continue;
    const owed = !results[id] || queued.has(id) || Boolean(state.standingsOwedSince);
    if (!owed) continue;
    // Before the expected final whistle sleep until it; after it, poll.
    let waitMs = sinceKickoff < WATCH.settleMs ? WATCH.settleMs - sinceKickoff : WATCH.pollMs;
    waitMs = Math.min(Math.max(waitMs, WATCH.minSleepMs), WATCH.maxSleepMs);
    best = best === null ? waitMs : Math.min(best, waitMs);
  }
  return best === null ? null : Math.round(best / 1000);
}
