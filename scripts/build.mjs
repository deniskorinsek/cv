#!/usr/bin/env node
/**
 * Builds the static site into dist/ (no dependencies, Node 20+).
 *
 *   node scripts/build.mjs              review build: noindex, no canonical URLs or sitemap
 *   node scripts/build.mjs --publish    publish build: needs the public URL and the launch
 *                                       confirmations in content/site.json
 *
 * Options (each can also come from an environment variable):
 *   --site-url <url>    SITE_URL   public address, e.g. https://deniskorinsek.github.io/
 *   --base-path <path>  BASE_PATH  path the site is served from, e.g. / or /portfolio/
 *                                  (derived from --site-url when that is set)
 *   --out <dir>         OUT_DIR    output folder (default: dist)
 */
import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadContent, ContentError } from './lib/content.mjs';
import { raw, jsonLd } from '../src/templates/html.mjs';
import { formatBytes } from '../src/templates/format.mjs';
import { layout } from '../src/templates/layout.mjs';
import { homePage } from '../src/templates/home.mjs';
import { caseStudyPage } from '../src/templates/work.mjs';
import { notFoundPage } from '../src/templates/not-found.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export class BuildError extends Error {}

function parseArgs(argv) {
  const args = { publish: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => {
      if (arg.includes('=')) return arg.slice(arg.indexOf('=') + 1);
      i += 1;
      return argv[i];
    };
    if (arg === '--publish') args.publish = true;
    else if (arg.startsWith('--site-url')) args.siteUrl = value();
    else if (arg.startsWith('--base-path')) args.basePath = value();
    else if (arg.startsWith('--out')) args.out = value();
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new BuildError(`Unknown option: ${arg}`);
  }
  return args;
}

function normaliseSiteUrl(value) {
  if (!value) return '';
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new BuildError(`Site URL "${value}" is not a valid absolute URL`);
  }
  if (!['https:', 'http:'].includes(url.protocol)) throw new BuildError(`Site URL "${value}" must use https://`);
  url.search = '';
  url.hash = '';
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.href;
}

function normaliseBasePath(value) {
  const trimmed = String(value ?? '').trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}

function resolveOptions(cli, site) {
  const mode = cli.publish ? 'publish' : 'review';
  const notices = [];
  let siteUrl = normaliseSiteUrl(cli.siteUrl ?? (process.env.SITE_URL || site.launch?.siteUrl || ''));
  const explicitBase = cli.basePath ?? (process.env.BASE_PATH || undefined);
  const basePath = explicitBase !== undefined
    ? normaliseBasePath(explicitBase)
    : siteUrl ? new URL(siteUrl).pathname : '/';
  if (siteUrl && new URL(siteUrl).pathname !== basePath) {
    if (mode === 'publish') throw new BuildError(`Base path "${basePath}" doesn't match the site URL "${siteUrl}"`);
    notices.push(`Base path ${basePath} differs from the site URL ${siteUrl}, so absolute social-preview URLs are left out of this review build`);
    siteUrl = '';
  }
  const outDir = path.resolve(ROOT, cli.out ?? process.env.OUT_DIR ?? 'dist');
  return { mode, siteUrl, basePath, outDir, notices };
}

/** The publish build refuses to run until the launch inputs are in place. */
function assertLaunchReady(options, site) {
  const problems = [];
  if (!options.siteUrl) problems.push('No public URL. Set "launch.siteUrl" in content/site.json, or pass --site-url / SITE_URL.');
  else if (!options.siteUrl.startsWith('https://')) problems.push(`The public URL should use https:// (got ${options.siteUrl}).`);
  const confirmations = site.launch?.confirmations ?? {};
  for (const [key, value] of Object.entries(confirmations)) {
    if (value !== true) problems.push(`"launch.confirmations.${key}" in content/site.json is not confirmed yet.`);
  }
  if (problems.length) {
    throw new BuildError(
      `Not ready to publish:\n  - ${problems.join('\n  - ')}\n` +
        'Review the content, then update content/site.json. Use the review build (without --publish) meanwhile.',
    );
  }
}

const hash = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 10);

/** Builds the site. Returns { outDir, pages, notices }. */
export async function build(cliOptions = {}) {
  const content = await loadContent(ROOT);
  const options = resolveOptions(cliOptions, content.site);
  if (options.mode === 'publish') assertLaunchReady(options, content.site);

  const { outDir } = options;
  if (outDir === ROOT || !outDir.startsWith(ROOT)) throw new BuildError(`Refusing to write to ${outDir}`);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await cp(path.join(ROOT, 'src/assets'), path.join(outDir, 'assets'), {
    recursive: true,
    filter: (src) => !path.basename(src).startsWith('.'),
  });

  const versions = {
    'assets/css/site.css': hash(await readFile(path.join(ROOT, 'src/assets/css/site.css'))),
    'assets/js/site.js': hash(await readFile(path.join(ROOT, 'src/assets/js/site.js'))),
  };
  const markSvg = await readFile(path.join(ROOT, 'src/assets/icons/favicon.svg'), 'utf8');
  const brandMark = raw(
    markSvg.trim().replace('<svg ', '<svg class="mark" width="28" height="28" aria-hidden="true" focusable="false" '),
  );
  const studiesBySlug = new Map(content.studies.map((s) => [s.slug, s]));
  const now = new Date();
  const year = now.getFullYear();

  const pages = [
    { url: '', file: 'index.html', render: (ctx) => ({
      title: content.site.seo.homeTitle,
      description: content.site.seo.homeDescription,
      content: homePage(ctx, content),
      head: jsonLd(personSchema(ctx, content)),
    }) },
    ...content.studies.map((study) => ({
      url: `work/${study.slug}/`,
      file: `work/${study.slug}/index.html`,
      currentNav: 'work',
      render: (ctx) => ({
        title: `${study.title} — ${content.site.name}`,
        socialTitle: study.title,
        description: study.description,
        ogType: 'article',
        content: caseStudyPage(ctx, study, content),
      }),
    })),
    { url: '404.html', file: '404.html', is404: true, render: (ctx) => ({
      title: `Page not found — ${content.site.name}`,
      description: 'The page you were looking for could not be found.',
      content: notFoundPage(ctx, content),
    }) },
  ];

  for (const page of pages) {
    const depth = page.is404 ? 0 : page.url.split('/').filter(Boolean).length;
    // Normal pages use relative links, so they work under any base path and from a
    // local server. The 404 page is served at arbitrary URLs, so it uses absolute ones.
    const root = page.is404 ? options.basePath : '../'.repeat(depth);
    const ctx = {
      ...options,
      site: content.site,
      portrait: content.portrait,
      cvs: content.cvs.map((cv) => ({ ...cv, href: `${root}${cv.path}`, size: formatBytes(cv.bytes) })),
      studiesBySlug,
      brandMark,
      now,
      year,
      pageUrl: page.url,
      isHome: page.url === '',
      is404: Boolean(page.is404),
      currentNav: page.currentNav,
      link: (target) => (target === '' ? root || './' : `${root}${target}`),
      section: (id) => (page.url === '' ? `#${id}` : `${root || './'}#${id}`),
      asset: (assetPath, versioned = false) => `${root}${assetPath}${versioned && versions[assetPath] ? `?v=${versions[assetPath]}` : ''}`,
      absolute: (target) => (options.siteUrl ? new URL(target, options.siteUrl).href : null),
    };
    const output = layout(ctx, page.render(ctx)).toString();
    const file = path.join(outDir, page.file);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, output);
  }

  // Tell GitHub Pages not to run Jekyll when the folder is published from a branch.
  await writeFile(path.join(outDir, '.nojekyll'), '');

  if (options.mode === 'publish') {
    const urls = pages.filter((p) => !p.is404).map((p) => new URL(p.url, options.siteUrl).href);
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${u}</loc></url>`)
      .join('\n')}\n</urlset>\n`;
    await writeFile(path.join(outDir, 'sitemap.xml'), sitemap);
    // Crawlers only read robots.txt at the root of a host, so it is only useful for a
    // user site (username.github.io) or a custom domain.
    if (options.basePath === '/') {
      await writeFile(path.join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${options.siteUrl}sitemap.xml\n`);
    }
  }

  return { ...options, pages: pages.map((p) => p.file), notices: [...options.notices, ...content.notices] };
}

function personSchema(ctx, content) {
  const { site, about } = content;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.name,
    // the current title exactly as on the CV, e.g. "Senior Android Developer | Team Lead | Line Manager"
    jobTitle: (content.career.roles.find((r) => !r.end) ?? content.career.roles[0]).parts.map((p) => p[0]).join(' | '),
    worksFor: { '@type': 'Organization', name: content.career.current.after.name },
    description: site.seo.homeDescription,
    address: { '@type': 'PostalAddress', addressLocality: site.location.split(',')[0].trim(), addressCountry: 'SI' },
    alumniOf: { '@type': 'CollegeOrUniversity', name: about.education.institution },
    knowsLanguage: ['sl', 'en', 'hr', 'sr'],
    sameAs: site.profiles.map((p) => p.url),
  };
  if (ctx.siteUrl) data.url = ctx.siteUrl;
  if (ctx.siteUrl && content.portrait) data.image = ctx.absolute(`${content.portrait.basename}-720.jpg`);
  return data;
}

async function main() {
  const cli = parseArgs(process.argv.slice(2));
  if (cli.help) {
    const source = await readFile(fileURLToPath(import.meta.url), 'utf8');
    console.log(source.split('*/')[0].replace(/^#!.*\n\/\*\*\n/, '').replace(/^ \* ?/gm, ''));
    return;
  }
  const started = Date.now();
  const result = await build(cli);
  const where = path.relative(process.cwd(), result.outDir) || '.';
  console.log(`Built ${result.pages.length} pages into ${where}/ (${result.mode} mode, base path ${result.basePath}) in ${Date.now() - started} ms`);
  if (result.siteUrl) console.log(`Public URL: ${result.siteUrl}`);
  if (result.mode === 'review') console.log('Review build: pages carry "noindex"; canonical URLs and the sitemap are added by --publish.');
  for (const notice of result.notices) console.log(`Note: ${notice}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    if (err instanceof BuildError || err instanceof ContentError) {
      console.error(`\n${err.message}\n`);
      process.exit(1);
    }
    throw err;
  });
}
