// Pipeline orchestrator.
//
//   node src/index.js generate   fetch ESPN → detect changes → render posts
//   node src/index.js publish    publish pending posts to Instagram
//   node src/index.js cleanup    delete rendered posts older than 30 days
//   node src/index.js samples    render demo posts, edge cases and standings
//
// `generate` writes PNGs + captions to output/posts/ and queues them in
// data/pending.json; `publish` (run after the workflow pushes, so the images
// have public raw.githubusercontent.com URLs) uploads them via the Instagram
// Graph API.

import fs from 'node:fs';
import path from 'node:path';
import { fetchAllMatches, fetchLogoDataUri, fetchMatchExtras, fetchStandings } from './espn.js';
import { fetchCupMatches } from './sportsdb.js';
import { renderPostHtml } from './templates/post.js';
import { renderStandingsHtml, selectRows } from './templates/standings.js';
// Playwright is only needed for rendering; import lazily so publish/diag
// modes work without dev dependencies installed.
const renderer = () => import('./render.js');
import { buildCaption, buildStandingsCaption, formatDayLine, formatTimeLine } from './captions.js';
import { loadState, saveState, planPosts, planStandingsPost, loadPending, savePending } from './state.js';
import { publishPending, diagnose } from './publish.js';
import { PATHS, TEAM_ID } from './config.js';
import { buildSampleMatches } from './samples.js';
import { pruneOldPosts } from './cleanup.js';

async function renderPost(match, type, outDir, extras = null) {
  const dark = true;
  const [homeLogo, awayLogo] = await Promise.all([
    fetchLogoDataUri(dark && match.home.logoDark ? match.home.logoDark : match.home.logo),
    fetchLogoDataUri(dark && match.away.logoDark ? match.away.logoDark : match.away.logo),
  ]);
  const html = renderPostHtml({
    postType: type,
    match,
    homeLogo,
    awayLogo,
    dayLine: formatDayLine(match.date, match.timeValid),
    timeLine: formatTimeLine(match.date, match.timeValid),
    extras,
  });
  const file = `${match.date.slice(0, 10)}_${match.id}_${type}.png`;
  const outPath = path.join(outDir, file);
  fs.mkdirSync(outDir, { recursive: true });
  const { renderHtmlToPng } = await renderer();
  await renderHtmlToPng(html, outPath);
  const caption = buildCaption(type, match, extras);
  fs.writeFileSync(outPath.replace(/\.png$/, '.txt'), caption);
  return { file, caption };
}

// Render the LigaPro table poster. Only the displayed rows' crests are
// downloaded; the filename keeps the YYYY-MM-DD_<id>_<type> convention that
// cleanup relies on.
async function renderStandingsPost(standings, outDir, now = new Date()) {
  const rows = selectRows(standings.entries).filter((r) => !r.gap);
  const logoPairs = await Promise.all(
    rows.map(async (r) => [r.team.id, await fetchLogoDataUri(r.team.logo)])
  );
  const html = renderStandingsHtml({
    standings,
    logos: Object.fromEntries(logoPairs),
    dayLine: formatDayLine(now.toISOString(), true),
  });
  const ldu = standings.entries.find((e) => e.team.id === TEAM_ID);
  const round = ldu?.played ?? Math.max(...standings.entries.map((e) => e.played));
  const file = `${now.toISOString().slice(0, 10)}_tabla-f${round}_standings.png`;
  const outPath = path.join(outDir, file);
  fs.mkdirSync(outDir, { recursive: true });
  const { renderHtmlToPng } = await renderer();
  await renderHtmlToPng(html, outPath);
  const caption = buildStandingsCaption(standings);
  fs.writeFileSync(outPath.replace(/\.png$/, '.txt'), caption);
  return { eventId: `tabla-f${round}`, file, caption };
}

async function generate() {
  console.log('Fetching LDU matches from ESPN + TheSportsDB…');
  // ESPN covers LigaPro and CONMEBOL; TheSportsDB fills in Copa Ecuador and
  // Supercopa, which ESPN has no data for.
  const [espnMatches, cupMatches] = await Promise.all([fetchAllMatches(), fetchCupMatches()]);
  const matches = [...espnMatches, ...cupMatches].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  console.log(`Found ${matches.length} matches across competitions (${cupMatches.length} from cups):`);
  for (const m of matches.slice(-6)) {
    console.log(`  ${m.date}  [${m.competitionType}] ${m.home.shortName} ${m.home.score ?? ''}-${m.away.score ?? ''} ${m.away.shortName} (${m.state})`);
  }

  const { posts, state } = planPosts(matches, loadState());
  if (posts.length === 0) {
    console.log('No new posts needed — state unchanged.');
    saveState(state);
    return;
  }

  const pending = loadPending();
  const queue = (eventId, type, file, caption, matchDate = null) => {
    // Replace any stale pending entry for the same event+type (rescheduled).
    // matchDate (fixtures) lets publish drop the entry if the queue ever gets
    // stuck past kickoff.
    const filtered = pending.filter((p) => !(p.eventId === eventId && p.type === type));
    filtered.push({ eventId, type, file, caption, matchDate, createdAt: new Date().toISOString() });
    pending.length = 0;
    pending.push(...filtered);
  };

  let generated = 0;
  for (const { match, type } of posts) {
    console.log(`Rendering ${type} post: ${match.home.shortName} vs ${match.away.shortName} [${match.competitionType}]`);
    // Scorers (results) and last-five form (fixtures); null when unavailable.
    const extras = await fetchMatchExtras(match);
    const { file, caption } = await renderPost(match, type, PATHS.outDir, extras);
    queue(match.id, type, file, caption, match.date);
    generated += 1;
  }

  // A LigaPro result just went out → follow it with the updated table, once.
  const ligaproResultPosted = posts.some(
    (p) => p.type === 'result' && p.match.competitionType === 'ligapro'
  );
  if (ligaproResultPosted) {
    const standings = await fetchStandings();
    // LDU's completed LigaPro games we can already see (the ecu.1 team schedule
    // IS LDU's LigaPro fixtures) — used to detect a table that hasn't yet
    // absorbed the match we just posted, so we never publish a stale fecha.
    const expectedPlayed = matches.filter(
      (m) => m.competitionType === 'ligapro' && m.completed
    ).length;
    if (planStandingsPost(standings, state, true, expectedPlayed)) {
      console.log('Rendering standings post: LigaPro table');
      const { eventId, file, caption } = await renderStandingsPost(standings, PATHS.outDir);
      queue(eventId, 'standings', file, caption);
      generated += 1;
    }
  }

  savePending(pending);
  saveState(state);
  await (await renderer()).closeBrowser();
  console.log(`Generated ${generated} post(s). Queued in ${PATHS.pending}.`);
}

async function cleanup() {
  const removed = pruneOldPosts(PATHS.outDir, 30, new Date(), loadPending());
  if (removed.length === 0) console.log('Nothing to prune — no rendered posts older than 30 days.');
  else console.log(`Pruned ${removed.length} old file(s): ${removed.join(', ')}`);
}

async function samples() {
  const sampleMatches = buildSampleMatches();
  const outDir = 'output/samples';
  for (const { match, type, extras } of sampleMatches) {
    console.log(`Rendering sample [${match.competitionType}] ${type}`);
    await renderPost(match, type, outDir, extras);
  }
  // Standings sample uses the live LigaPro table (needs network anyway).
  const standings = await fetchStandings();
  if (standings) {
    console.log('Rendering sample standings post');
    await renderStandingsPost(standings, outDir);
  }
  await (await renderer()).closeBrowser();
  console.log(`Samples written to ${outDir}/`);
}

const mode = process.argv[2] || 'generate';
try {
  if (mode === 'generate') await generate();
  else if (mode === 'publish') await publishPending();
  else if (mode === 'cleanup') await cleanup();
  else if (mode === 'samples') await samples();
  else if (mode === 'diag') await diagnose(process.argv.includes('--deep'));
  else {
    console.error(`Unknown mode: ${mode}`);
    process.exit(1);
  }
} catch (err) {
  console.error(err);
  process.exit(1);
}
