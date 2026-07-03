<script>
  import { navigate } from './router.svelte.js';
  import { session, signIn, signInWeb3Auth, signOut, setHandle } from './session.svelte.js';
  import { configured as w3aConfigured } from './web3auth.js';
  import { command, query } from './bus.js';
  import { shortKey } from './identity.js';

  let busy = $state(false);
  let promptedOnce = false;

  // join = get an identity, then claim /handle first-come.
  // With web3auth configured, identity comes from Google sign-in (redirect —
  // the page navigates away; on return, initSession restores the identity and
  // the effect below picks up the claim). Without it, a local keypair.
  async function join() {
    if (!session.identity) {
      busy = true;
      try {
        if (w3aConfigured) {
          await signInWeb3Auth(); // redirect mode: usually never returns
        } else {
          signIn();
        }
      } catch (err) {
        alert(`sign-in failed: ${err.message}`);
        busy = false;
        return;
      }
      busy = false;
      if (!session.identity) return; // redirected away or cancelled
    }
    await claimFlow(session.suggested);
  }

  async function claimFlow(suggested = null) {
    let h = prompt('claim your folder — pick a handle (letters/digits, - _ .):', suggested ?? session.handle ?? '');
    if (!h) return;
    h = h.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(h)) return alert('letters/digits first, then letters, digits, - _ .');
    busy = true;
    try {
      const res = await command(session.identity, 'claim', { slug: `/${h}`, components: { about: { label: h } } });
      if (res?.ok === false) {
        // already ours from an earlier visit? then it's a rejoin, not an error
        const existing = await query('get', { slug: `/${h}` }, session.identity);
        if (existing?.owner !== session.identity.publicKey) return alert(res.error);
      }
      setHandle(h);
      navigate(`/${h}`);
    } finally {
      busy = false;
    }
  }

  // after a fresh web3auth sign-in (redirect return), offer the claim once,
  // pre-filled from the email prefix
  $effect(() => {
    if (session.identity && !session.handle && session.suggested && !promptedOnce) {
      promptedOnce = true;
      claimFlow(session.suggested);
    }
  });

  function leave() {
    const msg = session.kind === 'web3auth'
      ? 'Sign out? Signing back in with Google recovers the same identity.'
      : 'Sign out? This key exists only in this browser and will be destroyed.';
    if (confirm(msg)) signOut();
  }
</script>

<button class="chip logo" onclick={() => navigate('/')}>orbital·jam</button>

<div class="chip who">
  {#if session.identity}
    <button class="plain" onclick={() => (session.handle ? navigate('/' + session.handle) : join())}>
      {session.handle ?? shortKey(session.identity.publicKey)}
    </button>
    <button class="plain dim" title="copy my public key (share it to get invited)"
      onclick={() => navigator.clipboard.writeText(session.identity.publicKey)}>⧉</button>
    <button class="plain dim" title="sign out" onclick={leave}>×</button>
  {:else if session.restoring}
    <span class="plain dim">…</span>
  {:else}
    <button class="plain" onclick={join} disabled={busy}>{busy ? '…' : 'join'}</button>
  {/if}
</div>
