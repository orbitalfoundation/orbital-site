// The load-bearing compatibility test: an identity minted with the BROWSER
// stack (@noble/curves + WebCrypto SHA-256) must produce envelopes the
// filespace core (node:crypto) verifies. If this passes, the web app's
// signatures are real.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newIdentity } from '../src/lib/identity.js';
import { signAction, stableStringify } from '../src/lib/auth.js';
import { verify, makeMemoryStore, makeService, stableStringify as coreStringify } from '@orbitalfoundation/filespace';

test('stableStringify matches the core byte-for-byte', () => {
  const v = { b: [3, { z: 1, a: 2 }], a: 'x', c: { q: null } };
  assert.equal(stableStringify(v), coreStringify(v));
});

test('a browser-minted signature verifies against the node core', async () => {
  const id = newIdentity();
  const msg = 'hello filespace';
  const sig = await id.sign(msg);
  assert.equal(verify(id.publicKey, msg, sig), true);
  assert.equal(verify(id.publicKey, 'tampered', sig), false);
});

test('a browser-signed command drives an authenticated filespace end-to-end', async () => {
  const fs = makeService(makeMemoryStore(), { enforce: true, authenticate: true });
  const macy = newIdentity();

  const claimed = await fs.command(await signAction(macy, 'claim', { slug: '/macy', policy: 'private' }));
  assert.equal(claimed.ok, true);
  assert.equal(claimed.node.owner, macy.publicKey);

  const made = await fs.command(await signAction(macy, 'create', { slug: '/macy/ces' }));
  assert.equal(made.ok, true);

  // tampering after signing is caught by the core
  const envelope = await signAction(macy, 'create', { slug: '/macy/ok' });
  envelope.slug = '/victim';
  const res = await fs.command(envelope);
  assert.equal(res.ok, false);
  assert.match(res.error, /signature mismatch/);

  // and a signed read sees the private area
  const kids = await fs.query(await signAction(macy, 'list', { slug: '/macy' }));
  assert.deepEqual(kids.map((n) => n.slug), ['/macy/ces']);
});
