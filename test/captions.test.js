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
  const caption = buildCaption('fixture', match('sample-ligapro-fix'));
  const line = closer(caption);
  const lines = closerLines(caption);
  assert.doesNotMatch(line, genericConOpener);
  assert.match(line, /\b(Liga|alb[ao]s?|hinchada|Casa Blanca|Ponciano|camiseta|viejo amigo|La U)\b/i);
  assert.ok(lines.length >= 2);
  for (const part of lines) assert.ok(part.length <= 80, `fixture line is too long: ${part}`);
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
    assert.match(line, /\b(Liga|alb[ao]s?|hinchada|Casa Blanca|Ponciano|camiseta|viejo amigo|La U)\b/i);
    assert.ok(lines.length >= 2);
    for (const part of lines) assert.ok(part.length <= 80, `result line is too long: ${part}`);
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
    assert.ok(new Set(lines).size >= 5000, `${name} should have at least 5000 unique closers`);
    for (const line of lines) {
      assert.ok(line.length <= 220, `${name} closer is too long: ${line}`);
      assert.doesNotMatch(line, genericConOpener);
      assert.match(line, /\b(Liga|alb[ao]s?|Casa Blanca|Ponciano|camiseta|viejo amigo|La U|Centrales|Rey de Copas|blanca)\b/i);
      for (const part of line.split('\n')) {
        assert.ok(part.length <= 80, `${name} closer line is too long: ${part}`);
      }
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
