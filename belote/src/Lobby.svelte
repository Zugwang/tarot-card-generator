<script lang="ts">
  // Shown at the root: the four seat links to hand out. The link IS the
  // identity, which is what makes reconnecting on a phone painless.
  import { SEAT_LABEL } from './cards';
  import { sfx } from './sfx.svelte';
  import { net } from './net.svelte';

  let copied = $state<string | null>(null);

  function linkFor(seat: string): string {
    const key = net.links?.[seat] ?? '';
    return `${location.origin}/s/${seat}#k=${key}`;
  }
  async function copy(seat: string) {
    sfx.click();
    const url = linkFor(seat);
    try {
      await navigator.clipboard.writeText(url);
      copied = seat;
      setTimeout(() => (copied = null), 1600);
    } catch {
      prompt('Copie ce lien :', url);
    }
  }
</script>

<div class="lobby">
  <h1>Belotier</h1>
  <p class="lede">
    Une table, quatre places. Envoie un lien à chacun : le lien <em>est</em> la place.
    Dès que les quatre sont connectés, la partie démarre.
  </p>

  {#if net.links}
    <div class="seats">
      {#each ['nord', 'est', 'sud', 'ouest'] as seat}
        <div class="seat" style="--c: var(--{seat === 'nord' || seat === 'sud' ? 'ns' : 'eo'})">
          <div class="hd">
            <b>{SEAT_LABEL[seat]}</b>
            <span>{seat === 'nord' || seat === 'sud' ? 'Nord-Sud' : 'Est-Ouest'}</span>
          </div>
          <code>{linkFor(seat)}</code>
          <div class="actions">
            <button onclick={() => copy(seat)}>{copied === seat ? 'Copié !' : 'Copier'}</button>
            <a class="go" href={linkFor(seat)}>Prendre cette place</a>
          </div>
        </div>
      {/each}
    </div>
    <p class="warn">
      Ces liens donnent accès à la table : ne les publie pas. Ils changent si le
      service redémarre.
    </p>
  {:else if net.error}
    <div class="private">
      <p><b>Les liens de place ne sont pas publics.</b></p>
      <p class="lede">
        Le propriétaire de la table les distribue lui-même — c'est ce qui empêche
        un visiteur de passage de s'asseoir. Si tu dois jouer, demande-lui ton lien.
      </p>
    </div>
  {:else}
    <p class="lede">Connexion au serveur…</p>
  {/if}
</div>

<style>
  .lobby { max-width: 620px; margin: 0 auto; padding: 18px 4px 40px; }
  h1 { font-size: clamp(34px, 11vw, 54px); margin: 10px 0 4px; letter-spacing: -.03em; color: var(--gold); text-shadow: 0 4px 0 rgba(0, 0, 0, .4); }
  .lede { color: var(--ink-dim); line-height: 1.5; margin: 0 0 18px; }
  .seats { display: grid; gap: 11px; }
  .seat {
    padding: 12px; border-radius: 14px;
    background: rgba(0, 0, 0, .26);
    border: 2px solid var(--c);
  }
  .hd { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 7px; }
  .hd b { font-size: 17px; }
  .hd span { font-size: 11px; color: var(--ink-dim); text-transform: uppercase; letter-spacing: .08em; }
  code {
    display: block; font-size: 11px; color: var(--ink-dim);
    background: rgba(0, 0, 0, .35); padding: 7px 9px; border-radius: 8px;
    overflow-wrap: anywhere; margin-bottom: 9px;
  }
  .actions { display: flex; gap: 8px; }
  .go {
    display: inline-flex; align-items: center; padding: 12px 16px; min-height: 48px;
    border-radius: 12px; font-weight: 800; text-decoration: none;
    background: linear-gradient(#f3c14a, var(--gold-deep)); color: #2a1c02;
    box-shadow: 0 4px 0 rgba(0, 0, 0, .45);
  }
  .private { padding: 16px; border-radius: 14px; background: rgba(0,0,0,.26); border: 2px solid var(--gold); }
  .private p { margin: 0 0 6px; }
  .warn { color: #e8b26b; font-size: 12.5px; margin-top: 16px; line-height: 1.5; }
</style>
