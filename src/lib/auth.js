// auth — the client half of filespace's signed-envelope protocol. Mirrors
// @orbitalfoundation/filespace src/auth.js exactly (same stableStringify, same
// signing string), except sign() is async because browser SHA-256 is async.
// If the server-side format ever changes, test/crypto.test.js breaks first.

export function stableStringify(value) {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = sortDeep(v[k]);
    return out;
  }
  return v;
}

export async function signAction(identity, op, args = {}, { ttlMs = 30_000 } = {}) {
  const params = { ...args, principal: identity.publicKey };
  const exp = Date.now() + ttlMs;
  const nonce = globalThis.crypto.randomUUID();
  const sig = await identity.sign(stableStringify({ op, params, nonce, exp }));
  return { op, ...params, auth: { nonce, exp, sig } };
}
