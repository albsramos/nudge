// The live orb (from Stack): a dithered sphere on a canvas. It sways at rest, spins while busy, reacts to
// `kick`, and while listening takes the shape of your voice. Colour comes from CSS `color` (--orb).
import { useCallback } from 'react';
import { drawOrb } from '@/shared/lib/orb';
import { readVoice } from '@/shared/lib/voice';
import { mouthFor } from '@/shared/lib/vowel';
import { cn } from '@/shared/lib/cn';
import { pickReaction, type Reaction } from './reactions';
import styles from './Orb.module.css';

type OrbProps = {
  /** CSS pixels. */
  size: number;
  /** Cells across: fewer reads as chunkier dots. */
  grid?: number;
  /** The light circles and the dust orbits. */
  isBusy?: boolean;
  /** Read the microphone every frame and follow it. */
  isListening?: boolean;
  /** Change this number to make the orb react once. */
  kick?: number;
  /** Play the intro: the dots fly in and settle on first draw. */
  isIntro?: boolean;
  className?: string;
};

type Live = { isBusy: boolean; isListening: boolean; kick: number };

/** The loop reads the latest props from the canvas's data attributes, so it never restarts on a prop change. */
function readLive(canvas: HTMLCanvasElement): Live {
  const d = canvas.dataset;
  return { isBusy: d.busy === 'true', isListening: d.listening === 'true', kick: Number(d.kick) || 0 };
}

const BASE = -Math.PI / 4;
const BANDS = 8;

export function Orb({ size, grid = 32, isBusy = false, isListening = false, kick = 0, isIntro = false, className }: OrbProps) {
  const start = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      return runOrb(canvas, size, grid, isIntro);
    },
    [size, grid, isIntro],
  );

  return (
    <canvas
      ref={start}
      className={cn(styles.root, className)}
      style={{ width: size, height: size }}
      data-busy={isBusy}
      data-listening={isListening}
      data-kick={kick}
      aria-hidden="true"
    />
  );
}

function runOrb(canvas: HTMLCanvasElement, size: number, grid: number, isIntro: boolean) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const px = Math.round(size * dpr);
  canvas.width = px;
  canvas.height = px;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let color = getComputedStyle(canvas).color;
  const scheme = window.matchMedia('(prefers-color-scheme: dark)');
  const recolor = () => (color = getComputedStyle(canvas).color);
  scheme.addEventListener('change', recolor);

  // Everything eases from where it is, so reactions and voice blend instead of jumping.
  let angle = BASE;
  let vel = 0;
  let orbit = 0;
  let twinkle = 0;
  let burst = 0;
  let spin = 0;
  let fill = 0;
  let assemble = isIntro && !reduce.matches ? 0 : 1;
  let voice = 0; // 0–1: how much the voice shape is mixed in
  const bands = new Array<number>(BANDS).fill(0);
  let level = 0;
  let pitch = 0.5;
  const mouth = { sx: 1, sy: 1, smile: 0 };
  let reaction: Reaction | null = null;
  let lastKind: Reaction['kind'] | null = null;
  let lastKick = readLive(canvas).kick;
  let lastKickAt = 0;
  const t0 = performance.now();
  let last = t0;
  let raf = 0;
  let visible = true;
  const ease = (rate: number, dt: number) => 1 - Math.exp(-dt * rate);
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = (now - t0) / 1000;
    const { isBusy, isListening, kick } = readLive(canvas);

    if (kick !== lastKick) {
      lastKick = kick;
      const rapid = now - lastKickAt < 400;
      lastKickAt = now;
      reaction = { ...pickReaction(lastKind, rapid), start: now };
      lastKind = reaction.kind;
    }
    if (reaction && now - reaction.start > reaction.ms) reaction = null;
    const age = reaction ? now - reaction.start : 0;

    // Voice: fast attack, slower release, so syllables pop and the shape settles between words.
    voice += ((isListening ? 1 : 0) - voice) * ease(5, dt);
    const heard = isListening ? readVoice() : null;
    for (let b = 0; b < BANDS; b++) {
      const to = heard?.bands[b] ?? 0;
      bands[b] += (to - bands[b]) * ease(to > bands[b] ? 28 : 7, dt);
    }
    const levelTo = heard?.level ?? 0;
    level += (levelTo - level) * ease(levelTo > level ? 24 : 6, dt);
    if (heard && heard.level > 0.04) pitch += (heard.pitch - pitch) * ease(8, dt);
    // The vowel's mouth shape: quick to open, a little slower to relax, so the orb keeps up with syllables.
    const mouthTo = mouthFor(heard ? heard.vowel : { open: 0, front: 0, strength: 0 });
    for (const key of ['sx', 'sy', 'smile'] as const) {
      const away = Math.abs(mouthTo[key] - (key === 'smile' ? 0 : 1)) > Math.abs(mouth[key] - (key === 'smile' ? 0 : 1));
      mouth[key] += (mouthTo[key] - mouth[key]) * ease(away ? 18 : 9, dt);
    }

    // Light: busy or a spin reaction speeds it round; listening, it follows the pitch (low = bottom left,
    // high = top right); otherwise it sways at rest.
    const spinning = reaction?.kind === 'spin';
    const velTo = isBusy ? 2.2 : spinning ? 2.2 * reaction!.dir * reaction!.speed : 0;
    vel += (velTo - vel) * ease(6, dt);
    angle += vel * dt;
    if (velTo === 0) {
      const sway = BASE + Math.sin(t * 0.6) * 0.18;
      const voiced = (3 * Math.PI) / 4 - pitch * Math.PI;
      const restAt = reaction?.kind === 'flick' ? reaction.angle : voice > 0.5 ? voiced : sway;
      angle += wrap(restAt - angle) * ease(reaction?.kind === 'flick' ? 9 : 5, dt);
    }
    spin += ((isBusy || spinning ? 1 : 0) - spin) * ease(6, dt);
    orbit += vel * dt * 0.73 + level * dt * 2.5;
    twinkle += dt * (2 + spin * 4 + level * 6);

    const burstTo = reaction?.kind === 'burst' && age < 160 ? reaction.amount : level * 0.9 * voice;
    burst += (burstTo - burst) * ease(burstTo > burst ? 16 : 3.5, dt);

    if (reaction?.kind === 'reform' && age < 220) assemble += (reaction.amount - assemble) * ease(9, dt);
    else if (assemble < 1) assemble = Math.min(1, assemble + dt / (isIntro && t < 1.5 ? 1.4 : 0.55));

    const fillTo = reaction?.kind === 'pulse' && age < reaction.ms * 0.5 ? reaction.amount : level * 0.25 * voice;
    fill += (fillTo - fill) * ease(reaction?.kind === 'pulse' ? 12 : 10, dt);

    drawOrb(ctx, px, grid, color, {
      t, spin, fill, assemble, light: angle, orbit, twinkle, burst,
      // With the mouth shape leading, the per-band swell is a texture on top of it.
      bands: voice > 0.01 ? bands.map((b) => b * voice * 0.5) : undefined,
      mouth: voice > 0.01 ? mouth : undefined,
      // While listening the squares glow, a little brighter as you talk.
      glow: voice * (0.6 + 0.4 * level),
    });
    // Reduced motion: one still frame, except while listening, where the shape is the feedback.
    if (visible && (!reduce.matches || isListening || voice > 0.01)) raf = requestAnimationFrame(frame);
  };

  const restart = () => {
    cancelAnimationFrame(raf);
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  // Don't draw an orb nobody can see.
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) restart();
  });
  io.observe(canvas);
  reduce.addEventListener('change', restart);
  // Under reduced motion the loop stops after a frame: wake it when the props change.
  const wake = setInterval(() => {
    const now = readLive(canvas);
    if (reduce.matches && (now.isListening || now.kick !== lastKick)) restart();
  }, 250);
  restart();

  return () => {
    cancelAnimationFrame(raf);
    clearInterval(wake);
    io.disconnect();
    reduce.removeEventListener('change', restart);
    scheme.removeEventListener('change', recolor);
  };
}
