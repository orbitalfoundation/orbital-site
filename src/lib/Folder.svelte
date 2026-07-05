<script>
  import { navigate } from './router.svelte.js';
  import { session } from './session.svelte.js';
  import { command } from './bus.js';
  import { labelOf, basename } from './views.js';
  import { shortKey } from './identity.js';

  let { slug, entity, kids, onrefresh } = $props();

  const segs = $derived(slug.split('/').filter(Boolean));
  const crumbs = $derived(segs.map((s, i) => ({ label: s, path: '/' + segs.slice(0, i + 1).join('/') })));
  const isHome = $derived(slug === '/');
  const mine = $derived(Boolean(session.identity) && entity?.owner === session.identity.publicKey);

  const childSlug = (name) => (slug === '/' ? `/${name}` : `${slug}/${name}`);

  async function act(op, params, label) {
    const res = await command(session.identity, op, params);
    if (res?.ok === false) alert(`${label}: ${res.error}`);
    else onrefresh?.();
  }

  function mkdir() {
    const name = prompt('folder name:');
    if (!name) return;
    act('create', { slug: childSlug(name.trim().toLowerCase()) }, 'create');
  }

  function addNote() {
    const label = prompt('note title:');
    if (!label) return;
    const description = prompt('note text:') ?? '';
    const name = label.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[^a-z0-9]+/, '');
    if (!name) return alert('need a name that starts with a letter or digit');
    act('create', { slug: childSlug(name), components: { about: { label, description } } }, 'note');
  }

  function addLink() {
    const href = prompt('url:');
    if (!href) return;
    const label = prompt('label:', href.replace(/^https?:\/\//, '').slice(0, 40)) ?? href;
    const name = label.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[^a-z0-9]+/, '');
    if (!name) return alert('need a name that starts with a letter or digit');
    act('create', { slug: childSlug(name), components: { about: { label }, link: { href } } }, 'link');
  }

  function invite() {
    const who = prompt("invitee's public key (they can copy it from their ⧉ chip):");
    if (!who) return;
    act('invite', { slug, who: who.trim() }, 'invite');
  }

  function setPolicy(e) {
    const policy = e.target.value;
    if (policy) act('set_policy', { slug, policy }, 'policy');
    e.target.value = '';
  }

  function rename() {
    const name = prompt('new name:', basename(slug));
    if (!name) return;
    const parent = '/' + segs.slice(0, -1).join('/');
    const to = (parent === '/' ? '' : parent) + '/' + name.trim().toLowerCase();
    act('move', { slug, to }, 'rename');
    navigate(to);
  }

  function del(target) {
    if (!confirm(`delete ${target}?`)) return;
    act('delete', { slug: target }, 'delete');
  }
</script>

{#if !isHome}
  <nav class="crumbs">
    <button onclick={() => navigate('/')}>home</button>
    {#each crumbs as c, i}
      <span class="sep">/</span>
      {#if i < crumbs.length - 1}<button onclick={() => navigate(c.path)}>{c.label}</button>
      {:else}<span>{c.label}</span>{/if}
    {/each}
  </nav>
{/if}

<header class="head">
  <h1>
    {isHome ? (entity ? labelOf(entity, slug) : 'orbital jam') : labelOf(entity, slug)}
    {#if entity?.policy && entity.policy !== 'public'}<span class="badge" class:hot={entity.policy === 'private'}>{entity.policy}</span>{/if}
  </h1>
  {#if isHome && !entity}
    <p class="desc">a shared filespace — claim a folder, drag friends in, jam on projects together.</p>
  {:else if entity?.components?.about?.description}
    <p class="desc">{entity.components.about.description}</p>
  {/if}
  {#if entity?.owner}<p class="meta">owner {shortKey(entity.owner)}{#if entity.members?.length > 1} · {entity.members.length} members{/if}</p>{/if}
</header>

{#if session.identity && !isHome}
  <div class="actions">
    <button class="primary" onclick={mkdir}>+ folder</button>
    <button class="primary" onclick={addNote}>+ note</button>
    <button class="primary" onclick={addLink}>+ link</button>
    <button onclick={invite}>invite…</button>
    {#if mine}
      <select onchange={setPolicy}>
        <option value="">privacy…</option>
        <option value="public">public</option>
        <option value="protected">protected</option>
        <option value="private">private</option>
      </select>
      <button onclick={rename}>rename…</button>
      <button onclick={() => del(slug)}>delete</button>
    {/if}
  </div>
{/if}

{#if kids.length}
  <div class="cards">
    {#each kids as k (k.id)}
      <button class="card" onclick={() => navigate(k.slug)}>
        {#if k.components?.about?.depiction}<img class="pic" src={k.components.about.depiction} alt="" />{/if}
        <div class="inner">
          <span class="kind">
            {k.components?.about?.view === 'chat' ? '◉' : k.components?.link ? '🔗' : '▸'}
            {#if k.policy && k.policy !== 'public'} · {k.policy}{/if}
            {#if k.hydrated === false} · …{/if}
          </span>
          <h2>{labelOf(k)}</h2>
          {#if k.components?.about?.description}<p class="desc">{k.components.about.description}</p>{/if}
          {#if k.components?.link?.href}<a href={k.components.link.href} target="_blank" rel="noreferrer" onclick={(e) => e.stopPropagation()}>{k.components.link.href}</a>{/if}
        </div>
      </button>
    {/each}
  </div>
{:else}
  <p class="empty">
    {#if isHome}
      nothing here yet — hit <strong>join</strong> (top right), then claim a folder from your profile.
    {:else}
      empty. {#if session.identity}add a folder, note or link above.{/if}
    {/if}
  </p>
{/if}
