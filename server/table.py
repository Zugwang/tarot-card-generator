"""The single belote table: seats, phases, and the authoritative game state.

Design notes
------------
* The server is the referee. It never trusts a client about legality: every play
  is checked against `rules.legal.playable`, and each player is *told* which of
  their cards are playable so the client needs no rules of its own.
* `state_for(seat)` is the ONLY function that serialises a hand. Audit it alone to
  be sure a player can never see someone else's cards.
* Transient happenings are queued in `self.events` for the client's animations
  (a card landing, a trick being swept, a score popping). State is what *is*;
  events are what just *happened*.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field

from rules.bidding import Bidding
from rules.cards import Card, Suit, card_by_id
from rules.deal import Deal, belote_holder, complete, deal
from rules.legal import DEFAULT_VARIANTS, Variants, playable
from rules.scoring import DEFAULT_SCORING, DealScore, ScoreVariants, score_deal
from rules.trick import Play, trick_points, trick_winner

SEATS: tuple[str, ...] = ("nord", "est", "sud", "ouest")
PARTNER = {"nord": "sud", "sud": "nord", "est": "ouest", "ouest": "est"}
TEAMS = {"nord": "ns", "sud": "ns", "est": "eo", "ouest": "eo"}
TEAM_LABEL = {"ns": "Nord-Sud", "eo": "Est-Ouest"}

LOBBY, BIDDING, PLAYING, TRICK_DONE, DEAL_END, GAME_END, PAUSED = (
    "lobby", "bidding", "playing", "trick_done", "deal_end", "game_end", "paused"
)
#: Phases in which losing a player freezes the game rather than freeing the seat.
IN_PLAY = (BIDDING, PLAYING, TRICK_DONE, DEAL_END)


class SeatBusy(Exception):
    """Raised when a live client already holds the requested seat."""


@dataclass(slots=True)
class SeatState:
    name: str | None = None
    client: str | None = None
    online: bool = False
    ready: bool = False


def next_seat(seat: str, step: int = 1) -> str:
    return SEATS[(SEATS.index(seat) + step) % 4]


class Table:
    def __init__(
        self,
        target: int = 501,
        rng: random.Random | None = None,
        template: str = "marseille",
        variants: Variants = DEFAULT_VARIANTS,
        scoring: ScoreVariants = DEFAULT_SCORING,
    ) -> None:
        self.target = target
        self.rng = rng or random.Random()
        self.template = template
        self.variants = variants
        self.scoring = scoring
        self.seats: dict[str, SeatState] = {s: SeatState() for s in SEATS}
        self.scores: dict[str, int] = {"ns": 0, "eo": 0}
        self.carried = 0
        self.dealer = "nord"
        self.phase = LOBBY
        self.paused_from: str | None = None
        self.events: list[dict] = []
        #: Bumped on every deal. Lets a client discard a state frame that arrived
        #: late and describes a deal that is already over.
        self.deal_id = 0
        self._reset_deal()

    # ---- seats ------------------------------------------------------------

    def seat_of_client(self, client: str) -> str | None:
        return next((s for s, st in self.seats.items() if st.client == client), None)

    def claim(self, seat: str, client: str, name: str | None, takeover: bool = False) -> None:
        """Sit down. The table has no owner: any of the four seats is free to
        whoever asks for it first, and only a live occupant blocks a seat."""
        if seat not in self.seats:
            raise ValueError("siège inconnu")
        st = self.seats[seat]
        if st.online and st.client != client and not takeover:
            raise SeatBusy(seat)
        reclaimed = st.client == client
        st.client = client
        st.online = True
        if name:
            st.name = name.strip()[:18] or None
        elif not st.name:
            st.name = seat.capitalize()
        self.events.append({"type": "seated", "seat": seat, "name": st.name, "reclaimed": reclaimed})
        self._maybe_resume()

    def drop(self, client: str) -> str | None:
        """Mark a client's seat offline. Freezes the game if a deal is running."""
        seat = self.seat_of_client(client)
        if seat is None:
            return None
        st = self.seats[seat]
        st.online = False
        st.client = None
        self.events.append({"type": "left", "seat": seat, "name": st.name})
        if self.phase in IN_PLAY:
            self.paused_from = self.phase
            self.phase = PAUSED
            self.events.append({"type": "paused", "seat": seat})
        elif self.phase == LOBBY:
            st.name = None
        # Nobody left to come back: wipe the table rather than leave four
        # "reclaim me" chairs facing the next visitor for the whole grace period.
        if self.online_count == 0 and self.phase != LOBBY:
            self.reset_table()
        return seat

    @property
    def online_count(self) -> int:
        return sum(1 for st in self.seats.values() if st.online)

    def _maybe_resume(self) -> None:
        if self.phase == PAUSED and self.online_count == 4:
            self.phase = self.paused_from or BIDDING
            self.paused_from = None
            self.events.append({"type": "resumed"})

    def reset_table(self) -> None:
        """Wipe everything but keep the seat keys (used after a long desertion)."""
        for st in self.seats.values():
            st.name = None
            st.client = None
            st.online = False
            st.ready = False
        self.scores = {"ns": 0, "eo": 0}
        self.carried = 0
        self.dealer = "nord"
        self.phase = LOBBY
        self.paused_from = None
        self._reset_deal()
        self.events.append({"type": "table_reset"})

    # ---- deal lifecycle ---------------------------------------------------

    def _reset_deal(self) -> None:
        self.deal: Deal | None = None
        self.bidding: Bidding | None = None
        self.trump: Suit | None = None
        self.taker: str | None = None
        self.belote_seat: str | None = None
        self.belote_announced = False
        self.tricks: list[list[Play]] = []
        self.trick: list[Play] = []
        self.last_trick: dict | None = None
        self.turn: str | None = None
        self.deal_score: DealScore | None = None
        self.trick_winner_seat: str | None = None

    def maybe_start(self) -> bool:
        """Start a deal as soon as the four seats are filled."""
        if self.phase == LOBBY and self.online_count == 4:
            self.begin_deal()
            return True
        return False

    def begin_deal(self) -> None:
        self._reset_deal()
        self.deal_id += 1
        for st in self.seats.values():
            st.ready = False
        self.deal = deal(list(SEATS), self.rng)
        order = [next_seat(self.dealer, i + 1) for i in range(4)]
        self.bidding = Bidding(order=order, retourne_suit=self.deal.retourne.suit)
        self.phase = BIDDING
        self.turn = self.bidding.current
        self.events.append({
            "type": "deal",
            "dealer": self.dealer,
            "retourne": self.deal.retourne.id,
            "order": order,
        })

    def bid(self, seat: str, action: str, suit: Suit | None = None) -> None:
        if self.phase != BIDDING or self.bidding is None:
            raise ValueError("ce n'est pas le moment d'annoncer")
        # Check the turn here so the player gets the same French wording as in the
        # play phase; Bidding.bid keeps its own check as a safety net.
        if self.bidding.current != seat:
            raise ValueError("ce n'est pas ton tour")
        self.bidding.bid(seat, action, suit)
        self.events.append({"type": "bid", "seat": seat, "action": action, "suit": self.bidding.trump if action == "prends" else None})
        if not self.bidding.done:
            self.turn = self.bidding.current
            return
        if self.bidding.redeal:
            self.events.append({"type": "redeal"})
            self.dealer = next_seat(self.dealer)
            self.begin_deal()
            return
        assert self.deal and self.bidding.taker and self.bidding.trump
        self.taker = self.bidding.taker
        self.trump = self.bidding.trump
        complete(self.deal, list(SEATS), self.taker)
        self.belote_seat = belote_holder(self.deal.hands, self.trump)
        self.phase = PLAYING
        self.turn = next_seat(self.dealer)
        self.events.append({
            "type": "contract",
            "taker": self.taker,
            "trump": self.trump,
            "team": TEAMS[self.taker],
        })

    def playable_for(self, seat: str) -> list[Card]:
        if self.phase != PLAYING or self.deal is None or self.trump is None or self.turn != seat:
            return []
        return playable(self.deal.hands[seat], self.trick, self.trump, PARTNER[seat], self.variants)

    def play(self, seat: str, card_id: str) -> None:
        if self.phase != PLAYING:
            raise ValueError("ce n'est pas le moment de jouer")
        if self.turn != seat:
            raise ValueError("ce n'est pas ton tour")
        assert self.deal and self.trump
        card = card_by_id(card_id)
        hand = self.deal.hands[seat]
        if card not in hand:
            raise ValueError("tu n'as pas cette carte")
        allowed = playable(hand, self.trick, self.trump, PARTNER[seat], self.variants)
        if card not in allowed:
            raise ValueError("coup interdit")

        hand.remove(card)
        self.trick.append((seat, card))
        self.events.append({"type": "play", "seat": seat, "card": card.id})

        # Belote-rebelote: announced automatically when the pair is shown.
        if (
            not self.belote_announced
            and self.belote_seat == seat
            and card.suit == self.trump
            and card.rank in ("roi", "dame")
        ):
            self.belote_announced = True
            self.events.append({"type": "belote", "seat": seat})

        if len(self.trick) < 4:
            self.turn = next_seat(seat)
            return

        last = len(self.tricks) == 7
        winner = trick_winner(self.trick, self.trump)
        points = trick_points(self.trick, self.trump, last=last)
        self.trick_winner_seat = winner
        self.turn = None
        self.phase = TRICK_DONE
        self.events.append({
            "type": "trick",
            "winner": winner,
            "team": TEAMS[winner],
            "points": points,
            "last": last,
            "cards": [{"seat": s, "card": c.id} for s, c in self.trick],
        })

    def finish_trick(self) -> None:
        """Sweep the completed trick. Called by the app after the display pause."""
        if self.phase != TRICK_DONE or self.trick_winner_seat is None:
            return
        winner = self.trick_winner_seat
        self.last_trick = {
            "winner": winner,
            "cards": [{"seat": s, "card": c.id} for s, c in self.trick],
        }
        self.tricks.append(self.trick)
        self.trick = []
        self.trick_winner_seat = None
        if len(self.tricks) == 8:
            self._end_deal()
        else:
            self.phase = PLAYING
            self.turn = winner

    def _end_deal(self) -> None:
        assert self.trump and self.taker
        s = score_deal(
            self.tricks, self.trump, self.taker, TEAMS,
            belote_seat=self.belote_seat, carried=self.carried, variants=self.scoring,
        )
        self.deal_score = s
        for team, pts in s.awarded.items():
            self.scores[team] += pts
        self.carried = s.carried
        self.phase = DEAL_END
        self.turn = None
        self.events.append({
            "type": "deal_end",
            "taker": self.taker,
            "takerTeam": s.taker_team,
            "success": s.success,
            "litige": s.litige,
            "capot": s.capot_team,
            "belote": s.belote_team,
            "cardPoints": s.card_points,
            "awarded": s.awarded,
            "carried": s.carried,
            "scores": dict(self.scores),
        })
        leader = max(self.scores, key=lambda t: self.scores[t])
        other = "eo" if leader == "ns" else "ns"
        if self.scores[leader] >= self.target and self.scores[leader] != self.scores[other]:
            self.phase = GAME_END
            self.events.append({"type": "game_end", "winner": leader, "scores": dict(self.scores)})

    def set_ready(self, seat: str) -> bool:
        """Mark a player ready for the next deal. True when the next deal started."""
        if self.phase not in (DEAL_END, GAME_END):
            raise ValueError("rien à confirmer pour l'instant")
        self.seats[seat].ready = True
        self.events.append({"type": "ready", "seat": seat})
        if not all(st.ready for st in self.seats.values() if st.online):
            return False
        if self.phase == GAME_END:
            self.scores = {"ns": 0, "eo": 0}
            self.carried = 0
        self.dealer = next_seat(self.dealer)
        self.begin_deal()
        return True

    # ---- serialisation ---------------------------------------------------

    def public_state(self) -> dict:
        """Everything every player may see. Contains NO hand."""
        return {
            "phase": self.phase,
            "dealId": self.deal_id,
            "pausedFrom": self.paused_from,
            "dealer": self.dealer,
            "turn": self.turn,
            "trump": self.trump,
            "retourne": self.deal.retourne.id if self.deal and self.phase == BIDDING else None,
            "taker": self.taker,
            "target": self.target,
            "scores": dict(self.scores),
            "carried": self.carried,
            "template": self.template,
            "teams": TEAMS,
            "seats": {
                s: {
                    "name": st.name,
                    "online": st.online,
                    "ready": st.ready,
                    "team": TEAMS[s],
                    "cards": len(self.deal.hands[s]) if self.deal else 0,
                }
                for s, st in self.seats.items()
            },
            "trick": [{"seat": s, "card": c.id} for s, c in self.trick],
            "trickWinner": self.trick_winner_seat,
            "lastTrick": self.last_trick,
            "tricksPlayed": len(self.tricks),
            "belote": self.belote_seat if self.belote_announced else None,
            "bidding": None if not self.bidding else {
                "round": self.bidding.round,
                "current": self.bidding.current,
                "allowed": self.bidding.allowed_suits(),
                "history": [
                    {"seat": s, "action": a, "suit": su} for s, a, su in self.bidding.history
                ],
            },
            "dealScore": None if not self.deal_score else {
                "success": self.deal_score.success,
                "litige": self.deal_score.litige,
                "capot": self.deal_score.capot_team,
                "belote": self.deal_score.belote_team,
                "cardPoints": self.deal_score.card_points,
                "awarded": self.deal_score.awarded,
                "tricksWon": self.deal_score.tricks_won,
                "takerTeam": self.deal_score.taker_team,
            },
        }

    def state_for(self, seat: str | None) -> dict:
        """The ONLY place a hand is serialised. `seat=None` yields a hand-free view."""
        state = self.public_state()
        state["you"] = seat
        if seat is None or self.deal is None:
            state["hand"] = []
            state["playable"] = []
            return state
        state["hand"] = [c.id for c in self.deal.hands[seat]]
        state["playable"] = [c.id for c in self.playable_for(seat)]
        return state

    def drain_events(self) -> list[dict]:
        out = self.events
        self.events = []
        return out
