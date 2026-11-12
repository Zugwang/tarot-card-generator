"""Trick resolution: who wins, and how many points the trick carries."""

from __future__ import annotations

from .cards import Card, DIX_DE_DER, Suit

#: A play is (seat, card); a trick is the list of plays in play order.
Play = tuple[str, Card]


def trick_winner(plays: list[Play], trump: Suit | None) -> str:
    """Seat winning the trick. Highest trump wins, else highest card of the led suit."""
    if not plays:
        raise ValueError("empty trick has no winner")
    lead = plays[0][1].suit
    trumps = [p for p in plays if p[1].suit == trump]
    pool = trumps if trumps else [p for p in plays if p[1].suit == lead]
    return max(pool, key=lambda p: p[1].strength(trump))[0]


def trick_points(plays: list[Play], trump: Suit | None, last: bool = False) -> int:
    """Card points in the trick, plus the dix de der when it is the 8th trick."""
    return sum(c.value(trump) for _, c in plays) + (DIX_DE_DER if last else 0)
