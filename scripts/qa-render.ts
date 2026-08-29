import { generateDeck, generateOracleDeck } from '../src/lib/model/deck';
import { renderCardSVG } from '../src/lib/render/card';
import { pipTemplate } from '../src/lib/render/pipLayouts';
import { writeFileSync } from 'node:fs';

const tarot = generateDeck(78);
const roiTrefle = tarot.find((c) => c.kind === 'court' && c.suit === 'trefle' && c.rank === 'roi')!;
const dameCoeur = tarot.find((c) => c.kind === 'court' && c.suit === 'coeur' && c.rank === 'dame')!;
const valetPique = tarot.find((c) => c.kind === 'court' && c.suit === 'pique' && c.rank === 'valet')!;
const oracle = generateOracleDeck();

const base = { width: 250, height: 455, pipTemplate: pipTemplate('classic') };
const cards: Record<string, string> = {
  danois_roi_t: renderCardSVG(roiTrefle, { ...base, courtStyle: 'danois' }),
  danois_dame_c: renderCardSVG(dameCoeur, { ...base, courtStyle: 'danois' }),
  danois_valet_p: renderCardSVG(valetPique, { ...base, courtStyle: 'danois' }),
  oracle_05: renderCardSVG(oracle[5], base),
  oracle_40: renderCardSVG(oracle[40], base),
  oracle_77: renderCardSVG(oracle[77], base),
};
for (const [k, svg] of Object.entries(cards)) writeFileSync(`dist/qa-${k}.svg`, svg);
console.log('wrote', Object.keys(cards).join(', '));
