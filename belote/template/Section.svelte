<script lang="ts">
  /* One block of the style sheet, with its provenance stated. Every section
     names where its material comes from and under which licence — that is the
     whole point of the page: nothing here is of unverified origin. */
  import type { Snippet } from 'svelte';

  interface Props {
    id: string;
    n: string;
    title: string;
    source?: string;
    licence?: string;
    href?: string;
    note?: string;
    children: Snippet;
  }
  let { id, n, title, source, licence, href, note, children }: Props = $props();
</script>

<section {id}>
  <header>
    <span class="n num">{n}</span>
    <h2>{title}</h2>
  </header>
  {#if source}
    <p class="prov">
      <span class="engraved">Source</span>
      {#if href}<a {href} target="_blank" rel="noopener noreferrer">{source}</a>{:else}{source}{/if}
      {#if licence}<span class="lic">{licence}</span>{/if}
    </p>
  {/if}
  {#if note}<p class="note">{note}</p>{/if}
  <div class="body">{@render children()}</div>
</section>

<style>
  section { margin: 0 0 54px; scroll-margin-top: 64px; }
  header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px; }
  .n {
    font-size: 13px; color: var(--gold-deep);
    border: 1px solid var(--gold-dark); border-radius: 3px;
    padding: 1px 6px; flex: none;
  }
  h2 {
    font-family: var(--font-display); font-weight: 400;
    font-size: clamp(24px, 7vw, 34px); margin: 0; color: var(--gold);
    text-shadow: 0 2px 0 var(--void);
  }
  .prov { margin: 0 0 6px; font-size: 13px; color: var(--parchment-dim); font-family: var(--font-text); }
  .prov a { color: var(--parchment); text-decoration: underline var(--gold-dark); }
  .lic {
    display: inline-block; margin-left: 7px;
    font-family: var(--font-roman); font-size: 9.5px; letter-spacing: .1em;
    text-transform: uppercase; color: var(--void);
    background: var(--gold-deep); border-radius: 2px; padding: 2px 6px;
  }
  .note {
    margin: 0 0 12px; font-family: var(--font-text); font-size: 15px; font-style: italic;
    color: var(--parchment-dim); max-width: 62ch; line-height: 1.5;
  }
  .body { margin-top: 12px; }
</style>
