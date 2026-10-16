#!/usr/bin/env node
/**
 * Checks the built site (no dependencies). Run after a build:
 *
 *   node scripts/check.mjs            checks dist/
 *   node scripts/check.mjs --dir out  checks another output folder
 *
 * It verifies that every page has a language, title, description, viewport and
 * exactly one <h1>; heading levels don't skip; ids are unique; every internal link,
 * #fragment, image and asset resolves; images declare alt text and dimensions;
 * email links use the configured address; external links use https; no placeholder
 * text slipped in; and, for publish builds, canonical URLs and the sitemap agree.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argIndex = process.argv.indexOf('--dir');
const distDir = path.resolve(ROOT, argIndex > -1 ? process.argv[argIndex + 1] : 'dist');

const errors = [];
const warnings = [];
const error = (file, message) => errors.push(`${file}: ${message}`);
const warn = (file, message) => warnings.push(`${file}: ${message}`);

const PLACEHOLDER = /\b(TODO|TBD|FIXME|XXX+|lorem ipsum|placeholder)\b|\[(YOUR|ADD|INSERT)[^\]]*\]/i;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const attr = (tag, name) => {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'));
  return match ? match[1].replace(/&amp;/g, '&') : null;
};
const hasAttr = (tag, name) => new RegExp(`\\s${name}(=|\\s|>|$)`, 'i').test(tag);
const textContent = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ');

/** Maps a URL pathname (already stripped of the base path) to a file in dist. */
function fileFor(pathname) {
  const decoded = decodeURIComponent(pathname);
  let file = path.join(distDir, decoded);
  if (decoded.endsWith('/')) file = path.join(file, 'index.html');
  else if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
  return file;
}

async function main() {
  if (!existsSync(path.join(distDir, 'index.html'))) {
    console.error(`No build found in ${path.relative(ROOT, distDir)}/. Run "npm run build" first.`);
    process.exit(1);
  }
  const site = JSON.parse(await readFile(path.join(ROOT, 'content/site.json'), 'utf8'));
  const files = await walk(distDir);
  const htmlFiles = files.filter((f) => f.endsWith('.html'));
  const pages = new Map();
  for (const file of htmlFiles) pages.set(file, await readFile(file, 'utf8'));

  // The 404 page uses absolute paths; read the base path from its stylesheet link.
  const notFound = pages.get(path.join(distDir, '404.html')) ?? '';
  const cssHref = notFound.match(/<link rel="stylesheet" href="([^"?]*)assets\/css\/site\.css/);
  const basePath = cssHref ? cssHref[1] : '/';
  if (!basePath.startsWith('/')) error('404.html', 'links must be absolute because the page is served at any URL');

  const idsByFile = new Map();
  for (const [file, html] of pages) {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    idsByFile.set(file, new Set(ids));
    const seen = new Set();
    for (const id of ids) {
      if (seen.has(id)) error(rel(file), `duplicate id "${id}"`);
      seen.add(id);
    }
  }

  const isPublish = /<link rel="canonical"/.test(pages.get(path.join(distDir, 'index.html')));
  const canonicals = [];
  const externalLinks = new Set();

  for (const [file, html] of pages) {
    const name = rel(file);
    const is404 = file === path.join(distDir, '404.html');

    // Document basics
    if (!/<html lang="[a-z-]+"/i.test(html)) error(name, 'missing <html lang>');
    if (!/<title>[^<]{5,}<\/title>/.test(html)) error(name, 'missing or empty <title>');
    if (!/<meta name="description" content="[^"]{20,}"/.test(html)) error(name, 'missing meta description');
    if (!/<meta name="viewport"/.test(html)) error(name, 'missing viewport meta tag');
    const h1s = html.match(/<h1[\s>]/g) ?? [];
    if (h1s.length !== 1) error(name, `expected exactly one <h1>, found ${h1s.length}`);

    // Heading levels must not skip (h2 → h4)
    let previous = 0;
    for (const match of html.matchAll(/<h([1-6])[\s>]/g)) {
      const level = Number(match[1]);
      if (previous && level > previous + 1) error(name, `heading jumps from h${previous} to h${level}`);
      previous = level;
    }

    // Robots / canonical
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
    if (isPublish && !is404) {
      if (!canonical) error(name, 'publish build page without a canonical URL');
      else canonicals.push(canonical[1]);
    }
    if (!isPublish && !/<meta name="robots" content="noindex/.test(html)) error(name, 'review build page should carry noindex');
    if (is404 && !/<meta name="robots" content="noindex/.test(html)) error(name, '404 page should carry noindex');

    // Structured data must be valid JSON
    for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try {
        JSON.parse(match[1]);
      } catch {
        error(name, 'invalid JSON-LD');
      }
    }

    // Images
    for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
      if (!hasAttr(tag, 'alt')) error(name, `image without alt: ${tag.slice(0, 80)}`);
      if (!attr(tag, 'width') || !attr(tag, 'height')) error(name, `image without width/height: ${tag.slice(0, 80)}`);
    }

    // Links and assets
    const pageUrl = is404
      ? new URL(`${basePath}some/missing/page/`, 'http://site.test')
      : new URL(`${basePath}${path.relative(distDir, file).replace(/index\.html$/, '')}`, 'http://site.test');
    const refs = [];
    for (const [tag] of html.matchAll(/<(a|link|script|img|source)\b[^>]*>/g)) {
      for (const name of ['href', 'src']) {
        const value = attr(tag, name);
        if (value) refs.push({ value, tag });
      }
      const srcset = attr(tag, 'srcset');
      if (srcset) for (const candidate of srcset.split(',')) refs.push({ value: candidate.trim().split(/\s+/)[0], tag });
      if (/^<a\b/.test(tag) && /target="_blank"/.test(tag) && !/rel="[^"]*noopener/.test(tag)) error(name, 'target="_blank" link without rel="noopener"');
    }

    for (const { value, tag } of refs) {
      if (value.startsWith('#')) {
        const id = decodeURIComponent(value.slice(1));
        if (id && !idsByFile.get(file).has(id)) error(name, `in-page link ${value} has no matching id`);
        continue;
      }
      if (value.startsWith('mailto:')) {
        const address = value.slice(7).split('?')[0];
        if (address !== site.email) error(name, `mailto address "${address}" doesn't match content/site.json`);
        continue;
      }
      if (/^(tel|data):/.test(value)) continue;
      if (/^https?:\/\//.test(value)) {
        if (/^<link rel="canonical"|og:/.test(tag)) continue;
        if (value.startsWith('http://')) error(name, `insecure link ${value}`);
        externalLinks.add(value);
        continue;
      }
      if (value.startsWith('//')) {
        error(name, `protocol-relative URL ${value}`);
        continue;
      }
      if (value.startsWith('/') && !is404) warn(name, `root-relative link ${value} breaks on project sites; prefer relative links`);

      const target = new URL(value, pageUrl);
      if (target.origin !== 'http://site.test') continue;
      if (!target.pathname.startsWith(basePath)) {
        error(name, `link ${value} points outside the site base path ${basePath}`);
        continue;
      }
      const targetFile = fileFor(target.pathname.slice(basePath.length - 1));
      if (!existsSync(targetFile)) {
        error(name, `broken link or asset: ${value}`);
        continue;
      }
      if (target.hash && target.hash.length > 1) {
        const id = decodeURIComponent(target.hash.slice(1));
        const ids = idsByFile.get(targetFile);
        if (id !== 'top' && ids && !ids.has(id)) error(name, `link ${value} points to a missing #${id}`);
        if (id === 'top' && ids && !ids.has('top')) error(name, `link ${value} needs an element with id="top"`);
      }
    }

    // Placeholder text
    const text = textContent(html);
    const placeholder = text.match(PLACEHOLDER);
    if (placeholder) error(name, `placeholder text found: "${placeholder[0]}"`);
  }

  // Sitemap and robots for publish builds
  if (isPublish) {
    const sitemapFile = path.join(distDir, 'sitemap.xml');
    if (!existsSync(sitemapFile)) error('sitemap.xml', 'missing in a publish build');
    else {
      const sitemap = await readFile(sitemapFile, 'utf8');
      for (const url of canonicals) if (!sitemap.includes(`<loc>${url}</loc>`)) error('sitemap.xml', `missing ${url}`);
    }
  } else if (existsSync(path.join(distDir, 'sitemap.xml'))) {
    error('sitemap.xml', 'present in a review build');
  }

  // Large files
  for (const file of files) {
    const { size } = await stat(file);
    if (/\.(png|jpe?g|webp|avif|gif)$/i.test(file) && size > 300 * 1024) warn(rel(file), `large image (${Math.round(size / 1024)} KB)`);
  }

  console.log(`Checked ${pages.size} pages in ${path.relative(ROOT, distDir)}/ (${isPublish ? 'publish' : 'review'} build, base path ${basePath}).`);
  if (externalLinks.size) {
    console.log('External links (check these by hand):');
    for (const link of [...externalLinks].sort()) console.log(`  ${link}`);
  }
  for (const w of warnings) console.log(`Warning: ${w}`);
  if (errors.length) {
    console.error(`\n${errors.length} problem(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log('No problems found.');
}

const rel = (file) => path.relative(distDir, file);

main();
