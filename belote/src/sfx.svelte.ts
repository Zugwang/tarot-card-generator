// Synthesised sound effects. No audio files: every sound is built from
// oscillators and a noise buffer, which keeps the payload at zero bytes, dodges
// any CSP/media-host question and sidesteps sample licensing entirely.
//
// Browsers refuse to start audio before a user gesture, so the context is
// created lazily and `unlock()` is wired to the first pointer/key event.

const KEY = 'belotier.muted';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

export const audio = $state({
  muted: localStorage.getItem(KEY) === '1',
  ready: false,
});

function ensure(): AudioContext | null {
  if (audio.muted) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  audio.ready = ctx.state === 'running';
  return ctx;
}

/** Call from the first user gesture so mobile browsers allow sound. */
export function unlock(): void {
  const c = ensure();
  if (c && c.state === 'suspended') void c.resume();
}

export function toggleMute(): void {
  audio.muted = !audio.muted;
  localStorage.setItem(KEY, audio.muted ? '1' : '0');
  if (audio.muted && ctx) {
    void ctx.suspend();
  } else {
    unlock();
  }
}

function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    const len = Math.floor(c.sampleRate * 0.4);
    noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

interface ToneOpts {
  freq: number;
  to?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

function tone({ freq, to, dur = 0.12, type = 'triangle', gain = 0.25, delay = 0 }: ToneOpts): void {
  const c = ensure();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to && to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

interface SwishOpts {
  dur?: number;
  from?: number;
  to?: number;
  gain?: number;
  delay?: number;
  q?: number;
}

/** Filtered noise burst — the "paper" half of every card sound. */
function swish({ dur = 0.14, from = 900, to = 2600, gain = 0.16, delay = 0, q = 1.2 }: SwishOpts = {}): void {
  const c = ensure();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noise(c);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = q;
  bp.frequency.setValueAtTime(from, t);
  bp.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

export const sfx = {
  /** One card sliding off the deck. Call with an index to stagger a whole deal. */
  deal(i = 0): void {
    const d = i * 0.055;
    swish({ dur: 0.1, from: 700, to: 2300, gain: 0.1, delay: d });
    tone({ freq: 240 + (i % 4) * 18, dur: 0.05, type: 'sine', gain: 0.06, delay: d });
  },
  /** A card hitting the felt. */
  play(): void {
    swish({ dur: 0.1, from: 1400, to: 500, gain: 0.17 });
    tone({ freq: 160, to: 90, dur: 0.1, type: 'sine', gain: 0.2 });
  },
  /** Picking a card up / selecting it. */
  lift(): void {
    swish({ dur: 0.06, from: 1800, to: 3200, gain: 0.05 });
  },
  click(): void {
    tone({ freq: 520, to: 700, dur: 0.05, type: 'square', gain: 0.1 });
  },
  /** The trick being swept to its winner. */
  trick(): void {
    swish({ dur: 0.26, from: 500, to: 2400, gain: 0.16, q: 0.8 });
    tone({ freq: 330, to: 660, dur: 0.2, type: 'triangle', gain: 0.14 });
  },
  /** Balatro-ish counting chips: one rising blip per step. */
  chips(n: number, base = 420): void {
    const steps = Math.max(1, Math.min(n, 14));
    for (let i = 0; i < steps; i++) {
      tone({
        freq: base * Math.pow(1.085, i),
        dur: 0.07,
        type: 'square',
        gain: 0.1,
        delay: i * 0.055,
      });
    }
  },
  take(): void {
    [0, 0.09, 0.18].forEach((d, i) => tone({ freq: [392, 523, 659][i], dur: 0.16, gain: 0.16, delay: d }));
  },
  pass(): void {
    tone({ freq: 300, to: 200, dur: 0.14, type: 'sine', gain: 0.12 });
  },
  belote(): void {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, dur: 0.22, type: 'triangle', gain: 0.17, delay: i * 0.1 }),
    );
  },
  win(): void {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      tone({ freq: f, dur: 0.34, type: 'triangle', gain: 0.2, delay: i * 0.12 }),
    );
    swish({ dur: 0.7, from: 400, to: 5000, gain: 0.1, delay: 0.1, q: 0.6 });
  },
  lose(): void {
    [392, 330, 262, 196].forEach((f, i) =>
      tone({ freq: f, dur: 0.3, type: 'sawtooth', gain: 0.13, delay: i * 0.13 }),
    );
  },
  error(): void {
    tone({ freq: 180, to: 120, dur: 0.18, type: 'sawtooth', gain: 0.16 });
  },
  join(): void {
    tone({ freq: 440, to: 880, dur: 0.18, type: 'triangle', gain: 0.14 });
  },
};
