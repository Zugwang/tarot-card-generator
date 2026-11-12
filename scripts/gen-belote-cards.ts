// Pre-render the 32 belote cards (+ the back) for Belotier, at BUILD time.
//
// The game server renders nothing: nginx serves these as plain static files, so
// the belote client needs no Tarotier rendering code at all.
//
// Run through the SSR pipeline (see belote/gen-cards.sh), which bundles the pure
// renderers for node:
//   npx vite build --ssr scripts/gen-belote-cards.ts --outDir /tmp/x
//   node /tmp/x/gen-belote-cards.js <outdir>
//
// Hrefs are rewritten from "/art/..." to "art/..." and the referenced images are
// copied next to the SVGs, because librsvg refuses <image> paths that leave the
// SVG's own directory (and refuses ".." too).

import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { BACK_CARD, cardId, cardLabel, cardName, generateDeck, type Card } from '../src/lib/model/deck';
import { renderCardSVG, type RenderOptions } from '../src/lib/render/card';
import { pipTemplate } from '../src/lib/render/pipLayouts';
import { suitSymbol } from '../src/lib/render/suits';

interface TemplateDef {
  label: string;
  courtStyle: string;
  cardBg: string;
  suitColors?: Partial<Record<string, string>>;
  back: { templateId: string; color: string; suit?: string };
}

/** Only public-domain, repo-committed art: these ship with the game. */
const TEMPLATES: Record<string, TemplateDef> = {
  marseille: {
    label: 'Marseille',
    courtStyle: 'marseille',
    cardBg: '#fdfaf2',
    suitColors: { coeur: '#b3202e', carreau: '#b3202e', pique: '#1b1b20', trefle: '#1b1b20' },
    back: { templateId: 'ornement', color: '#7d1d2a' },
  },
  danois: {
    label: 'Portrait danois',
    courtStyle: 'danois',
    cardBg: '#fbf7ef',
    suitColors: { coeur: '#c0392b', carreau: '#c0392b', pique: '#161616', trefle: '#161616' },
    back: { templateId: 'losanges', color: '#1f3b57' },
  },
};

const W = 250;
const H = 350;
// The SSR bundle runs from a temp dir, so never derive this from the bundle's
// own location: take it from the caller (default = ./public of the cwd).
const PUBLIC = process.argv[3] ?? join(process.cwd(), 'public');

function optionsFor(t: TemplateDef): RenderOptions {
  return {
    width: W,
    height: H,
    pipTemplate: pipTemplate('classic'),
    pipSize: 34,
    cornerCount: 2,
    indexFont: 'georgia',
    cardBg: t.cardBg,
    suitColors: t.suitColors as RenderOptions['suitColors'],
    courtStyle: t.courtStyle,
    imageFit: 'meet',
    backConfig: t.back as RenderOptions['backConfig'],
  };
}

/** Corner index badge for illustrated court cards.
 *
 * Tarotier draws no index over a court illustration, which is fine for a display
 * deck but not for actually playing: the Marseille figures are captioned with
 * TAROT suits ("VALET D'ESPEE" on a spade), so a player could not read their hand
 * at a glance — and at belote the trump Jack is worth 20, you must spot it fast.
 * So Belotier overlays its own badge, on a translucent plate for legibility.
 */
function courtBadge(card: Card, opts: RenderOptions): string {
  if (card.kind !== 'court') return '';
  const colour = (opts.suitColors as Record<string, string> | undefined)?.[card.suit] ?? '#161616';
  const glyph = suitSymbol(card.suit, undefined, colour);
  const label = cardLabel(card);
  const block = (x: number, y: number, rot: number) =>
    `<g transform="translate(${x} ${y}) rotate(${rot})">` +
    `<rect x="-15" y="-21" width="30" height="46" rx="9" fill="#fdfbf5" fill-opacity="0.9" stroke="${colour}" stroke-opacity="0.35" stroke-width="1"/>` +
    `<text x="0" y="-4" text-anchor="middle" font-family="Georgia, serif" font-size="24" font-weight="700" fill="${colour}">${label}</text>` +
    `<g transform="translate(0 13) scale(0.2) translate(-50 -50)">${glyph}</g></g>`;
  return block(0.104 * W, 0.105 * H, 0) + block(W - 0.104 * W, H - 0.105 * H, 180);
}

/** Rewrite absolute /art/ refs to relative, and report what must be copied. */
function localise(svg: string): { svg: string; assets: string[] } {
  const assets = new Set<string>();
  const out = svg.replace(/(href|xlink:href)="\/art\/([^"]+)"/g, (_m, attr, rest) => {
    assets.add(`art/${rest}`);
    return `${attr}="art/${rest}"`;
  });
  return { svg: out, assets: [...assets] };
}

function main(): void {
  const outRoot = process.argv[2];
  if (!outRoot) {
    console.error('usage: gen-belote-cards.js <outdir> [publicDir]');
    process.exit(2);
  }

  const deck = generateDeck(32);
  if (deck.length !== 32) throw new Error(`expected 32 cards, got ${deck.length}`);

  const manifest: Record<string, unknown> = { width: W, height: H, templates: {} };

  for (const [id, tpl] of Object.entries(TEMPLATES)) {
    const dir = join(outRoot, id);
    mkdirSync(dir, { recursive: true });
    const opts = optionsFor(tpl);
    const cards: { id: string; label: string; name: string }[] = [];
    let copied = 0;

    const emit = (card: Card, name: string) => {
      const raw = renderCardSVG(card, opts).replace(/<\/svg>$/, `${courtBadge(card, opts)}</svg>`);
      const { svg, assets } = localise(raw);
      writeFileSync(join(dir, `${name}.svg`), svg);
      for (const rel of assets) {
        const dest = join(dir, rel);
        mkdirSync(dirname(dest), { recursive: true });
        copyFileSync(join(PUBLIC, rel), dest);
        copied++;
      }
    };

    for (const card of deck) {
      emit(card, cardId(card));
      cards.push({ id: cardId(card), label: cardLabel(card), name: cardName(card) });
    }
    emit(BACK_CARD, 'back');

    (manifest.templates as Record<string, unknown>)[id] = { label: tpl.label, cards };
    console.log(`${id}: 32 cartes + dos, ${copied} images d'art copiees`);
  }

  writeFileSync(join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`manifeste ecrit dans ${outRoot}/manifest.json`);
}

main();
