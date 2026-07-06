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

// Lead-ins are pure tone-setters (no specific claim), so they combine
// cleanly with any clause in their bucket — chosen to share no root word
// with their clause bank, avoiding "Con respeto, se respeta..." repeats.
const FIXTURE_LEADINS = [
  'Con confianza', 'Con calma', 'Con determinación', 'Con humildad', 'Con respeto',
  'Con paciencia', 'Con enfoque', 'Con actitud', 'Con seriedad', 'Con convicción',
];
const FIXTURE_CLAUSES = [
  'vamos por los tres puntos.', 'el equipo sale a ganar.', 'toca sumar de a tres.',
  'la hinchada no falla.', 'se juega para ganar.', 'cada partido es una final.',
  'no hay margen para relajarse.', 'vamos con toda la garra.', 'el objetivo está claro.',
  'se juega de igual a igual.', 'la cancha dirá el resto.', 'vamos paso a paso.',
  'el equipo está listo.', 'se juega hasta el final.', 'toca hacer respetar la camiseta.',
  'vamos por el triunfo.', 'la meta no cambia: ganar.', 'se sale a competir sin miedo.',
  'cada punto cuenta desde ya.', 'vamos Liga.',
];

const WIN_LEADINS = [
  'Con orgullo', 'Con satisfacción', 'Con alegría', 'Con humildad', 'Con gratitud',
  'Con confianza', 'Con ilusión', 'Con la frente en alto', 'Con el trabajo bien hecho', 'Con espíritu ganador',
];
const WIN_CLAUSES = [
  'se disfruta el triunfo.', 'el esfuerzo dio sus frutos.', 'el equipo respondió en la cancha.',
  'se suma un triunfo más.', 'la hinchada sale feliz.', 'se avanza en la tabla.',
  'el esfuerzo se refleja en el resultado.', 'cada punto cuenta, y este se festeja.', 'la Liga sigue firme.',
  'vamos por más.', 'se celebra con altura.', 'el equipo dejó todo en la cancha.',
  'la victoria se construyó en equipo.', 'sigue la buena racha.', 'el aguante de siempre se hizo sentir.',
  'el marcador refleja el esfuerzo.', 'vamos con todo por el próximo.', 'se disfruta como se debe.',
  'el equipo creció con este triunfo.', 'vamos por más triunfos así.',
];

const DRAW_LEADINS = [
  'Con calma', 'Con paciencia', 'Con humildad', 'Con respeto', 'Con confianza',
  'Con serenidad', 'Con constancia', 'Con templanza', 'Con autocrítica', 'Con la mirada al frente',
];
const DRAW_CLAUSES = [
  'se suma, aunque no alcanzó.', 'el equipo sigue en la pelea.', 'se corrigen detalles para el próximo.',
  'un punto también cuenta.', 'la Liga sigue firme.', 'se trabaja para el próximo partido.',
  'no se pierde de vista el objetivo.', 'el esfuerzo estuvo, faltó un poco más.', 'se avanza, aunque sea de a poco.',
  'toca seguir sumando.', 'el punto también suma.', 'la hinchada sigue de pie.',
  'el próximo partido es la revancha.', 'se sigue en carrera.', 'no se relaja la exigencia.',
  'cada punto suma para el objetivo.', 'se aprende de cada partido.', 'la Liga no se rinde.',
  'vamos por los tres en el próximo.', 'se sigue trabajando en equipo.',
];

const LOSS_LEADINS = [
  'Con la frente en alto', 'Con respeto', 'Con humildad', 'Con calma', 'Con confianza',
  'Con paciencia', 'Con serenidad', 'Con autocrítica', 'Con esperanza', 'Con el apoyo de siempre',
];
const LOSS_CLAUSES = [
  'se levanta la cabeza y se sigue.', 'el equipo se repone y sigue.', 'se corrigen los errores.',
  'la hinchada no suelta la mano.', 'la Liga sigue firme.', 'toca revertir el momento.',
  'no se bajan los brazos.', 'el próximo partido es la oportunidad.', 'el esfuerzo se reconoce igual.',
  'se sigue creyendo en el equipo.', 'un mal resultado no define la temporada.', 'se trabaja para el próximo desafío.',
  'la hinchada sigue de pie.', 'se aprende y se sigue adelante.', 'el equipo no baja los brazos.',
  'toca reponerse cuanto antes.', 'la Liga vuelve más fuerte.', 'se sigue de pie, siempre.',
  'no se pierde la fe en el equipo.', 'vamos por la revancha.',
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
