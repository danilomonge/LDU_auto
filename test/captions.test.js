// Unit tests for caption tone and variety.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCaption, captionClosersForTest } from '../src/captions.js';

function match(id, overrides = {}) {
  const lduHome = overrides.lduIsHome ?? true;
  const ldu = {
    id: '4816',
    name: 'Liga de Quito',
    shortName: 'LDU',
    score: overrides.lduScore ?? null,
    winner: overrides.outcome === 'win',
  };
  const rival = {
    id: '1',
    name: 'Libertad (Ecuador)',
    shortName: 'Libertad (Ecuador)',
    score: overrides.rivalScore ?? null,
    winner: overrides.outcome === 'loss',
  };
  return {
    id,
    date: '2026-07-12T17:00Z',
    competitionType: overrides.competitionType ?? 'ligapro',
    state: overrides.postType === 'result' ? 'post' : 'pre',
    completed: overrides.postType === 'result',
    venue: overrides.venue ?? 'Estadio Rodrigo Paz Delgado',
    city: 'Quito',
    country: 'Ecuador',
    lduIsHome: lduHome,
    home: lduHome ? ldu : rival,
    away: lduHome ? rival : ldu,
  };
}

function closer(caption) {
  return caption.split('\n\n').at(-2);
}

function closerLines(caption) {
  return closer(caption).split('\n');
}

const genericConOpener = /^Con (confianza|calma|determinación|humildad|respeto|paciencia|enfoque|actitud|seriedad|convicción|orgullo|satisfacción|alegría|gratitud|ilusión|serenidad|constancia|templanza|autocrítica|esperanza)[,.]/i;

test('fixture caption uses a natural hinchada line instead of a rigid formula', () => {
  // Announced days before kickoff — must use the time-neutral bank.
  const daysBefore = new Date('2026-07-09T15:00Z');
  const caption = buildCaption('fixture', match('sample-ligapro-fix'), null, daysBefore);
  const line = closer(caption);
  const lines = closerLines(caption);
  assert.doesNotMatch(line, genericConOpener);
  assert.match(line, /\b(Liga|alb[ao]s?|hinchada|Casa Blanca|Ponciano|camiseta|viejo amigo|La U|Centrales|Rey de Copas|blanca)\b/i);
  assert.equal(lines.length, 1, `fixture closer must be a single line: ${line}`);
  for (const part of lines) assert.ok(part.length <= 60, `fixture line is too long: ${part}`);
  assert.ok(captionClosersForTest.fixture.includes(line), `not from the neutral bank: ${line}`);
});

test('fixture closer says "hoy" only when posted on the match day', () => {
  // The announcement usually goes out days early, so the neutral bank must
  // never claim the match is today.
  for (const line of captionClosersForTest.fixture) {
    assert.doesNotMatch(line, /\bhoy\b/i, `neutral fixture line claims "hoy": ${line}`);
  }
  // Same match, generated on match day (kickoff 12:00 Ecuador): matchday bank.
  const matchDay = new Date('2026-07-12T15:00Z');
  const line = closer(buildCaption('fixture', match('sample-ligapro-fix'), null, matchDay));
  assert.ok(captionClosersForTest.matchday.includes(line), `not from the matchday bank: ${line}`);
  // Unconfirmed kickoff times can't back a same-day claim.
  const tbd = { ...match('sample-ligapro-fix'), timeValid: false };
  const tbdLine = closer(buildCaption('fixture', tbd, null, matchDay));
  assert.ok(captionClosersForTest.fixture.includes(tbdLine), `timeValid=false must use the neutral bank: ${tbdLine}`);
});

test('result captions keep the closer concise and tied to Liga', () => {
  for (const [outcome, scores] of Object.entries({
    win: { lduScore: '2', rivalScore: '0' },
    draw: { lduScore: '1', rivalScore: '1' },
    loss: { lduScore: '0', rivalScore: '1' },
  })) {
    const caption = buildCaption('result', match(`result-${outcome}`, {
      postType: 'result',
      outcome,
      ...scores,
    }));
    const line = closer(caption);
    const lines = closerLines(caption);
    assert.doesNotMatch(line, genericConOpener);
    assert.match(line, /\b(Liga|alb[ao]s?|hinchada|Casa Blanca|Ponciano|camiseta|viejo amigo|La U|Centrales|Rey de Copas|blanca)\b/i);
    assert.equal(lines.length, 1, `result closer must be a single line: ${line}`);
    for (const part of lines) assert.ok(part.length <= 60, `result line is too long: ${part}`);
  }
});

test('caption banks have broad variety without burned-out filler or toxic rivalry copy', () => {
  const banned = [
    /cada partido es una final/i,
    /esp[ií]ritu ganador/i,
    /con la frente en alto/i,
    /se celebra con altura/i,
    /vamos Liga\.$/i,
    /\b(puta|puto|huevos|matar|muerte|droga|marihuana|torero|mono)\b/i,
  ];

  for (const [name, lines] of Object.entries(captionClosersForTest)) {
    const minUnique = { standings: 45, matchday: 80 }[name] ?? 100;
    assert.ok(new Set(lines).size >= minUnique, `${name} should have at least ${minUnique} unique closers`);
    assert.equal(new Set(lines).size, lines.length, `${name} bank contains duplicate lines`);
    for (const line of lines) {
      assert.ok(!line.includes('\n'), `${name} closer must be a single line: ${line}`);
      assert.ok(line.length <= 60, `${name} closer is too long: ${line}`);
      assert.doesNotMatch(line, genericConOpener);
      // Every closer must name the team — no generic motivational filler.
      assert.match(line, /\b(Liga|alb[ao]s?|Casa Blanca|Ponciano|camiseta|viejo amigo|La U|Centrales|Rey de Copas|blanca)\b/i);
      for (const pattern of banned) assert.doesNotMatch(line, pattern);
    }
  }
});

test('caption banks include researched LDU fan motifs', () => {
  const all = Object.values(captionClosersForTest).flat().join('\n');
  for (const pattern of [
    /viejo amigo/i,
    /guambra/i,
    /Ponciano/i,
    /Casa Blanca/i,
    /Rey de Copas/i,
    /Centrales/i,
    /La U/i,
  ]) {
    assert.match(all, pattern);
  }
});
