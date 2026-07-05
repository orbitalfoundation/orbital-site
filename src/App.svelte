<script>
  import Header from './lib/Header.svelte';
  import Folder from './lib/Folder.svelte';
  import Chat from './lib/Chat.svelte';
  import Profile from './lib/Profile.svelte';
  import { route, setView } from './lib/router.svelte.js';
  import { session, initSession } from './lib/session.svelte.js';
  import { query, onChanged } from './lib/bus.js';
  import { viewOf } from './lib/views.js';

  initSession(); // restore local identity, or complete/resume a web3auth session

  let entity = $state(null);
  let kids = $state([]);
  let error = $state(null);

  async function refresh(slug, identity) {
    try {
      error = null;
      const [e, k] = await Promise.all([
        query('get', { slug }, identity),
        query('list', { slug }, identity),
      ]);
      entity = e;
      kids = k ?? [];
    } catch (err) {
      error = err.message;
    }
  }

  const reload = () => refresh(route.path, session.identity);

  // /profile and /profile/<pubkey> are hard routes, resolved BEFORE the
  // wildcard slug-to-entity routing (the names are also reserved as seeds, so
  // no entity can legitimately shadow them)
  const profileMatch = $derived(route.path.match(/^\/profile(?:\/([A-Za-z0-9]+))?\/?$/));

  $effect(() => {
    if (route.path.startsWith('/profile')) return; // hard route — no entity fetch
    refresh(route.path, session.identity);
  });

  $effect(() => {
    // live: whenever a change touches this folder or anything in it, refetch
    return onChanged((c) => {
      const here = route.path;
      const inHere = (s) => s && (s === here || s.startsWith(here === '/' ? '/' : here + '/'));
      if (inHere(c?.slug) || inHere(c?.from)) reload();
    });
  });

  // the effective view: the viewer's lens wins, else the area's own preference
  const view = $derived(viewOf(entity, route.view));

  function flipLens() {
    const target = view === 'chat' ? 'folder' : 'chat';
    // flipping back to the area's own default clears the lens (clean URL)
    setView(target === viewOf(entity) ? null : target);
  }
</script>

<Header />

{#if !profileMatch}
  <button class="chip lens" title="look at this area through a different lens (changes nothing for anyone else)" onclick={flipLens}>
    {view === 'chat' ? '▸ folder' : '◉ chat'}
  </button>
{/if}

<main>
  {#if profileMatch}
    <Profile pubkey={profileMatch[1] ?? null} />
  {:else}
    {#if error}<p class="error">{error}</p>{/if}
    {#if view === 'chat'}
      <Chat slug={route.path} {entity} {kids} onrefresh={reload} />
    {:else}
      <Folder slug={route.path} {entity} {kids} onrefresh={reload} />
    {/if}
  {/if}
</main>
