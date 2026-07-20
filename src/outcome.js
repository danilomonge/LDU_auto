// Single source of truth for who won a completed match, shared by the caption
// text and the poster image so the two can never disagree.
//
// The SCORELINE is authoritative. ESPN publishes the final score at full time
// but only sets the per-side `winner` booleans a few minutes later, so a fresh
// 0-1 loss briefly carries both flags false — trusting those flags alone
// mislabels a decided game as a draw ("Empate."/"EMPATE"). This was the real
// LDU-vs-Leones incident (2026-07-18). A level score is broken by the penalty
// tally (cup ties); only when no numeric score exists at all do we fall back to
// ESPN's winner flags.

// Parse an ESPN/TheSportsDB score ("1", 1, " 2 " …) to an int, or null when it
// isn't a real number yet.
export function toScore(v) {
  if (v == null) return null;
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * @returns {{homeWon: boolean, awayWon: boolean, draw: boolean}}
 */
export function matchWinners(match) {
  const hs = toScore(match.home?.score);
  const as = toScore(match.away?.score);
  if (hs != null && as != null) {
    if (hs > as) return { homeWon: true, awayWon: false, draw: false };
    if (as > hs) return { homeWon: false, awayWon: true, draw: false };
    if (match.penalties) {
      const { home, away } = match.penalties;
      if (home > away) return { homeWon: true, awayWon: false, draw: false };
      if (away > home) return { homeWon: false, awayWon: true, draw: false };
    }
    return { homeWon: false, awayWon: false, draw: true };
  }
  // No usable score — fall back to ESPN's winner flags.
  const homeWon = match.home?.winner === true;
  const awayWon = match.away?.winner === true;
  return { homeWon, awayWon, draw: !homeWon && !awayWon };
}

// LDU-centric outcome for caption wording.
export function lduOutcome(match) {
  const { homeWon, awayWon, draw } = matchWinners(match);
  if (draw) return 'draw';
  const lduWon = match.lduIsHome ? homeWon : awayWon;
  return lduWon ? 'win' : 'loss';
}
