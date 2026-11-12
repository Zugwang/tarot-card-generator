<script lang="ts">
  /* Belotier's style sheet, served at /template.
   *
   * It imports the REAL components rather than copies of them, so what you judge
   * here is what ships. And it is the only place the sounds can be heard: the
   * headless Chromium used for automated checks has no audio output at all. */
  import { onMount } from 'svelte';
  import { SUIT_INK, SUIT_LABEL, SUIT_VARIANT } from '../src/cards';
  import { SUIT_VARIANTS } from '../../src/lib/render/suits';
  import { banner, embers, floatText, fx, shake } from '../src/fx.svelte';
  import { audio, sfx, toggleMute, unlock } from '../src/sfx.svelte';
  import Card from '../src/Card.svelte';
  import Overlay from '../src/Overlay.svelte';
  import Seat from '../src/Seat.svelte';
  import Sigil from '../src/Sigil.svelte';
  import Suit from '../src/Suit.svelte';
  import Demo from './Demo.svelte';
  import Section from './Section.svelte';

  // ---------------------------------------------------------------- jetons
  // Read live from the stylesheet instead of being retyped here, so the
  // swatches can never drift from the real art direction.
  const TOKEN_GROUPS = [
    { name: 'Fonds', keys: ['--void', '--bister', '--bister-soft'] },
    { name: 'Cuir', keys: ['--leather-0', '--leather-1', '--leather-2'] },
    { name: 'Or', keys: ['--gold-hi', '--gold', '--gold-deep', '--gold-dark'] },
    { name: 'Rouges', keys: ['--vermillon', '--oxblood', '--oxblood-deep'] },
    { name: 'Parchemin', keys: ['--parchment', '--parchment-dim', '--parchment-faint'] },
    { name: 'Équipes', keys: ['--ns', '--eo'] },
  ];
  let tokens = $state<Record<string, string>>({});
  let copied = $state<string | null>(null);

  async function copy(key: string) {
    try {
      await navigator.clipboard.writeText(tokens[key] ?? key);
      copied = key;
      setTimeout(() => (copied === key ? (copied = null) : null), 1200);
    } catch {
      // Clipboard is blocked without a secure context or a user gesture; the
      // hex is on screen anyway, so failing quietly is the right answer.
    }
  }

  // ---------------------------------------------------------------- icônes
  // Parsed from the CREDITS.txt that fetch-assets.sh writes, so every icon is
  // displayed next to the author CC BY 3.0 obliges us to name, and the list can
  // never fall out of step with what was actually downloaded.
  let icons = $state<{ file: string; name: string; author: string }[]>([]);

  onMount(async () => {
    const cs = getComputedStyle(document.documentElement);
    const next: Record<string, string> = {};
    for (const g of TOKEN_GROUPS) {
      for (const k of g.keys) next[k] = cs.getPropertyValue(k).trim();
    }
    tokens = next;

    try {
      const txt = await (await fetch('/icons/CREDITS.txt')).text();
      icons = txt
        .split('\n')
        // Slug and author only: the credits file opens with a line containing
        // " — " between two URLs, which a looser pattern turns into a phantom
        // icon with a mask pointing nowhere.
        .map((l) => l.match(/^([a-z0-9-]+)\s+—\s+([a-z0-9-]+)$/))
        .filter((m): m is RegExpMatchArray => !!m)
        .map((m) => ({ name: m[1], author: m[2], file: `/icons/${m[2]}--${m[1]}.svg` }));
    } catch {
      icons = [];
    }
  });

  // ------------------------------------------------------------- animations
  const ANIMS = [
    { n: 'spring-in', l: 'Spring in', d: 'arrivée, en service' },
    { n: 'land', l: 'Land', d: 'pose de carte, en service' },
    { n: 'squash', l: 'Squash', d: 'écrasement, en service' },
    { n: 'dust', l: 'Dust', d: 'poussière, en service' },
    { n: 'stamp', l: 'Stamp', d: 'cachet de cire, en service' },
    { n: 'emboss', l: 'Emboss', d: 'enseigne estampée, en service' },
    { n: 'slam', l: 'Slam', d: 'bannière, en service' },
    { n: 'rise', l: 'Rise', d: 'points flottants, en service' },
    { n: 'foil', l: 'Foil', d: 'atout, en service' },
    { n: 'bob', l: 'Bob', d: 'flottement, en service' },
    { n: 'breathe', l: 'Breathe', d: 'siège actif, en service' },
    { n: 'pulse', l: 'Pulse', d: 'carte jouable, en service' },
    { n: 'candle', l: 'Candle', d: 'chandelle, en service' },
    { n: 'turn', l: 'Turn', d: 'rose des vents, en service' },
    { n: 'sweep-out', l: 'Sweep out', d: 'pli ramassé, en service' },
    { n: 'sweep', l: 'Sweep', d: 'reflet d’or, en service' },
    { n: 'flip', l: 'Flip', d: 'proposition' },
    { n: 'wobble', l: 'Wobble', d: 'proposition' },
    { n: 'bloom', l: 'Bloom', d: 'proposition' },
    { n: 'smoke', l: 'Smoke', d: 'proposition' },
    { n: 'tilt', l: 'Tilt 3D', d: 'proposition' },
    { n: 'shiver', l: 'Shiver', d: 'proposition' },
  ];

  const SOUNDS: { k: keyof typeof sfx; l: string }[] = [
    { k: 'deal', l: 'Distribution' }, { k: 'play', l: 'Poser' },
    { k: 'lift', l: 'Lever' }, { k: 'click', l: 'Clic' },
    { k: 'trick', l: 'Pli' }, { k: 'chips', l: 'Jetons' },
    { k: 'take', l: 'Je prends' }, { k: 'pass', l: 'Je passe' },
    { k: 'belote', l: 'Belote' }, { k: 'win', l: 'Gagné' },
    { k: 'lose', l: 'Perdu' }, { k: 'error', l: 'Interdit' },
    { k: 'join', l: 'Arrivée' },
  ];

  const EASINGS = [
    '--ease-out-3', '--ease-in-out-3', '--ease-elastic-3', '--ease-elastic-4',
    '--ease-squish-3', '--ease-snap',
  ];
  let runEase = $state(0);

  const LICENCES = [
    { s: 'game-icons.net', l: 'CC BY 3.0', u: 'https://game-icons.net/about.html', k: 'retenue',
      w: 'Iconographie. Attribution obligatoire : auteur affiché sous chaque icône et dans public/icons/CREDITS.txt.' },
    { s: 'Google Fonts', l: 'SIL OFL', u: 'https://fonts.google.com/', k: 'retenue',
      w: 'Pirata One, Cinzel, EB Garamond. Sous-ensemble latin, self-hébergé.' },
    { s: 'open-props 1.7.23', l: 'MIT', u: 'https://github.com/argyleink/open-props', k: 'retenue',
      w: 'Courbes spring. Valeurs recopiées dans src/easings.css, pas installées en dépendance.' },
    { s: 'Art du dépôt', l: 'Domaine public', u: '', k: 'retenue',
      w: 'Dodal 1701, Grimaud 1898, BnF. Voir ART-CREDITS.md.' },
    { s: 'Fait main', l: '—', u: '', k: 'retenue',
      w: 'Boutons, filtres SVG (feTurbulence), toutes les animations ci-dessus.' },
    { s: 'Animate.css', l: 'contradictoire', u: 'https://github.com/animate-css/animate.css', k: 'ecartee',
      w: 'Hippocratic-2.1 dans le package.json de main, en-têtes MIT sur les copies v4.1.1.' },
    { s: 'Hover.css', l: 'restreinte', u: 'https://ianlunn.github.io/Hover/', k: 'ecartee',
      w: 'Palier gratuit restreint (« your application can’t be sold ») ; conditions commerciales au-delà de la 2.2.0.' },
    { s: 'css-loaders.com', l: 'introuvable', u: 'https://css-loaders.com/', k: 'ecartee',
      w: 'Aucune licence publiée ; la question est restée sans réponse publique chez l’auteur.' },
    { s: 'Animista', l: 'introuvable', u: 'https://animista.net/', k: 'ecartee',
      w: 'Ni licence ni conditions sur le site.' },
    { s: 'uiverse.io', l: 'MIT, inaccessible', u: 'https://uiverse.io/', k: 'ecartee',
      w: 'MIT annoncé, mais HTTP 403 à toute requête automatisée : impossible de vendoriser honnêtement.' },
  ];

  const NAV = [
    ['jetons', 'Jetons'], ['typo', 'Typo'], ['enseignes', 'Enseignes'],
    ['boutons', 'Boutons'], ['animations', 'Animations'], ['icones', 'Icônes'],
    ['courbes', 'Courbes'], ['composants', 'Composants'], ['sons', 'Sons'],
    ['licences', 'Licences'],
  ];

  const FAKE_SEAT = {
    name: 'Mathilde', online: true, ready: false, team: 'ns', cards: 6,
  };
</script>

<svelte:window onpointerdown={unlock} />

<div class="page" class:shake={fx.shaking}>
  <header class="top">
    <div>
      <h1 class="outlined">Planche de style</h1>
      <p class="sub">Belotier — direction artistique « Grimoire / Marseille »</p>
    </div>
    <button class="icon" onclick={() => toggleMute()}
            aria-label={audio.muted ? 'Activer le son' : 'Couper le son'}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        {#if audio.muted}
          <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
        {:else}
          <path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
        {/if}
      </svg>
    </button>
  </header>

  <nav>
    {#each NAV as [id, label]}<a href="#{id}">{label}</a>{/each}
  </nav>

  <main>
    <Section id="jetons" n="1" title="Jetons" source="Lus en direct dans la feuille de style"
             note="Les valeurs ci-dessous sont lues par getComputedStyle au chargement, pas recopiées : elles ne peuvent donc pas diverger de la vraie DA. Tape une pastille pour copier sa valeur.">
      {#each TOKEN_GROUPS as g}
        <div class="grp">
          <span class="engraved">{g.name}</span>
          <div class="swatches">
            {#each g.keys as k}
              <button class="sw" onclick={() => copy(k)} title={k}>
                <span class="chip" style="background: var({k})"></span>
                <span class="kn">{k.replace('--', '')}</span>
                <span class="hex num">{copied === k ? 'copié' : tokens[k] || '…'}</span>
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </Section>

    <Section id="typo" n="2" title="Typographie" source="Google Fonts" licence="SIL OFL"
             href="https://fonts.google.com/"
             note="Les chiffres et les accents sont affichés exprès : les cinq woff2 plus anciens du dépôt sont des sous-ensembles latin-ext SANS chiffres, et un jeu rempli de scores y retombait en silence sur une autre police. Si une ligne de chiffres ci-dessous change d’allure, le sous-ensemble est mauvais.">
      {#each [
        { f: 'var(--font-display)', n: 'Pirata One', u: 'Mot-symbole, grandes bannières', s: 40 },
        { f: 'var(--font-roman)', n: 'Cinzel 400–900', u: 'Chiffres, sièges, boutons', s: 28 },
        { f: 'var(--font-text)', n: 'EB Garamond 400–800', u: 'Texte courant', s: 24 },
      ] as t}
        <div class="face">
          <div class="fn"><b>{t.n}</b><span class="engraved">{t.u}</span></div>
          <div style="font-family: {t.f}; font-size: {t.s}px">Belote — Capot — Dedans</div>
          <div class="digits" style="font-family: {t.f}">0123456789 · 81 · 162 · 250 · 501</div>
          <div class="digits" style="font-family: {t.f}">àâäçéèêëîïôöùûü « » œ Œ</div>
        </div>
      {/each}
    </Section>

    <Section id="enseignes" n="3" title="Enseignes" source="src/lib/render/suits.ts de Tarotier"
             note="Le registre SVG paramétrique de Tarotier, que Belotier n’utilisait pas : il affichait ♠♥♦♣ en Unicode. La première colonne, encadrée, est la variante retenue — les enseignes du tarot latin : épée, coupe, denier, bâton.">
      {#each Object.entries(SUIT_VARIANTS) as [suit, variants]}
        <div class="suitrow">
          <span class="engraved sl">{SUIT_LABEL[suit]}</span>
          <div class="vars">
            {#each variants as v}
              <div class="v" class:chosen={v.id === SUIT_VARIANT[suit]}>
                <Suit {suit} variant={v.id} size={34} color={SUIT_INK[suit]} />
                <span class="vn">{v.label}</span>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </Section>

    <Section id="boutons" n="4" title="Boutons" source="Faits main, aucune bibliothèque"
             note="Les cinq collections de boutons CSS que j’ai examinées ont une licence soit restreinte, soit introuvable, soit inaccessible à une récupération automatique (voir §10). Tout ce qui suit est donc écrit à la main : le biseau vient d’ombres internes, pas d’un dégradé de remplissage.">
      <div class="btns">
        <button>Laiton gravé</button>
        <button class="primary">Feuille d’or</button>
        <button class="danger">Oxblood</button>
        <button class="ghost">Fantôme</button>
        <button class="seal">Cachet de cire</button>
        <button class="primary big">Grand · or</button>
        <button class="big">Grand · laiton</button>
        <button disabled>Désactivé</button>
        <button class="primary" disabled>Désactivé · or</button>
        <button class="icon" aria-label="Icône seule">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" /></svg>
        </button>
        {#each ['pique', 'coeur', 'carreau', 'trefle'] as s}
          <button class="stud" aria-label={SUIT_LABEL[s]}>
            <Suit suit={s} size={26} color={SUIT_INK[s]} />
          </button>
        {/each}
        <button class="stud on" aria-label="Enseigne choisie">
          <Suit suit="coeur" size={26} color="#2a1c02" />
        </button>
      </div>
    </Section>

    <Section id="animations" n="5" title="Animations" source="Faites main" 
             note="Tape une tuile pour la rejouer — c’est le seul moyen de juger une animation sur un téléphone. « En service » signifie que le jeu s’en sert déjà ; « proposition » qu’elle est disponible et attend ton avis.">
      <div class="demos">
        {#each ANIMS as a}<Demo name={a.n} label={a.l} detail={a.d} />{/each}
      </div>
      <div class="fxrow">
        <button onclick={() => shake(1)}>Secousse 1</button>
        <button onclick={() => shake(2)}>Secousse 2</button>
        <button onclick={() => shake(3)}>Secousse 3</button>
        <button onclick={() => floatText('+32', 'gold', 50, 42)}>Points flottants</button>
        <button onclick={() => floatText('+14', 'eo', 42, 46)}>Points · Est-Ouest</button>
        <button onclick={() => banner('Belote !', 'Nord', 'gold', 1600)}>Bannière</button>
        <button onclick={() => banner('Nord prend', 'Atout Cœur', 'gold', 2400, { seal: true, suit: 'coeur' })}>
          Cachet de cire
        </button>
        <button class="primary" onclick={() => embers()}>Braises</button>
      </div>
    </Section>

    <Section id="icones" n="6" title="Icônes" source="game-icons.net" licence="CC BY 3.0"
             href="https://game-icons.net/about.html"
             note="Attribution obligatoire, donc l’auteur est affiché sous chaque icône. Le fond opaque livré d’origine a été retiré et la couleur rendue variable, ce qui permet de les recolorer en CSS par mask-image.">
      {#if icons.length}
        <div class="icons">
          {#each icons as ic}
            <figure>
              <span class="ico" style="--src: url({ic.file})" role="img" aria-label={ic.name}></span>
              <figcaption>{ic.name}<small>{ic.author}</small></figcaption>
            </figure>
          {/each}
        </div>
      {:else}
        <p class="note">Liste indisponible : /icons/CREDITS.txt n’a pas pu être lu.</p>
      {/if}
    </Section>

    <Section id="courbes" n="7" title="Courbes" source="open-props 1.7.23" licence="MIT"
             href="https://github.com/argyleink/open-props"
             note="Transcrites dans src/easings.css plutôt qu’installées : le projet tient à une seule dépendance runtime. fetch-assets.sh revérifie que ces noms existent toujours en amont.">
      <button class="primary" onclick={() => runEase++}>Rejouer les six</button>
      <div class="eases">
        {#each EASINGS as e}
          <div class="ease">
            <span class="en">{e.replace('--ease-', '')}</span>
            <div class="track">
              {#key runEase}
                <span class="runner" style="animation: slide 1.1s var({e}) both"></span>
              {/key}
            </div>
          </div>
        {/each}
      </div>
    </Section>

    <Section id="composants" n="8" title="Composants réels"
             source="Importés depuis belote/src, pas recopiés"
             note="Ce sont les composants du jeu, donc ce que tu vois ici est exactement ce qui tourne en partie. La carte de gauche est à l’atout : son reflet foil est ce qui rend l’atout lisible d’un coup d’œil.">
      <div class="live">
        <div class="cell">
          <span class="engraved">Carte · atout</span>
          <Card template="marseille" id="pip-coeur-1" trump="coeur" playable />
        </div>
        <div class="cell">
          <span class="engraved">Carte · jouable</span>
          <Card template="marseille" id="court-pique-roi" playable />
        </div>
        <div class="cell">
          <span class="engraved">Carte · interdite</span>
          <Card template="marseille" id="pip-trefle-7" dim />
        </div>
        <div class="cell">
          <span class="engraved">Dos</span>
          <Card template="danois" faceDown />
        </div>
        <div class="cell">
          <span class="engraved">Siège · actif</span>
          <Seat seat="nord" info={FAKE_SEAT} where="top" active isDealer={false} isTaker
                template="marseille" />
        </div>
        <div class="cell">
          <span class="engraved">Siège · hors ligne</span>
          <Seat seat="est" info={{ ...FAKE_SEAT, name: 'Paul', online: false, team: 'eo' }}
                where="top" active={false} isDealer isTaker={false} template="marseille" />
        </div>
      </div>
      <div class="cell wide">
        <span class="engraved">Rose des vents — ton siège en bas, le tour en cours s’allume</span>
        <div class="sigilbox"><Sigil you="sud" turn="est" size={240} /></div>
      </div>
    </Section>

    <Section id="sons" n="9" title="Sons" source="Synthétisés en WebAudio, aucun fichier"
             note="LA section qu’aucune vérification automatique ne couvre : le Chromium headless de la box n’a pas de sortie audio. Si un son te déplaît, c’est ici que ça se voit — ou plutôt que ça s’entend.">
      <div class="fxrow">
        {#each SOUNDS as s}
          <button onclick={() => (sfx[s.k] as (n?: number) => void)()}>{s.l}</button>
        {/each}
      </div>
    </Section>

    <Section id="licences" n="10" title="Licences" source="Vérifiées une par une"
             note="Chaque source a été testée sur deux points : sa licence est-elle explicite, et le fichier est-il réellement récupérable. Cinq candidates ont échoué sur l’un ou l’autre.">
      <div class="lics">
        {#each LICENCES as r}
          <div class="lrow" class:out={r.k === 'ecartee'}>
            <div class="lhead">
              <b>{#if r.u}<a href={r.u} target="_blank" rel="noopener noreferrer">{r.s}</a>{:else}{r.s}{/if}</b>
              <span class="tag">{r.l}</span>
              <span class="kind">{r.k === 'retenue' ? 'retenue' : 'écartée'}</span>
            </div>
            <p>{r.w}</p>
          </div>
        {/each}
      </div>
    </Section>
  </main>

  <footer>
    <a href="/">← la table</a>
    <span>Page de travail, en noindex. Les captures automatiques ne jugent ni le ressenti ni le son.</span>
  </footer>

  <Overlay />
</div>

<style>
  .page { max-width: 860px; margin: 0 auto; padding: 0 2px 40px; }

  .top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 18px 0 6px; }
  h1 {
    font-size: clamp(30px, 9vw, 50px); margin: 0; color: var(--gold);
    -webkit-text-stroke-width: 5px;
  }
  .sub {
    margin: 4px 0 0; font-family: var(--font-text); font-style: italic;
    color: var(--parchment-dim); font-size: 15px;
  }

  nav {
    display: flex; flex-wrap: wrap; gap: 6px;
    position: sticky; top: 0; z-index: 40;
    padding: 9px 2px;
    background: linear-gradient(var(--void) 70%, transparent);
  }
  nav a {
    font-family: var(--font-roman); font-size: 10px; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase;
    color: var(--parchment-dim); text-decoration: none;
    padding: 5px 9px; border-radius: 3px;
    border: 1px solid var(--gold-dark);
    background: rgba(11, 9, 8, .7);
  }
  nav a:hover { color: var(--gold); border-color: var(--gold-deep); }

  /* --- jetons --- */
  .grp { margin-bottom: 14px; }
  .swatches { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 5px; }
  .sw {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 10px 6px 7px; min-height: 0;
    text-transform: none; letter-spacing: normal;
  }
  .chip {
    width: 26px; height: 26px; border-radius: 3px; flex: none;
    box-shadow: inset 0 0 0 1px rgba(234, 211, 160, .25), 0 1px 3px rgba(0, 0, 0, .6);
  }
  .kn { font-family: var(--font-roman); font-size: 11px; letter-spacing: .06em; }
  /* Hex in a monospace: Cinzel's zero is close enough to its O to misread. */
  .hex {
    font-family: ui-monospace, 'DejaVu Sans Mono', monospace;
    font-size: 10.5px; color: var(--parchment-faint); min-width: 62px; text-align: left;
  }

  /* --- typo --- */
  .face {
    padding: 13px 15px; margin-bottom: 11px;
    border-radius: 4px; border: 1px solid var(--gold-dark);
    background: rgba(11, 9, 8, .4);
  }
  .fn { display: flex; align-items: baseline; gap: 10px; margin-bottom: 7px; }
  .fn b { font-family: var(--font-roman); font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: var(--gold); }
  .digits { font-size: 19px; color: var(--parchment-dim); margin-top: 3px; font-variant-numeric: tabular-nums; }

  /* --- enseignes --- */
  .suitrow { display: flex; gap: 12px; align-items: center; margin-bottom: 11px; flex-wrap: wrap; }
  .sl { min-width: 66px; }
  .vars { display: flex; flex-wrap: wrap; gap: 7px; }
  .v {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    width: 64px; padding: 7px 2px;
    border-radius: 4px; border: 1px solid transparent;
  }
  .v.chosen {
    border-color: var(--gold);
    background: rgba(200, 160, 74, .09);
    box-shadow: inset 0 0 0 1px rgba(200, 160, 74, .2);
  }
  .vn { font-family: var(--font-roman); font-size: 8.5px; letter-spacing: .06em;
        text-transform: uppercase; color: var(--parchment-faint); text-align: center; }

  /* --- boutons --- */
  .btns { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .stud { width: 54px; height: 54px; min-height: 54px; padding: 0; display: grid; place-items: center; border-radius: 50%; }
  .stud.on {
    background: linear-gradient(170deg, var(--gold-hi), var(--gold) 46%, var(--gold-deep));
    border-color: var(--gold-hi);
    box-shadow: inset 0 1px 0 rgba(255, 250, 235, .7), 0 4px 0 var(--gold-dark);
  }
  .icon { padding: 11px 13px; display: grid; place-items: center; color: var(--parchment-dim); }

  /* --- animations --- */
  .demos { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px; }
  .fxrow { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .fxrow button { font-size: 11px; padding: 10px 13px; min-height: 42px; }

  /* --- icônes --- */
  .icons { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 9px; }
  figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 4px;
           padding: 9px 4px; border-radius: 4px; background: rgba(11, 9, 8, .4);
           border: 1px solid var(--gold-dark); }
  /* mask-image + currentColor: that is why the opaque background had to go. */
  .ico {
    width: 38px; height: 38px;
    background: var(--gold);
    -webkit-mask: var(--src) center / contain no-repeat;
    mask: var(--src) center / contain no-repeat;
  }
  figcaption {
    font-family: var(--font-roman); font-size: 8.5px; letter-spacing: .05em;
    text-transform: uppercase; color: var(--parchment-dim); text-align: center;
    display: flex; flex-direction: column; gap: 1px; word-break: break-word;
  }
  figcaption small { font-family: var(--font-text); font-size: 10px; text-transform: none;
                     letter-spacing: 0; color: var(--parchment-faint); font-style: italic; }

  /* --- courbes --- */
  .eases { margin-top: 11px; display: grid; gap: 8px; }
  .ease { display: flex; align-items: center; gap: 11px; }
  .en { font-family: var(--font-roman); font-size: 10px; letter-spacing: .08em;
        text-transform: uppercase; color: var(--parchment-dim); min-width: 96px; }
  .track { flex: 1; height: 16px; border-radius: 3px; background: rgba(11, 9, 8, .55);
           box-shadow: inset 0 1px 4px rgba(0, 0, 0, .6); position: relative; overflow: hidden; }
  .runner {
    position: absolute; top: 3px; left: 0; width: 10px; height: 10px; border-radius: 2px;
    background: var(--gold);
    box-shadow: 0 0 8px rgba(200, 160, 74, .6);
  }
  @keyframes slide { from { left: 2px; } to { left: calc(100% - 12px); } }

  /* --- composants --- */
  .live { display: flex; flex-wrap: wrap; gap: 14px; }
  .cell { display: flex; flex-direction: column; align-items: center; gap: 7px;
          padding: 13px; border-radius: 4px; border: 1px solid var(--gold-dark);
          background: rgba(11, 9, 8, .35); }
  .wide { margin-top: 14px; align-items: flex-start; }
  .sigilbox { position: relative; width: 100%; height: 250px; }

  /* --- licences --- */
  .lics { display: grid; gap: 8px; }
  .lrow { padding: 11px 13px; border-radius: 4px; background: rgba(11, 9, 8, .4);
          border-left: 3px solid var(--gold); }
  .lrow.out { border-left-color: var(--oxblood); opacity: .82; }
  .lhead { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
  .lhead b { font-family: var(--font-roman); font-size: 13px; letter-spacing: .05em; }
  .lhead a { color: var(--parchment); text-decoration: underline var(--gold-dark); }
  .tag { font-family: var(--font-roman); font-size: 9px; letter-spacing: .1em; text-transform: uppercase;
         background: var(--gold-deep); color: var(--void); border-radius: 2px; padding: 2px 6px; }
  .out .tag { background: var(--oxblood); color: #f4ccc6; }
  .kind { font-family: var(--font-text); font-size: 12px; font-style: italic; color: var(--parchment-faint); }
  .lrow p { margin: 5px 0 0; font-family: var(--font-text); font-size: 14px; line-height: 1.45;
            color: var(--parchment-dim); }

  footer {
    margin-top: 30px; padding-top: 16px; border-top: 1px solid var(--gold-dark);
    display: flex; flex-direction: column; gap: 6px;
    font-family: var(--font-text); font-size: 13px; font-style: italic; color: var(--parchment-faint);
  }
  footer a { color: var(--gold); text-decoration: none; font-style: normal;
             font-family: var(--font-roman); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; }
</style>
