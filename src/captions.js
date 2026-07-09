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

// The banks are original lines built from real LDU hinchada motifs (Ponciano,
// Casa Blanca, viejo amigo, guambra, Centrales, Rey de Copas), without copying
// full chants. The generated closer is deterministic but can vary across tens
// of thousands of natural two/three-line combinations.
const CORE_HEART_LINES = [
  'Como te quiero, mi viejo amigo.',
  'Otra vez contigo, Liga querida.',
  'Mi viejo amigo, hoy volvemos a estar.',
  'Liga de mi vida, una vez más.',
  'Esto de Liga no se explica, se siente.',
  'Desde guambra con la blanca en el pecho.',
  'Desde que me acuerdo, siempre Liga.',
  'Hay amores que no se discuten.',
  'Mi corazón sabe de qué lado está.',
  'La U no se suelta nunca.',
  'Qué lindo es volver a pensarte todo el día.',
  'Albo querido, acá estamos otra vez.',
  'Una vida entera aprendiendo a quererte.',
  'La camiseta blanca no se mira de lejos.',
  'Con Liga se sufre, se canta y se vuelve.',
  'No es costumbre: es pertenencia.',
  'No es solo fútbol cuando juega Liga.',
  'Hay cosas que se heredan sin explicación.',
  'Liga es ese amor que vuelve cada semana.',
  'A veces alegría, a veces bronca, siempre Liga.',
  'Lo nuestro con Liga viene de lejos.',
  'Donde esté Liga, algo se mueve adentro.',
  'Esta locura alba no pide permiso.',
  'La semana cambia cuando juega la U.',
  'En esta casa se habla en blanco, rojo y azul.',
];

const PLACE_AND_HISTORY_LINES = [
  'Ponciano no es cualquier cancha.',
  'La Casa Blanca tiene memoria.',
  'Quito sabe cuando juega Liga.',
  'El Rey de Copas no vive de apodos; los defiende.',
  'Esta camiseta se hizo grande con noches así.',
  'En Ponciano se aprende a querer distinto.',
  'La U tiene historia y la historia exige.',
  'La blanca pesa porque atrás hay vida.',
  'La casona guarda alegrías que no se olvidan.',
  'Ser albo también es saber esperar.',
  'Centrales de nombre, albos de corazón.',
  'Liga no necesita gritar para pesar.',
  'El escudo ya habla antes del pitazo.',
  'Cada partido trae su propio nudo en la garganta.',
  'La historia no entra a la cancha, pero empuja.',
];

const FIXTURE_LINES = [
  'Que ruede la pelota y que hable la camiseta.',
  'Hoy toca jugar con memoria y presente.',
  'Ponciano sabe lo que pesa esta camiseta.',
  'Que la Casa Blanca empuje desde el primer minuto.',
  'Partido para entrar serios y salir más albos.',
  'Hoy no alcanza con estar: toca competir.',
  'Que se sienta Quito cuando salga Liga.',
  'Con fe, con cabeza y con el pecho albo.',
  'A jugar como pide la historia.',
  'La previa ya se vive con nervios de Liga.',
  'Que sea una de esas tardes que se quedan.',
  'La cancha espera, la hinchada también.',
  'Hoy hay que responderle al escudo.',
  'Que el rival sepa dónde está parado.',
  'La pelota dirá, pero el aliento ya está.',
  'A Ponciano se va con fe y exigencia.',
  'No importa el torneo: importa la camiseta.',
  'Que sea con carácter, como manda Liga.',
  'Hoy se vuelve a prender el corazón albo.',
  'Vamos por otra alegría, sin vender humo.',
  'Partido a partido, como se vive esto.',
  'Que Liga haga lo suyo y la gente lo de siempre.',
  'Desde temprano ya se siente distinto.',
  'Hoy la blanca tiene que hablar fuerte.',
  'Que el equipo entre sabiendo lo que representa.',
];

const WIN_LINES = [
  'Así se vuelve a casa con el pecho lleno.',
  'Triunfo de esos que se gritan distinto.',
  'Tres puntos y una sonrisa bien alba.',
  'Ganó Liga y la semana respira mejor.',
  'Cuando gana la U, todo pesa menos.',
  'Esto también es Liga: sufrir, empujar, ganar.',
  'La alegría tiene nombre y juega de blanco.',
  'Se disfruta, porque también costaba.',
  'Victoria para abrazar al viejo amigo.',
  'Qué lindo dormir con Liga ganando.',
  'La Casa Blanca sabe celebrar estas noches.',
  'Tres puntos para seguir creyendo con calma.',
  'Orgullo albo, sin perder la cabeza.',
  'Ganó Liga y Ponciano lo sabe.',
  'Hoy la camiseta respondió.',
  'Una alegría más para esta locura.',
  'Se ganó como se tenía que ganar.',
  'Esto se festeja con memoria y humildad.',
  'Partido trabajado, alegría completa.',
  'La U hizo lo suyo y el corazón también.',
  'Ganar con Liga nunca se vuelve rutina.',
  'Qué lindo verte ganar, viejo amigo.',
  'Triunfo para los que siempre están.',
  'Otra página chica, otro orgullo grande.',
  'Se festeja porque Liga importa.',
];

const DRAW_LINES = [
  'No alcanza, pero acá nadie se baja.',
  'Punto con bronca, camiseta intacta.',
  'Faltaron detalles; sobró aliento.',
  'Se suma, se corrige y se vuelve.',
  'Empatar con Liga deja ganas de más.',
  'La exigencia también es parte del amor.',
  'No era lo que queríamos, pero seguimos.',
  'Hay que mejorar, porque Liga obliga.',
  'La hinchada acompaña, pero también exige.',
  'Punto que sabe a tarea pendiente.',
  'Queda bronca; queda Liga.',
  'No se festeja, se analiza y se sigue.',
  'El viejo amigo merecía más hoy.',
  'A levantar la cabeza sin conformarse.',
  'La camiseta pide otra respuesta.',
  'Esto no termina acá; Liga nunca se mira de lejos.',
  'Hoy faltó cerrar lo que se peleó.',
  'La fe sigue, la vara también.',
  'Se vuelve con el alma medio cruzada.',
  'Hay empates que dejan trabajo para la semana.',
  'A esta historia se le pide más.',
  'No nos vamos felices, nos vamos presentes.',
  'El camino sigue y la exigencia también.',
  'Cuando no alcanza, toca hablar en la cancha.',
  'Liga merece más, y por eso duele.',
];

const LOSS_LINES = [
  'Duele porque Liga importa.',
  'Hoy pesa, mañana se vuelve.',
  'Se acompaña, pero se exige.',
  'La camiseta no permite acostumbrarse a perder.',
  'Bronca alba, amor intacto.',
  'A Liga no se la deja en una mala noche.',
  'Perder con esta camiseta siempre tiene que doler.',
  'Toca mirarse de frente y responder.',
  'No hay frase linda para esto: hay que mejorar.',
  'La hinchada está, la respuesta tiene que venir.',
  'Viejo amigo, hoy duele; igual acá estamos.',
  'La historia pide reacción.',
  'Esto se levanta jugando, no hablando.',
  'En las malas también se demuestra quién está.',
  'No se abandona, pero tampoco se tapa.',
  'A corregir rápido, porque Liga exige.',
  'La bronca también es amor por la camiseta.',
  'Que este golpe sirva para despertar.',
  'Hoy nos vamos golpeados, no ausentes.',
  'La U merece una respuesta a la altura.',
  'Cuando Liga cae, el pecho queda pesado.',
  'No se negocia el apoyo; tampoco la exigencia.',
  'Otra vez tocará volver y empujar.',
  'Hay derrotas que solo se curan respondiendo.',
  'Que duela, y que se note en el próximo.',
];

function buildCloserBank(statusLines) {
  const identity = /\b(Liga|alb[ao]s?|Casa Blanca|Ponciano|camiseta|viejo amigo|La U|Centrales|Rey de Copas|blanca)\b/i;
  return CORE_HEART_LINES.flatMap((heart) =>
    statusLines.flatMap((status) =>
      ['', ...PLACE_AND_HISTORY_LINES].map((place) =>
        [heart, status, place].filter(Boolean).join('\n')
      )
    )
  ).filter((line) => identity.test(line));
}

const STANDINGS_LINES = [
  'La tabla se mira con calma y exigencia.',
  'El campeonato se define partido a partido.',
  'La tabla habla, pero la cancha decide.',
  'Cada punto de esta tabla costó lo suyo.',
  'Se sigue el campeonato con la vara alta.',
  'Arriba se llega jugando, no mirando.',
  'La pelea por el título no da respiro.',
  'Esta tabla todavía tiene mucho por escribir.',
  'Los números acompañan, el aliento empuja.',
  'Fecha a fecha, la tabla toma forma.',
];

const FIXTURE_CLOSERS = buildCloserBank(FIXTURE_LINES); // 10,000
const RESULT_CLOSERS = {
  win: buildCloserBank(WIN_LINES), // 10,000
  draw: buildCloserBank(DRAW_LINES), // 10,000
  loss: buildCloserBank(LOSS_LINES), // 10,000
};
const STANDINGS_CLOSERS = buildCloserBank(STANDINGS_LINES); // 3,650

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
