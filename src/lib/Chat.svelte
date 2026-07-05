<script>
  // chat is a VIEW of a folder — a conversational space over its objects. The
  // message log lives in the streams layer; presence is ephemeral room state.
  import { navigate } from './router.svelte.js';
  import { session } from './session.svelte.js';
  import { labelOf } from './views.js';
  import { shortKey } from './identity.js';
  import { socket, streamsQuery, streamsCommand, hello, join, leave, onMessage, onPresence } from './bus.js';

  let { slug, entity, kids } = $props();

  let messages = $state([]);
  let people = $state([]);
  let draft = $state('');
  let status = $state(null);
  let pane = $state(null);

  async function enter(s, identity) {
    messages = [];
    people = [];
    status = null;
    try {
      if (identity) await hello(identity, session.handle);
      const joined = await join(s);
      if (!joined.ok) {
        status = joined.error;
        return;
      }
      messages = await streamsQuery('tail', { slug: s, limit: 100 }, identity);
      scrollDown();
    } catch (err) {
      status = err.message;
    }
  }

  $effect(() => {
    const s = slug;
    const id = session.identity;
    enter(s, id);
    const offMsg = onMessage((m) => {
      if (m.slug === s) {
        messages.push(m);
        scrollDown();
      }
    });
    const offPres = onPresence((p) => {
      if (p.slug === s) people = p.people;
    });
    const reconnect = () => enter(s, id); // a dropped socket forgets hello + rooms
    socket.on('connect', reconnect);
    return () => {
      offMsg();
      offPres();
      socket.off('connect', reconnect);
      leave(s);
    };
  });

  async function send(e) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !session.identity) return;
    draft = '';
    const res = await streamsCommand(session.identity, 'post', { slug, body, label: session.handle });
    if (res?.ok === false) status = res.error;
  }

  function scrollDown() {
    requestAnimationFrame(() => pane?.scrollTo(0, pane.scrollHeight));
  }

  const mine = (m) => m.author === session.identity?.publicKey;
  const who = (m) => m.label ?? (m.author ? shortKey(m.author) : 'guest');
  const at = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
</script>

<nav class="crumbs">
  <button onclick={() => navigate('/')}>home</button>
  <span class="sep">/</span>
  <span>{labelOf(entity, slug)}</span>
</nav>

<header class="head chathead">
  <h2>◉ {labelOf(entity, slug)}</h2>
  {#if people.length}
    <p class="meta">here now: {people.map((p) => p.label ?? (p.principal ? shortKey(p.principal) : 'guest')).join(' · ')}</p>
  {/if}
  {#if kids.length}
    <p class="meta objects">
      {#each kids as k (k.id)}
        <button class="obj" onclick={() => navigate(k.slug)}>▸ {labelOf(k)}</button>
      {/each}
    </p>
  {/if}
</header>

<div class="chatwrap">
  <div class="messages" bind:this={pane}>
    {#if status}<div class="notice">{status}</div>{/if}
    {#if !messages.length && !status}<div class="notice">no messages yet — say something.</div>{/if}
    {#each messages as m (m.seq)}
      <div class="msg" class:mine={mine(m)}>
        <span class="who">
          {#if m.author}<button class="plain" title="their profile" onclick={() => navigate('/profile/' + m.author)}>{who(m)}</button>{:else}{who(m)}{/if}
          · {at(m.at)}
        </span>
        <div class="bubble">{m.body}</div>
      </div>
    {/each}
  </div>
  <form class="composer" onsubmit={send}>
    {#if session.identity}
      <input bind:value={draft} placeholder="message {labelOf(entity, slug)}…" autocomplete="off" />
      <button type="submit" disabled={!draft.trim()}>send</button>
    {:else}
      <input placeholder="hit join (top right) to chat" disabled />
      <button disabled>send</button>
    {/if}
  </form>
</div>
