import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredAccounts, isAuthError } from '../src/publish.js';

function withEnv(vars, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const BASE_ENV = {
  IG_USER_ID: '17890000000000000',
  IG_ACCESS_TOKEN: 'EAAprimary',
  IG_ACCESS_TOKEN_FALLBACK: undefined,
  FACEBOOK_USER_ID: '100000000000000',
  FACEBOOK_ACCESS_TOKEN: undefined,
};

test('accounts carry a token chain: primary first, fallback after', () => {
  withEnv({ ...BASE_ENV, IG_ACCESS_TOKEN_FALLBACK: 'EAAsecret' }, () => {
    const [ig, fb] = configuredAccounts();
    assert.equal(ig.key, 'instagram');
    assert.deepEqual(ig.tokens, ['EAAprimary', 'EAAsecret']);
    // The FB page account falls back through the same chain.
    assert.equal(fb.key, 'facebook');
    assert.deepEqual(fb.tokens, ['EAAprimary', 'EAAsecret']);
  });
});

test('without a fallback env the chain has a single token', () => {
  withEnv(BASE_ENV, () => {
    const [ig] = configuredAccounts();
    assert.deepEqual(ig.tokens, ['EAAprimary']);
  });
});

test('duplicate tokens are collapsed so the same token is never retried', () => {
  withEnv({ ...BASE_ENV, IG_ACCESS_TOKEN_FALLBACK: 'EAAprimary' }, () => {
    const [ig] = configuredAccounts();
    assert.deepEqual(ig.tokens, ['EAAprimary']);
  });
});

test('a dedicated page token leads the facebook chain', () => {
  withEnv({ ...BASE_ENV, FACEBOOK_ACCESS_TOKEN: 'EAApage', IG_ACCESS_TOKEN_FALLBACK: 'EAAsecret' }, () => {
    const fb = configuredAccounts().find((a) => a.key === 'facebook');
    assert.deepEqual(fb.tokens, ['EAApage', 'EAAprimary', 'EAAsecret']);
  });
});

test('isAuthError recognizes OAuth/token failures but not transient ones', () => {
  const oauth = new Error('Graph API error: {"message":"…","type":"OAuthException","code":190}');
  oauth.graphCode = 190;
  assert.equal(isAuthError(oauth), true);
  const oauthNoCode = new Error('Graph API error: {"type":"OAuthException"}');
  assert.equal(isAuthError(oauthNoCode), true);
  const transient = new Error('Graph API error: {"message":"Please retry","code":2}');
  transient.graphCode = 2;
  assert.equal(isAuthError(transient), false);
  assert.equal(isAuthError(new Error('fetch failed')), false);
});
