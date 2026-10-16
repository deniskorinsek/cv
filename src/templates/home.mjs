import { html } from './html.mjs';
import { icon } from './icons.mjs';
import { dateRange } from './format.mjs';
import { sectionHead, portrait, highlights, chips, contactCard } from './partials.mjs';
import { journey } from './journey.mjs';

function hero(ctx, content) {
  const { site, home } = content;
  const h = home.hero;
  const linkedin = site.profiles.find((p) => p.id === 'linkedin');
  return html`<section class="hero" aria-labelledby="name" data-trail-start>
  <div class="hero-text">
    <h1 id="name" class="name">${site.name}</h1>
    <p class="title">${h.title}</p>
    <p class="lead">${h.lead}</p>
    <ul class="meta" role="list" aria-label="Contact details">
      <li>${site.location}</li>
      <li><a href="mailto:${site.email}">${site.email}</a></li>
      ${linkedin && html`<li><a href="${linkedin.url}" rel="me">${linkedin.display}</a></li>`}
    </ul>
    <p class="cta"><a class="btn p" href="${h.primaryAction.href}">${h.primaryAction.label} ${icon('arrowDown')}</a><a class="btn s" href="${h.secondaryAction.href}">${h.secondaryAction.label}</a></p>
    ${ctx.cvs.length ? html`<p class="cvs"><span class="cvs-l">Download</span>${ctx.cvs.map((cv) => html`<a href="${cv.href}" download>${icon('download')}<span>${cv.label}</span><span class="cvs-s">PDF, ${cv.size}</span></a>`)}</p>` : ''}
  </div>
  <div class="ph"><span class="ph-ring" aria-hidden="true"></span>${portrait(ctx, { sizes: '(min-width: 70rem) 240px, (min-width: 48rem) 190px, 136px', priority: true })}</div>
</section>
<ul class="figures rv" role="list" aria-label="At a glance">
${home.figures.map((f) => html`  <li><span class="fig-k">${f.label}</span><b>${f.value}</b><span class="fig-l">${f.text}</span></li>\n`)}</ul>`;
}

function career(ctx, content) {
  const c = content.home.career;
  return html`<section class="sec" id="career" aria-labelledby="career-t">
  ${sectionHead({ id: 'career', eyebrow: c.eyebrow, heading: c.heading, intro: c.intro })}
  ${journey(ctx, content)}
</section>`;
}

function stopCard(ctx, stop, lane, studies) {
  const study = stop.caseStudy && studies.get(stop.caseStudy);
  return html`<article class="stop rv${study ? ' linked' : ''}" data-spur data-lane="${lane}">
          <h4>${study ? html`<a class="stretch" href="${ctx.link(`work/${study.slug}/`)}">${stop.title}</a>` : stop.title}</h4>
          <p class="smeta"><span class="when ${lane}">${dateRange(stop.start, stop.end)}</span></p>
          ${stop.summary && html`<p class="summary">${stop.summary}</p>`}
          ${highlights(stop.points, lane)}
          ${study && html`<p class="more ${lane}">Engagement summary ${icon('arrowRight')}</p>`}
        </article>`;
}

function column(ctx, path, id, lane, marks, studies) {
  return html`<section class="col ${lane}" id="${id}" aria-labelledby="${id}-t">
      <p class="plabel ${lane}"><span class="sw" aria-hidden="true"></span>${path.label}</p>
      <div class="era head" data-era="head" data-spur data-lane="${lane}">
        <h3 class="prole" id="${id}-t">${path.role.replace(' | ', ' | ')}</h3>
        <p class="pprof">${path.profile}</p>
        ${chips(path.chips, lane, `${path.label} skills`)}
      </div>
${path.eras.map((era) => html`      <div class="era" data-era="${era.era}">
        <p class="era-mark"><span class="yr">${marks[era.era][0]}</span><span>${marks[era.era][1]}</span></p>
        ${era.stops.map((stop) => stopCard(ctx, stop, lane, studies))}
      </div>\n`)}      <p class="trailhead ${lane}">${path.end}</p>
    </section>`;
}

function twoPaths(ctx, content) {
  const { home, paths } = content;
  return html`<section class="sec" id="paths" aria-labelledby="paths-t">
  ${sectionHead({ id: 'paths', eyebrow: home.paths.eyebrow, heading: home.paths.heading, intro: home.paths.intro })}
  <div class="duo">
    ${column(ctx, paths.technical, 'technical', 't', paths.eraMarks, ctx.studiesBySlug)}
    ${column(ctx, paths.leadership, 'leadership', 'l', paths.eraMarks, ctx.studiesBySlug)}
  </div>
</section>`;
}

function earlier(ctx, content) {
  const e = content.home.earlier;
  return html`<section class="sec" id="earlier" aria-labelledby="earlier-t">
  ${sectionHead({ id: 'earlier', eyebrow: e.eyebrow, heading: e.heading })}
  <ol class="ees rv">
${content.career.earlier.map((r) => html`    <li class="ee" data-trail-stop><span class="when">${r.start} – ${r.end}</span><div><p class="co"><b>${r.company}</b> <span>${r.role}</span></p>${r.summary && html`<p class="ee-d">${r.summary}</p>`}</div></li>\n`)}  </ol>
</section>`;
}

function facts(content) {
  const { education, languages } = content.about;
  return html`<section class="sec facts" id="education" aria-labelledby="education-t">
  <div class="fact rv">
    <h2 class="mini-h" id="education-t">${education.heading}</h2>
    <p class="strong">${education.institution}</p>
    <p class="where">${education.faculty}</p>
    <ul class="deg">
${education.degrees.map((d) => html`      <li><span>${d.title}</span><span class="when">${d.start} – ${d.end}</span></li>\n`)}    </ul>
  </div>
  <div class="fact rv">
    <h2 class="mini-h">${languages.heading}</h2>
    <dl class="langs">
${languages.items.map((l) => html`      <div><dt>${l.name}</dt><dd>${l.level}</dd></div>\n`)}    </dl>
  </div>
</section>`;
}

export function homePage(ctx, content) {
  return html`${hero(ctx, content)}
${career(ctx, content)}
${twoPaths(ctx, content)}
${earlier(ctx, content)}
${facts(content)}
${contactCard(ctx, content.home.contact)}`;
}
