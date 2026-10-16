import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { imageSize } from './image-size.mjs';

export class ContentError extends Error {}

const DATE = /^\d{4}(-(0[1-9]|1[0-2]))?$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LANES = new Set(['t', 'l', 'tl']);

async function readJson(root, relPath) {
  const text = await readFile(path.join(root, relPath), 'utf8');
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new ContentError(`${relPath}: invalid JSON (${err.message})`);
  }
}

/** Highlights are written as [label, text] pairs. */
function checkPairs(file, list, where, fail, { required = false } = {}) {
  if (!Array.isArray(list)) {
    if (required) fail(file, `${where} must be a list of [label, text] pairs`);
    return;
  }
  if (required && !list.length) fail(file, `${where} needs at least one item`);
  list.forEach((pair, i) => {
    if (!Array.isArray(pair) || pair.length !== 2 || !pair[0] || !pair[1]) fail(file, `${where}[${i}] must be ["Label", "Text"]`);
  });
}

/**
 * Loads every content file, validates it and resolves derived data
 * (image dimensions). Throws ContentError listing every problem.
 */
export async function loadContent(root) {
  const errors = [];
  const notices = [];
  const fail = (file, message) => errors.push(`${file}: ${message}`);
  const srcPath = (assetPath) => path.join(root, 'src', assetPath);

  const site = await readJson(root, 'content/site.json');
  const home = await readJson(root, 'content/home.json');
  const career = await readJson(root, 'content/career.json');
  const paths = await readJson(root, 'content/paths.json');
  const about = await readJson(root, 'content/about.json');

  // Engagement summaries: every content/work/*.json that isn't a template or unpublished.
  const allStudySlugs = new Set();
  const studies = [];
  const workDir = path.join(root, 'content/work');
  for (const name of (await readdir(workDir)).sort()) {
    if (!name.endsWith('.json') || name.startsWith('_')) continue;
    const file = `content/work/${name}`;
    const study = await readJson(root, file);
    const stem = name.replace(/\.json$/, '');
    allStudySlugs.add(stem);
    if (study.published === false) {
      notices.push(`${file}: not published, skipped`);
      continue;
    }
    if (study.slug !== stem) fail(file, `"slug" must match the file name ("${stem}")`);
    if (!SLUG.test(study.slug ?? '')) fail(file, '"slug" may only contain lowercase letters, digits and hyphens');
    for (const key of ['kind', 'title', 'shortTitle', 'description', 'lede']) {
      if (!study[key]) fail(file, `"${key}" is required`);
    }
    for (const key of ['organization', 'role', 'start']) {
      if (!study.meta?.[key]) fail(file, `"meta.${key}" is required`);
    }
    checkDates(file, study.meta ?? {}, fail);
    checkPairs(file, study.technical, '"technical"', fail, { required: true });
    checkPairs(file, study.leadership, '"leadership"', fail, { required: true });
    studies.push(study);
  }
  studies.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  // Site identity and contact details.
  if (!site.name) fail('content/site.json', '"name" is required');
  if (!EMAIL.test(site.email ?? '')) fail('content/site.json', '"email" is not a valid address');
  for (const profile of site.profiles ?? []) {
    if (!/^https:\/\//.test(profile.url ?? '')) fail('content/site.json', `profile "${profile.label}" must use an https:// URL`);
  }

  // Homepage copy.
  for (const key of ['hero', 'figures', 'career', 'paths', 'earlier', 'contact']) {
    if (!home[key]) fail('content/home.json', `"${key}" is required`);
  }

  // Career: the company line and the role titles (each role belongs to Kamino or G+D Netcetera).
  const cf = 'content/career.json';
  for (const item of career.earlier ?? []) {
    checkDates(cf, item, fail, item.company);
    if (!item.company || !item.role) fail(cf, 'every earlier role needs "company" and "role"');
  }
  const cur = career.current ?? {};
  for (const part of [cur, cur.before ?? {}, cur.after ?? {}]) checkDates(cf, part, fail, part.name ?? cur.label);
  if (!cur.before?.name || !cur.after?.name) fail(cf, '"current.before" and "current.after" need a "name"');
  if (!/^\d{4}$/.test(String(cur.acquisition?.year ?? ''))) fail(cf, '"current.acquisition.year" must be a year such as 2023');
  if (!career.roles?.length) fail(cf, '"roles" needs at least one role');
  if ((career.roles ?? []).filter((r) => !r.end).length > 1) fail(cf, 'only one role can be ongoing ("end": null)');
  for (const role of career.roles ?? []) {
    const name = role.parts?.map((p) => p[0]).join(' | ');
    checkDates(cf, role, fail, name);
    if (!role.start) fail(cf, `role "${name}" needs a "start" date`);
    if (![cur.before?.name, cur.after?.name].includes(role.company)) fail(cf, `role "${name}": "company" must be "${cur.before?.name}" or "${cur.after?.name}"`);
    if (!role.parts?.length) fail(cf, 'every role needs "parts", for example [["Team Lead", "l"]]');
    for (const part of role.parts ?? []) if (!LANES.has(part[1])) fail(cf, `title part "${part[0]}" must be marked "t", "l" or "tl"`);
  }

  // The two paths, and their links to engagement summaries.
  const pf = 'content/paths.json';
  for (const key of ['technical', 'leadership']) {
    const p = paths[key];
    if (!p) {
      fail(pf, `"${key}" is required`);
      continue;
    }
    for (const field of ['label', 'role', 'profile', 'end']) if (!p[field]) fail(pf, `"${key}.${field}" is required`);
    for (const era of p.eras ?? []) {
      if (!paths.eraMarks?.[era.era]) fail(pf, `"${key}" uses era "${era.era}" without an entry in "eraMarks"`);
      for (const stop of era.stops ?? []) {
        checkDates(pf, stop, fail, stop.title);
        if (!stop.start) fail(pf, `"${stop.title}" needs a "start" date`);
        checkPairs(pf, stop.points, `"${stop.title}" points`, fail);
        if (stop.caseStudy && !allStudySlugs.has(stop.caseStudy)) fail(pf, `"caseStudy": "${stop.caseStudy}" has no matching content/work/${stop.caseStudy}.json`);
      }
    }
  }
  for (const degree of about.education?.degrees ?? []) checkDates('content/about.json', degree, fail, degree.title);

  // Portrait: every size and format must exist; dimensions come from the largest JPEG.
  let portrait = null;
  if (site.portrait) {
    const p = site.portrait;
    const missing = [];
    for (const w of p.widths) for (const f of p.formats) if (!existsSync(srcPath(`${p.basename}-${w}.${f}`))) missing.push(`src/${p.basename}-${w}.${f}`);
    if (!p.alt) fail('content/site.json', '"portrait.alt" is required');
    if (!p.formats.includes('jpg')) fail('content/site.json', '"portrait.formats" must include "jpg" as the fallback');
    if (missing.length) fail('content/site.json', `portrait files missing: ${missing.join(', ')}`);
    else {
      const largest = Math.max(...p.widths);
      const size = await imageSize(srcPath(`${p.basename}-${largest}.jpg`));
      portrait = { ...p, widths: [...p.widths].sort((a, b) => a - b), ...size };
    }
  }

  // CVs: offered for download only when the PDF really exists.
  const cvs = [];
  for (const cv of site.cvs ?? []) {
    if (!cv.label || !cv.path) {
      fail('content/site.json', 'every CV needs a "label" and a "path"');
      continue;
    }
    if (!/\.pdf$/i.test(cv.path)) fail('content/site.json', `CV "${cv.label}" must be a PDF`);
    const file = srcPath(cv.path);
    if (existsSync(file)) cvs.push({ ...cv, bytes: (await stat(file)).size });
    else notices.push(`CV link left out: no file at src/${cv.path}`);
  }

  if (errors.length) throw new ContentError(`Content problems:\n  - ${errors.join('\n  - ')}`);
  return { site, home, career, paths, about, studies, portrait, cvs, notices };
}

function checkDates(file, item, fail, label = '') {
  const name = label ? ` (${label})` : '';
  if (item.start !== undefined && !DATE.test(String(item.start))) fail(file, `start date "${item.start}"${name} must look like 2023 or 2023-05`);
  if (item.end !== undefined && item.end !== null && !DATE.test(String(item.end))) fail(file, `end date "${item.end}"${name} must look like 2023, 2023-05 or null`);
  if (item.start && item.end && String(item.end) < String(item.start)) fail(file, `end date is before start date${name}`);
}
