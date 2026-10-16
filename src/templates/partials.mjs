import { html } from './html.mjs';
import { icon } from './icons.mjs';
import { dateRange } from './format.mjs';

/**
 * Section heading: a mono eyebrow above the title. `pin` puts a map pin on the trail
 * beside the heading.
 */
export function sectionHead({ id, eyebrow, heading, intro, pin = true, level = 2, inverse = false }) {
  const tag = `h${level}`;
  return html`<div class="sec-head"${pin ? html` data-pin` : ''}>
    <p class="kicker${inverse ? ' inv' : ''}">${eyebrow}</p>
    ${level === 1 ? html`<h1 id="${id}-t">${heading}</h1>` : tag === 'h2' ? html`<h2 id="${id}-t">${heading}</h2>` : html`<h3 id="${id}-t">${heading}</h3>`}
  </div>${intro ? html`
  <p class="intro">${intro}</p>` : ''}`;
}

/** Responsive portrait: AVIF and WebP sources with a JPEG fallback. */
export function portrait(ctx, { sizes, priority = false } = {}) {
  const p = ctx.portrait;
  if (!p) return '';
  const srcset = (format) => p.widths.map((w) => `${ctx.asset(`${p.basename}-${w}.${format}`)} ${w}w`).join(', ');
  const fallbackWidth = p.widths.find((w) => w >= 480) ?? p.widths[p.widths.length - 1];
  const modern = p.formats.filter((f) => f !== 'jpg');
  return html`<picture>
${modern.map((format) => html`        <source type="image/${format}" srcset="${srcset(format)}" sizes="${sizes}">\n`)}        <img src="${ctx.asset(`${p.basename}-${fallbackWidth}.jpg`)}" srcset="${srcset('jpg')}" sizes="${sizes}" width="${p.width}" height="${p.height}" alt="${p.alt}"${priority ? html` fetchpriority="high"` : html` loading="lazy"`} decoding="async">
      </picture>`;
}

/** Labelled highlights: [label, text] pairs, coloured for the technical (t) or leadership (l) lane. */
export function highlights(points, lane) {
  if (!points?.length) return '';
  return html`<dl class="hl ${lane}">
${points.map(([label, text]) => html`        <div><dt>${label}</dt><dd>${text}</dd></div>\n`)}      </dl>`;
}

export function chips(items, lane, label) {
  if (!items?.length) return '';
  return html`<ul class="chips ${lane}" role="list" aria-label="${label}">${items.map((item) => html`<li>${item}</li>`)}</ul>`;
}

/** A card linking to an engagement summary. */
export function studyCard(ctx, study, level = 2) {
  const m = study.meta;
  const link = html`<a class="stretch" href="${ctx.link(`work/${study.slug}/`)}">${study.title}</a>`;
  return html`<article class="stop study linked rv" data-spur data-lane="t">
      <p class="smeta"><span class="org">${m.organization}</span><span class="when">${dateRange(m.start, m.end)}</span></p>
      ${level === 2 ? html`<h2 class="study-t">${link}</h2>` : html`<h3 class="study-t">${link}</h3>`}
      <p class="summary">${study.lede}</p>
      <p class="more">Read the engagement summary ${icon('arrowRight')}</p>
    </article>`;
}

/** The dark contact card that ends every page. */
export function contactCard(ctx, contact, { headingLevel = 2, roles = true } = {}) {
  const { site } = ctx;
  const linkedin = site.profiles.find((p) => p.id === 'linkedin');
  const github = site.profiles.find((p) => p.id === 'github');
  const [user, domain] = site.email.split('@');
  return html`<section class="sec" id="contact" aria-labelledby="contact-t" data-trail-end>
  <div class="endsign rv">
    ${sectionHead({ id: 'contact', eyebrow: contact.eyebrow, heading: contact.heading, pin: false, level: headingLevel, inverse: true })}
    <p class="end-intro">${contact.text}</p>
    <p class="mail"><a href="mailto:${site.email}" id="email-link">${user}@<wbr>${domain}</a> <button type="button" class="copy" data-copy="${site.email}">Copy address</button></p>
    <p class="links">${linkedin && html`<a href="${linkedin.url}" rel="me">LinkedIn</a><span class="dot" aria-hidden="true"></span>`}${github && html`<a href="${github.url}" rel="me">GitHub</a><span class="dot" aria-hidden="true"></span>`}<span>${site.location} · ${site.timezone}</span></p>
${roles && contact.roles?.length ? html`    <div class="endgrid"><p class="kicker inv">${contact.rolesLabel}</p><ul class="badges">${contact.roles.map((r) => html`<li class="badge">${r}</li>`)}</ul></div>\n` : ''}  </div>
</section>`;
}
