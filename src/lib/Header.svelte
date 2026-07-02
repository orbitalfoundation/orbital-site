<script>
  import { navigate } from './router.svelte.js';
  import { session, signIn, signOut, setHandle } from './session.svelte.js';
  import { command, query } from './bus.js';
  import { shortKey } from './identity.js';

  let busy = $state(false);

  // "join" = mint a local keypair (if needed) and claim /handle first-come.
  async function join() {
    const id = session.identity ?? signIn();
    let h = prompt('claim your folder — pick a handle (letters/digits, - _ .):', session.handle ?? '');
    if (!h) return;
    h = h.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(h)) return alert('letters/digits first, then letters, digits, - _ .');
    busy = true;
    try {
      const res = await command(id, 'claim', { slug: `/${h}`, components: { about: { label: h } } });
      if (res?.ok === false) {
        // already ours from an earlier visit? then it's a rejoin, not an error
        const existing = await query('get', { slug: `/${h}` }, id);
        if (existing?.owner !== id.publicKey) return alert(res.error);
      }
      setHandle(h);
      navigate(`/${h}`);
    } finally {
      busy = false;
    }
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
    <button class="plain dim" title="sign out — the key only lives in this browser"
      onclick={() => confirm('Sign out? Your key exists only in this browser and will be destroyed.') && signOut()}>×</button>
  {:else}
    <button class="plain" onclick={join} disabled={busy}>join</button>
  {/if}
</div>
