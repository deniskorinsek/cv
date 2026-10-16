import { html, raw } from './html.mjs';
import { icon } from './icons.mjs';

/**
 * Header navigation. Homepage sections are linked with #fragments; on other pages
 * the same links lead back to the homepage section.
 */
export const NAV = [
  { id: 'career', label: 'Career' },
  { id: 'technical', label: 'Technical', tone: 't' },
  { id: 'leadership', label: 'Leadership', tone: 'l' },
];

/* Runs before first paint: marks JavaScript support. The page is complete without it. */
const BOOT_SCRIPT = "document.documentElement.classList.add('js');";

function head(ctx, page) {
  const { site } = ctx;
  const pageUrl = ctx.is404 ? null : ctx.absolute(ctx.pageUrl);
  const canonical = ctx.mode === 'publish' ? pageUrl : null;
  const socialImage = ctx.absolute(site.seo.socialImage);
  const robots = ctx.mode === 'review' ? 'noindex, nofollow' : ctx.is404 ? 'noindex' : null;

  return html`<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${page.title}</title>
<meta name="description" content="${page.description}">
${robots && html`<meta name="robots" content="${robots}">\n`}${canonical && html`<link rel="canonical" href="${canonical}">\n`}<meta name="author" content="${site.name}">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="${site.seo.themeColor}">
<meta property="og:type" content="${page.ogType ?? 'website'}">
<meta property="og:site_name" content="${site.name}">
<meta property="og:title" content="${page.socialTitle ?? page.title}">
<meta property="og:description" content="${page.description}">
${pageUrl && html`<meta property="og:url" content="${pageUrl}">\n`}${socialImage && html`<meta property="og:image" content="${socialImage}">
<meta property="og:image:width" content="${site.seo.socialImageWidth}">
<meta property="og:image:height" content="${site.seo.socialImageHeight}">
<meta property="og:image:alt" content="${site.seo.socialImageAlt}">
`}<meta name="twitter:card" content="${socialImage ? 'summary_large_image' : 'summary'}">
<link rel="icon" href="${ctx.asset('assets/icons/favicon.ico')}" sizes="32x32">
<link rel="icon" href="${ctx.asset('assets/icons/favicon.svg')}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${ctx.asset('assets/icons/apple-touch-icon.png')}">
<link rel="preload" href="${ctx.asset('assets/fonts/karla-latin-wght.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${ctx.asset('assets/css/site.css', true)}">
<script>${raw(BOOT_SCRIPT)}</script>
<script src="${ctx.asset('assets/js/site.js', true)}" defer></script>
${page.head ?? ''}</head>`;
}

function navLink(ctx, item) {
  const href = item.page ? ctx.link(item.page) : ctx.section(item.id);
  const current = ctx.currentNav === item.id;
  return html`<li><a href="${href}"${item.tone ? html` class="${item.tone}"` : ''}${current ? raw(' aria-current="page"') : ''} data-nav="${item.id}">${item.label}</a></li>`;
}

function header(ctx) {
  const homeHref = ctx.isHome ? '#top' : ctx.link('');
  return html`<header class="top" data-topbar>
  <div class="top-in">
    <a class="brand" href="${homeHref}">${ctx.brandMark}<span>${ctx.site.name.toUpperCase()}</span></a>
    <nav aria-label="Primary"><ul>
      ${NAV.map((item) => navLink(ctx, item))}
      <li><a class="pill" href="${ctx.section('contact')}" data-nav="contact">Contact</a></li>
    </ul></nav>
  </div>
</header>`;
}

function footer(ctx) {
  const { site } = ctx;
  const homeHref = ctx.isHome ? '#top' : ctx.link('');
  return html`<footer class="foot">
  <div class="foot-in">
    <div class="foot-brand">
      <a class="brand" href="${homeHref}">${ctx.brandMark}<span>${site.name.toUpperCase()}</span></a>
      <p>${site.roleLine}</p>
    </div>
    <ul class="foot-links">
      <li><a href="mailto:${site.email}">Email</a></li>
${site.profiles.map((profile) => html`      <li><a href="${profile.url}" rel="me">${profile.label}</a></li>\n`)}${ctx.cvs.map((cv) => html`      <li><a href="${cv.href}" download>${cv.label} (PDF)</a></li>\n`)}
    </ul>
  </div>
  <div class="foot-bottom">
    <p>© ${ctx.year} ${site.name} · ${site.location}</p>
    <a href="#top">Back to the top ${icon('arrowUp')}</a>
  </div>
</footer>`;
}

/**
 * Wraps page content in the full document.
 * page: { title, description, content, ogType?, socialTitle?, head? }
 */
export function layout(ctx, page) {
  return html`<!doctype html>
<html lang="en">
${head(ctx, page)}
<body id="top">
<div class="page" id="page">
<span class="no-js-trail" aria-hidden="true"></span>
<a class="skip" href="#main">Skip to content</a>
${header(ctx)}
<main id="main" class="wrap" tabindex="-1">
${page.content}
</main>
${footer(ctx)}
</div>
</body>
</html>
`;
}
