// session — the local identity, from one of two sources:
//
//   kind 'web3auth' — sign in with Google via web3auth; a real secp256k1 key
//     is derived client-side from threshold shares. Jam NEVER persists this
//     key: on reload the web3auth session (their storage) re-derives it.
//     Custody and recovery ride the social login.
//   kind 'local' — a keypair minted in this browser, persisted in
//     localStorage. Dev/guest fallback (also used when no client id is
//     configured). Sign-out destroys it; there is no recovery.
//
// Either way the identity signs the same envelopes; the core doesn't care
// where the key came from.

import { newIdentity, identityFromPrivateHex } from './identity.js';

const KEY = 'jam.identity';

export const session = $state({
  identity: null,
  handle: null,
  kind: null, // 'web3auth' | 'local'
  email: null,
  suggested: null, // handle suggestion after a fresh web3auth sign-in
  restoring: false,
});

function persist() {
  const data = { kind: session.kind, handle: session.handle, email: session.email };
  if (session.kind === 'local') data.privateKey = session.identity?.privateKey; // web3auth keys are never written by jam
  localStorage.setItem(KEY, JSON.stringify(data));
}

// local dev/guest keypair
export function signIn() {
  session.identity = newIdentity();
  session.kind = 'local';
  session.handle = null;
  persist();
  return session.identity;
}

export function setHandle(handle) {
  session.handle = handle;
  session.suggested = null;
  persist();
}

export function signOut() {
  const kind = session.kind;
  localStorage.removeItem(KEY);
  session.identity = null;
  session.handle = null;
  session.kind = null;
  session.email = null;
  session.suggested = null;
  if (kind === 'web3auth') import('./web3auth.js').then((m) => m.w3aLogout()).catch(() => {});
}

function adopt(result, saved = {}) {
  if (!result?.privateKey) return false;
  session.identity = identityFromPrivateHex(result.privateKey);
  session.kind = 'web3auth';
  session.email = result.email ?? saved.email ?? null;
  session.handle = saved.handle ?? null;
  if (!session.handle) {
    session.suggested = session.email?.split('@')[0]?.toLowerCase()?.replace(/[^a-z0-9._-]+/g, '-') ?? null;
  }
  persist();
  return true;
}

// Called once at app boot. Local identities restore synchronously; a pending
// OAuth redirect or a saved web3auth session restores through the (lazily
// imported) SDK.
export async function initSession() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch { /* fresh session */ }

  if (saved?.privateKey && saved.kind !== 'web3auth') {
    session.identity = identityFromPrivateHex(saved.privateKey);
    session.kind = 'local';
    session.handle = saved.handle ?? null;
    return;
  }

  const w3aMarker = saved?.kind === 'web3auth';
  let pending = false;
  try {
    pending = Boolean(sessionStorage.getItem('jam.oauth.pending'));
  } catch { /* no sessionStorage */ }
  if (!pending && !w3aMarker) return;

  session.restoring = true;
  try {
    const w3a = await import('./web3auth.js');
    const result = pending ? await w3a.completeRedirect() : await w3a.resume();
    if (!adopt(result, saved ?? {}) && w3aMarker) {
      // their web3auth session expired — the handle is still theirs on the
      // server; signing in again re-derives the same key
      console.warn('[session] web3auth session expired — sign in again');
    }
  } catch (err) {
    console.error('[session] web3auth restore failed:', err);
  }
  session.restoring = false;
}

// Sign in with Google (redirect mode: the page navigates away; completion
// happens in initSession on return). Popup fallback resolves directly.
export async function signInWeb3Auth() {
  const w3a = await import('./web3auth.js');
  const result = await w3a.beginSignIn('google');
  adopt(result ?? {}, {});
}
