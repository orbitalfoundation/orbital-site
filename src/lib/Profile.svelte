<script>
  // /profile — the canonical "home" of a user: not a folder, a view over
  // everything the identity touches. Your own profile carries the powers that
  // don't belong in the header (keys, sign-out, claiming); /profile/<pubkey>
  // shows someone else's — their areas filtered to what YOU may see.
  import { navigate } from './router.svelte.js';
  import { session, setHandle, signOut } from './session.svelte.js';
  import { query, command } from './bus.js';
  import { shortKey } from './identity.js';
  import { labelOf } from './views.js';

  let { pubkey = null } = $props();

  const own = $derived(!pubkey || pubkey === session.identity?.publicKey);
  const who = $derived(pubkey ?? session.identity?.publicKey ?? null);

  let areas = $state([]);
  let loaded = $state(false);
  let busy = $state(false);

  const isRoot = (n) => n.slug.split('/').filter(Boolean).length === 1;

  async function load(pk, identity) {
    areas = [];
    loaded = false;
    if (!pk) {
      loaded = true;
      return;
    }
    try {
      areas = (await query('find', { member: pk }, identity)) ?? [];
      // adopt my handle from a root I own, if I haven't got one yet
      if (own && identity && !session.handle) {
        const root = areas.find((n) => n.owner === identity.publicKey && isRoot(n));
        if (root) setHandle(root.slug.slice(1));
      }
    } catch { /* filtered to nothing */ }
    loaded = true;
  }

  $effect(() => {
    load(who, session.identity);
  });

  async function claimFolder() {
    let h = prompt('claim a folder — pick a name (letters/digits, - _ .):', session.suggested ?? session.handle ?? '');
    if (!h) return;
    h = h.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(h)) return alert('letters/digits first, then letters, digits, - _ .');
    busy = true;
    try {
      const res = await command(session.identity, 'claim', { slug: `/${h}`, components: { about: { label: h } } });
      if (res?.ok === false) return alert(res.error);
      if (!session.handle) setHandle(h);
      navigate(`/${h}`);
    } finally {
      busy = false;
    }
  }

  async function copyKey(secret = false) {
    if (secret && !confirm('Copy your SECRET key to the clipboard?\n\nAnyone holding this key IS you. Store it safely; paste it into join on another browser to carry your identity there.')) return;
    await navigator.clipboard.writeText(secret ? session.identity.privateKey : session.identity.publicKey);
  }

  function leave() {
    const msg = session.kind === 'web3auth'
      ? 'Sign out? Signing back in with Google recovers the same identity.'
      : 'Sign out? This key exists only in this browser and will be destroyed — copy the secret key first if you want it back.';
    if (!confirm(msg)) return;
    signOut();
    navigate('/');
  }
</script>

<header class="head">
  <h1>{own ? (session.handle ?? 'your profile') : shortKey(who)}</h1>
  {#if who}
    <p class="meta pubkey" title={who}>key {shortKey(who)}
      <button class="plain dim" title="copy full public key" onclick={() => navigator.clipboard.writeText(who)}>⧉</button>
    </p>
  {/if}
</header>

{#if !who}
  <p class="empty">no identity yet — hit <strong>join</strong> (top right) to mint one.</p>
{:else}
  <section class="profsection">
    <h2>areas</h2>
    {#if areas.length}
      <div class="cards">
        {#each areas as a (a.id)}
          <button class="card" onclick={() => navigate(a.slug)}>
            <div class="inner">
              <span class="kind">{isRoot(a) ? '⌂' : a.components?.about?.view === 'chat' ? '◉' : '▸'} {a.slug}
                {#if a.policy && a.policy !== 'public'} · {a.policy}{/if}
                {#if a.owner === who} · owner{/if}
              </span>
              <h2>{labelOf(a)}</h2>
              {#if a.components?.about?.description}<p class="desc">{a.components.about.description}</p>{/if}
            </div>
          </button>
        {/each}
      </div>
    {:else if loaded}
      <p class="empty">{own ? 'nothing yet — claim a folder below.' : 'nothing you can see (their private spaces stay theirs).'}</p>
    {/if}
  </section>

  {#if own && session.identity}
    <section class="profsection">
      <h2>powers</h2>
      <div class="actions">
        <button class="primary" onclick={claimFolder} disabled={busy}>claim a folder…</button>
        <button onclick={() => copyKey(false)}>copy public key</button>
        <button onclick={() => copyKey(true)}>copy secret key…</button>
        <button onclick={leave}>sign out…</button>
      </div>
      <p class="meta">your public key is how people invite you; your secret key IS your identity — guard it.</p>
    </section>
  {/if}
{/if}
