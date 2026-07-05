<script>
  import { navigate } from './router.svelte.js';
  import { session, signIn, signInWeb3Auth } from './session.svelte.js';
  import { configured as w3aConfigured } from './web3auth.js';
  import { shortKey } from './identity.js';

  let busy = $state(false);

  // join = get an identity, then land on your profile — the canonical home.
  // Claiming folders (plural, optional) lives there, not in a startup gate.
  async function join() {
    busy = true;
    try {
      if (w3aConfigured && confirm('Sign in with Google (via Web3Auth)?\n\nOK — Google sign-in: recoverable, Web3Auth custodies key shares.\nCancel — local key: yours alone, no recovery, portable by copying it.')) {
        await signInWeb3Auth(); // redirect mode: usually never returns
        if (!session.identity) return; // redirected away
      } else {
        const pasted = prompt('paste a SECRET key to restore an identity — or leave empty to mint a new one:');
        if (pasted === null) return;
        try {
          signIn(pasted.trim() || null);
        } catch {
          return alert('that is not a valid secret key');
        }
      }
      navigate('/profile');
    } catch (err) {
      alert(`sign-in failed: ${err.message}`);
    } finally {
      busy = false;
    }
  }
</script>

<button class="chip logo" onclick={() => navigate('/')}>orbital·jam</button>

<div class="chip who">
  {#if session.identity}
    <button class="plain" title="your profile" onclick={() => navigate('/profile')}>
      {session.handle ?? shortKey(session.identity.publicKey)}
    </button>
  {:else if session.restoring}
    <span class="plain dim">…</span>
  {:else}
    <button class="plain" onclick={join} disabled={busy}>{busy ? '…' : 'join'}</button>
  {/if}
</div>
