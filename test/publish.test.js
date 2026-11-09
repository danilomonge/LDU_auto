import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredAccounts, isAuthError, isStaleFixture, resolvePageToken } from '../src/publish.js';

function withFetch(impl, fn) {
  const saved = globalThis.fetch;
  globalThis.fetch = impl;
  return fn().finally(() => {
    globalThis.fetch = saved;
  });
}

const jsonResponse = (body, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(body) });

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

test('a user token is swapped for the page token before posting to the page', async () => {
  await withFetch(
    () => jsonResponse({ data: [{ id: '111', access_token: 'EAApageA' }, { id: '222', access_token: 'EAApageB' }] }),
    async () => {
      assert.equal(await resolvePageToken('222', 'EAAuser-swap'), 'EAApageB');
    }
  );
});

// Routes mocked Graph GETs by path: { '/me/accounts': body, '/me': body,
// '/<pageId>': body }. A body with `error` is served as a failed response.
function graphRouter(routes) {
  return (url) => {
    const path = new URL(url).pathname.replace(/^\/v[\d.]+/, '');
    const body = routes[path] ?? { error: { message: `unmocked ${path}`, type: 'OAuthException', code: 100 } };
    return jsonResponse(body, !body.error);
  };
}

// Production failure 2026-10-28: once the user token's 90-day data-access
// window lapsed, Meta started answering /me/accounts with an EMPTY list (HTTP
// 200, no error) — yet the page node still hands out its page token.
test('the page token comes from the page node when /me/accounts is empty', async () => {
  await withFetch(
    graphRouter({
      '/me/accounts': { data: [] },
      '/444': { id: '444', access_token: 'EAApage-node' },
      '/me': { id: '9999', name: 'Some User' },
    }),
    async () => {
      assert.equal(await resolvePageToken('444', 'EAAuser-node'), 'EAApage-node');
    }
  );
});

test('/me/accounts still resolves the page token when the page node gives none', async () => {
  await withFetch(
    graphRouter({
      '/555': { id: '555' }, // no access_token field
      '/me/accounts': { data: [{ id: '555', access_token: 'EAApage-list' }] },
    }),
    async () => {
      assert.equal(await resolvePageToken('555', 'EAAuser-list'), 'EAApage-list');
    }
  );
});

test("a token that IS the page's own token is used as-is", async () => {
  await withFetch(
    graphRouter({
      '/me/accounts': { error: { message: 'impersonation…', type: 'OAuthException', code: 190 } },
      '/666': { id: '666' },
      '/me': { id: '666', name: 'The Page' },
    }),
    async () => {
      assert.equal(await resolvePageToken('666', 'EAApage-asis'), 'EAApage-asis');
    }
  );
});

// Posting to a page with a USER token fails with Meta's misleading
// "(#200) publish_actions deprecated" — never do it; fail with the real cause.
test('a user token that yields no page token fails loudly as an auth error', async () => {
  await withFetch(
    graphRouter({
      '/me/accounts': { data: [] },
      '/777': { id: '777' },
      '/me': { id: '9999', name: 'Some User' },
    }),
    async () => {
      await assert.rejects(resolvePageToken('777', 'EAAuser-none'), (err) => {
        assert.equal(isAuthError(err), true);
        assert.match(err.message, /page access token/i);
        assert.match(err.message, /777/);
        return true;
      });
    }
  );
});

// A network outage is transient, not a token problem: surface it as-is so
// the run fails with the real error and the token chain is not walked.
test('a network failure during page-token lookup is not reported as an auth error', async () => {
  await withFetch(
    () => Promise.reject(new TypeError('fetch failed')),
    async () => {
      await assert.rejects(resolvePageToken('999', 'EAAuser-offline'), (err) => {
        assert.equal(err.message, 'fetch failed');
        assert.equal(isAuthError(err), false);
        return true;
      });
    }
  );
});

test('a failed resolution is retried, not cached', async () => {
  let pageNode = { id: '888' };
  await withFetch(
    (url) => graphRouter({ '/me/accounts': { data: [] }, '/888': pageNode, '/me': { id: '1' } })(url),
    async () => {
      await assert.rejects(resolvePageToken('888', 'EAAuser-retry'));
      pageNode = { id: '888', access_token: 'EAApage-later' };
      assert.equal(await resolvePageToken('888', 'EAAuser-retry'), 'EAApage-later');
    }
  );
});

test('page-token resolution is cached per token', async () => {
  let calls = 0;
  await withFetch(
    () => {
      calls += 1;
      return jsonResponse({ data: [{ id: '333', access_token: 'EAApageC' }] });
    },
    async () => {
      assert.equal(await resolvePageToken('333', 'EAAuser-cache'), 'EAApageC');
      const afterFirst = calls;
      assert.equal(await resolvePageToken('333', 'EAAuser-cache'), 'EAApageC');
      assert.equal(calls, afterFirst); // second lookup never hits the network
    }
  );
});

// A fixture stuck in the queue past kickoff (token outage, repeated publish
// failures) must be dropped, not announced after the match already happened.
test('a queued fixture goes stale at kickoff; results and standings never do', () => {
  const fixture = {
    type: 'fixture',
    file: '2026-07-12_401859608_fixture.png',
    matchDate: '2026-07-12T17:00Z',
  };
  assert.equal(isStaleFixture(fixture, new Date('2026-07-12T16:59Z')), false);
  assert.equal(isStaleFixture(fixture, new Date('2026-07-12T17:00Z')), true);
  assert.equal(isStaleFixture(fixture, new Date('2026-07-13T09:00Z')), true);

  // Entries queued before matchDate existed: the filename's YYYY-MM-DD prefix
  // is the kickoff's UTC date, so >24h old can only happen after kickoff.
  const legacy = { type: 'fixture', file: '2026-07-12_401859608_fixture.png' };
  assert.equal(isStaleFixture(legacy, new Date('2026-07-12T23:00Z')), false);
  assert.equal(isStaleFixture(legacy, new Date('2026-07-14T01:00Z')), true);

  // Results and the standings table are still worth publishing late.
  const when = new Date('2026-07-20T00:00Z');
  assert.equal(isStaleFixture({ type: 'result', file: '2026-07-12_x_result.png', matchDate: '2026-07-12T17:00Z' }, when), false);
  assert.equal(isStaleFixture({ type: 'standings', file: '2026-07-12_tabla-f19_standings.png' }, when), false);
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
