// Pipeline orchestrator.
//
//   node src/index.js generate   fetch ESPN → detect changes → render posts
//   node src/index.js publish    publish pending posts to Instagram
//   node src/index.js samples    render demo posts for every competition type
//
// `generate` writes PNGs + captions to output/posts/ and queues them in
// data/pending.json; `publish` (run after the workflow pushes, so the images
// have public raw.githubusercontent.com URLs) uploads them via the Instagram
// Graph API.

import fs from 'node:fs';
import path from 'node:path';
import { fetchAllMatches, fetchLogoDataUri } from './espn.js';
import { renderPostHtml } from './templates/post.js';
import { renderHtmlToPng, closeBrowser } from './render.js';
import { buildCaption, formatDayLine, formatTimeLine } from './captions.js';
import { loadState, saveState, planPosts, loadPending, savePending } from './state.js';
import { publishPending } from './publish.js';
import { PATHS } from './config.js';
import { buildSampleMatches } from './samples.js';

async function renderPost(match, type, outDir) {
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
  });
  const file = `${match.date.slice(0, 10)}_${match.id}_${type}.png`;
  const outPath = path.join(outDir, file);
  fs.mkdirSync(outDir, { recursive: true });
  await renderHtmlToPng(html, outPath);
  const caption = buildCaption(type, match);
  fs.writeFileSync(outPath.replace(/\.png$/, '.txt'), caption);
  return { file, caption };
}

async function generate() {
  console.log('Fetching LDU matches from ESPN…');
  const matches = await fetchAllMatches();
  console.log(`Found ${matches.length} matches across competitions:`);
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
  for (const { match, type } of posts) {
    console.log(`Rendering ${type} post: ${match.home.shortName} vs ${match.away.shortName} [${match.competitionType}]`);
    const { file, caption } = await renderPost(match, type, PATHS.outDir);
    // Replace any stale pending entry for the same event+type (rescheduled).
    const filtered = pending.filter((p) => !(p.eventId === match.id && p.type === type));
    filtered.push({ eventId: match.id, type, file, caption, createdAt: new Date().toISOString() });
    pending.length = 0;
    pending.push(...filtered);
  }
  savePending(pending);
  saveState(state);
  await closeBrowser();
  console.log(`Generated ${posts.length} post(s). Queued in ${PATHS.pending}.`);
}

async function samples() {
  const sampleMatches = buildSampleMatches();
  const outDir = 'output/samples';
  for (const { match, type } of sampleMatches) {
    console.log(`Rendering sample [${match.competitionType}] ${type}`);
    await renderPost(match, type, outDir);
  }
  await closeBrowser();
  console.log(`Samples written to ${outDir}/`);
}

const mode = process.argv[2] || 'generate';
try {
  if (mode === 'generate') await generate();
  else if (mode === 'publish') await publishPending();
  else if (mode === 'samples') await samples();
  else {
    console.error(`Unknown mode: ${mode}`);
    process.exit(1);
  }
} catch (err) {
  console.error(err);
  process.exit(1);
}
