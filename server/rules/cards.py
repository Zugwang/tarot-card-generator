"""Cards, suits, ranks and point values for belote classique (32-card deck).

Card identifiers MUST match Tarotier's `cardId()` (src/lib/model/deck.ts) so the
same string addresses a rules object here, a pre-rendered image on disk and a DOM
node in the client. Beware: the Ace is rank 1, so its id is `pip-coeur-1`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterator, Literal, Union

Suit = Literal["pique", "coeur", "carreau", "trefle"]
CourtRank = Literal["valet", "dame", "roi"]
Rank = Union[int, str]

#: Canonical suit order, same as Tarotier's SUITS.
SUITS: tuple[Suit, ...] = ("pique", "coeur", "carreau", "trefle")

#: A belote deck is Tarotier's DECK_SHAPES[32]: pips 1,7,8,9,10 + V,D,R.
PIP_RANKS: tuple[int, ...] = (1, 7, 8, 9, 10)
COURT_RANKS: tuple[CourtRank, ...] = ("valet", "dame", "roi")

#: Point value of a card when its suit IS the trump suit. Sums to 62 per suit.
TRUMP_VALUES: dict[Rank, int] = {
    "valet": 20, 9: 14, 1: 11, 10: 10, "roi": 4, "dame": 3, 8: 0, 7: 0,
}
#: Point value of a card when its suit is NOT the trump suit. Sums to 30 per suit.
PLAIN_VALUES: dict[Rank, int] = {
    1: 11, 10: 10, "roi": 4, "dame": 3, "valet": 2, 9: 0, 8: 0, 7: 0,
}

#: Strength order, weakest first. Trump promotes the Jack and the 9.
TRUMP_ORDER: tuple[Rank, ...] = (7, 8, "dame", "roi", 10, 1, 9, "valet")
PLAIN_ORDER: tuple[Rank, ...] = (7, 8, 9, "valet", "dame", "roi", 10, 1)

#: Total card points in a deal (62 trump + 3 x 30 plain), before dix de der.
CARD_POINTS_TOTAL = 152
#: Dix de der — awarded to the team taking the last trick.
DIX_DE_DER = 10
#: Belote-rebelote — King + Queen of trump in the same hand.
BELOTE_BONUS = 20
#: Full deal total, used as an invariant in the tests.
DEAL_TOTAL = CARD_POINTS_TOTAL + DIX_DE_DER  # 162

_LABELS: dict[Rank, str] = {
    1: "A", 7: "7", 8: "8", 9: "9", 10: "10",
    "valet": "V", "dame": "D", "roi": "R",
}


@dataclass(frozen=True, slots=True, order=False)
class Card:
    """An immutable playing card. Hashable, so it works in sets and dict keys."""

    suit: Suit
    rank: Rank

    @property
    def is_court(self) -> bool:
        return isinstance(self.rank, str)

    @property
    def id(self) -> str:
        """Stable id, identical to Tarotier's cardId()."""
        kind = "court" if self.is_court else "pip"
        return f"{kind}-{self.suit}-{self.rank}"

    @property
    def label(self) -> str:
        return _LABELS[self.rank]

    def value(self, trump: Suit | None) -> int:
        table = TRUMP_VALUES if self.suit == trump else PLAIN_VALUES
        return table[self.rank]

    def strength(self, trump: Suit | None) -> int:
        """Rank within its own suit. Only comparable between cards of one suit."""
        order = TRUMP_ORDER if self.suit == trump else PLAIN_ORDER
        return order.index(self.rank)

    def __repr__(self) -> str:  # compact, for test failures
        return f"{self.label}{self.suit[0]}"


def deck() -> list[Card]:
    """The 32 cards, in Tarotier's deck order (per suit: pips then courts)."""
    out: list[Card] = []
    for suit in SUITS:
        for rank in PIP_RANKS:
            out.append(Card(suit, rank))
        for court in COURT_RANKS:
            out.append(Card(suit, court))
    return out


def card_by_id(cid: str) -> Card:
    """Parse an id back into a Card. Raises ValueError on anything unexpected."""
    parts = cid.split("-")
    if len(parts) != 3 or parts[0] not in ("pip", "court"):
        raise ValueError(f"bad card id: {cid!r}")
    _, suit, rank = parts
    if suit not in SUITS:
        raise ValueError(f"bad suit in id: {cid!r}")
    if parts[0] == "pip":
        if not rank.isdigit() or int(rank) not in PIP_RANKS:
            raise ValueError(f"bad pip rank in id: {cid!r}")
        return Card(suit, int(rank))  # type: ignore[arg-type]
    if rank not in COURT_RANKS:
        raise ValueError(f"bad court rank in id: {cid!r}")
    return Card(suit, rank)  # type: ignore[arg-type]


def ids(cards: Iterator[Card] | list[Card]) -> list[str]:
    return [c.id for c in cards]
