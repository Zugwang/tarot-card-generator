"""Dealing: 3 then 2 to each player, turn the retourne, complete to 8 after the bid."""

from __future__ import annotations

import random
from dataclasses import dataclass, field

from .cards import Card, Suit, deck


@dataclass(slots=True)
class Deal:
    """Cards in flight for one hand. `hands` is keyed by seat."""

    hands: dict[str, list[Card]]
    retourne: Card
    talon: list[Card] = field(default_factory=list)


def deal(seats: list[str], rng: random.Random | None = None, pattern: tuple[int, ...] = (3, 2)) -> Deal:
    """Shuffle and deal `pattern` cards per player, then turn the retourne.

    Leaves 11 cards in the talon: the taker will add the retourne plus 2, the three
    others 3 each, bringing everyone to 8 (see `complete`).
    """
    rng = rng or random.Random()
    cards = deck()
    rng.shuffle(cards)
    hands: dict[str, list[Card]] = {s: [] for s in seats}
    i = 0
    for count in pattern:
        for seat in seats:
            hands[seat].extend(cards[i:i + count])
            i += count
    retourne = cards[i]
    return Deal(hands=hands, retourne=retourne, talon=cards[i + 1:])


def complete(d: Deal, seats: list[str], taker: str, target: int = 8) -> None:
    """Hand the retourne to the taker, then top every hand up to `target` cards.

    Mutates `d` in place; the talon ends empty.
    """
    d.hands[taker].append(d.retourne)
    for seat in seats:
        need = target - len(d.hands[seat])
        if need < 0:
            raise ValueError(f"{seat} already holds {len(d.hands[seat])} cards")
        d.hands[seat].extend(d.talon[:need])
        del d.talon[:need]
    if d.talon:
        raise ValueError(f"talon not exhausted: {len(d.talon)} left")


def belote_holder(hands: dict[str, list[Card]], trump: Suit) -> str | None:
    """Seat holding both King and Queen of trump, if any (belote-rebelote)."""
    for seat, hand in hands.items():
        ranks = {c.rank for c in hand if c.suit == trump}
        if {"roi", "dame"} <= ranks:
            return seat
    return None
