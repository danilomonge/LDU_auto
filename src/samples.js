// Fabricated matches for design previews: one fixture + one result for every
// competition type, using real ESPN logos.

const LOGO = (id) => `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;
const LOGO_DARK = (id) => `https://a.espncdn.com/i/teamlogos/soccer/500-dark/${id}.png`;

const team = (id, name, shortName, abbrev) => ({
  id, name, shortName, abbrev,
  logo: LOGO(id), logoDark: LOGO_DARK(id),
  winner: false, score: null,
});

const LDU = () => team('4816', 'Liga de Quito', 'LDU', 'LDU');
const RIVALS = {
  ligapro: () => team('2686', 'Barcelona SC', 'Barcelona SC', 'BAR'),
  libertadores: () => team('16', 'River Plate', 'River Plate', 'RIV'),
  sudamericana: () => team('874', 'Corinthians', 'Corinthians', 'COR'),
  copaecuador: () => team('2668', 'Emelec', 'Emelec', 'EME'),
  supercopa: () => team('17086', 'Independiente del Valle', 'Ind. del Valle', 'IDV'),
  amistoso: () => team('20232', 'Inter Miami CF', 'Inter Miami', 'MIA'),
  otra: () => team('819', 'Flamengo', 'Flamengo', 'FLA'),
};

const VENUES = {
  ligapro: { venue: 'Estadio Rodrigo Paz Delgado', city: 'Quito', country: 'Ecuador' },
  libertadores: { venue: 'Estadio Monumental de Núñez', city: 'Buenos Aires', country: 'Argentina' },
  sudamericana: { venue: 'Estadio Rodrigo Paz Delgado', city: 'Quito', country: 'Ecuador' },
  copaecuador: { venue: 'Estadio George Capwell', city: 'Guayaquil', country: 'Ecuador' },
  supercopa: { venue: 'Estadio Olímpico Atahualpa', city: 'Quito', country: 'Ecuador' },
  amistoso: { venue: 'Chase Stadium', city: 'Fort Lauderdale', country: 'Estados Unidos' },
  otra: { venue: 'Estadio Maracaná', city: 'Río de Janeiro', country: 'Brasil' },
};

export function buildSampleMatches() {
  const out = [];
  let day = 10;
  for (const [type, rivalFn] of Object.entries(RIVALS)) {
    const { venue, city, country } = VENUES[type];
    const lduHome = ['ligapro', 'sudamericana', 'supercopa', 'copaecuador'].includes(type);

    // Fixture sample
    {
      const home = lduHome ? LDU() : rivalFn();
      const away = lduHome ? rivalFn() : LDU();
      out.push({
        type: 'fixture',
        match: {
          id: `sample-${type}-fix`,
          date: `2026-08-${String(day).padStart(2, '0')}T00:30Z`, // 19:30 Ecuador
          competitionType: type,
          state: 'pre', completed: false,
          venue, city, country, home, away, lduIsHome: lduHome,
        },
      });
    }
    // Result sample (LDU wins, draws for amistoso, loses for otra — variety)
    {
      const home = lduHome ? LDU() : rivalFn();
      const away = lduHome ? rivalFn() : LDU();
      const outcome = type === 'amistoso' ? 'draw' : type === 'otra' ? 'loss' : 'win';
      const ldu = lduHome ? home : away;
      const rival = lduHome ? away : home;
      if (outcome === 'win') { ldu.score = '2'; ldu.winner = true; rival.score = '0'; }
      else if (outcome === 'draw') { ldu.score = '1'; rival.score = '1'; }
      else { ldu.score = '1'; rival.score = '3'; rival.winner = true; }
      out.push({
        type: 'result',
        match: {
          id: `sample-${type}-res`,
          date: `2026-08-${String(day).padStart(2, '0')}T00:30Z`,
          competitionType: type,
          state: 'post', completed: true,
          venue, city, country, home, away, lduIsHome: lduHome,
        },
      });
    }
    day += 1;
  }
  return out;
}
