<script lang="ts">
  // A range slider whose numeric read-out is double-clickable to type an exact
  // value. Typed values are NOT clamped to [min,max] (the thumb just pegs at the
  // end); dragging stays within range.
  let {
    label,
    value = $bindable(),
    min,
    max,
    step = 1,
    unit = '',
    onchange,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    onchange?: () => void;
  } = $props();

  let editing = $state(false);
  let draft = $state('');

  function focus(el: HTMLInputElement) {
    el.focus();
    el.select();
  }
  function startEdit() {
    draft = String(Math.round(value * 100) / 100);
    editing = true;
  }
  function commit() {
    const n = parseFloat(draft.replace(',', '.'));
    if (!Number.isNaN(n)) {
      value = n; // unclamped on purpose
      onchange?.();
    }
    editing = false;
  }
  const shown = $derived(Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10);
</script>

<label class="slider">
  {label}
  {#if editing}
    <input
      class="valedit"
      type="text"
      inputmode="decimal"
      bind:value={draft}
      onblur={commit}
      onkeydown={(e) => {
        if (e.key === 'Enter') commit();
        else if (e.key === 'Escape') editing = false;
      }}
      use:focus
    />
  {:else}
    <button type="button" class="val" ondblclick={startEdit} title="Double-clic pour saisir une valeur exacte (non limitée)">
      {shown}{unit}
    </button>
  {/if}
  <input
    type="range"
    {min}
    {max}
    {step}
    value={Math.min(max, Math.max(min, value))}
    oninput={(e) => {
      value = +e.currentTarget.value;
      onchange?.();
    }}
  />
</label>

<style>
  .slider {
    display: block;
    font-size: 0.85rem;
    margin-top: 0.6rem;
  }
  .val {
    float: right;
    opacity: 0.75;
    font: inherit;
    background: transparent;
    border: 1px dashed transparent;
    border-radius: 4px;
    padding: 0 0.2rem;
    color: inherit;
    cursor: text;
  }
  .val:hover {
    border-color: var(--border);
    opacity: 1;
  }
  .valedit {
    float: right;
    width: 5rem;
    font: inherit;
    text-align: right;
    padding: 0 0.25rem;
    border: 1px solid var(--accent);
    border-radius: 4px;
    background: var(--panel);
    color: inherit;
  }
  .slider input[type='range'] {
    width: 100%;
    accent-color: var(--accent);
  }
</style>
