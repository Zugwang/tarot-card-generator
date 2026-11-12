"""Bidding for belote classique: two rounds of "je prends" / "je passe".

Round 1 — the trump can only be the suit of the turned card (the retourne).
Round 2 — a player may name any other suit (the retourne's suit is excluded by
default, a widely used restriction; see `allow_retourne_suit_in_round2`).
Everyone passing twice means a redeal with the next dealer.
"""

from __future__ import annotations

from dataclasses import dataclass

from .cards import SUITS, Suit


@dataclass(slots=True)
class Bidding:
    order: list[str]          # seats in bidding order, starting left of the dealer
    retourne_suit: Suit
    allow_retourne_suit_in_round2: bool = False
    round: int = 1
    index: int = 0
    taker: str | None = None
    trump: Suit | None = None
    done: bool = False
    redeal: bool = False
    history: list[tuple[str, str, Suit | None]] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.history is None:
            self.history = []

    @property
    def current(self) -> str | None:
        return None if self.done else self.order[self.index]

    def allowed_suits(self) -> list[Suit]:
        """Suits the current player may take with."""
        if self.done:
            return []
        if self.round == 1:
            return [self.retourne_suit]
        if self.allow_retourne_suit_in_round2:
            return list(SUITS)
        return [s for s in SUITS if s != self.retourne_suit]

    def bid(self, seat: str, action: str, suit: Suit | None = None) -> None:
        """Apply a bid. Raises ValueError on anything illegal (wrong turn, bad suit)."""
        if self.done:
            raise ValueError("bidding is over")
        if seat != self.current:
            raise ValueError(f"not {seat}'s turn to bid (waiting for {self.current})")
        if action == "passe":
            self.history.append((seat, "passe", None))
            self._advance()
            return
        if action != "prends":
            raise ValueError(f"unknown bid action: {action!r}")
        if self.round == 1:
            # Round 1 implies the retourne's suit. Accept an omitted suit, but
            # reject a contradictory one instead of silently overriding it.
            if suit is not None and suit != self.retourne_suit:
                raise ValueError(
                    f"round 1 can only take the retourne suit {self.retourne_suit!r}, got {suit!r}"
                )
            suit = self.retourne_suit
        if suit not in self.allowed_suits():
            raise ValueError(f"cannot take with {suit!r} in round {self.round}")
        self.taker = seat
        self.trump = suit
        self.done = True
        self.history.append((seat, "prends", suit))

    def _advance(self) -> None:
        self.index += 1
        if self.index < len(self.order):
            return
        self.index = 0
        if self.round == 1:
            self.round = 2
            return
        self.done = True
        self.redeal = True
