#!/usr/bin/env node
/**
 * Optional helper: turns a portrait photo into the responsive images the site uses.
 * It needs the "sharp" image library, which is deliberately not a project dependency:
 *
 *   npm install --no-save sharp
 *   node scripts/portrait.mjs path/to/photo.jpg [--cutout path/to/cutout.png]
 *
 * Writes src/assets/img/portrait/denis-korinsek-{320,480,720,960}.{avif,webp,jpg},
 * cropped to 4:5 (keeping the top of the photo) with all metadata (EXIF, GPS) removed.
 *
 * --cutout takes the same photo with its background removed (a transparent PNG of the same
 * size, made with any background-removal tool) and writes the hero's cut-out versions,
 * denis-korinsek-cutout-{320,480,720,960}.{avif,webp}, with the same crop. Browsers that
 * can't show AVIF or WebP get the JPEG photo instead. The names match "portrait" in
 * content/site.json.
 */
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const cutoutAt = args.indexOf('--cutout');
const cutoutInput = cutoutAt >= 0 ? args[cutoutAt + 1] : null;
const input = args.find((arg, i) => !arg.startsWith('--') && (cutoutAt < 0 || i !== cutoutAt + 1));
if (!input || (cutoutAt >= 0 && !cutoutInput)) {
  console.error('Usage: node scripts/portrait.mjs path/to/photo.jpg [--cutout path/to/cutout.png]');
  process.exit(1);
}

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('This helper needs sharp. Install it for this run with: npm install --no-save sharp');
  process.exit(1);
}

const outDir = path.join(ROOT, 'src/assets/img/portrait');
const base = 'denis-korinsek';
const WIDTHS = [320, 480, 720, 960];
await mkdir(outDir, { recursive: true });

/** Crops to 4:5, keeping the top of the image (where the face is). */
async function crop(file) {
  const { width, height } = await sharp(file).metadata();
  const cropHeight = Math.min(height, Math.round((width * 5) / 4));
  const cropWidth = Math.min(width, Math.round((cropHeight * 4) / 5));
  return sharp(file)
    .rotate()
    .extract({ left: Math.round((width - cropWidth) / 2), top: 0, width: cropWidth, height: cropHeight })
    .toBuffer();
}

const photo = await crop(input);
for (const w of WIDTHS) {
  const resized = () => sharp(photo).resize(w, Math.round((w * 5) / 4), { fit: 'cover' });
  await resized().avif({ quality: 52, effort: 6 }).toFile(path.join(outDir, `${base}-${w}.avif`));
  await resized().webp({ quality: 80, effort: 6 }).toFile(path.join(outDir, `${base}-${w}.webp`));
  await resized().jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile(path.join(outDir, `${base}-${w}.jpg`));
}
let written = WIDTHS.length * 3;

if (cutoutInput) {
  const cutout = await crop(cutoutInput);
  for (const w of WIDTHS) {
    const resized = () => sharp(cutout).ensureAlpha().resize(w, Math.round((w * 5) / 4), { fit: 'cover' });
    await resized().avif({ quality: 55, effort: 6 }).toFile(path.join(outDir, `${base}-cutout-${w}.avif`));
    await resized().webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(path.join(outDir, `${base}-cutout-${w}.webp`));
  }
  written += WIDTHS.length * 2;
}
console.log(`Wrote ${written} portrait files to ${path.relative(ROOT, outDir)}/`);
