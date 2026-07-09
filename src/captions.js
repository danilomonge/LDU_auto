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

// The banks are short, original lines in the voice of the LDU hinchada
// (viejo amigo, Rey de Copas, Casa Blanca, Ponciano, Centrales, guambra),
// without copying full chants. Each closer is exactly two lines: a short
// status line plus a classic grito, so it reads like a real fan post
// instead of stacked poetry.
const GRITOS = [
  '¡Vamos, Liga!',
  '¡Liga, Liga, Liga!',
  '¡Somos la U!',
  '¡Arriba el Rey de Copas!',
  '¡Vamos, viejo amigo!',
  '¡Arriba los albos!',
  'Liga es Liga.',
  'Hincha de Liga desde guambra.',
  'Orgullosamente albo.',
  '¡Dale, Liga!',
  'Siempre Liga.',
  'Todos somos Liga.',
];

const FIXTURE_LINES = [
  'Hoy juega Liga.',
  'Día de partido.',
  'Hoy toca alentar a la U.',
  'La previa ya se siente en Quito.',
  'La blanca sale a la cancha.',
  'Que hable la cancha.',
  'Con la U a todas partes.',
  'Los Centrales ya viven la previa.',
  'Nos vemos en la cancha.',
  'Un partido más para alentar a Liga.',
  'Se viene un lindo partido.',
  'Todos con la U.',
  'Que ruede la pelota.',
  'La hinchada ya está lista.',
  'Quito amanece pensando en Liga.',
  'Salimos a ganar, como siempre.',
  'El Rey de Copas sale a la cancha.',
  'Vamos con fe.',
  'Partido a partido.',
  'A dejar todo por la camiseta.',
];

const WIN_LINES = [
  'Tres puntos más para la U.',
  'Qué lindo es ganar.',
  'Así da gusto.',
  'Triunfo albo.',
  'Esto es Liga.',
  'Se sufrió, pero se ganó.',
  'A seguir por este camino.',
  'El Rey de Copas hizo lo suyo.',
  'Victoria alba.',
  'Qué bien se duerme cuando gana Liga.',
  'Tres puntos que valen oro.',
  'La camiseta respondió.',
  'Fiesta en Ponciano.',
  'Sonríe la Casa Blanca.',
  'Otro triunfo para el viejo amigo.',
  'Que siga la racha.',
  'Bien, Liga, bien.',
  'Se festeja hoy, mañana a pensar en lo que viene.',
];

const DRAW_LINES = [
  'Sabor a poco.',
  'Un punto y a seguir.',
  'No era el resultado que queríamos.',
  'Da iras, pero seguimos.',
  'La U merecía más.',
  'Empate que no conforma.',
  'Punto que suma, pero no alcanza.',
  'Seguimos en la pelea.',
  'Ni modo, a seguir alentando.',
  'La próxima se gana.',
  'Faltó el gol, no el aliento.',
  'Hay que mejorar, así de simple.',
  'Nadie dijo que era fácil.',
  'Se sigue sumando.',
  'Cabeza arriba y a lo que viene.',
  'Igual estamos con la U.',
  'A pensar en el próximo partido.',
  'A corregir y pensar en lo que viene.',
];

const LOSS_LINES = [
  'Duele, sí. Pero acá estamos.',
  'Ahora más que nunca.',
  'En las buenas y en las malas.',
  'Da iras perder así.',
  'A levantarse rápido.',
  'No se abandona.',
  'La U se levanta, siempre lo ha hecho.',
  'Mal partido, mismo sentimiento.',
  'A dar vuelta la página.',
  'El hincha siempre está.',
  'Toca responder en la cancha.',
  'De Liga no se baja nadie.',
  'Tocó perder, toca volver.',
  'Con más razón, a alentar.',
  'Esto se arregla ganando.',
  'La camiseta exige reaccionar.',
  'Tranquilos, esto es largo.',
  'Seguimos con la U, como siempre.',
];

const STANDINGS_LINES = [
  'Partido a partido.',
  'La tabla habla, la cancha decide.',
  'A seguir sumando.',
  'Paso a paso con la U.',
  'El objetivo está claro.',
  'Nada está dicho todavía.',
  'Se pelea hasta el final.',
  'La U sigue en carrera.',
  'Cada punto cuesta.',
  'Vamos por más.',
];

function buildCloserBank(statusLines) {
  const identity = /\b(Liga|alb[ao]s?|Casa Blanca|Ponciano|camiseta|viejo amigo|La U|Centrales|Rey de Copas|blanca)\b/i;
  return statusLines.flatMap((status) =>
    GRITOS.map((grito) => `${status}\n${grito}`)
  ).filter((line) => identity.test(line));
}

const FIXTURE_CLOSERS = buildCloserBank(FIXTURE_LINES); // 240
const RESULT_CLOSERS = {
  win: buildCloserBank(WIN_LINES), // 216
  draw: buildCloserBank(DRAW_LINES), // 216
  loss: buildCloserBank(LOSS_LINES), // 216
};
const STANDINGS_CLOSERS = buildCloserBank(STANDINGS_LINES); // 120

export const captionClosersForTest = {
  fixture: FIXTURE_CLOSERS,
  win: RESULT_CLOSERS.win,
  draw: RESULT_CLOSERS.draw,
  loss: RESULT_CLOSERS.loss,
  standings: STANDINGS_CLOSERS,
};

export function buildCaption(postType, match, extras = null) {
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
  // Cup ties decided from the spot: the 90' score alone would read wrong.
  const pens = match.penalties
    ? `\n🎯 Penales: ${match.penalties.home} - ${match.penalties.away}`
    : '';
  // LDU goalscorers (from the ESPN match summary), when available.
  const lduScorers = (match.lduIsHome ? extras?.scorers?.home : extras?.scorers?.away) || [];
  const goals = lduScorers.length
    ? `\n⚽️ ${lduScorers
        .map((s) => `${s.name}${s.og ? ' (AG)' : s.pen ? ' (P)' : ''} ${s.minutes.join(' ')}`)
        .join(' · ')}`
    : '';
  const closer = pick(RESULT_CLOSERS[outcome], match.id);
  return (
    `${opener} ${score}\n${comp.label}` +
    pens +
    goals +
    venue +
    `\n\n${closer}\n\n${comp.hashtags}`
  );
}

// Caption for the "tabla de posiciones" post. Deterministic per table state,
// so re-generating the same table is byte-identical.
export function buildStandingsCaption(standings, teamId = TEAM_ID) {
  const ldu = standings.entries.find((e) => e.team.id === teamId);
  const round = ldu?.played ?? Math.max(...standings.entries.map((e) => e.played));
  const leader = standings.entries[0];
  const lines = [`⚪️🔴 Así está la tabla de la LigaPro tras la fecha ${round}.`];
  if (ldu) {
    lines.push(`📊 LDU: ${ldu.rank}.º con ${ldu.points} puntos (${ldu.played} PJ, ${ldu.goalDiff} DG).`);
    if (ldu.rank !== 1 && leader) {
      lines.push(`🔝 Líder: ${cleanName(leader.team.shortName)} con ${leader.points} puntos.`);
    }
  }
  const closer = pick(STANDINGS_CLOSERS, `tabla-${round}-${ldu?.rank ?? ''}-${ldu?.points ?? ''}`);
  return (
    lines.join('\n') +
    `\n\n${closer}\n\n#LDU #LigaDeQuito #LigaPro #SerieA #TablaDePosiciones #FutbolEcuatoriano`
  );
}
