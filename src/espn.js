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
    // ESPN sets timeValid=false when only the day is known; the placeholder
    // time must then not be shown (nor shifted across timezones).
    timeValid: event.timeValid !== false,
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
    // Prefer final status; among equals prefer the entry that knows the venue.
    const better =
      !prev ||
      (m.state === 'post' && prev.state !== 'post') ||
      (m.state === prev.state && !prev.venue && !!m.venue);
    if (better) byId.set(m.id, m);
  }
  return [...byId.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
}

// --- Match extras: goalscorers + recent form (event summary endpoint) ------

// Scoring plays among key events. Shootout kicks and missed/saved penalties
// are not goals in the running score and must not be listed as scorers.
function isScoringEvent(typeText) {
  const t = String(typeText || '').toLowerCase();
  if (/(missed|saved|shootout)/.test(t)) return false;
  return t.includes('goal') || t.includes('penalty');
}

// Players are captioned by surname, football-graphic style: everything after
// the first given name ("Mateo Viera" → "Viera"); single-word names kept.
function surname(displayName) {
  const words = String(displayName || '').trim().split(/\s+/);
  return words.length > 1 ? words.slice(1).join(' ') : words[0] || '';
}

/**
 * Extract goalscorers from a summary's keyEvents, grouped per side and
 * aggregated per player: { home: [{name, minutes, og, pen}], away: [...] }.
 * `event.team` is the side credited with the goal on the scoreboard.
 */
export function extractScorers(keyEvents, homeId, awayId) {
  const sides = { [homeId]: [], [awayId]: [] };
  for (const ev of keyEvents || []) {
    const typeText = ev.type?.text || '';
    if (!isScoringEvent(typeText)) continue;
    const teamId = ev.team?.id;
    if (!sides[teamId]) continue;
    const athlete = (ev.participants || []).find((p) => p.athlete)?.athlete;
    const name = surname(athlete?.displayName) || '—';
    const minute = ev.clock?.displayValue || '';
    const og = /own goal/i.test(typeText);
    const pen = /penalty/i.test(typeText);
    const list = sides[teamId];
    const prev = list.find((s) => s.name === name && s.og === og && s.pen === pen);
    if (prev) prev.minutes.push(minute);
    else list.push({ name, minutes: [minute], og, pen });
  }
  return { home: sides[homeId], away: sides[awayId] };
}

/**
 * Extract W/D/L form from a summary's lastFiveGames, oldest → newest:
 * { home: ['W','D',…], away: […] }. ESPN lists most-recent first.
 */
export function extractForm(lastFiveGames, homeId, awayId) {
  const out = { home: [], away: [] };
  for (const entry of lastFiveGames || []) {
    const key = entry.team?.id === homeId ? 'home' : entry.team?.id === awayId ? 'away' : null;
    if (!key) continue;
    out[key] = (entry.events || [])
      .slice(0, 5)
      .map((e) => String(e.gameResult || '').toUpperCase())
      .filter((r) => ['W', 'D', 'L'].includes(r))
      .reverse();
  }
  return out;
}

// Fetch scorers + form for one match. Best-effort: any failure returns null
// and the poster renders exactly as it would without extras.
export async function fetchMatchExtras(match) {
  // Summary data only exists for ESPN events; cup matches come from
  // TheSportsDB and have no extras.
  if (match.source && match.source !== 'espn') return null;
  try {
    const data = await fetchJson(`${BASE}/${match.league}/summary?event=${match.id}`);
    return {
      scorers: extractScorers(data.keyEvents, match.home.id, match.away.id),
      form: extractForm(data.lastFiveGames, match.home.id, match.away.id),
    };
  } catch {
    return null;
  }
}

// --- League standings (LigaPro) --------------------------------------------

const STANDINGS_URL = 'https://site.api.espn.com/apis/v2/sports/soccer/ecu.1/standings';

/**
 * Choose which stage/group table to read from a standings payload. LigaPro
 * currently exposes a single stage, but a season split into etapas lists
 * several; prefer the stage that actually contains LDU (the table this account
 * is about), and among ties the last one — the most recent phase. Blindly
 * taking the FIRST stage would keep showing a finished etapa after the next
 * one has already started.
 */
export function selectStandingsStage(children = [], teamId = TEAM_ID) {
  const withEntries = (children || []).filter((c) => c.standings?.entries?.length);
  if (!withEntries.length) return null;
  const withLdu = withEntries.filter((c) =>
    c.standings.entries.some((e) => e.team?.id === teamId)
  );
  const pool = withLdu.length ? withLdu : withEntries;
  return pool[pool.length - 1];
}

/**
 * Normalize a raw ESPN standings payload into:
 * { seasonName, stageName, entries: [{rank, team:{id,name,shortName,abbrev,logo},
 *   played, wins, draws, losses, goalsFor, goalsAgainst, goalDiff, points}] }
 * Entries come sorted by rank. Pure (no network) so it can be unit tested.
 * Returns null when the table can't be trusted (no stage, or a missing rank).
 */
export function normalizeStandings(data, teamId = TEAM_ID) {
  const stage = selectStandingsStage(data?.children, teamId);
  if (!stage) return null;
  const stat = (e, name) => e.stats?.find((s) => s.name === name);
  const entries = (stage.standings.entries || [])
    .map((e) => ({
      rank: stat(e, 'rank')?.value ?? null,
      team: {
        id: e.team?.id,
        name: e.team?.displayName,
        shortName: e.team?.shortDisplayName || e.team?.displayName,
        abbrev: e.team?.abbreviation || '',
        logo: pickLogo(e.team, false),
      },
      played: stat(e, 'gamesPlayed')?.value ?? 0,
      wins: stat(e, 'wins')?.value ?? 0,
      draws: stat(e, 'ties')?.value ?? 0,
      losses: stat(e, 'losses')?.value ?? 0,
      goalsFor: stat(e, 'pointsFor')?.value ?? 0,
      goalsAgainst: stat(e, 'pointsAgainst')?.value ?? 0,
      goalDiff: stat(e, 'pointDifferential')?.displayValue || '0',
      points: stat(e, 'points')?.value ?? 0,
    }))
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  if (!entries.length || entries.some((e) => e.rank == null)) return null;
  return {
    seasonName: stage.standings.seasonDisplayName || 'LigaPro',
    stageName: stage.name || '',
    entries,
  };
}

// Fetch the LigaPro table, normalized (see normalizeStandings). Returns null
// on any network/parse failure so the caller renders nothing rather than junk.
export async function fetchStandings() {
  try {
    return normalizeStandings(await fetchJson(STANDINGS_URL));
  } catch {
    return null;
  }
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
