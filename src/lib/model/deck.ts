// Deck data model — the combinatorial core of Tarotier.
// Pure, framework-agnostic: given a deck size + suit selection, produce the
// exact ordered list of cards. Everything downstream (rendering, thumbnails,
// export) consumes this.

export type Suit = 'pique' | 'coeur' | 'carreau' | 'trefle';

/** Canonical display/render order of suits. */
export const SUITS: Suit[] = ['pique', 'coeur', 'carreau', 'trefle'];

export type CourtRank = 'valet' | 'cavalier' | 'dame' | 'roi';

export type DeckSize = 32 | 40 | 52 | 56 | 78;

/** A single card, discriminated by `kind`. */
export type Card =
  | { kind: 'pip'; suit: Suit; rank: number } // rank 1..10 (1 = As)
  | { kind: 'court'; suit: Suit; rank: CourtRank }
  | { kind: 'atout'; number: number } // 1..21
  | { kind: 'excuse' }
  | { kind: 'back' }; // the shared card back, shown as the first card

/** The shared card back, treated as a card (first position). */
export const BACK_CARD: Card = { kind: 'back' };

interface DeckShape {
  /** Pip ranks present per suit (1 = As). */
  pipRanks: number[];
  /** Court ranks present per suit, in ascending order. */
  courtRanks: CourtRank[];
  /** Include the 21 atouts + l'Excuse. */
  atouts: boolean;
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

/**
 * Per-size composition (agreed model):
 *  32 = 7,8,9,10,As + V,D,R                     (×4 = 32)
 *  40 = As→7 + V,D,R           (latin, no 8/9/10) (×4 = 40)
 *  52 = As→10 + V,D,R                            (×4 = 52)
 *  56 = As→10 + V,Cavalier,D,R  (tarot minors)    (×4 = 56)
 *  78 = 56 minors + 21 atouts + l'Excuse                = 78
 */
export const DECK_SHAPES: Record<DeckSize, DeckShape> = {
  32: { pipRanks: [1, 7, 8, 9, 10], courtRanks: ['valet', 'dame', 'roi'], atouts: false },
  40: { pipRanks: range(1, 7), courtRanks: ['valet', 'dame', 'roi'], atouts: false },
  52: { pipRanks: range(1, 10), courtRanks: ['valet', 'dame', 'roi'], atouts: false },
  56: { pipRanks: range(1, 10), courtRanks: ['valet', 'cavalier', 'dame', 'roi'], atouts: false },
  78: { pipRanks: range(1, 10), courtRanks: ['valet', 'cavalier', 'dame', 'roi'], atouts: true },
};

export const DECK_SIZES = Object.keys(DECK_SHAPES).map(Number) as DeckSize[];

/**
 * Generate the full ordered deck for a given size.
 * Order: for each suit → pips (ascending) then courts; then atouts 1..21,
 * then l'Excuse last.
 */
export function generateDeck(size: DeckSize): Card[] {
  const shape = DECK_SHAPES[size];
  const cards: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of shape.pipRanks) cards.push({ kind: 'pip', suit, rank });
    for (const rank of shape.courtRanks) cards.push({ kind: 'court', suit, rank });
  }

  if (shape.atouts) {
    for (const n of range(1, 21)) cards.push({ kind: 'atout', number: n });
    cards.push({ kind: 'excuse' });
  }

  return cards;
}

/** Short corner label for a card (French figures). */
export function cardLabel(card: Card): string {
  switch (card.kind) {
    case 'pip':
      return card.rank === 1 ? 'A' : String(card.rank);
    case 'court':
      return { valet: 'V', cavalier: 'C', dame: 'D', roi: 'R' }[card.rank];
    case 'atout':
      return String(card.number);
    case 'excuse':
      return '★';
    case 'back':
      return '';
  }
}

const SUIT_NAMES: Record<Suit, string> = {
  pique: 'Pique',
  coeur: 'Cœur',
  carreau: 'Carreau',
  trefle: 'Trèfle',
};

const PIP_NAMES: Record<number, string> = {
  1: 'As',
  2: 'Deux',
  3: 'Trois',
  4: 'Quatre',
  5: 'Cinq',
  6: 'Six',
  7: 'Sept',
  8: 'Huit',
  9: 'Neuf',
  10: 'Dix',
};

const COURT_NAMES: Record<CourtRank, string> = {
  valet: 'Valet',
  cavalier: 'Cavalier',
  dame: 'Dame',
  roi: 'Roi',
};

/** Human-readable French name for a card. */
export function cardName(card: Card): string {
  switch (card.kind) {
    case 'pip':
      return `${PIP_NAMES[card.rank]} de ${SUIT_NAMES[card.suit]}`;
    case 'court':
      return `${COURT_NAMES[card.rank]} de ${SUIT_NAMES[card.suit]}`;
    case 'atout':
      return `Atout ${card.number}`;
    case 'excuse':
      return 'L’Excuse';
    case 'back':
      return 'Dos';
  }
}

/** Stable unique id for a card (useful as a keyed-list key). */
export function cardId(card: Card): string {
  switch (card.kind) {
    case 'pip':
      return `pip-${card.suit}-${card.rank}`;
    case 'court':
      return `court-${card.suit}-${card.rank}`;
    case 'atout':
      return `atout-${card.number}`;
    case 'excuse':
      return 'excuse';
    case 'back':
      return 'back';
  }
}
