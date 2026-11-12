"""Belotier — WebSocket game server.

One process, one table, state in RAM, nothing spawned. Listens on a unix socket
by default (the convention on this box) or on TCP for local testing.

Environment
-----------
BELOTIER_SOCKET   unix socket path (default /run/belotier/ws.sock)
BELOTIER_HOST     set (with _PORT) to listen on TCP instead — dev only
BELOTIER_PORT
BELOTIER_TARGET   points to win a game (default 501)
BELOTIER_LINKS    "0" (default) keeps the 4 seat links private — read them with
                  deploy/links-belotier.sh. Set "1" to publish them on the lobby
                  page, which lets ANY visitor take a seat.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import signal
import sys
from http import HTTPStatus
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from websockets.asyncio.server import ServerConnection, serve, unix_serve
from websockets.exceptions import ConnectionClosed

from table import SEATS, SeatBusy, Table

LOG = logging.getLogger("belotier")

#: How long the finished trick stays face-up before being swept (seconds).
TRICK_PAUSE = 1.7
#: A paused table is wiped if nobody comes back within this many seconds.
DESERT_TIMEOUT = 15 * 60
#: Hard ceiling on sockets: 4 seats plus a little slack for reconnect overlap.
MAX_SOCKETS = 10
#: A connection that never claims a seat is closed after this long. Without it,
#: idle visitors sitting on the lobby page would occupy the ceiling above and
#: could lock real players out of their own table.
IDLE_TIMEOUT = 90
#: Largest accepted frame. Our messages are tiny; this is pure abuse protection.
MAX_MESSAGE = 4 * 1024

TARGET = int(os.environ.get("BELOTIER_TARGET", "501"))
PUBLIC_LINKS = os.environ.get("BELOTIER_LINKS", "0") == "1"

table = Table(target=TARGET)
#: ws -> {"client": str, "seat": str | None}
conns: dict[ServerConnection, dict] = {}
_sweep_task: asyncio.Task | None = None
_desert_task: asyncio.Task | None = None


# ---- sending ---------------------------------------------------------------

async def send(ws: ServerConnection, payload: dict) -> None:
    try:
        await ws.send(json.dumps(payload, separators=(",", ":")))
    except ConnectionClosed:
        pass


async def broadcast(events: list[dict] | None = None) -> None:
    """Push the state to everyone, each seat getting only its own hand."""
    events = events or []
    for ws, info in list(conns.items()):
        payload = {"t": "state", "state": table.state_for(info["seat"])}
        if events:
            payload["events"] = events
        await send(ws, payload)


async def push(events: list[dict] | None = None) -> None:
    """Drain the table's queued events and broadcast the resulting state.

    Re-arms the trick sweep here rather than at the call sites: a player dropping
    during the trick-display window cancels the sweep, and without this the table
    would stay wedged in `trick_done` for ever once everyone came back.
    """
    queued = table.drain_events()
    await broadcast(queued + (events or []))
    if table.phase == "trick_done":
        schedule_sweep()


# ---- timers ----------------------------------------------------------------

def schedule_sweep() -> None:
    """After a completed trick, pause so players can see it, then sweep."""
    global _sweep_task
    if _sweep_task and not _sweep_task.done():
        return

    async def run() -> None:
        try:
            await asyncio.sleep(TRICK_PAUSE)
            # A pause (someone left) must not sweep the trick from under them.
            if table.phase != "trick_done":
                return
            table.finish_trick()
            await push()
        except asyncio.CancelledError:
            raise
        except Exception:
            LOG.exception("trick sweep failed")

    _sweep_task = asyncio.create_task(run())


def schedule_desert_check() -> None:
    global _desert_task
    if _desert_task and not _desert_task.done():
        return

    async def run() -> None:
        try:
            await asyncio.sleep(DESERT_TIMEOUT)
            if table.phase == "paused":
                LOG.info("table deserted for %ss, resetting", DESERT_TIMEOUT)
                table.reset_table()
                await push()
        except asyncio.CancelledError:
            raise
        except Exception:
            LOG.exception("desert check failed")

    _desert_task = asyncio.create_task(run())


def cancel_desert_check() -> None:
    global _desert_task
    if _desert_task and not _desert_task.done():
        _desert_task.cancel()
    _desert_task = None


# ---- message handling ------------------------------------------------------

async def handle_message(ws: ServerConnection, info: dict, msg: dict) -> None:
    kind = msg.get("t")

    if kind == "links":
        if not PUBLIC_LINKS:
            await send(ws, {
                "t": "error", "code": "links_private",
                "message": "Les liens de place ne sont pas publics. Demande-les au proprietaire de la table.",
            })
            return
        await send(ws, {"t": "links", "links": table.links, "seats": list(SEATS)})
        return

    if kind == "hello":
        seat = msg.get("seat")
        key = msg.get("key") or ""
        client = str(msg.get("client") or "")[:64]
        if not client:
            await send(ws, {"t": "error", "code": "no_client", "message": "Identifiant client manquant."})
            return
        try:
            table.claim(seat, key, client, msg.get("name"), takeover=bool(msg.get("takeover")))
        except SeatBusy:
            await send(ws, {"t": "error", "code": "seat_busy", "message": "Ce siège est déjà occupé.", "seat": seat})
            return
        except ValueError as e:
            await send(ws, {"t": "error", "code": "bad_seat", "message": str(e)})
            return
        # Kick any older socket squatting the same seat.
        for other, oinfo in list(conns.items()):
            if other is not ws and oinfo["seat"] == seat:
                oinfo["seat"] = None
                await send(other, {"t": "error", "code": "taken_over", "message": "Ta place a été reprise ailleurs."})
        info["client"] = client
        info["seat"] = seat
        cancel_desert_check()
        await send(ws, {"t": "welcome", "seat": seat, "name": table.seats[seat].name})
        table.maybe_start()
        await push()
        return

    seat = info["seat"]
    if not seat:
        await send(ws, {"t": "error", "code": "not_seated", "message": "Prends d'abord une place."})
        return

    try:
        if kind == "bid":
            table.bid(seat, str(msg.get("action")), msg.get("suit"))
        elif kind == "play":
            table.play(seat, str(msg.get("card")))
        elif kind == "ready":
            table.set_ready(seat)
        elif kind == "ping":
            await send(ws, {"t": "pong"})
            return
        else:
            await send(ws, {"t": "error", "code": "unknown", "message": f"Message inconnu: {kind!r}"})
            return
    except (ValueError, KeyError) as e:
        await send(ws, {"t": "error", "code": "illegal", "message": str(e)})
        await send(ws, {"t": "state", "state": table.state_for(seat)})
        return

    await push()


async def handler(ws: ServerConnection) -> None:
    if len(conns) >= MAX_SOCKETS:
        await ws.close(code=1013, reason="table saturee")
        return
    info = {"client": None, "seat": None}
    conns[ws] = info
    LOG.info("connexion (%d ouvertes)", len(conns))

    async def reap_if_idle() -> None:
        await asyncio.sleep(IDLE_TIMEOUT)
        if info["seat"] is None:
            LOG.info("fermeture d'une connexion sans siege apres %ss", IDLE_TIMEOUT)
            await ws.close(code=1000, reason="aucune place prise")

    reaper = asyncio.create_task(reap_if_idle())
    try:
        async for raw in ws:
            if isinstance(raw, bytes) or len(raw) > MAX_MESSAGE:
                await send(ws, {"t": "error", "code": "bad_frame", "message": "Message invalide."})
                continue
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await send(ws, {"t": "error", "code": "bad_json", "message": "JSON invalide."})
                continue
            if not isinstance(msg, dict):
                await send(ws, {"t": "error", "code": "bad_json", "message": "Objet attendu."})
                continue
            await handle_message(ws, info, msg)
    except ConnectionClosed:
        pass
    finally:
        reaper.cancel()
        conns.pop(ws, None)
        if info["seat"] and info["client"]:
            still_here = any(
                o["seat"] == info["seat"] and o["client"] == info["client"] for o in conns.values()
            )
            if not still_here:
                table.drop(info["client"])
                if table.phase == "paused":
                    schedule_desert_check()
                await push()
        LOG.info("deconnexion (%d ouvertes)", len(conns))


def process_request(connection: ServerConnection, request):
    """Answer a plain GET /health on the same socket; everything else upgrades."""
    if request.path == "/health":
        body = json.dumps({
            "ok": True,
            "phase": table.phase,
            "sockets": len(conns),
            "online": table.online_count,
        }) + "\n"
        return connection.respond(HTTPStatus.OK, body)
    return None


async def main() -> None:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", stream=sys.stdout
    )
    LOG.info("liens des sièges : %s", json.dumps(table.links))

    loop = asyncio.get_running_loop()
    stop = loop.create_future()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: stop.done() or stop.set_result(None))

    opts = dict(
        process_request=process_request,
        ping_interval=20,
        ping_timeout=20,
        close_timeout=5,
        max_size=MAX_MESSAGE,
        max_queue=16,
    )
    host = os.environ.get("BELOTIER_HOST")
    if host:
        port = int(os.environ.get("BELOTIER_PORT", "8787"))
        LOG.info("écoute TCP %s:%s", host, port)
        async with serve(handler, host, port, **opts):
            await stop
    else:
        path = os.environ.get("BELOTIER_SOCKET", "/run/belotier/ws.sock")
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        if Path(path).exists():
            Path(path).unlink()
        LOG.info("écoute unix %s", path)
        async with unix_serve(handler, path, **opts):
            # Same exposure as the box's existing gunicorn sockets: nginx (www-data)
            # must be able to connect, and RuntimeDirectory is already world-readable.
            os.chmod(path, 0o666)
            await stop
    LOG.info("arrêt propre")


if __name__ == "__main__":
    asyncio.run(main())
