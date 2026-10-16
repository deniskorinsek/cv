import { html } from './html.mjs';
import { icon } from './icons.mjs';
import { sectionHead } from './partials.mjs';

/**
 * GitHub Pages serves 404.html for any missing URL, at any depth, so every link
 * and asset on this page is absolute (built from the configured base path).
 */
export function notFoundPage(ctx, content) {
  const links = [
    { label: 'Career at a glance', href: ctx.section('career') },
    { label: 'Technical path', href: ctx.section('technical') },
    { label: 'Leadership path', href: ctx.section('leadership') },
    ...content.studies.map((s) => ({ label: s.title, href: ctx.link(`work/${s.slug}/`) })),
    { label: 'Contact', href: ctx.section('contact') },
  ];
  return html`<section class="lost" aria-labelledby="lost-t" data-trail-start>
  ${sectionHead({ id: 'lost', eyebrow: 'Error 404', heading: 'This path doesn’t lead anywhere', level: 1, intro: 'The link may be out of date, or the address may have a typo. These pages do exist:' })}
  <ul class="lost-links" data-trail-end>
${links.map((l) => html`    <li><a href="${l.href}"><span>${l.label}</span>${icon('arrowRight')}</a></li>\n`)}  </ul>
  <p class="cta"><a class="btn p" href="${ctx.link('')}">${icon('arrowLeft')} Back to the homepage</a><a class="btn s" href="mailto:${ctx.site.email}">Email me</a></p>
</section>`;
}
