// Instagram publishing via the official Instagram Graph API.
//
// Requirements (GitHub Actions secrets → env):
//   IG_USER_ID      Instagram Business/Creator account id
//   IG_ACCESS_TOKEN Long-lived Page access token with instagram_content_publish
//   IMAGE_BASE_URL  Public base URL for output/posts (optional — derived from
//                   GITHUB_REPOSITORY as a raw.githubusercontent.com URL)
//
// Flow per image: create media container (image_url + caption) → wait until
// status FINISHED → publish. Pending queue lives in data/pending.json;
// entries are removed once published so retries are safe.

import fs from 'node:fs';
import { loadPending, savePending } from './state.js';
import { PATHS } from './config.js';

const GRAPH = 'https://graph.facebook.com/v23.0';

function imageBaseUrl() {
  if (process.env.IMAGE_BASE_URL) return process.env.IMAGE_BASE_URL.replace(/\/$/, '');
  const repo = process.env.GITHUB_REPOSITORY; // owner/name
  const branch = process.env.GITHUB_REF_NAME || 'main';
  if (repo) return `https://raw.githubusercontent.com/${repo}/${branch}/${PATHS.outDir}`;
  return null;
}

async function graphPost(url, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Graph API error: ${JSON.stringify(json.error || json)}`);
  }
  return json;
}

async function graphGet(url, params) {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${url}?${qs}`);
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Graph API error: ${JSON.stringify(json.error || json)}`);
  }
  return json;
}

async function waitForContainer(containerId, token, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const st = await graphGet(`${GRAPH}/${containerId}`, {
      fields: 'status_code',
      access_token: token,
    });
    if (st.status_code === 'FINISHED') return;
    if (st.status_code === 'ERROR') throw new Error('Media container processing failed');
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error('Timed out waiting for media container');
}

export async function publishPending() {
  const userId = process.env.IG_USER_ID;
  const token = process.env.IG_ACCESS_TOKEN;
  const base = imageBaseUrl();

  const pending = loadPending();
  if (pending.length === 0) {
    console.log('Nothing pending to publish.');
    return;
  }
  if (!userId || !token) {
    console.log(`Instagram credentials not configured (IG_USER_ID / IG_ACCESS_TOKEN). ` +
      `${pending.length} post(s) remain queued in ${PATHS.pending}.`);
    return;
  }
  if (!base) {
    console.log('No public image base URL available (set IMAGE_BASE_URL). Skipping publish.');
    return;
  }

  const remaining = [];
  for (const item of pending) {
    const imageUrl = `${base}/${encodeURIComponent(item.file)}`;
    try {
      if (!fs.existsSync(`${PATHS.outDir}/${item.file}`)) {
        console.log(`Skipping ${item.file} — file missing locally, dropping from queue.`);
        continue;
      }
      console.log(`Publishing ${item.file} …`);
      const container = await graphPost(`${GRAPH}/${userId}/media`, {
        image_url: imageUrl,
        caption: item.caption,
        access_token: token,
      });
      await waitForContainer(container.id, token);
      const pub = await graphPost(`${GRAPH}/${userId}/media_publish`, {
        creation_id: container.id,
        access_token: token,
      });
      console.log(`Published ${item.file} → media id ${pub.id}`);
    } catch (err) {
      console.error(`Failed to publish ${item.file}: ${err.message}`);
      remaining.push(item); // keep in queue, retried next run
    }
  }
  savePending(remaining);
  if (remaining.length) {
    console.log(`${remaining.length} post(s) failed and remain queued.`);
    process.exitCode = 1;
  }
}
