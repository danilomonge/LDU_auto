// Spanish Instagram captions per post type and outcome.

import { COMPETITION_TYPES, TEAM_ID, TIMEZONE } from './config.js';

const fmtDay = new Intl.DateTimeFormat('es-EC', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: TIMEZONE,
});
const fmtTime = new Intl.DateTimeFormat('es-EC', {
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TIMEZONE,
});

export function formatDayLine(dateIso) {
  // "DOM 12 · JULIO" style for the poster.
  const d = new Date(dateIso);
  const parts = new Intl.DateTimeFormat('es-EC', {
    weekday: 'short', day: 'numeric', month: 'long', timeZone: TIMEZONE,
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value || '';
  return `${get('weekday').replace('.', '')} ${get('day')} · ${get('month')}`.toUpperCase();
}

export function formatTimeLine(dateIso) {
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

export function buildCaption(postType, match) {
  const comp = COMPETITION_TYPES[match.competitionType] || COMPETITION_TYPES.otra;
  const rival = match.home.id === TEAM_ID ? match.away : match.home;
  const where = match.lduIsHome ? 'en casa' : 'de visita';
  const score = `${cleanName(match.home.shortName)} ${match.home.score ?? '-'} - ${match.away.score ?? '-'} ${cleanName(match.away.shortName)}`;

  if (postType === 'fixture') {
    const day = fmtDay.format(new Date(match.date));
    const time = fmtTime.format(new Date(match.date));
    const venue = match.venue ? `\n🏟️ ${match.venue}${match.city ? `, ${match.city}` : ''}` : '';
    return (
      `⚪️🔵 ¡Se viene un nuevo reto! LDU enfrenta a ${cleanName(rival.name)} ${where} por ${comp.label}.` +
      `\n\n📅 ${day.charAt(0).toUpperCase() + day.slice(1)}` +
      `\n⏰ ${time} (Ecuador)` +
      venue +
      `\n\n¡Vamos Liga! 💪\n\n${comp.hashtags}`
    );
  }

  const outcome = lduOutcome(match);
  const opener = {
    win: `⚪️🔵 ¡VICTORIA DE LIGA! 🎉`,
    draw: `⚪️🔵 Reparto de puntos.`,
    loss: `⚪️🔵 No se pudo esta vez.`,
  }[outcome];
  const closer = {
    win: '¡Vamos Liga, siempre contigo! 🤍💙',
    draw: 'Seguimos trabajando. ¡Vamos Liga! 🤍💙',
    loss: 'A levantar la cabeza, el equipo te necesita. 🤍💙',
  }[outcome];
  const venue = match.venue ? `\n🏟️ ${match.venue}` : '';
  return (
    `${opener}\n\n${comp.label}\n📊 ${score}` +
    venue +
    `\n\n${closer}\n\n${comp.hashtags}`
  );
}
