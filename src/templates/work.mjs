import { html } from './html.mjs';
import { icon } from './icons.mjs';
import { dateRange } from './format.mjs';
import { sectionHead, highlights, studyCard, contactCard } from './partials.mjs';

function breadcrumb(items) {
  return html`<nav class="crumbs" aria-label="Breadcrumb"><ol>
${items.map((item) => html`      <li>${item.href ? html`<a href="${item.href}">${item.label}</a>` : html`<span aria-current="page">${item.label}</span>`}</li>\n`)}    </ol></nav>`;
}

function metaList(study) {
  const m = study.meta;
  const rows = [
    ['Company', m.organization],
    ['Engagement', m.engagement],
    ['Role', m.role],
    ['Period', dateRange(m.start, m.end)],
    ['Domains', m.domains?.length ? m.domains.join(', ') : null],
  ].filter(([, value]) => value);
  return html`<dl class="case-meta rv">
${rows.map(([label, value]) => html`      <div><dt>${label}</dt><dd>${value}</dd></div>\n`)}    </dl>`;
}

export function caseStudyPage(ctx, study, content) {
  const others = content.studies.filter((s) => s.slug !== study.slug);
  return html`<section class="case-hero" aria-labelledby="case-t" data-trail-start>
  ${breadcrumb([{ label: 'Home', href: ctx.link('') }, { label: 'Engagements', href: ctx.link('work/') }, { label: study.shortTitle }])}
  ${sectionHead({ id: 'case', eyebrow: `${study.kind} · ${study.meta.organization}`, heading: study.title, level: 1 })}
  <p class="case-lede">${study.lede}</p>
  ${metaList(study)}
</section>
<section class="sec" id="work-done" aria-labelledby="work-done-t">
  ${sectionHead({ id: 'work-done', eyebrow: 'Technical and leadership', heading: 'What I did' })}
  <div class="case-cols">
    <article class="stop rv" data-spur data-lane="t" aria-labelledby="case-tech-t">
      <p class="plabel t still"><span class="sw" aria-hidden="true"></span>Technical path</p>
      <h3 id="case-tech-t">Engineering</h3>
      ${highlights(study.technical, 't')}
    </article>
    <article class="stop rv" data-spur data-lane="l" aria-labelledby="case-lead-t">
      <p class="plabel l still"><span class="sw" aria-hidden="true"></span>Leadership path</p>
      <h3 id="case-lead-t">Leadership</h3>
      ${highlights(study.leadership, 'l')}
    </article>
  </div>
  ${study.note && html`<p class="case-note">${study.note}</p>`}
</section>
${others.length ? html`<section class="sec" id="more" aria-labelledby="more-t">
  ${sectionHead({ id: 'more', eyebrow: 'Engagements', heading: 'More of my work' })}
  <div class="studies">
    ${others.map((s) => studyCard(ctx, s, 3))}
  </div>
  <p class="back"><a href="${ctx.section('paths')}">${icon('arrowLeft')} Back to the two paths</a></p>
</section>` : ''}
${contactCard(ctx, content.home.contact, { roles: false })}`;
}

export function workIndexPage(ctx, content) {
  return html`<section class="case-hero" aria-labelledby="work-t" data-trail-start>
  ${breadcrumb([{ label: 'Home', href: ctx.link('') }, { label: 'Engagements' }])}
  ${sectionHead({ id: 'work', eyebrow: 'Engagements', heading: 'Platforms I have built for', level: 1 })}
  <p class="case-lede">Short summaries of the engagements behind both paths. Each one covers my own role and responsibilities, not the product as a whole.</p>
  <div class="studies">
    ${content.studies.map((s) => studyCard(ctx, s, 2))}
  </div>
</section>
${contactCard(ctx, content.home.contact, { roles: false })}`;
}
