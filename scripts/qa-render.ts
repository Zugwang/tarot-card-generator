import { generateDeck, generateOracleDeck } from '../src/lib/model/deck';
import { renderCardSVG } from '../src/lib/render/card';
import { pipTemplate } from '../src/lib/render/pipLayouts';
import { writeFileSync } from 'node:fs';

const tarot = generateDeck(78);
const roi = (suit: string) => tarot.find((c) => c.kind === 'court' && c.suit === suit && c.rank === 'roi')!;
const dame = (suit: string) => tarot.find((c) => c.kind === 'court' && c.suit === suit && c.rank === 'dame')!;
const pip7 = tarot.find((c) => c.kind === 'pip' && c.suit === 'coeur' && c.rank === 7)!;

const base = { width: 250, height: 455, pipTemplate: pipTemplate('classic'), cardBg: '#efe6d0' };
const cards: Record<string, string> = {
  danois_roi_bg: renderCardSVG(roi('pique'), { ...base, courtStyle: 'danois' }),
  danois_roi_corners4: renderCardSVG(roi('coeur'), { ...base, courtStyle: 'danois', courtCorners: true, cornerCount: 4 }),
  grimaud_dame_bg: renderCardSVG(dame('carreau'), { ...base, courtStyle: 'grimaud' }),
  poker_roi_bg: renderCardSVG(roi('trefle'), { ...base, courtStyle: 'poker' }),
  pip7_4corners: renderCardSVG(pip7, { ...base, cornerCount: 4 }),
  pip7_2corners: renderCardSVG(pip7, { ...base, cornerCount: 2 }),
};
for (const [k, svg] of Object.entries(cards)) writeFileSync(`dist/qa-${k}.svg`, svg);
console.log('wrote', Object.keys(cards).join(', '));
