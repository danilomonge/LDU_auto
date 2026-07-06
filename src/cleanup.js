// Prunes rendered posts older than a retention window so output/posts (and
// the git history growing from it) doesn't grow forever. Filenames are
// `YYYY-MM-DD_<eventId>_<type>.(png|txt)`, so age is read straight from the
// name — no need to stat the filesystem.

import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from './config.js';

const NAME_DATE = /^(\d{4}-\d{2}-\d{2})_/;

export function pruneOldPosts(dir = PATHS.outDir, maxAgeDays = 30, now = new Date(), pending = []) {
  const keep = new Set(pending.map((p) => p.file));
  let removed = [];
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch {
    return removed; // nothing generated yet
  }

  const cutoff = now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000;
  for (const file of files) {
    const m = file.match(NAME_DATE);
    if (!m) continue;
    if (keep.has(file)) continue; // still queued for publishing
    const age = new Date(`${m[1]}T00:00:00Z`).getTime();
    if (age < cutoff) {
      fs.unlinkSync(path.join(dir, file));
      removed.push(file);
    }
  }
  return removed;
}
