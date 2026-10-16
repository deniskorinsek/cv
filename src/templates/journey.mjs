import { html } from './html.mjs';
import { formatDate } from './format.mjs';

/**
 * "Career at a glance": one vertical line for the company since 2017, newest first, on
 * every screen size. The line changes colour where Kamino became part of Netcetera.
 * Every role title is split into its technical and leadership parts: on wide cards the
 * parts sit in two columns under "Technical" and "Leadership", on narrow cards they
 * stack. With JavaScript the two column labels become buttons that highlight one path.
 * The earlier employers have their own section further down the page.
 */

const LANE_NAME = { t: 'Technical', l: 'Leadership', tl: 'Technical and leadership' };

const ym = (value) => {
  const [y, m] = String(value).split('-').map(Number);
  return y * 12 + (m ? m - 1 : 0);
};

function roleRow(role) {
  const parts = { tl: [], t: [], l: [] };
  for (const [title, lane] of role.parts) parts[lane].push(title);
  const lanes = new Set(role.parts.flatMap(([, lane]) => (lane === 'tl' ? ['t', 'l'] : [lane])));
  return html`<li class="role${lanes.has('t') ? ' has-t' : ''}${lanes.has('l') ? ' has-l' : ''}${role.end ? '' : ' now'}">
          <span class="when"><time datetime="${role.start}">${formatDate(role.start)}</time></span>
          <span class="node" aria-hidden="true"></span>
${['tl', 't', 'l'].map((lane) => (parts[lane].length ? html`          <span class="part ${lane}"><span class="vh">${LANE_NAME[lane]}: </span>${parts[lane].join(' · ')}</span>\n` : ''))}        </li>`;
}

function lane(id, label) {
  return html`<span class="lane ${id}" data-lane="${id}"><span class="sw" aria-hidden="true"></span><span class="vh">Highlight the </span>${label}<span class="vh"> path</span></span>`;
}

export function journey(ctx, content) {
  const { career, home } = content;
  const copy = home.career;
  const cur = career.current;
  const roles = [...career.roles].sort((a, b) => ym(b.start) - ym(a.start));
  const segment = (part, cls) => {
    const range = part.end ? `${formatDate(part.start)} – ${formatDate(part.end)}` : `${formatDate(part.start)} – today`;
    return html`<li class="seg ${cls}">
        <p class="seg-h"><span class="when">${range}</span><b>${part.name}</b></p>
        <ol class="roles" role="list" aria-label="Roles at ${part.name}, newest first">
        ${roles.filter((r) => r.company === part.name).map(roleRow)}
        </ol>
      </li>`;
  };

  return html`<figure class="journey rv" aria-labelledby="journey-cap">
    <div class="jx-head"><div class="jx-lanes">${lane('t', 'Technical')}${lane('l', 'Leadership')}</div></div>
    <ol class="jx" role="list" aria-label="${copy.rolesLabel}, newest first">
      ${segment(cur.after, 'g')}
      <li class="acq"><span class="when">${cur.acquisition.year}</span><span class="node" aria-hidden="true"><span class="jdot"></span></span><span class="acq-t"><span class="acq-y">${cur.acquisition.year} · </span>${cur.acquisition.text}</span></li>
      ${segment(cur.before, 'k')}
    </ol>
    <figcaption id="journey-cap">${copy.note}</figcaption>
  </figure>`;
}
