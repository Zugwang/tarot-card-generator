"""Which cards a player may legally play.

This is the single source of truth for legality: the server computes it and ships
the resulting id list to the client, which therefore embeds no belote rules at all.

Several sub-rules genuinely differ from region to region, so they live in
`Variants` rather than being hard-coded. The defaults are the most widely used set.
"""

from __future__ import annotations

from dataclasses import dataclass

from .cards import Card, Suit
from .trick import Play, trick_winner


@dataclass(frozen=True, slots=True)
class Variants:
    #: Holding a trump higher than the best trump played, you must play it.
    must_overtrump: bool = True
    #: When your partner is already winning the trick and you are void in the led
    #: suit, must you still cut? Default: no — you may discard ("pisser").
    must_trump_when_partner_master: bool = False
    #: Void in the led suit, opponent has trumped, and you hold only lower trumps:
    #: may you discard instead of under-trumping? Default: yes.
    may_discard_when_cannot_overtrump: bool = True


DEFAULT_VARIANTS = Variants()


def playable(
    hand: list[Card],
    plays: list[Play],
    trump: Suit,
    partner: str,
    variants: Variants = DEFAULT_VARIANTS,
) -> list[Card]:
    """The subset of `hand` that may legally be played into `plays`.

    `partner` is the seat of the player's partner, used to detect that the trick is
    already won by one's own side. Never returns an empty list for a non-empty hand.
    """
    if not hand:
        return []
    if not plays:
        return list(hand)

    lead = plays[0][1].suit
    in_lead = [c for c in hand if c.suit == lead]
    in_trump = [c for c in hand if c.suit == trump]

    # --- the led suit IS trump: follow trump, and climb over it if you can ------
    if lead == trump:
        if not in_trump:
            return list(hand)
        best = max((c for _, c in plays if c.suit == trump), key=lambda c: c.strength(trump))
        if variants.must_overtrump:
            higher = [c for c in in_trump if c.strength(trump) > best.strength(trump)]
            if higher:
                return higher
        return in_trump

    # --- a plain suit was led: follow it if you hold it ------------------------
    if in_lead:
        return in_lead

    # --- void in the led suit --------------------------------------------------
    if trick_winner(plays, trump) == partner and not variants.must_trump_when_partner_master:
        return list(hand)
    if not in_trump:
        return list(hand)

    played_trumps = [c for _, c in plays if c.suit == trump]
    if not played_trumps:
        return in_trump  # obligation de couper

    best = max(played_trumps, key=lambda c: c.strength(trump))
    higher = [c for c in in_trump if c.strength(trump) > best.strength(trump)]
    if higher:
        return higher
    return list(hand) if variants.may_discard_when_cannot_overtrump else in_trump
