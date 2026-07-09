// TheSportsDB client: covers the competitions ESPN has no data for
// (Copa Ecuador and Supercopa Ecuador — ESPN's API only carries ecu.1).
// Free tier, no credentials. Events are normalized to the same match shape
// produced by src/espn.js so the rest of the pipeline is source-agnostic.

import { TEAM_ID, TEAM_NAME, TEAM_SHORT, classifyCompetition } from './config.js';

const BASE = 'https://www.thesportsdb.com/api/v1/json/123';
export const SPORTSDB_TEAM_ID = '138227'; // LDU Quito on TheSportsDB

// Only leagues ESPN does NOT cover. LigaPro etc. stay ESPN-only so the same
// real-world match can never be posted twice under two different event ids.
export const CUP_LEAGUE_IDS = new Set([
  '5636', // Copa Ecuador
  '5884', // Supercopa Ecuador
]);

const FINISHED = new Set(['FT', 'AET', 'AP', 'PEN', 'MATCH FINISHED']);
const SCHEDULED = new Set(['', 'NS', 'TBD', 'NOT STARTED']);

const initials = (name) =>
  String(name || '')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

export function normalizeSportsDbEvent(ev) {
  if (!ev || !CUP_LEAGUE_IDS.has(String(ev.idLeague))) return null;

  const status = String(ev.strStatus || '').toUpperCase();
  // Anything neither finished nor scheduled (live, postponed, abandoned…)
  // maps to 'in': planPosts ignores it, so it can never trigger a post.
  const state = FINISHED.has(status) ? 'post' : SCHEDULED.has(status) ? 'pre' : 'in';

  const ts = ev.strTimestamp || `${ev.dateEvent}T${ev.strTime || '00:00:00'}`;
  const date = ts.endsWith('Z') ? ts : `${ts}Z`;
  // TheSportsDB has no explicit "time confirmed" flag; a 00:00:00 UTC kickoff
  // almost always means the hour is unknown, so fail safe and hide it.
  const timeValid = !!ev.strTime && ev.strTime !== '00:00:00';

  const homeScore = ev.intHomeScore == null ? null : Number(ev.intHomeScore);
  const awayScore = ev.intAwayScore == null ? null : Number(ev.intAwayScore);
  // On penalty shootouts (AP/PEN) the Extra fields hold the shootout score.
  const shootout = ['AP', 'PEN'].includes(status) && ev.intHomeScoreExtra != null;
  const penalties = shootout
    ? { home: Number(ev.intHomeScoreExtra), away: Number(ev.intAwayScoreExtra) }
    : null;

  const completed = state === 'post';
  const decided = (side) => {
    if (!completed || homeScore == null || awayScore == null) return false;
    if (homeScore !== awayScore) return side === 'home' ? homeScore > awayScore : awayScore > homeScore;
    if (!penalties) return false;
    return side === 'home' ? penalties.home > penalties.away : penalties.away > penalties.home;
  };

  const team = (name, id, badge, side) => {
    const isLdu = String(id) === SPORTSDB_TEAM_ID;
    return {
      id: isLdu ? TEAM_ID : `tsdb-${id}`,
      name: isLdu ? TEAM_NAME : name,
      shortName: isLdu ? TEAM_SHORT : name,
      abbrev: isLdu ? TEAM_SHORT : initials(name),
      logo: badge || null,
      logoDark: null,
      winner: decided(side),
      score: (side === 'home' ? homeScore : awayScore) == null
        ? null
        : String(side === 'home' ? homeScore : awayScore),
    };
  };

  let venue = ev.strVenue || null;
  if (venue && !/estadio|arena|stadium|coliseo/i.test(venue)) venue = `Estadio ${venue}`;

  return {
    id: `tsdb-${ev.idEvent}`,
    date,
    timeValid,
    league: `tsdb.${ev.idLeague}`,
    leagueName: ev.strLeague,
    competitionType: classifyCompetition(`tsdb.${ev.idLeague}`, ev.strLeague || ''),
    state,
    completed,
    statusDetail: ev.strStatus || '',
    venue,
    city: ev.strCity || null,
    country: ev.strCountry || null,
    home: team(ev.strHomeTeam, ev.idHomeTeam, ev.strHomeTeamBadge, 'home'),
    away: team(ev.strAwayTeam, ev.idAwayTeam, ev.strAwayTeamBadge, 'away'),
    lduIsHome: String(ev.idHomeTeam) === SPORTSDB_TEAM_ID,
    penalties,
    source: 'sportsdb',
  };
}

// Fetch LDU's recent + upcoming cup matches (Copa Ecuador / Supercopa).
// Best-effort like the ESPN client: any failure yields [] so a TheSportsDB
// outage can never break the LigaPro feed.
export async function fetchCupMatches() {
  const events = [];
  for (const endpoint of ['eventslast', 'eventsnext']) {
    try {
      const res = await fetch(`${BASE}/${endpoint}.php?id=${SPORTSDB_TEAM_ID}`, {
        headers: { 'User-Agent': 'ldu-post-bot/1.0' },
      });
      if (!res.ok) continue;
      const data = await res.json();
      events.push(...(data.results || data.events || []));
    } catch {
      // Transient failure — skip.
    }
  }
  const byId = new Map();
  for (const ev of events) {
    const m = normalizeSportsDbEvent(ev);
    if (!m) continue;
    const prev = byId.get(m.id);
    if (!prev || (m.state === 'post' && prev.state !== 'post')) byId.set(m.id, m);
  }
  return [...byId.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
}
