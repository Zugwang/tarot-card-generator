// Dev-only visual QA: one SVG per suit/variant swatch.
import { writeFileSync, mkdirSync } from 'node:fs';
import { SUITS } from '../src/lib/model/deck';
import { SUIT_VARIANTS, suitColor, suitSymbol } from '../src/lib/render/suits';

const dir = process.argv[2] || '/tmp/swatches';
mkdirSync(dir, { recursive: true });

let n = 0;
for (const suit of SUITS) {
  for (const v of SUIT_VARIANTS[suit]) {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">` +
      `<rect width="100" height="100" fill="#fff"/>` +
      suitSymbol(suit, v.id, suitColor(suit)) +
      `</svg>`;
    writeFileSync(`${dir}/${String(n).padStart(2, '0')}-${suit}-${v.id}.svg`, svg);
    n++;
  }
}
console.log(`wrote ${n} swatches to ${dir}`);
