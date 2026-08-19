// Dev-only visual QA: write one SVG file per card of a deck into a directory.
// Built via `vite build --ssr` then run with node; PNGs montaged externally.
import { writeFileSync, mkdirSync } from 'node:fs';
import { generateDeck, cardId, type DeckSize } from '../src/lib/model/deck';
import { renderCardSVG } from '../src/lib/render/card';

const size = (Number(process.argv[2]) || 52) as DeckSize;
const dir = process.argv[3] || '/tmp/cards';

mkdirSync(dir, { recursive: true });
const deck = generateDeck(size);
deck.forEach((card, i) => {
  const idx = String(i).padStart(2, '0');
  writeFileSync(`${dir}/${idx}-${cardId(card)}.svg`, renderCardSVG(card));
});
console.log(`wrote ${deck.length} card SVGs to ${dir}`);
