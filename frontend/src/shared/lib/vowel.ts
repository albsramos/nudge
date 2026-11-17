// Vowels from a spectrum, and the mouth shape they make. Pure functions, so they're testable without a mic.
//
// Every vowel has two resonance peaks (formants): F1 rises as the mouth opens (ee/oo ≈ 300 Hz, ah ≈ 750 Hz),
// F2 rises as the tongue moves forward (oo ≈ 850 Hz, ah ≈ 1200 Hz, ee ≈ 2300 Hz).

export type Vowel = {
  /** 0 = closed (oo, ee) … 1 = open (ah), from F1. */
  open: number;
  /** 0 = back (oo) … 1 = front (ee), from F2. */
  front: number;
  /** 0–1: how clearly a vowel is there (loud and peaky), so noise doesn't twitch the shape. */
  strength: number;
};

export const silentVowel: Vowel = { open: 0.3, front: 0.4, strength: 0 };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Finds F1 and F2 in byte FFT data (0–255 per bin, as AnalyserNode gives) and turns them into a Vowel. */
export function estimateVowel(bins: ArrayLike<number>, hzPerBin: number): Vowel {
  // Smooth across harmonics (a voice's harmonics sit 100–250 Hz apart) so the peaks are the envelope's, not one harmonic's.
  const radius = Math.max(2, Math.round(160 / hzPerBin));
  const env = (k: number) => {
    let sum = 0;
    let n = 0;
    for (let i = k - radius; i <= k + radius; i++) {
      if (i < 0 || i >= bins.length) continue;
      sum += bins[i];
      n++;
    }
    return n ? sum / n : 0;
  };
  const peak = (loHz: number, hiHz: number) => {
    let best = -1;
    let at = loHz;
    for (let k = Math.ceil(loHz / hzPerBin); k <= Math.floor(hiHz / hzPerBin) && k < bins.length; k++) {
      const e = env(k);
      if (e > best) {
        best = e;
        at = k * hzPerBin;
      }
    }
    return { hz: at, level: best };
  };

  // F1 is the lowest strong peak, not the loudest: for oo, F2 sits close above it and can be as loud.
  // Bins are decibels (about 0.27 dB a step), so "strong" means within ~6 dB of the loudest peak.
  const loudest = peak(250, 2700).level;
  let f1 = peak(250, 900);
  for (let k = Math.ceil(250 / hzPerBin); k <= Math.floor(900 / hzPerBin); k++) {
    const e = env(k);
    if (e >= loudest - 22 && e >= env(k - 1) && e >= env(k + 1)) {
      f1 = { hz: k * hzPerBin, level: e };
      break;
    }
  }
  const f2 = peak(Math.max(850, f1.hz + 300), 2700);
  // A vowel's formants stand well above the quiet parts of its own spectrum (the 20th percentile from 100 Hz to 4 kHz).
  const span: number[] = [];
  for (let k = Math.ceil(100 / hzPerBin); k <= Math.floor(4000 / hzPerBin) && k < bins.length; k++) span.push(env(k));
  span.sort((a, b) => a - b);
  const floor = span.length ? span[Math.floor(span.length * 0.2)] : 0;
  const strength = clamp01((Math.min(f1.level, f2.level) - Math.max(floor, 40)) / 60);
  return {
    open: clamp01((f1.hz - 300) / (750 - 300)),
    front: clamp01((f2.hz - 850) / (2300 - 850)),
    strength,
  };
}

export type Mouth = {
  /** Horizontal and vertical scale of the sphere (1 = round). */
  sx: number;
  sy: number;
  /** 0–1: the sphere bends up at the sides, a grin. */
  smile: number;
};

export const restMouth: Mouth = { sx: 1, sy: 1, smile: 0 };

/** oo → tall and narrow, ah → wide open, ee → flat and grinning. Mixed in by how clearly the vowel is heard. */
export function mouthFor(v: Vowel): Mouth {
  const target: Mouth = {
    sx: 0.82 + 0.22 * v.front + 0.3 * v.open,
    sy: 1.1 - 0.3 * v.front + 0.02 * v.open,
    smile: clamp01((v.front - 0.55) / 0.35) * (1 - v.open),
  };
  const k = v.strength;
  return { sx: 1 + (target.sx - 1) * k, sy: 1 + (target.sy - 1) * k, smile: target.smile * k };
}
