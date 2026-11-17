import { estimateVowel, mouthFor, restMouth } from './vowel';

const HZ = 48000 / 2048; // AnalyserNode with fftSize 2048 at 48 kHz

/** A voice-like spectrum: harmonics of f0 shaped by two formant peaks over a low noise floor. */
function spectrum(f1: number, f2: number, f0 = 140): number[] {
  const bins = new Array(1024).fill(25);
  for (let h = f0; h < 4000; h += f0) {
    const k = Math.round(h / HZ);
    const gain = 150 * Math.exp(-(((h - f1) / 140) ** 2)) + 130 * Math.exp(-(((h - f2) / 220) ** 2)) + 40;
    for (let d = -1; d <= 1; d++) bins[k + d] = Math.max(bins[k + d], Math.min(255, gain - Math.abs(d) * 20));
  }
  return bins;
}

test.each([
  ['oo', 320, 870, { open: [0, 0.2], front: [0, 0.15] }],
  ['ah', 760, 1220, { open: [0.8, 1], front: [0.15, 0.4] }],
  ['ee', 290, 2280, { open: [0, 0.2], front: [0.85, 1] }],
])('hears %s', (_, f1, f2, want) => {
  const v = estimateVowel(spectrum(f1, f2), HZ);
  expect(v.open).toBeGreaterThanOrEqual(want.open[0]);
  expect(v.open).toBeLessThanOrEqual(want.open[1]);
  expect(v.front).toBeGreaterThanOrEqual(want.front[0]);
  expect(v.front).toBeLessThanOrEqual(want.front[1]);
  expect(v.strength).toBeGreaterThan(0.5);
});

test('silence is no vowel', () => {
  expect(estimateVowel(new Array(1024).fill(10), HZ).strength).toBe(0);
});

test('oo is tall, ah is wide, ee is flat and grinning', () => {
  const oo = mouthFor({ open: 0.05, front: 0.02, strength: 1 });
  const ah = mouthFor({ open: 1, front: 0.25, strength: 1 });
  const ee = mouthFor({ open: 0, front: 1, strength: 1 });
  expect(oo.sy / oo.sx).toBeGreaterThan(1.25);
  expect(ah.sx).toBeGreaterThan(1.1);
  expect(ee.sx / ee.sy).toBeGreaterThan(1.2);
  expect(ee.smile).toBeGreaterThan(0.8);
  expect(oo.smile + ah.smile).toBe(0);
});

test('an unclear vowel barely moves the shape', () => {
  expect(mouthFor({ open: 1, front: 1, strength: 0 })).toEqual(restMouth);
});
