"""Table state machine: seating, pausing, and the privacy of a hand."""

from __future__ import annotations

import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from table import SEATS, SeatBusy, Table


def seat_all(t: Table) -> None:
    for i, s in enumerate(SEATS):
        t.claim(s, f"c{i}", s.capitalize())
    t.maybe_start()


class TestSeating(unittest.TestCase):
    def test_game_starts_by_itself_once_four_are_in(self):
        t = Table(rng=random.Random(1))
        for i, s in enumerate(SEATS[:3]):
            t.claim(s, f"c{i}", None)
            self.assertFalse(t.maybe_start(), "must not start with three")
        t.claim(SEATS[3], "c3", None)
        self.assertTrue(t.maybe_start())
        self.assertEqual(t.phase, "bidding")

    def test_no_key_is_needed_but_a_live_occupant_blocks(self):
        t = Table(rng=random.Random(2))
        t.claim("nord", "alice", "Alice")
        with self.assertRaises(SeatBusy):
            t.claim("nord", "bob", "Bob")
        t.claim("nord", "bob", "Bob", takeover=True)   # explicit takeover is allowed
        self.assertEqual(t.seats["nord"].name, "Bob")

    def test_same_client_reclaims_its_own_seat_silently(self):
        t = Table(rng=random.Random(3))
        t.claim("est", "alice", "Alice")
        t.claim("est", "alice", "Alice")               # a reload, not a conflict
        self.assertTrue(t.seats["est"].online)

    def test_unknown_seat_is_refused(self):
        t = Table()
        with self.assertRaises(ValueError):
            t.claim("milieu", "x", None)


class TestPauseAndReset(unittest.TestCase):
    def test_losing_a_player_mid_deal_pauses_and_the_return_resumes(self):
        t = Table(rng=random.Random(4))
        seat_all(t)
        self.assertEqual(t.phase, "bidding")
        t.drop("c1")
        self.assertEqual(t.phase, "paused")
        self.assertEqual(t.paused_from, "bidding")
        t.claim("est", "c1-again", "Est")
        self.assertEqual(t.phase, "bidding")
        self.assertIsNone(t.paused_from)

    def test_table_wipes_itself_when_the_last_player_leaves(self):
        t = Table(rng=random.Random(5))
        seat_all(t)
        for i in range(4):
            t.drop(f"c{i}")
        self.assertEqual(t.phase, "lobby")
        self.assertEqual([st.name for st in t.seats.values()], [None] * 4,
                         "a fresh visitor must see four free chairs, not four 'reclaim me'")
        self.assertEqual(t.scores, {"ns": 0, "eo": 0})

    def test_leaving_the_lobby_frees_the_chair_outright(self):
        t = Table()
        t.claim("sud", "c0", "Sud")
        t.drop("c0")
        self.assertIsNone(t.seats["sud"].name)
        self.assertEqual(t.phase, "lobby")


class TestPrivacy(unittest.TestCase):
    def test_public_state_carries_no_hand(self):
        t = Table(rng=random.Random(6))
        seat_all(t)
        pub = t.public_state()
        self.assertNotIn("hand", pub)
        blob = repr(pub)
        for seat in SEATS:
            for card in t.deal.hands[seat]:
                self.assertNotIn(card.id, blob, f"{card.id} leaked into the public state")

    def test_state_for_shows_only_your_own_hand(self):
        t = Table(rng=random.Random(7))
        seat_all(t)
        for seat in SEATS:
            st = t.state_for(seat)
            self.assertEqual(sorted(st["hand"]), sorted(c.id for c in t.deal.hands[seat]))
            others = {c.id for s in SEATS if s != seat for c in t.deal.hands[s]}
            # the retourne is face up, so exclude it from the forbidden set
            others.discard(t.deal.retourne.id)
            self.assertFalse(others & set(repr(st).split("'")), "another hand leaked")

    def test_anonymous_viewer_gets_no_hand(self):
        t = Table(rng=random.Random(8))
        seat_all(t)
        st = t.state_for(None)
        self.assertEqual(st["hand"], [])
        self.assertEqual(st["playable"], [])
        self.assertIsNone(st["you"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
