// web3auth — social sign-on that yields a real secp256k1 private key, which
// drops straight into jam's existing signing path (identityFromPrivateHex).
// Unlike orbital-sim's integration (idToken → server session), jam needs NO
// server exchange: the key signs envelopes, the pubkey is the principal.
//
// Hard-won subtleties carried over from orbital-sim's auth.svelte.js:
//   - REDIRECT mode, not popup: Google's OAuth page sets
//     Cross-Origin-Opener-Policy: same-origin, which nulls window.opener in a
//     popup and silently breaks the postMessage callback.
//   - v9 no-modal requires an explicitly configured AuthAdapter, and a
//     privateKeyProvider so it can honor the project's key_export flag.
//     CommonPrivateKeyProvider + CHAIN_NAMESPACES.OTHER makes no RPC calls.
//   - The SDK is ~2.6MB — dynamic imports keep it out of the boot path; it
//     loads only on sign-in or when restoring a web3auth session.
//   - A sessionStorage flag survives the same-tab OAuth redirect so the
//     return page knows to complete the login.

const CLIENT_ID = import.meta.env.VITE_WEB3AUTH_CLIENT_ID ?? '';
const PENDING = 'jam.oauth.pending';

export const configured = Boolean(CLIENT_ID);

let _w3a = null;

async function getWeb3Auth() {
  if (_w3a) return _w3a;
  const [{ Web3AuthNoModal }, { CHAIN_NAMESPACES }, { AuthAdapter }, { CommonPrivateKeyProvider }] = await Promise.all([
    import('@web3auth/no-modal'),
    import('@web3auth/base'),
    import('@web3auth/auth-adapter'),
    import('@web3auth/base-provider'),
  ]);
  const chainConfig = {
    chainNamespace: CHAIN_NAMESPACES.OTHER,
    chainId: '0x0',
    rpcTarget: 'http://localhost', // unused — OTHER namespace makes no RPC calls
  };
  const privateKeyProvider = new CommonPrivateKeyProvider({ config: { chainConfig } });
  _w3a = new Web3AuthNoModal({
    clientId: CLIENT_ID,
    web3AuthNetwork: 'sapphire_mainnet',
    privateKeyProvider,
  });
  _w3a.configureAdapter(new AuthAdapter({ adapterSettings: { uxMode: 'redirect' } }));
  await _w3a.init(); // on the redirect-return page this processes the stored OAuth result
  return _w3a;
}

// Extract what jam needs from a connected instance: the raw private key (hex)
// plus profile hints for suggesting a handle.
async function harvest(w3a) {
  const privateKey = await w3a.provider.request({ method: 'private_key' });
  if (!privateKey) throw new Error('web3auth returned no private key (is key export enabled for this project?)');
  const info = await w3a.getUserInfo().catch(() => ({}));
  return { privateKey, email: info?.email ?? null, name: info?.name ?? null };
}

// Start a sign-in. In redirect mode the page navigates away and nothing after
// connectTo() runs — completion happens in completeRedirect() on return. If
// the adapter fell back to popup mode, this resolves directly.
export async function beginSignIn(provider = 'google') {
  if (!configured) throw new Error('VITE_WEB3AUTH_CLIENT_ID not set');
  const w3a = await getWeb3Auth();
  if (w3a.connected) await w3a.logout(); // a stale session would shadow the new login
  sessionStorage.setItem(PENDING, '1');
  await w3a.connectTo('auth', { loginProvider: provider });
  sessionStorage.removeItem(PENDING); // only reached in popup fallback
  return harvest(w3a);
}

export const redirectPending = () => Boolean(sessionStorage.getItem(PENDING));

// Called on page load when a redirect return is pending: init() has already
// processed the OAuth result; poll briefly for connected status to settle.
export async function completeRedirect() {
  if (!redirectPending()) return null;
  try {
    const w3a = await getWeb3Auth();
    for (let i = 0; i < 50; i++) {
      if (w3a.connected) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    sessionStorage.removeItem(PENDING);
    return w3a.connected ? harvest(w3a) : null;
  } catch (err) {
    sessionStorage.removeItem(PENDING);
    throw err;
  }
}

// Restore a still-valid web3auth session (their SDK keeps its own storage) —
// jam never persists a web3auth-derived key itself.
export async function resume() {
  const w3a = await getWeb3Auth();
  return w3a.connected ? harvest(w3a) : null;
}

export async function w3aLogout() {
  try {
    const w3a = await getWeb3Auth();
    if (w3a.connected) await w3a.logout();
  } catch { /* best effort */ }
}
