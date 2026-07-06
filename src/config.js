// Central configuration for the LDU Quito Instagram post generator.

export const TEAM_ID = '4816'; // Liga de Quito on ESPN
export const TEAM_NAME = 'Liga de Quito';
export const TEAM_SHORT = 'LDU';

// ESPN league codes polled on every run. Unknown/404 leagues are tolerated,
// so speculative codes (e.g. a future Copa Ecuador slug) can stay listed.
export const LEAGUES = [
  'ecu.1',
  'conmebol.libertadores',
  'conmebol.sudamericana',
  'conmebol.recopa',
  'ecu.supercopa',
  'ecu.copa_ecuador',
  'club.friendly',
  'fifa.friendly',
];

// Competition types. Every match is classified into exactly one of these and
// rendered with that competition's bespoke theme.
export const COMPETITION_TYPES = {
  ligapro: {
    label: 'LIGAPRO · SERIE A',
    hashtags: '#LDU #LigaDeQuito #LigaPro #SerieA #FutbolEcuatoriano',
  },
  libertadores: {
    label: 'CONMEBOL LIBERTADORES',
    hashtags: '#LDU #LigaDeQuito #Libertadores #CONMEBOL #GloriaEterna',
  },
  sudamericana: {
    label: 'CONMEBOL SUDAMERICANA',
    hashtags: '#LDU #LigaDeQuito #Sudamericana #CONMEBOL',
  },
  copaecuador: {
    label: 'COPA ECUADOR',
    hashtags: '#LDU #LigaDeQuito #CopaEcuador #FutbolEcuatoriano',
  },
  supercopa: {
    label: 'SUPERCOPA ECUADOR',
    hashtags: '#LDU #LigaDeQuito #SupercopaEcuador #FutbolEcuatoriano',
  },
  amistoso: {
    label: 'PARTIDO AMISTOSO',
    hashtags: '#LDU #LigaDeQuito #Amistoso #Pretemporada',
  },
  otra: {
    label: 'COMPETICIÓN INTERNACIONAL',
    hashtags: '#LDU #LigaDeQuito #Futbol',
  },
};

// Map an ESPN league slug + display name to a competition type.
export function classifyCompetition(slug, name = '') {
  const n = name.toLowerCase();
  if (slug === 'ecu.1' || n.includes('ligapro')) return 'ligapro';
  if (slug === 'conmebol.libertadores' || n.includes('libertadores')) return 'libertadores';
  if (slug === 'conmebol.sudamericana' || n.includes('sudamericana')) return 'sudamericana';
  if (n.includes('copa ecuador') || slug === 'ecu.copa_ecuador') return 'copaecuador';
  if (slug === 'ecu.supercopa' || n.includes('supercopa')) return 'supercopa';
  if (slug.includes('friendly') || n.includes('friendly') || n.includes('amistoso')) return 'amistoso';
  return 'otra';
}

export const HOME_VENUE = { name: 'Estadio Rodrigo Paz Delgado', city: 'Quito' };

// Timezone used to display kickoff times (Ecuador mainland).
export const TIMEZONE = 'America/Guayaquil';

export const PATHS = {
  state: 'data/state.json',
  pending: 'data/pending.json',
  outDir: 'output/posts',
};
