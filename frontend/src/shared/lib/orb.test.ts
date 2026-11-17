import { lighter, orbDots } from './orb';

const frame = { t: 0, spin: 0, fill: 0 };
const rows = (dots: { j: number }[], below: number) => dots.filter((d) => d.j < below).length;

test('a loud high band swells the top of the sphere', () => {
  const quiet = orbDots(40, { ...frame, bands: new Array(8).fill(0) }, 0);
  const high = orbDots(40, { ...frame, bands: [0, 0, 0, 0, 0, 0, 1, 1] }, 0);
  expect(rows(high, 6)).toBeGreaterThan(rows(quiet, 6));
});

test('silence draws the same sphere as no voice at all', () => {
  const plain = orbDots(40, frame, 0);
  const silent = orbDots(40, { ...frame, bands: new Array(8).fill(0) }, 0);
  expect(silent).toEqual(plain);
});

test('lighter mixes a colour towards white', () => {
  expect(lighter('rgb(31, 61, 255)', 0.5)).toBe('rgb(143, 158, 255)');
  expect(lighter('#1f3dff', 0)).toBe('rgb(31, 61, 255)');
  expect(lighter('currentColor', 0.5)).toBe('currentColor');
});
