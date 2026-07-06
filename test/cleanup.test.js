// Unit tests for retention pruning: node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pruneOldPosts } from '../src/cleanup.js';

function tmpDirWith(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ldu-cleanup-'));
  for (const f of files) fs.writeFileSync(path.join(dir, f), 'x');
  return dir;
}

const NOW = new Date('2026-07-06T12:00:00Z');

test('removes files older than the retention window', () => {
  const dir = tmpDirWith([
    '2026-05-01_1_fixture.png', // 66 days old — pruned
    '2026-05-01_1_fixture.txt',
    '2026-06-20_2_result.png', // 16 days old — kept
  ]);
  const removed = pruneOldPosts(dir, 30, NOW, []);
  assert.deepEqual(removed.sort(), ['2026-05-01_1_fixture.png', '2026-05-01_1_fixture.txt']);
  assert.deepEqual(fs.readdirSync(dir), ['2026-06-20_2_result.png']);
});

test('never removes a file still referenced in the pending queue', () => {
  const dir = tmpDirWith(['2026-01-01_9_result.png']);
  const removed = pruneOldPosts(dir, 30, NOW, [{ file: '2026-01-01_9_result.png' }]);
  assert.deepEqual(removed, []);
  assert.deepEqual(fs.readdirSync(dir), ['2026-01-01_9_result.png']);
});

test('missing directory is a no-op', () => {
  const removed = pruneOldPosts('/nonexistent/dir/xyz', 30, NOW, []);
  assert.deepEqual(removed, []);
});
