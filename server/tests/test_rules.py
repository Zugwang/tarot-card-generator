"""Rules engine tests. Stdlib unittest only: `python3 -m unittest discover server/tests`."""

from __future__ import annotations

import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from rules.bidding import Bidding
from rules.cards import (
    BELOTE_BONUS, COURT_RANKS, DEAL_TOTAL, PIP_RANKS, PLAIN_VALUES, SUITS,
    TRUMP_VALUES, Card, card_by_id, deck,
)
from rules.deal import belote_holder, complete, deal
from rules.legal import Variants, playable
from rules.scoring import ScoreVariants, score_deal
from rules.trick import trick_points, trick_winner

SEATS = ["nord", "est", "sud", "ouest"]
TEAMS = {"nord": "ns", "sud": "ns", "est": "eo", "ouest": "eo"}
PARTNER = {"nord": "sud", "sud": "nord", "est": "ouest", "ouest": "est"}


def C(suit: str, rank) -> Card:
    return Card(suit, rank)  # type: ignore[arg-type]


class TestCards(unittest.TestCase):
    def test_deck_is_32_distinct_cards(self):
        d = deck()
        self.assertEqual(len(d), 32)
        self.assertEqual(len(set(d)), 32)
        self.assertEqual(len({c.id for c in d}), 32)

    def test_ids_match_tarotier_convention(self):
        self.assertEqual(C("coeur", 1).id, "pip-coeur-1")   # the Ace is rank 1
        self.assertEqual(C("pique", "roi").id, "court-pique-roi")
        self.assertEqual(C("trefle", 10).id, "pip-trefle-10")

    def test_id_roundtrip(self):
        for c in deck():
            self.assertEqual(card_by_id(c.id), c)

    def test_bad_ids_raise(self):
        for bad in ["", "pip-coeur", "pip-coeur-2", "pip-xx-7", "court-coeur-cavalier", "zip-coeur-7"]:
            with self.assertRaises(ValueError, msg=bad):
                card_by_id(bad)

    def test_value_tables(self):
        self.assertEqual(sum(TRUMP_VALUES[r] for r in (*PIP_RANKS, *COURT_RANKS)), 62)
        self.assertEqual(sum(PLAIN_VALUES[r] for r in (*PIP_RANKS, *COURT_RANKS)), 30)

    def test_deal_total_invariant(self):
        for trump in SUITS:
            self.assertEqual(sum(c.value(trump) for c in deck()) + 10, DEAL_TOTAL)

    def test_trump_promotes_jack_and_nine(self):
        jack, nine, ace = C("pique", "valet"), C("pique", 9), C("pique", 1)
        self.assertGreater(jack.strength("pique"), nine.strength("pique"))
        self.assertGreater(nine.strength("pique"), ace.strength("pique"))
        # outside trump the Ace is top and the Jack is weak
        self.assertGreater(ace.strength("coeur"), jack.strength("coeur"))


class TestTrick(unittest.TestCase):
    def test_highest_of_led_suit_wins(self):
        plays = [("nord", C("coeur", 10)), ("est", C("coeur", 1)), ("sud", C("coeur", "roi")), ("ouest", C("coeur", 7))]
        self.assertEqual(trick_winner(plays, "pique"), "est")

    def test_trump_beats_any_plain(self):
        plays = [("nord", C("coeur", 1)), ("est", C("pique", 7)), ("sud", C("coeur", 10)), ("ouest", C("coeur", "roi"))]
        self.assertEqual(trick_winner(plays, "pique"), "est")

    def test_highest_trump_wins(self):
        plays = [("nord", C("pique", 1)), ("est", C("pique", 9)), ("sud", C("pique", "valet")), ("ouest", C("pique", 10))]
        self.assertEqual(trick_winner(plays, "pique"), "sud")

    def test_discard_never_wins(self):
        plays = [("nord", C("coeur", 7)), ("est", C("carreau", 1)), ("sud", C("trefle", 1)), ("ouest", C("coeur", 8))]
        self.assertEqual(trick_winner(plays, "pique"), "ouest")

    def test_points_and_dix_de_der(self):
        plays = [("nord", C("coeur", 1)), ("est", C("coeur", 10)), ("sud", C("pique", "valet")), ("ouest", C("coeur", 7))]
        self.assertEqual(trick_points(plays, "pique"), 11 + 10 + 20 + 0)
        self.assertEqual(trick_points(plays, "pique", last=True), 41 + 10)

    def test_empty_trick_raises(self):
        with self.assertRaises(ValueError):
            trick_winner([], "pique")


class TestLegal(unittest.TestCase):
    def test_leader_may_play_anything(self):
        hand = [C("coeur", 7), C("pique", 1), C("trefle", "roi")]
        self.assertEqual(set(playable(hand, [], "pique", "sud")), set(hand))

    def test_must_follow_led_suit(self):
        hand = [C("coeur", 10), C("coeur", 7), C("pique", 1), C("trefle", "roi")]
        got = playable(hand, [("sud", C("coeur", "roi"))], "pique", "est")
        self.assertEqual(set(got), {C("coeur", 10), C("coeur", 7)})

    def test_void_and_opponent_master_must_trump(self):
        hand = [C("trefle", 10), C("pique", 7), C("pique", 1)]
        got = playable(hand, [("sud", C("coeur", "roi"))], "pique", "est")
        self.assertEqual(set(got), {C("pique", 7), C("pique", 1)})

    def test_void_and_partner_master_is_free(self):
        hand = [C("trefle", 10), C("pique", 7)]
        got = playable(hand, [("est", C("coeur", "roi"))], "pique", "est")
        self.assertEqual(set(got), set(hand))

    def test_void_partner_master_but_variant_forces_cut(self):
        hand = [C("trefle", 10), C("pique", 7)]
        v = Variants(must_trump_when_partner_master=True)
        got = playable(hand, [("est", C("coeur", "roi"))], "pique", "est", v)
        self.assertEqual(set(got), {C("pique", 7)})

    def test_void_without_trump_is_free(self):
        hand = [C("trefle", 10), C("carreau", 7)]
        got = playable(hand, [("sud", C("coeur", "roi"))], "pique", "est")
        self.assertEqual(set(got), set(hand))

    def test_trump_led_must_follow_trump(self):
        hand = [C("pique", 7), C("coeur", 1)]
        got = playable(hand, [("sud", C("pique", "dame"))], "pique", "est")
        self.assertEqual(set(got), {C("pique", 7)})

    def test_must_overtrump_when_able(self):
        hand = [C("pique", 7), C("pique", "valet"), C("coeur", 1)]
        got = playable(hand, [("sud", C("pique", 9))], "pique", "est")
        self.assertEqual(set(got), {C("pique", "valet")})  # only the Jack beats the 9

    def test_overtrump_not_required_when_variant_off(self):
        hand = [C("pique", 7), C("pique", "valet")]
        v = Variants(must_overtrump=False)
        got = playable(hand, [("sud", C("pique", 9))], "pique", "est", v)
        self.assertEqual(set(got), set(hand))

    def test_cannot_overtrump_may_discard(self):
        hand = [C("pique", 7), C("coeur", 1), C("trefle", 10)]
        # opponent cut with the Jack; our 7 cannot beat it
        plays = [("sud", C("carreau", "roi")), ("ouest", C("pique", "valet"))]
        got = playable(hand, plays, "pique", "est")
        self.assertEqual(set(got), set(hand))

    def test_cannot_overtrump_must_undertrump_when_variant_on(self):
        hand = [C("pique", 7), C("coeur", 1)]
        v = Variants(may_discard_when_cannot_overtrump=False)
        plays = [("sud", C("carreau", "roi")), ("ouest", C("pique", "valet"))]
        got = playable(hand, plays, "pique", "est", v)
        self.assertEqual(set(got), {C("pique", 7)})

    def test_trump_led_no_trump_in_hand_is_free(self):
        hand = [C("coeur", 1), C("trefle", 7)]
        got = playable(hand, [("sud", C("pique", "dame"))], "pique", "est")
        self.assertEqual(set(got), set(hand))

    def test_empty_hand(self):
        self.assertEqual(playable([], [("sud", C("coeur", 7))], "pique", "est"), [])

    def test_result_is_always_a_nonempty_subset_of_hand(self):
        rng = random.Random(7)
        for _ in range(3000):
            d = deck()
            rng.shuffle(d)
            hand = d[:rng.randint(1, 8)]
            n = rng.randint(0, 3)
            plays = [(SEATS[i], d[8 + i]) for i in range(n)]
            trump = rng.choice(SUITS)
            got = playable(hand, plays, trump, "sud")
            self.assertTrue(got, "playable must never be empty for a non-empty hand")
            self.assertTrue(set(got) <= set(hand))


class TestDeal(unittest.TestCase):
    def test_deal_then_complete_gives_everyone_eight(self):
        for seed in range(50):
            d = deal(SEATS, random.Random(seed))
            self.assertTrue(all(len(h) == 5 for h in d.hands.values()))
            self.assertEqual(len(d.talon), 11)
            complete(d, SEATS, "nord")
            self.assertTrue(all(len(h) == 8 for h in d.hands.values()))
            self.assertEqual(d.talon, [])
            allc = [c for h in d.hands.values() for c in h]
            self.assertEqual(len(allc), 32)
            self.assertEqual(len(set(allc)), 32, "a card was duplicated")

    def test_retourne_goes_to_the_taker(self):
        d = deal(SEATS, random.Random(1))
        r = d.retourne
        complete(d, SEATS, "est")
        self.assertIn(r, d.hands["est"])

    def test_belote_holder(self):
        hands = {"nord": [C("pique", "roi"), C("pique", "dame")], "est": [], "sud": [], "ouest": []}
        self.assertEqual(belote_holder(hands, "pique"), "nord")
        self.assertIsNone(belote_holder(hands, "coeur"))
        hands["nord"] = [C("pique", "roi"), C("coeur", "dame")]
        self.assertIsNone(belote_holder(hands, "pique"), "K and Q must be in the same suit")


class TestBidding(unittest.TestCase):
    def test_round1_only_allows_the_retourne_suit(self):
        b = Bidding(order=SEATS, retourne_suit="coeur")
        self.assertEqual(b.allowed_suits(), ["coeur"])
        with self.assertRaises(ValueError):
            b.bid("nord", "prends", "pique")

    def test_taking_in_round1_sets_trump(self):
        b = Bidding(order=SEATS, retourne_suit="coeur")
        b.bid("nord", "prends")
        self.assertTrue(b.done)
        self.assertEqual((b.taker, b.trump), ("nord", "coeur"))

    def test_four_passes_opens_round2_without_the_retourne_suit(self):
        b = Bidding(order=SEATS, retourne_suit="coeur")
        for s in SEATS:
            b.bid(s, "passe")
        self.assertEqual(b.round, 2)
        self.assertEqual(b.current, "nord")
        self.assertNotIn("coeur", b.allowed_suits())
        self.assertEqual(len(b.allowed_suits()), 3)

    def test_eight_passes_means_redeal(self):
        b = Bidding(order=SEATS, retourne_suit="coeur")
        for _ in range(2):
            for s in SEATS:
                b.bid(s, "passe")
        self.assertTrue(b.done)
        self.assertTrue(b.redeal)
        self.assertIsNone(b.taker)

    def test_out_of_turn_is_rejected(self):
        b = Bidding(order=SEATS, retourne_suit="coeur")
        with self.assertRaises(ValueError):
            b.bid("sud", "passe")

    def test_bidding_after_done_is_rejected(self):
        b = Bidding(order=SEATS, retourne_suit="coeur")
        b.bid("nord", "prends")
        with self.assertRaises(ValueError):
            b.bid("est", "passe")

    def test_unknown_action(self):
        b = Bidding(order=SEATS, retourne_suit="coeur")
        with self.assertRaises(ValueError):
            b.bid("nord", "coinche")


def tricks_from_plan(plan: list[tuple[str, list[Card]]]) -> list[list[Card]]:
    """Build tricks where the designated seat holds the only trump, so it wins.

    `plan` is [(winner_seat, [trump_card, plain, plain, plain]), ...].
    """
    out = []
    for winner, cards in plan:
        others = [s for s in SEATS if s != winner]
        out.append([(winner, cards[0])] + [(others[i], cards[1 + i]) for i in range(3)])
    return out


class TestScoring(unittest.TestCase):
    def _capot_plan(self, winner="nord"):
        piques = [C("pique", r) for r in (1, 7, 8, 9, 10, "valet", "dame", "roi")]
        plains = [c for c in deck() if c.suit != "pique"]
        return tricks_from_plan([(winner, [piques[i], *plains[3 * i:3 * i + 3]]) for i in range(8)])

    def test_points_always_sum_to_162(self):
        tricks = self._capot_plan()
        s = score_deal(tricks, "pique", "nord", TEAMS)
        self.assertEqual(sum(s.card_points.values()), DEAL_TOTAL)

    def test_capot_by_taker(self):
        s = score_deal(self._capot_plan("nord"), "pique", "nord", TEAMS)
        self.assertEqual(s.capot_team, "ns")
        self.assertTrue(s.success)
        self.assertEqual(s.awarded["ns"], 250)
        self.assertEqual(s.awarded["eo"], 0)
        self.assertEqual(s.tricks_won, {"ns": 8, "eo": 0})

    def test_capot_against_the_taker(self):
        s = score_deal(self._capot_plan("nord"), "pique", "est", TEAMS)
        self.assertEqual(s.capot_team, "ns")
        self.assertFalse(s.success)
        self.assertEqual(s.awarded["ns"], 250)
        self.assertEqual(s.awarded["eo"], 0)

    def test_belote_adds_twenty_and_survives_going_dedans(self):
        s = score_deal(self._capot_plan("nord"), "pique", "est", TEAMS, belote_seat="ouest")
        self.assertEqual(s.belote_team, "eo")
        self.assertFalse(s.success)
        self.assertEqual(s.awarded["eo"], BELOTE_BONUS)  # kept despite being dedans
        v = ScoreVariants(belote_always_counts=False)
        s2 = score_deal(self._capot_plan("nord"), "pique", "est", TEAMS, belote_seat="ouest", variants=v)
        self.assertEqual(s2.awarded["eo"], 0)

    def _split_plan(self):
        """A deal engineered to split the cards 81 (ns) / 71 + der (eo) = 81/81."""
        ns_piques = [C("pique", r) for r in ("valet", 9, 1, 10)]          # 20+14+11+10 = 55
        eo_piques = [C("pique", r) for r in ("roi", "dame", 8, 7)]         # 4+3+0+0  = 7
        zeros = [C(s, r) for s in ("coeur", "carreau", "trefle") for r in (7, 8, 9)]
        ns_plains = [C("coeur", 1), C("coeur", 10), C("coeur", "dame"), C("coeur", "valet")] + zeros[:8]
        eo_plains = [C("coeur", "roi")] + [
            C(s, r) for s in ("carreau", "trefle") for r in (1, 10, "roi", "dame", "valet")
        ] + zeros[8:]
        self.assertEqual(sum(c.value("pique") for c in ns_piques + ns_plains), 81)
        self.assertEqual(sum(c.value("pique") for c in eo_piques + eo_plains), 71)
        plan = []
        for i in range(4):   # ns wins tricks 1-4
            plan.append(("nord", [ns_piques[i], *ns_plains[3 * i:3 * i + 3]]))
        for i in range(4):   # eo wins tricks 5-8, so eo also takes the dix de der
            plan.append(("est", [eo_piques[i], *eo_plains[3 * i:3 * i + 3]]))
        return tricks_from_plan(plan)

    def test_litige_at_eighty_one_each(self):
        s = score_deal(self._split_plan(), "pique", "nord", TEAMS)
        self.assertEqual(s.card_points, {"ns": 81, "eo": 81})
        self.assertTrue(s.litige)
        self.assertFalse(s.success)
        self.assertEqual(s.carried, 81)
        self.assertEqual(s.awarded["ns"], 0)
        self.assertEqual(s.awarded["eo"], 81)

    def test_litige_disabled_means_the_taker_is_dedans(self):
        v = ScoreVariants(litige_enabled=False)
        s = score_deal(self._split_plan(), "pique", "nord", TEAMS, variants=v)
        self.assertFalse(s.litige)
        self.assertFalse(s.success)
        self.assertEqual(s.awarded["eo"], DEAL_TOTAL)
        self.assertEqual(s.awarded["ns"], 0)

    def test_belote_turns_the_litige_into_a_made_contract(self):
        s = score_deal(self._split_plan(), "pique", "nord", TEAMS, belote_seat="nord")
        self.assertFalse(s.litige)
        self.assertTrue(s.success)             # 81 + 20 = 101 >= 82
        self.assertEqual(s.awarded["ns"], 101)
        self.assertEqual(s.awarded["eo"], 81)

    def _dedans_plan(self):
        """ns sweeps tricks 1-7; eo takes only a worthless trick 8 (with the der)."""
        ns_piques = [C("pique", r) for r in (1, 8, 9, 10, "valet", "dame", "roi")]
        zeros = [C(s, r) for s in ("coeur", "carreau", "trefle") for r in (7, 8, 9)]
        rest = [c for c in deck() if c.suit != "pique" and c not in zeros[:3]]
        plan = [("nord", [ns_piques[i], *rest[3 * i:3 * i + 3]]) for i in range(7)]
        plan.append(("est", [C("pique", 7), *zeros[:3]]))
        return tricks_from_plan(plan)

    def test_dedans_hands_the_whole_deal_to_the_defenders(self):
        s = score_deal(self._dedans_plan(), "pique", "est", TEAMS)
        self.assertEqual(s.card_points, {"ns": 152, "eo": 10})  # eo only got the der
        self.assertFalse(s.success)
        self.assertFalse(s.litige)
        self.assertEqual(s.awarded["ns"], DEAL_TOTAL)
        self.assertEqual(s.awarded["eo"], 0)

    def test_made_contract_lets_each_side_keep_its_own_points(self):
        s = score_deal(self._dedans_plan(), "pique", "nord", TEAMS)
        self.assertTrue(s.success)
        self.assertEqual(s.awarded, {"ns": 152, "eo": 10})

    def test_round1_take_may_omit_or_restate_the_retourne_suit(self):
        b = Bidding(order=SEATS, retourne_suit="coeur")
        b.bid("nord", "prends", "coeur")       # restating it is fine
        self.assertEqual(b.trump, "coeur")

    def test_carried_points_go_to_the_winner_of_the_next_deal(self):
        s = score_deal(self._capot_plan("nord"), "pique", "nord", TEAMS, carried=81)
        self.assertEqual(s.awarded["ns"], 250 + 81)
        s2 = score_deal(self._capot_plan("nord"), "pique", "est", TEAMS, carried=81)
        self.assertEqual(s2.awarded["ns"], 250 + 81)   # defenders won, they take the carry

    def test_wrong_trick_count_raises(self):
        with self.assertRaises(ValueError):
            score_deal(self._capot_plan()[:7], "pique", "nord", TEAMS)


class TestFullGameFuzz(unittest.TestCase):
    """Play many complete random-but-legal deals and assert the invariants hold."""

    def test_random_legal_deals(self):
        rng = random.Random(1234)
        for _ in range(300):
            d = deal(SEATS, rng)
            b = Bidding(order=SEATS, retourne_suit=d.retourne.suit)
            while not b.done:
                seat = b.current
                assert seat is not None
                if rng.random() < 0.4:
                    b.bid(seat, "prends", rng.choice(b.allowed_suits()))
                else:
                    b.bid(seat, "passe")
            if b.redeal:
                continue
            taker, trump = b.taker, b.trump
            assert taker and trump
            complete(d, SEATS, taker)
            belote = belote_holder(d.hands, trump)

            lead = SEATS[(SEATS.index(taker)) % 4]
            tricks = []
            for _trick in range(8):
                plays = []
                order = [SEATS[(SEATS.index(lead) + i) % 4] for i in range(4)]
                for seat in order:
                    opts = playable(d.hands[seat], plays, trump, PARTNER[seat])
                    self.assertTrue(opts, "a player had no legal card")
                    card = rng.choice(opts)
                    d.hands[seat].remove(card)
                    plays.append((seat, card))
                tricks.append(plays)
                lead = trick_winner(plays, trump)
            self.assertTrue(all(not h for h in d.hands.values()), "cards left in hand")
            s = score_deal(tricks, trump, taker, TEAMS, belote_seat=belote)
            self.assertEqual(sum(s.card_points.values()), DEAL_TOTAL)
            self.assertEqual(sum(s.tricks_won.values()), 8)


if __name__ == "__main__":
    unittest.main(verbosity=2)
