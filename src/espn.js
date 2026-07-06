// ESPN public API client: fetches LDU Quito fixtures and results across all
// configured competitions and normalizes them into plain match objects.

import { TEAM_ID, LEAGUES, classifyCompetition, HOME_VENUE } from './config.js';

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'ldu-post-bot/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function pickLogo(team, dark = false) {
  const logos = team.logos || [];
  if (dark) {
    const d = logos.find((l) => (l.rel || []).includes('dark'));
    if (d) return d.href;
  }
  const full = logos.find((l) => (l.rel || []).includes('default')) || logos[0];
  return full ? full.href : null;
}

function normalizeEvent(event, leagueSlug, leagueName) {
  const comp = event.competitions?.[0];
  if (!comp) return null;
  const competitors = comp.competitors || [];
  const home = competitors.find((c) => c.homeAway === 'home');
  const away = competitors.find((c) => c.homeAway === 'away');
  if (!home || !away) return null;

  const status = comp.status?.type || {};
  const scoreOf = (c) => {
    const s = c.score;
    if (s == null) return null;
    if (typeof s === 'object') return s.displayValue ?? (s.value != null ? String(s.value) : null);
    return String(s);
  };

  const isLduHome = home.team.id === TEAM_ID;
  let venueName = comp.venue?.fullName || null;
  let venueCity = comp.venue?.address?.city || null;
  let venueCountry = comp.venue?.address?.country || null;
  // ESPN sometimes omits the venue for future fixtures; LDU home games are
  // always at Rodrigo Paz Delgado.
  if (!venueName && isLduHome) {
    venueName = HOME_VENUE.name;
    venueCity = HOME_VENUE.city;
    venueCountry = 'Ecuador';
  }
  // Normalize ESPN's unprefixed venue names ("Rodrigo Paz Delgado").
  if (venueName && !/estadio|arena|stadium|coliseo/i.test(venueName)) {
    venueName = `Estadio ${venueName}`;
  }

  const teamInfo = (c) => ({
    id: c.team.id,
    name: c.team.displayName,
    shortName: c.team.shortDisplayName || c.team.displayName,
    abbrev: c.team.abbreviation || '',
    logo: pickLogo(c.team, false),
    logoDark: pickLogo(c.team, true),
    winner: c.winner === true,
    score: scoreOf(c),
  });

  return {
    id: event.id,
    date: event.date, // ISO UTC
    league: leagueSlug,
    leagueName,
    competitionType: classifyCompetition(leagueSlug, leagueName),
    state: status.state || 'pre', // pre | in | post
    completed: status.completed === true,
    statusDetail: status.shortDetail || '',
    venue: venueName,
    city: venueCity,
    country: venueCountry,
    home: teamInfo(home),
    away: teamInfo(away),
    lduIsHome: isLduHome,
  };
}

async function fetchLeagueSchedule(league) {
  const out = [];
  for (const fixture of [false, true]) {
    const url = `${BASE}/${league}/teams/${TEAM_ID}/schedule${fixture ? '?fixture=true' : ''}`;
    try {
      const data = await fetchJson(url);
      const leagueName = data.season?.displayName || data.team?.groups?.name || league;
      for (const ev of data.events || []) {
        const m = normalizeEvent(ev, league, ev.season?.displayName || leagueName);
        if (m) out.push(m);
      }
    } catch {
      // League not available on ESPN (404) or transient failure — skip.
    }
  }
  return out;
}

// Fetch every match (played + upcoming) across all configured leagues,
// de-duplicated by event id, sorted by date ascending.
export async function fetchAllMatches() {
  const results = await Promise.all(LEAGUES.map((l) => fetchLeagueSchedule(l)));
  const byId = new Map();
  for (const m of results.flat()) {
    const prev = byId.get(m.id);
    // Prefer the entry with scores/final status if duplicated.
    if (!prev || (m.state === 'post' && prev.state !== 'post')) byId.set(m.id, m);
  }
  return [...byId.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Download a logo and return it as a base64 data URI (inlined into the HTML
// template so rendering never depends on hotlinking).
export async function fetchLogoDataUri(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}
