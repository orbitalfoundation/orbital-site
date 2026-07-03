<script>
  import Header from './lib/Header.svelte';
  import Folder from './lib/Folder.svelte';
  import Chat from './lib/Chat.svelte';
  import { route } from './lib/router.svelte.js';
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

  $effect(() => {
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
</script>

<Header />

<main>
  {#if error}<p class="error">{error}</p>{/if}
  {#if viewOf(entity) === 'chat'}
    <Chat slug={route.path} {entity} {kids} onrefresh={reload} />
  {:else}
    <Folder slug={route.path} {entity} {kids} onrefresh={reload} />
  {/if}
</main>
