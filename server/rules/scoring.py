"""Scoring one deal of belote classique.

The contract: the taker's side must reach **82** (more than half of 162). Falling
short is "dedans" and hands the whole deal to the defenders.

Sub-rules that vary by region live in `ScoreVariants`:
  • belote_always_counts — the 20 stays with whoever held King+Queen of trump even
    when their side goes dedans (the common reading).
  • litige_enabled — an exact 81/81 split is not a win: the taker's 81 are held in
    abeyance and added to whoever wins the following deal.
  • capot_value — 250 is usual; some tables play 252.
"""

from __future__ import annotations

from dataclasses import dataclass

from .cards import BELOTE_BONUS, DEAL_TOTAL, Suit
from .trick import Play, trick_points, trick_winner


@dataclass(frozen=True, slots=True)
class ScoreVariants:
    belote_always_counts: bool = True
    litige_enabled: bool = True
    capot_value: int = 250
    contract_target: int = 82


DEFAULT_SCORING = ScoreVariants()


@dataclass(frozen=True, slots=True)
class DealScore:
    taker_team: str
    defender_team: str
    #: Cards + dix de der, before the belote bonus.
    card_points: dict[str, int]
    #: What each team actually banks for this deal (carried points included).
    awarded: dict[str, int]
    belote_team: str | None
    capot_team: str | None
    success: bool
    litige: bool
    #: Points held over to the next deal (non-zero only on a litige).
    carried: int
    tricks_won: dict[str, int]


def score_deal(
    tricks: list[list[Play]],
    trump: Suit,
    taker: str,
    teams: dict[str, str],
    belote_seat: str | None = None,
    carried: int = 0,
    variants: ScoreVariants = DEFAULT_SCORING,
) -> DealScore:
    """Score a completed deal of 8 tricks.

    `teams` maps every seat to its team id. `carried` is any amount held over from
    a previous litige, awarded here to whichever side wins this deal.
    """
    if len(tricks) != 8:
        raise ValueError(f"a deal is 8 tricks, got {len(tricks)}")

    taker_team = teams[taker]
    defender_team = next(t for t in set(teams.values()) if t != taker_team)

    card_points = {taker_team: 0, defender_team: 0}
    tricks_won = {taker_team: 0, defender_team: 0}
    for i, trick in enumerate(tricks):
        team = teams[trick_winner(trick, trump)]
        card_points[team] += trick_points(trick, trump, last=(i == len(tricks) - 1))
        tricks_won[team] += 1

    if sum(card_points.values()) != DEAL_TOTAL:
        raise ValueError(f"deal points must sum to {DEAL_TOTAL}, got {card_points}")

    belote_team = teams[belote_seat] if belote_seat else None
    bonus = {taker_team: 0, defender_team: 0}
    if belote_team:
        bonus[belote_team] = BELOTE_BONUS

    totals = {t: card_points[t] + bonus[t] for t in card_points}
    capot_team = next((t for t, n in tricks_won.items() if n == len(tricks)), None)

    litige = (
        variants.litige_enabled
        and capot_team is None
        and totals[taker_team] == totals[defender_team] == DEAL_TOTAL // 2
    )
    success = (not litige) and (
        capot_team == taker_team or totals[taker_team] >= variants.contract_target
    )

    awarded = {taker_team: 0, defender_team: 0}
    if litige:
        # The taker's half is frozen; the defenders bank theirs.
        awarded[defender_team] = totals[defender_team]
        new_carried = totals[taker_team]
    else:
        new_carried = 0
        if success:
            if capot_team == taker_team:
                awarded[taker_team] = variants.capot_value + bonus[taker_team]
                awarded[defender_team] = bonus[defender_team]
            else:
                awarded = dict(totals)
        else:
            base = variants.capot_value if capot_team == defender_team else DEAL_TOTAL
            awarded[defender_team] = base + bonus[defender_team]
            awarded[taker_team] = bonus[taker_team] if variants.belote_always_counts else 0
        winner = taker_team if success else defender_team
        awarded[winner] += carried

    return DealScore(
        taker_team=taker_team,
        defender_team=defender_team,
        card_points=card_points,
        awarded=awarded,
        belote_team=belote_team,
        capot_team=capot_team,
        success=success,
        litige=litige,
        carried=new_carried,
        tricks_won=tricks_won,
    )
