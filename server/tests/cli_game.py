"""Drive a whole game over real WebSockets with four clients, in one process.

Run: server/.venv/bin/python -u server/tests/cli_game.py

Deliberately spawns NO child process: the server runs as an asyncio task beside
the clients, so nothing can be left behind as a ghost. Fully event-driven — each
client acts when a new state arrives, so the test runs as fast as the server.

Checks
  1. four clients seat themselves and the deal starts by itself;
  2. an invalid link is refused, and an unseated socket cannot play;
  3. a complete game plays out to the target score;
  4. NO LEAK — every card id a client receives is either its own or truly public;
  5. dropping a socket pauses the table; reconnecting restores the same hand.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import app  # noqa: E402
from websockets.asyncio.client import connect  # noqa: E402
from websockets.asyncio.server import serve  # noqa: E402
from websockets.exceptions import ConnectionClosed  # noqa: E402

HOST, PORT = "127.0.0.1", 8799
CARD_RE = re.compile(r"(?:pip|court)-(?:pique|coeur|carreau|trefle)-(?:\d+|valet|dame|roi)")
SEATS = ["nord", "est", "sud", "ouest"]

failures: list[str] = []
leaks: list[str] = []
final_scores: dict[str, int] = {}
deals_done = 0
game_over = asyncio.Event()


def check(cond: bool, label: str) -> None:
    print(f"  {'ok  ' if cond else 'FAIL'} {label}", flush=True)
    if not cond:
        failures.append(label)


def hands_of_others(seat: str) -> set[str]:
    """Cards currently held by the other three players — the forbidden set.

    This is the precise privacy property: a card sitting in someone else's hand
    must never appear in a frame sent to `seat`. Anything already played, or the
    face-up retourne, is in nobody's hand, so it cannot raise a false alarm.
    """
    t = app.table
    if not t.deal:
        return set()
    return {c.id for s, hand in t.deal.hands.items() if s != seat for c in hand}


class Client:
    def __init__(self, seat: str, key: str) -> None:
        self.seat, self.key = seat, key
        self.ws = None
        self.state: dict = {}
        self.errors: list[dict] = []
        self.task: asyncio.Task | None = None
        #: Hand carried by the first state frame after (re)connecting, so a
        #: reconnection can be checked before play resumes and changes it.
        self.first_hand: list[str] | None = None

    async def open(self) -> None:
        self.first_hand = None
        self.ws = await connect(f"ws://{HOST}:{PORT}/", max_size=2**16)
        await self.ws.send(json.dumps({
            "t": "hello", "seat": self.seat, "key": self.key,
            "client": f"cli-{self.seat}", "name": self.seat.capitalize(),
            "takeover": True,
        }))

    def ingest(self, raw: str) -> None:
        global deals_done
        msg = json.loads(raw)
        # Leak audit on the raw frame, before anything is interpreted. Only audit
        # a frame that describes the deal still in progress: a late frame from a
        # finished deal refers to cards that have since been reshuffled, which
        # would be a false alarm rather than a leak.
        if msg.get("t") == "state" and msg["state"].get("dealId") == app.table.deal_id:
            own = set(msg["state"].get("hand") or [])
            seen = set(CARD_RE.findall(raw))
            leaked = (seen - own) & hands_of_others(self.seat)
            if leaked:
                leaks.append(f"{self.seat}: {sorted(leaked)[:4]}")
        if msg.get("t") == "state":
            if self.first_hand is None and msg["state"].get("hand"):
                self.first_hand = sorted(msg["state"]["hand"])
            self.state = msg["state"]
            for e in msg.get("events") or []:
                if e.get("type") == "deal_end":
                    deals_done += 1
                if e.get("type") == "game_end":
                    final_scores.update(e.get("scores") or {})
                    game_over.set()
        elif msg.get("t") == "error":
            self.errors.append(msg)

    async def act(self) -> None:
        st = self.state
        if not st:
            return
        phase, turn = st.get("phase"), st.get("turn")
        if phase == "bidding" and turn == self.seat:
            bid = st["bidding"]
            if bid["round"] == 2 and bid["allowed"]:
                await self.ws.send(json.dumps({"t": "bid", "action": "prends", "suit": bid["allowed"][0]}))
            else:
                await self.ws.send(json.dumps({"t": "bid", "action": "passe"}))
        elif phase == "playing" and turn == self.seat and st.get("playable"):
            await self.ws.send(json.dumps({"t": "play", "card": st["playable"][0]}))
        elif phase in ("deal_end", "game_end") and not st["seats"][self.seat]["ready"]:
            await self.ws.send(json.dumps({"t": "ready"}))

    async def loop(self) -> None:
        try:
            async for raw in self.ws:
                self.ingest(raw)
                await self.act()
        except (ConnectionClosed, asyncio.CancelledError):
            pass

    def start(self) -> None:
        self.task = asyncio.create_task(self.loop())

    async def stop(self) -> None:
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        if self.ws:
            await self.ws.close()


async def run() -> None:
    app.TRICK_PAUSE = 0.01
    opts = dict(
        process_request=app.process_request,
        ping_interval=20, ping_timeout=20, close_timeout=5,
        max_size=app.MAX_MESSAGE, max_queue=16,
    )
    async with serve(app.handler, HOST, PORT, **opts):
        t = app.table
        clients = [Client(s, t.links[s]) for s in SEATS]

        # --- an intruder, before the table fills up ----------------------
        async with connect(f"ws://{HOST}:{PORT}/") as spare:
            await spare.send(json.dumps({"t": "hello", "seat": "nord", "key": "wrong", "client": "intrus"}))
            r1 = json.loads(await asyncio.wait_for(spare.recv(), timeout=3))
            check(r1.get("code") == "bad_seat", "un lien invalide est refuse")
            await spare.send(json.dumps({"t": "play", "card": "pip-coeur-1"}))
            r2 = json.loads(await asyncio.wait_for(spare.recv(), timeout=3))
            check(r2.get("code") == "not_seated", "un intrus non assis ne peut pas jouer")

        for c in clients:
            await c.open()
        await asyncio.sleep(0.3)
        check(t.phase == "bidding", f"la partie demarre seule a 4 joueurs (phase={t.phase})")
        for c in clients:
            c.start()

        # --- mid-game disconnection -------------------------------------
        async def yank() -> None:
            while app.table.phase != "playing" or app.table.tricks == []:
                if game_over.is_set():
                    return
                await asyncio.sleep(0.05)
            victim = clients[2]
            await victim.stop()
            await asyncio.sleep(0.3)
            check(app.table.phase == "paused", f"perdre un joueur met la table en pause (phase={app.table.phase})")
            # Capture the hand only once the table is frozen: taken any earlier,
            # the client could still slip a play in while it was being stopped.
            hand_before = sorted(c.id for c in app.table.deal.hands[victim.seat])
            await victim.open()
            victim.start()
            await asyncio.sleep(0.4)
            check(app.table.phase != "paused", "le retour du joueur relance la partie")
            check(victim.first_hand == hand_before,
                  f"la main est restauree a l'identique apres reconnexion "
                  f"({len(victim.first_hand or [])} vs {len(hand_before)} cartes)")

        yanker = asyncio.create_task(yank())
        try:
            await asyncio.wait_for(game_over.wait(), timeout=90)
        except asyncio.TimeoutError:
            check(False, f"la partie se termine (bloquee en {app.table.phase}, scores {app.table.scores})")
        yanker.cancel()

        check(not leaks, f"aucune fuite de main (violations: {leaks[:3]})")
        check(deals_done >= 1, f"au moins une donne terminee (vu {deals_done})")
        check(app.table.phase == "game_end", f"phase finale = game_end (vu {app.table.phase})")
        check(max(app.table.scores.values()) >= app.table.target,
              f"le vainqueur depasse {app.table.target} (scores {app.table.scores})")
        # An optimistic client can always fire an action that the server has
        # already moved past (it sent a play just as the trick got swept). The
        # server rejecting those is correct behaviour, so they are tolerated and
        # counted; anything else is a genuine protocol fault.
        races = {"ce n'est pas le moment de jouer", "rien a confirmer pour l'instant",
                 "rien \u00e0 confirmer pour l'instant", "ce n'est pas le moment d'annoncer",
                 "ce n'est pas ton tour"}
        real = [e for c in clients for e in c.errors if e.get("message") not in races]
        n_races = sum(len(c.errors) for c in clients) - len(real)
        check(not real, f"aucune erreur protocole inattendue ({real[:2]})")
        print(f"  info  {n_races} rejets de courses client (comportement attendu)", flush=True)

        for c in clients:
            await c.stop()
        await asyncio.sleep(0.2)
        check(len(app.conns) == 0, f"toutes les sockets liberees ({len(app.conns)} restantes)")
        print(f"\n  donnes jouees: {deals_done} | scores a la victoire: {final_scores}", flush=True)


if __name__ == "__main__":
    print("== partie complete a 4 clients ==", flush=True)
    asyncio.run(run())
    if failures:
        print(f"\nECHECS ({len(failures)}):", flush=True)
        for f in failures:
            print("  -", f, flush=True)
        sys.exit(1)
    print("\ntout est vert", flush=True)
