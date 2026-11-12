// WebSocket link to the game server, with the reconnection behaviour a phone
// actually needs: backgrounding a tab kills the socket, so we reconnect on
// visibilitychange and on `online`, with a capped exponential backoff.
//
// The seat link IS the identity: the seat comes from the path (/s/nord) and the
// key from the URL fragment, which browsers never send to the server, so the key
// stays out of the nginx access log.

import { sfx } from './sfx.svelte';

export interface SeatInfo {
  name: string | null;
  online: boolean;
  ready: boolean;
  team: 'ns' | 'eo';
  cards: number;
}

export interface GameState {
  phase: string;
  dealId: number;
  pausedFrom: string | null;
  dealer: string;
  turn: string | null;
  trump: string | null;
  retourne: string | null;
  taker: string | null;
  target: number;
  scores: Record<string, number>;
  carried: number;
  template: string;
  teams: Record<string, 'ns' | 'eo'>;
  seats: Record<string, SeatInfo>;
  trick: { seat: string; card: string }[];
  trickWinner: string | null;
  lastTrick: { winner: string; cards: { seat: string; card: string }[] } | null;
  tricksPlayed: number;
  belote: string | null;
  bidding: {
    round: number;
    current: string | null;
    allowed: string[];
    history: { seat: string; action: string; suit: string | null }[];
  } | null;
  dealScore: Record<string, any> | null;
  you: string | null;
  hand: string[];
  playable: string[];
}

export type GameEvent = { type: string; [k: string]: any };

const CLIENT_KEY = 'belotier.client';

function clientId(): string {
  let id = localStorage.getItem(CLIENT_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? String(Math.random()).slice(2)) + '';
    localStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}

/** Parse /s/<seat>#k=<key> out of the address bar. */
export function readSeatLink(): { seat: string | null; key: string } {
  const m = location.pathname.match(/\/s\/(nord|est|sud|ouest)\/?$/);
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  return { seat: m ? m[1] : null, key: hash.get('k') ?? '' };
}

function wsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws`;
}

export const net = $state({
  status: 'idle' as 'idle' | 'connecting' | 'open' | 'retrying' | 'refused',
  state: null as GameState | null,
  error: null as string | null,
  seatBusy: false,
  links: null as Record<string, string> | null,
  attempts: 0,
});

type Listener = (e: GameEvent) => void;
const listeners: Listener[] = [];
export function onEvent(fn: Listener): void {
  listeners.push(fn);
}

let ws: WebSocket | null = null;
let retry: number | undefined;
let seat: string | null = null;
let key = '';
let name: string | null = null;
let takeover = false;
let closedByUs = false;

function schedule(): void {
  clearTimeout(retry);
  net.attempts += 1;
  const wait = Math.min(800 * 2 ** (net.attempts - 1), 15000);
  net.status = 'retrying';
  retry = setTimeout(connect, wait);
}

export function connect(): void {
  clearTimeout(retry);
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  closedByUs = false;
  net.status = 'connecting';
  ws = new WebSocket(wsUrl());

  ws.onopen = () => {
    net.status = 'open';
    net.attempts = 0;
    net.error = null;
    if (seat) {
      send({ t: 'hello', seat, key, client: clientId(), name, takeover });
      takeover = false;
    } else {
      send({ t: 'links' });
    }
  };

  ws.onmessage = (ev) => {
    let msg: any;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (msg.t === 'state') {
      net.state = msg.state;
      net.seatBusy = false;
      for (const e of msg.events ?? []) {
        for (const fn of listeners) fn(e);
      }
    } else if (msg.t === 'links') {
      net.links = msg.links;
    } else if (msg.t === 'welcome') {
      net.error = null;
      net.seatBusy = false;
    } else if (msg.t === 'error') {
      if (msg.code === 'seat_busy') {
        net.seatBusy = true;
      } else if (msg.code === 'taken_over') {
        closedByUs = true;
        net.status = 'refused';
      }
      net.error = msg.message ?? 'Erreur';
      sfx.error();
      setTimeout(() => (net.error = null), 3200);
    }
  };

  ws.onclose = () => {
    ws = null;
    if (closedByUs) {
      net.status = 'refused';
      return;
    }
    schedule();
  };

  ws.onerror = () => ws?.close();
}

export function send(msg: Record<string, unknown>): void {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

export function joinSeat(s: string, k: string, playerName: string | null, force = false): void {
  seat = s;
  key = k;
  name = playerName;
  takeover = force;
  if (ws?.readyState === WebSocket.OPEN) {
    send({ t: 'hello', seat, key, client: clientId(), name, takeover });
    takeover = false;
  } else {
    connect();
  }
}

/** A phone kills the socket the moment the tab goes to the background. */
export function watchLifecycle(): void {
  const wake = () => {
    if (document.visibilityState === 'visible' && !ws && !closedByUs) {
      net.attempts = 0;
      connect();
    }
  };
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('online', wake);
  window.addEventListener('pageshow', wake);
}
