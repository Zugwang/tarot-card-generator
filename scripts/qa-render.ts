import { generateDeck } from '../src/lib/model/deck';
import { renderCardSVG } from '../src/lib/render/card';
import { pipTemplate } from '../src/lib/render/pipLayouts';
import { writeFileSync } from 'node:fs';

const deck = generateDeck(78);
const atout = (n: number) => deck.find((c) => c.kind === 'atout' && (c as any).number === n)!;
const base = {
  width: 250,
  height: 455,
  pipTemplate: pipTemplate('classic'),
  imageFit: 'meet' as const,
};

// 1) Carrington Death (13), 2) Oracle arcane 05, 3) free-mode card with an
// oversized image to test the rounded-corner clip.
const cards: Record<string, string> = {
  carrington13: renderCardSVG(atout(13), { ...base, atoutStyle: 'carrington' }),
  oracle05: renderCardSVG(atout(5), { ...base, atoutStyle: 'oracle' }),
  clipTest: renderCardSVG(atout(1), {
    ...base,
    atoutStyle: 'marseille',
    freeCard: {
      hideBase: true,
      layers: [
        { id: 'a', type: 'image', href: '/art/atouts-oracle/09.webp', x: 0.5, y: 0.5, size: 520, rot: 8 } as any,
      ],
    },
  }),
};

for (const [k, svg] of Object.entries(cards)) writeFileSync(`dist/qa-${k}.svg`, svg);
console.log('wrote', Object.keys(cards).join(', '));
