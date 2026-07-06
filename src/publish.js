// Instagram publishing via the official Instagram Graph API.
//
// Supports publishing every post to MULTIPLE Instagram accounts. Each account
// is an env pair (GitHub Actions secrets):
//   IG_USER_ID + IG_ACCESS_TOKEN              account "instagram"
//   FACEBOOK_USER_ID + FACEBOOK_ACCESS_TOKEN  account "facebook" (classic,
//     page-linked; its token falls back to IG_ACCESS_TOKEN when unset)
//   IMAGE_BASE_URL  Public base URL for output/posts (optional — derived from
//                   GITHUB_REPOSITORY as a raw.githubusercontent.com URL)
//
// Flow per image: create media container (image_url + caption) → wait until
// status FINISHED → publish. Pending queue lives in data/pending.json;
// entries are removed once published so retries are safe.

import fs from 'node:fs';
import { loadPending, savePending } from './state.js';
import { PATHS } from './config.js';

// Two official token flavors are supported, auto-detected by prefix:
//  - "IGA…"  Instagram API with Instagram Login (new flow, no Facebook page
//            required) → graph.instagram.com
//  - "EAA…"  Facebook Login / Page token (classic flow) → graph.facebook.com
// Both expose identical /media, /media_publish and status endpoints.
function graphBase(token) {
  return token?.startsWith('IGA')
    ? 'https://graph.instagram.com/v23.0'
    : 'https://graph.facebook.com/v23.0';
}

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

async function waitForContainer(graph, containerId, token, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const st = await graphGet(`${graph}/${containerId}`, {
      fields: 'status_code',
      access_token: token,
    });
    if (st.status_code === 'FINISHED') return;
    if (st.status_code === 'ERROR') throw new Error('Media container processing failed');
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error('Timed out waiting for media container');
}

// Every configured account gets every post. The queue tracks per-account
// success (item.publishedTo) so a partial failure never re-posts to an
// account that already succeeded.
// Secrets pasted with stray whitespace, newlines or quotes are a classic
// source of "Cannot parse access token" — sanitize defensively.
const cleanEnv = (name) =>
  process.env[name]?.replace(/["'\s]/g, '') || undefined;

export function configuredAccounts() {
  const accounts = [];
  const igId = cleanEnv('IG_USER_ID');
  const igToken = cleanEnv('IG_ACCESS_TOKEN');
  if (igId && igToken) {
    accounts.push({ key: 'instagram', userId: igId, token: igToken });
  }
  const fbId = cleanEnv('FACEBOOK_USER_ID');
  const fbToken = cleanEnv('FACEBOOK_ACCESS_TOKEN') || igToken;
  if (fbId && fbToken) {
    accounts.push({ key: 'facebook', userId: fbId, token: fbToken });
  }
  return accounts;
}

async function publishTo(account, imageUrl, caption) {
  const GRAPH = graphBase(account.token);
  const container = await graphPost(`${GRAPH}/${account.userId}/media`, {
    image_url: imageUrl,
    caption,
    access_token: account.token,
  });
  await waitForContainer(GRAPH, container.id, account.token);
  return graphPost(`${GRAPH}/${account.userId}/media_publish`, {
    creation_id: container.id,
    access_token: account.token,
  });
}

export async function publishPending() {
  const accounts = configuredAccounts();
  const base = imageBaseUrl();

  const pending = loadPending();
  if (pending.length === 0) {
    console.log('Nothing pending to publish.');
    return;
  }
  if (accounts.length === 0) {
    console.log(`No Instagram accounts configured (IG_USER_ID/IG_ACCESS_TOKEN, FACEBOOK_USER_ID). ` +
      `${pending.length} post(s) remain queued in ${PATHS.pending}.`);
    return;
  }
  if (!base) {
    console.log('No public image base URL available (set IMAGE_BASE_URL). Skipping publish.');
    return;
  }

  let failures = 0;
  const remaining = [];
  for (const item of pending) {
    if (!fs.existsSync(`${PATHS.outDir}/${item.file}`)) {
      console.log(`Skipping ${item.file} — file missing locally, dropping from queue.`);
      continue;
    }
    const imageUrl = `${base}/${encodeURIComponent(item.file)}`;
    item.publishedTo ||= [];
    for (const account of accounts) {
      if (item.publishedTo.includes(account.key)) continue;
      try {
        console.log(`Publishing ${item.file} → [${account.key}] …`);
        const pub = await publishTo(account, imageUrl, item.caption);
        console.log(`Published ${item.file} → [${account.key}] media id ${pub.id}`);
        item.publishedTo.push(account.key);
      } catch (err) {
        console.error(`Failed to publish ${item.file} → [${account.key}]: ${err.message}`);
        failures += 1;
      }
    }
    const done = accounts.every((a) => item.publishedTo.includes(a.key));
    if (!done) remaining.push(item); // retried next run for the missing accounts
  }
  savePending(remaining);
  if (failures) {
    console.log(`${failures} publish attempt(s) failed; ${remaining.length} post(s) remain queued.`);
    process.exitCode = 1;
  }
}

// Diagnostic mode: validates the configured credentials against the Graph
// API and prints what the token can actually see, so misconfigured secrets
// (wrong id, missing permissions) are identified from the Actions log.
export async function diagnose() {
  const accounts = configuredAccounts();
  if (accounts.length === 0) {
    console.log('No accounts configured (need IG_USER_ID+IG_ACCESS_TOKEN and/or FACEBOOK_USER_ID).');
    return;
  }
  for (const account of accounts) {
    console.log(`\n===== Account [${account.key}] =====`);
    await diagnoseAccount(account.userId, account.token);
  }
}

async function diagnoseAccount(userId, token) {
  const GRAPH = graphBase(token);
  console.log(`Token type: ${token.startsWith('IGA') ? 'Instagram login (IGA…)' : 'Facebook login (EAA…)'} → ${GRAPH}`);
  console.log(`Token shape: starts "${token.slice(0, 3)}…", length ${token.length} chars` +
    (token.length < 100 ? '  ← SUSPICIOUSLY SHORT, probably an incomplete paste' : ''));
  console.log(`User id: ${/^\d+$/.test(userId) ? `numeric, ${userId.length} digits` : 'NOT numeric ← should be a number'}`);

  // debug_token reveals the token's real type, granted scopes and expiry —
  // the definitive answer to "why does publishing fail".
  if (!token.startsWith('IGA')) {
    try {
      const dbg = await graphGet(`${GRAPH}/debug_token`, { input_token: token, access_token: token });
      const d = dbg.data || {};
      console.log(`debug_token → type: ${d.type}, valid: ${d.is_valid}, app: ${d.application ?? '?'}`);
      console.log(`  expires: ${d.expires_at ? new Date(d.expires_at * 1000).toISOString() : 'never/unknown'}`);
      console.log(`  scopes: ${(d.scopes || []).join(', ') || '(none reported)'}`);
      const needed = ['instagram_basic', 'instagram_content_publish'];
      const missing = needed.filter((s) => !(d.scopes || []).includes(s));
      if (missing.length) console.log(`  MISSING required scopes: ${missing.join(', ')}`);
    } catch (err) {
      console.log(`debug_token failed: ${err.message}`);
    }
  }

  try {
    const me = await graphGet(`${GRAPH}/me`, { fields: 'id,name', access_token: token });
    console.log(`Token belongs to: ${me.name ?? '(no name)'}`);
  } catch (err) {
    console.log(`GET /me failed (typical for Page tokens without pages_read_engagement): ${err.message}`);
  }

  if (userId) {
    try {
      const u = await graphGet(`${GRAPH}/${userId}`, { fields: 'username', access_token: token });
      console.log(`IG_USER_ID OK → @${u.username}`);
    } catch (err) {
      console.log(`IG_USER_ID is NOT a reachable Instagram professional account: ${err.message}`);
    }
  } else {
    console.log('IG_USER_ID is not set.');
  }

  if (!token.startsWith('IGA')) {
    try {
      const pages = await graphGet(`${GRAPH}/me/accounts`, {
        fields: 'name,id,instagram_business_account{id,username}',
        access_token: token,
      });
      console.log('Facebook pages visible to this token:');
      for (const p of pages.data || []) {
        const ig = p.instagram_business_account;
        console.log(`  - Page "${p.name}" (page id ${p.id}) → ` +
          (ig ? `Instagram @${ig.username}, IG_USER_ID should be: ${ig.id}` : 'NO Instagram account linked'));
      }
      if (!(pages.data || []).length) console.log('  (none — token lacks pages_show_list or user manages no pages)');
    } catch (err) {
      console.log(`Could not list pages: ${err.message}`);
    }
  }
}
