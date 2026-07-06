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

// 200 closers per bucket (10 lead-ins × 20 clauses), formal tone, no emoji —
// the only emoji in the whole caption is the fixed ⚪️🔴 header marker.
const cartesian = (leadIns, clauses) => leadIns.flatMap((a) => clauses.map((b) => `${a}, ${b}`));

const FIXTURE_LEADINS = [
  'Con confianza', 'Con determinación', 'Con el respaldo de la hinchada', 'Con paso firme',
  'Con trabajo y disciplina', 'Con el mismo compromiso', 'Con la mente en el objetivo', 'Con responsabilidad',
  'Con unión y esfuerzo', 'Con convicción',
];
const FIXTURE_CLAUSES = [
  'vamos por los tres puntos.', 'seguimos avanzando.', 'vamos con todo.', 'el equipo está listo.',
  'la hinchada acompaña.', 'se define en la cancha.', 'cada partido cuenta.', 'el objetivo es claro.',
  'se juega hasta el final.', 'el esfuerzo no se negocia.', 'la meta sigue firme.', 'se respeta a cada rival.',
  'vamos paso a paso.', 'el compromiso es total.', 'se trabaja para ganar.', 'la constancia es clave.',
  'el resultado se construye.', 'la unión hace la fuerza.', 'se cree en el equipo.', 'vamos Liga.',
];

const WIN_LEADINS = [
  'Con orgullo', 'Con satisfacción', 'Con el trabajo bien hecho', 'Con la hinchada feliz',
  'Con méritos propios', 'Con constancia', 'Con la mira en lo que viene', 'Con el equipo unido',
  'Con paso firme', 'Con la camiseta en alto',
];
const WIN_CLAUSES = [
  'se suma un triunfo más.', 'el esfuerzo dio resultado.', 'el equipo respondió en la cancha.',
  'se celebra este resultado.', 'la victoria se construyó en equipo.', 'se avanza en la tabla.',
  'el objetivo sigue firme.', 'la hinchada disfruta este triunfo.', 'el trabajo se refleja en resultados.',
  'la constancia dio sus frutos.', 'cada punto suma.', 'el compromiso se nota en la cancha.',
  'se mantiene el buen nivel.', 'la unión hace la diferencia.', 'el camino sigue firme.',
  'se agradece el apoyo de siempre.', 'la meta sigue en marcha.', 'el esfuerzo del equipo se reconoce.',
  'la Liga sigue firme.', 'vamos por más.',
];

const DRAW_LEADINS = [
  'Con altura', 'Con respeto por el rival', 'Con la mente en el próximo desafío', 'Con el trabajo de siempre',
  'Con la calma necesaria', 'Con paso firme', 'Con la unión de siempre', 'Con la mira en el objetivo',
  'Con serenidad', 'Con confianza en el proceso',
];
const DRAW_CLAUSES = [
  'se suma un punto más.', 'el equipo sigue en la pelea.', 'se corrigen los detalles.',
  'la meta sigue firme.', 'se trabaja para el próximo partido.', 'el esfuerzo se mantiene.',
  'la constancia es el camino.', 'se avanza paso a paso.', 'el objetivo sigue vigente.',
  'la unión sigue intacta.', 'se agradece el apoyo constante.', 'el compromiso no cambia.',
  'se sigue trabajando en equipo.', 'la Liga sigue firme.', 'el proceso continúa.',
  'se mantiene el enfoque.', 'cada punto cuenta.', 'se respeta el esfuerzo realizado.',
  'la disciplina sigue firme.', 'vamos por el próximo.',
];

const LOSS_LEADINS = [
  'Con la frente en alto', 'Con respeto por el esfuerzo', 'Con el apoyo de siempre', 'Con la mente en el próximo desafío',
  'Con la unión de siempre', 'Con serenidad', 'Con confianza en el proceso', 'Con paso firme',
  'Con la camiseta en alto', 'Con la hinchada de siempre',
];
const LOSS_CLAUSES = [
  'se sigue trabajando para revertir el momento.', 'el equipo se levanta y sigue.',
  'se corrigen los errores para el próximo partido.', 'el compromiso no cambia.', 'la Liga sigue firme.',
  'se mantiene el respaldo de siempre.', 'el esfuerzo se reconoce.', 'la constancia no se pierde.',
  'el objetivo sigue firme.', 'se trabaja para el próximo desafío.', 'la unión sigue intacta.',
  'se agradece el apoyo constante.', 'el proceso continúa.', 'el equipo sigue de pie.',
  'la disciplina sigue firme.', 'cada partido es una oportunidad.', 'se respeta el esfuerzo del equipo.',
  'la Liga no baja los brazos.', 'se sigue creyendo en el equipo.', 'vamos por el próximo reto.',
];

const FIXTURE_CLOSERS = cartesian(FIXTURE_LEADINS, FIXTURE_CLAUSES); // 200
const RESULT_CLOSERS = {
  win: cartesian(WIN_LEADINS, WIN_CLAUSES), // 200
  draw: cartesian(DRAW_LEADINS, DRAW_CLAUSES), // 200
  loss: cartesian(LOSS_LEADINS, LOSS_CLAUSES), // 200
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
