// Regenerates the app icons from the orb drawing code (as Stack does): `npm run icons`.
// Nudge's orb is caught mid-word: the rim swells with a voice, which tells it apart from Stack's.
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { orbDots } from '../src/shared/lib/orb.ts';

const BLUE = '#1f3dff';
const BG = '#ffffff';
const VOICE = [0.35, 0.7, 1, 0.75, 0.45, 0.8, 0.95, 0.5];

function iconSvg(inset, grid = 24) {
  const S = 120;
  const area = S * (1 - inset * 2);
  const cell = area / grid;
  const dot = cell * 0.8;
  const off = S * inset + (cell - dot) / 2;
  const offY = off + area * 0.05; // the sphere sits at 45% of its grid: centre it in the tile
  const rects = orbDots(grid, { t: 0, spin: 0, fill: 0.15, light: (-3 * Math.PI) / 4 + 0.3, bands: VOICE }, 0.3)
    .map(({ i, j }) => `<rect x="${(off + i * cell).toFixed(2)}" y="${(offY + j * cell).toFixed(2)}" width="${dot.toFixed(2)}" height="${dot.toFixed(2)}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}"><rect width="${S}" height="${S}" fill="${BG}"/><g fill="${BLUE}">${rects}</g></svg>`;
}

const regular = iconSvg(0.08);
const maskable = iconSvg(0.18); // the maskable safe zone is the centre 80%
writeFileSync(new URL('../public/icon.svg', import.meta.url), regular + '\n');

// require(), not import: Playwright isn't a project dependency; this finds the machine's copy.
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
const shoot = async (svg, size, file) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.screenshot({ path: new URL(`../public/${file}`, import.meta.url).pathname });
};
await shoot(regular, 192, 'icon-192.png');
await shoot(regular, 512, 'icon-512.png');
await shoot(regular, 180, 'apple-touch-icon.png');
await shoot(maskable, 512, 'icon-maskable-512.png');
await browser.close();
console.log('icons written');
