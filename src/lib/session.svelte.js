// session — the local identity. A secp256k1 keypair lives in localStorage; the
// private key never leaves this browser. "Sign out" destroys it (there is no
// recovery — a wallet/web3auth graft is the later answer to key custody).

import { newIdentity, identityFromPrivateHex } from './identity.js';

const KEY = 'jam.identity';

export const session = $state({ identity: null, handle: null });

try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const { privateKey, handle } = JSON.parse(raw);
    session.identity = identityFromPrivateHex(privateKey);
    session.handle = handle ?? null;
  }
} catch { /* fresh session */ }

function persist() {
  localStorage.setItem(KEY, JSON.stringify({
    privateKey: session.identity?.privateKey,
    handle: session.handle,
  }));
}

export function signIn() {
  const id = newIdentity();
  session.identity = id;
  session.handle = null;
  persist();
  return id;
}

export function setHandle(handle) {
  session.handle = handle;
  persist();
}

export function signOut() {
  localStorage.removeItem(KEY);
  session.identity = null;
  session.handle = null;
}
