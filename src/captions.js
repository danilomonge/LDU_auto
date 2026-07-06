// Spanish Instagram captions per post type and outcome.

import { COMPETITION_TYPES, TEAM_ID, TIMEZONE } from './config.js';

const fmtTime = new Intl.DateTimeFormat('es-EC', {
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TIMEZONE,
});

// When ESPN marks the kickoff time as not confirmed (timeValid=false) the
// placeholder must not be converted to local time — format the day in UTC
// and show no time at all.
export function formatDayLine(dateIso, timeValid = true) {
  // "DOM 12 · JULIO" style for the poster.
  const d = new Date(dateIso);
  const parts = new Intl.DateTimeFormat('es-EC', {
    weekday: 'short', day: 'numeric', month: 'long',
    timeZone: timeValid ? TIMEZONE : 'UTC',
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value || '';
  return `${get('weekday').replace('.', '')} ${get('day')} · ${get('month')}`.toUpperCase();
}

export function formatTimeLine(dateIso, timeValid = true) {
  if (!timeValid) return null;
  return fmtTime.format(new Date(dateIso));
}

function lduOutcome(match) {
  const ldu = match.lduIsHome ? match.home : match.away;
  const rival = match.lduIsHome ? match.away : match.home;
  if (ldu.winner) return 'win';
  if (rival.winner) return 'loss';
  return 'draw';
}

// ESPN disambiguates names like "Libertad (Ecuador)" — drop the parenthetical.
const cleanName = (s) => String(s).replace(/\s*\([^)]*\)\s*$/, '');

// Deterministic pick from a fixed set of short lines, keyed off the match id
// so re-generating the same post is byte-identical, but different matches
// don't all read the same way.
function pick(list, seed) {
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

const FIXTURE_CLOSERS = ['¡Vamos Liga! 💪', '¡Con todo, Liga! 🔥', 'Nos vemos ahí. 🤍❤️'];
const RESULT_CLOSERS = {
  win: ['¡Vamos Liga! 🤍❤️', 'Así se hace. 🔥', '¡Grande, Liga! 🎉'],
  draw: ['Seguimos. 🤍❤️', 'A por el próximo. 💪'],
  loss: ['Arriba Liga. 🤍❤️', 'Se sigue. 💪'],
};

export function buildCaption(postType, match) {
  const comp = COMPETITION_TYPES[match.competitionType] || COMPETITION_TYPES.otra;
  const rival = match.home.id === TEAM_ID ? match.away : match.home;
  const verb = match.lduIsHome ? 'recibe a' : 'visita a';
  const score = `${cleanName(match.home.shortName)} ${match.home.score ?? '-'} - ${match.away.score ?? '-'} ${cleanName(match.away.shortName)}`;

  if (postType === 'fixture') {
    const timeValid = match.timeValid !== false;
    const day = new Intl.DateTimeFormat('es-EC', {
      weekday: 'long', day: 'numeric', month: 'long',
      timeZone: timeValid ? TIMEZONE : 'UTC',
    }).format(new Date(match.date));
    const time = timeValid ? `${fmtTime.format(new Date(match.date))} (Ecuador)` : 'Hora por confirmar';
    const venue = match.venue ? `\n🏟️ ${match.venue}${match.city ? `, ${match.city}` : ''}` : '';
    const closer = pick(FIXTURE_CLOSERS, match.id);
    return (
      `⚪️🔴 LDU ${verb} ${cleanName(rival.name)} · ${comp.label}` +
      `\n📅 ${day.charAt(0).toUpperCase() + day.slice(1)}` +
      `\n⏰ ${time}` +
      venue +
      `\n\n${closer}\n\n${comp.hashtags}`
    );
  }

  const outcome = lduOutcome(match);
  const opener = {
    win: '⚪️🔴 ¡Ganó Liga!',
    draw: '⚪️🔴 Empate.',
    loss: '⚪️🔴 Liga cayó.',
  }[outcome];
  const venue = match.venue ? `\n🏟️ ${match.venue}` : '';
  const closer = pick(RESULT_CLOSERS[outcome], match.id);
  return (
    `${opener} ${score}\n${comp.label}` +
    venue +
    `\n\n${closer}\n\n${comp.hashtags}`
  );
}
