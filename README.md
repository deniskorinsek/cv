# Denis Korinšek — portfolio website

Personal portfolio for Denis Korinšek, *Senior Android Engineer & Engineering Leader*.

The design follows his CVs: a winding trail in the left margin with two lanes, technical
(terracotta) and leadership (green). After a short career overview the trail splits into two
paths that run side by side, one for each CV role in the same company, and joins again before
the earlier years. White cards sit on warm paper; dates and labels are set in a mono face.

A static site with no runtime dependencies. Content lives in JSON files, page layout lives in small
JavaScript templates, and a zero-dependency Node script builds plain HTML, CSS and JavaScript into
`dist/`, ready for GitHub Pages.

- [Quick start](#quick-start)
- [Project structure](#project-structure)
- [Editing content](#editing-content)
- [Review build and publish build](#review-build-and-publish-build)
- [Deploying to GitHub Pages](#deploying-to-github-pages)
- [Checks](#checks)
- [Design, accessibility and performance notes](#design-accessibility-and-performance-notes)

## Quick start

You need [Node.js](https://nodejs.org/) 20 or newer. There is nothing to install: the project has
no npm dependencies.

```sh
npm run dev       # build, serve at http://localhost:4173/ and rebuild when you save a file
npm run build     # review build into dist/
npm run preview   # serve the existing dist/ at http://localhost:4173/
npm run check     # build, then check links, images, headings and metadata
```

`npm run dev` doesn't reload the browser for you; refresh the page after saving.

Without Node, you can still look at a build that already exists in `dist/` with any static server,
for example `python3 -m http.server 4173 --directory dist`. Opening `dist/index.html` straight
from the file system isn't supported, because pages use folder-style addresses like `work/globalid/`.

## Project structure

```text
content/                  All text on the site (edit these)
  site.json               Name, contact links, portrait, CV downloads, SEO text, launch settings
  home.json               Hero, figures, section headings and intros, contact
  career.json             Earlier employers, Kamino → G+D Netcetera, role titles and dates
  paths.json              The technical and the leadership path: roles, skills, cards by period
  about.json              Education and languages
  work/*.json             One file per engagement summary (pages at /work/<slug>/)
  work/_template.json     Starting point for a new engagement summary (never built)
src/
  templates/*.mjs         Page layout (HTML templates)
  assets/css/site.css     All styles; design tokens at the top
  assets/js/site.js       The trail, parallax contour lines and small extras;
                          the site works fully without it
  assets/cv/              The two CV PDFs offered for download
  assets/fonts/           Self-hosted fonts and their licences
  assets/img/             Portrait and the social preview image
  assets/icons/           Favicon set (the two-path mark)
scripts/
  build.mjs               Builds dist/
  serve.mjs               Local server that behaves like GitHub Pages
  check.mjs               Automated checks on the build
  portrait.mjs            Optional: regenerate the portrait images from a new photo
.github/workflows/
  deploy-pages.yml        Manual "Deploy to GitHub Pages" workflow
CONTENT-CHECKLIST.md      Where each statement comes from and what to confirm before launch
```

## Editing content

All visible text comes from `content/`. Edit a file, save, and `npm run dev` rebuilds the site.

| Section on the site | File |
| --- | --- |
| Hero, the four figures | `content/home.json` → `hero`, `figures` |
| Career at a glance | `content/career.json` (companies, roles) and `home.json` → `career` (headings, caption) |
| Two paths | `content/paths.json` |
| Earlier experience | `content/career.json` → `earlier` |
| Education, languages | `content/about.json` |
| Contact text and roles of interest | `content/home.json` → `contact` |
| Engagement pages | `content/work/<slug>.json` |
| Email, LinkedIn, GitHub, location, CVs, page titles and descriptions | `content/site.json` |

A few rules the build checks for you:

- **JSON syntax.** Text goes in double quotes and items are separated by commas, with no comma after
  the last item. Curly apostrophes (’) and dashes (–, —) are fine.
- **Dates** are `"2023-05"` (month) or `"2015"` (year only). An `end` of `null` shows as "Present".
- **Highlights** are written as pairs: `["Label", "Text"]`.
- **Title parts** in `career.json` → `roles` are marked `"t"` (technical), `"l"` (leadership) or
  `"tl"` (both).
- **Links to engagement pages** (`"caseStudy"` in `paths.json`) must match a file in `content/work/`.

### Career at a glance

`career.json` → `current` describes the company since 2017 as one vertical line, newest first:
`after` (G+D Netcetera) on top, the `acquisition` marker, then `before` (Kamino). Each entry in
`roles` sits on the line of its `company` (which must be one of those two names), with its start
date. Its title `parts` are shown in two columns, *Technical* and *Leadership*, on wide cards and
stacked on narrow ones. With JavaScript the two column labels become buttons that highlight one
path. Earlier employers are not repeated here; they have their own section (`career.json` →
`earlier`).

### Engagement pages

Each file in `content/work/` becomes a page at `/work/<slug>/`, listed under *More of my work* on the other engagement pages.

1. Copy `content/work/_template.json` to `content/work/<slug>.json` (lowercase letters, digits and
   hyphens; the file name must match `"slug"`).
2. Fill in `meta`, a short `lede`, and at least one `technical` and one `leadership` highlight.
3. `"order"` sets the position of the card. `"published": false` hides the page and its card.
4. Link a path card to it by adding `"caseStudy": "<slug>"` to the card in `paths.json`.

### Portrait

The hero shows `src/assets/img/portrait/denis-korinsek-{320,480,720,960}.{avif,webp,jpg}` in a
round frame. All are 4:5 crops with metadata removed. To replace the photo:

```sh
npm install --no-save sharp
node scripts/portrait.mjs path/to/new-photo.jpg
```

Update `portrait.alt` in `content/site.json` if the new photo looks different. To remove the
portrait entirely, delete the `"portrait"` block.

### CV downloads

`content/site.json` → `cvs` lists the PDFs offered under the hero buttons and in the footer:
`src/assets/cv/Denis-Korinsek-CV-Technical.pdf` and `Denis-Korinsek-CV-Leadership.pdf`. Replace a
file to update it; the file size is shown automatically. A CV whose file is missing is left out.

### Colours, fonts and spacing

Design tokens (colours, spacing, the trail width) are CSS custom properties at the top of
`src/assets/css/site.css`. There is one light colour scheme for everyone, with every text colour
chosen to meet WCAG AA on the background it sits on. Terracotta (`--tech*`) marks the technical
path and green (`--lead*`) the leadership path; the pair was checked to stay distinguishable for
colour-blind readers.

The fonts are Karla and JetBrains Mono, served from the site itself (SIL Open Font License; licences
are in `src/assets/fonts/`).

The social preview image (`src/assets/img/social-card.jpg`, 1200 × 630) and the favicon set in
`src/assets/icons/` are static images in the same style.

## Review build and publish build

| | Review build (`npm run build`) | Publish build (`npm run build:publish`) |
| --- | --- | --- |
| Search engines | `noindex` on every page | Indexable (the 404 page stays `noindex`) |
| Canonical URLs, `sitemap.xml`, `robots.txt` | Not added | Added |
| Requirements | None | A public URL and both launch confirmations |

The publish build stops with a clear message until `content/site.json` has:

```json
"launch": {
  "siteUrl": "https://deniskorinsek.github.io/",
  "confirmations": {
    "currentEmployment": true,
    "contentReviewed": true
  }
}
```

Set the two confirmations only after going through [CONTENT-CHECKLIST.md](CONTENT-CHECKLIST.md).
When the site is deployed by the GitHub workflow, the public URL comes from GitHub automatically, so
`siteUrl` can stay empty; set it only for local publish builds.

`robots.txt` is written only when the site sits at the root of its domain (a user site or a custom
domain), because crawlers ignore a `robots.txt` inside a sub-folder. For a project site, submit
`sitemap.xml` in Google Search Console instead if you want to.

## Deploying to GitHub Pages

### Simplest: upload the ready-made site in `docs/` (no Node needed)

`docs/` holds the finished site as plain HTML, CSS, JavaScript, fonts, images and PDFs, which is
exactly what GitHub Pages serves. Nothing has to be built.

1. Create a public repository on GitHub with any name, e.g. `portfolio`.
2. Upload this folder: push it with git, or use **Add file → Upload files** on github.com and drag
   in the project (at least the `docs/` folder).
3. **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` → `/docs`**.
4. After a minute the site is at `https://deniskorinsek.github.io/<repository>/`.

`docs/` is set up for a project site like this. All pages use relative links, and `docs/404.html`
detects the `/<repository>/` part of the address itself, so missing pages at any depth stay
styled. For a user site (`deniskorinsek.github.io`) or a custom domain, delete the `<script>` line
right after `<base href="/">` in `docs/404.html`.

`docs/` is a review build (`noindex`, hidden from search engines). To change content later, edit
`content/*.json` and rebuild with Node (`node scripts/build.mjs --out docs`), or use the
GitHub Actions workflow below, which runs Node on GitHub's servers.

### Alternative: build on GitHub with Actions

Nothing is published automatically: the workflow only runs when you start it.

### 1. Choose the address

| Option | Repository name | Address |
| --- | --- | --- |
| User site (recommended for a personal portfolio) | `deniskorinsek.github.io` | `https://deniskorinsek.github.io/` |
| Project site | any name, e.g. `portfolio` | `https://deniskorinsek.github.io/portfolio/` |
| Custom domain | either of the above | e.g. `https://www.example.com/` |

Pages link to each other with relative paths, so the same build works at the root or in a
sub-folder. Only the 404 page needs absolute paths; the workflow sets the right base path for it.

### 2. Push the code

```sh
git init
git add .
git commit -m "Portfolio website"
git branch -M main
git remote add origin https://github.com/deniskorinsek/<repository>.git
git push -u origin main
```

`dist/` is in `.gitignore`; GitHub builds the site from the sources.

On a free GitHub plan, a repository that publishes to GitHub Pages must be public, so everything in
it, including `CONTENT-CHECKLIST.md` and any unpublished engagement summaries in `content/work/`, can be
read by anyone. Remove anything you don't want public before pushing.

### 3. Turn on Pages

In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

### 4. Run the workflow

**Actions → Deploy to GitHub Pages → Run workflow**, then pick a mode:

- **review** deploys the site with `noindex`, which is useful for sharing a preview link.
- **publish** deploys the public version. It fails, without deploying, until the launch
  confirmations are set.

The workflow reads the address and base path from GitHub, builds, runs `scripts/check.mjs` and
deploys. If you later want every push to `main` to deploy, add `push: branches: [main]` under `on:`
in `.github/workflows/deploy-pages.yml`.

### Custom domain (optional)

Add the domain under **Settings → Pages → Custom domain**, create the DNS records GitHub shows you,
and tick **Enforce HTTPS**. Run the workflow again so canonical URLs use the new domain. No `CNAME`
file is needed when deploying with GitHub Actions.

### Alternative: publish from a branch

If you'd rather not use Actions, build into `docs/` and let GitHub serve that folder:

```sh
node scripts/build.mjs --publish --site-url https://deniskorinsek.github.io/ --out docs
```

Commit `docs/`, then choose **Settings → Pages → Deploy from a branch → main → /docs**. The build
adds a `.nojekyll` file so GitHub serves the files as they are.

### After the first deployment

- Open the site at desktop and phone sizes and try every contact link.
- Open a missing address such as `/work/nothing/` and check that the 404 page is styled.
- Check the link preview with [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/).

## Checks

`npm run check` builds the site and runs `scripts/check.mjs`, which fails if:

- a page lacks a language, title, description or viewport tag, has more or fewer than one `<h1>`,
  skips a heading level or repeats an id;
- an internal link, `#fragment`, image, font, stylesheet, script or CV doesn't resolve, including
  from the 404 page at a nested address;
- an image has no `alt`, `width` or `height`;
- an email link doesn't use the address in `content/site.json`, or an external link uses `http://`;
- placeholder text such as "TODO", "TBD" or "lorem ipsum" appears;
- a review build lacks `noindex`, or a publish build lacks canonical URLs or a complete sitemap.

It also lists the external links so you can open them by hand.

For HTML validation, `.htmlvalidate.json` holds the settings the site was checked with
(`html-validate:recommended` without purely stylistic rules; `role="list"` is kept on purpose so
Safari's VoiceOver still announces lists styled without bullets):

```sh
npx html-validate "dist/**/*.html"
```

## Design, accessibility and performance notes

- **The trail:** with JavaScript, an SVG trail with two lanes is drawn beside the content and fills
  in as you scroll, with a small marker on each lane. On the homepage the lanes split into two
  trails for *Two paths* (side by side from about 900 px, stacked lanes on phones) and join again
  before the earlier years; map pins mark the sections and short side paths lead to the cards.
  The trail is decorative and hidden from screen readers. Without JavaScript a dashed line stands
  in for it and every word of content is still there.
- **Career at a glance** is plain HTML and CSS: one vertical line for the company, with the title
  parts in two columns when the card is wide enough and stacked otherwise (a CSS container query).
  JavaScript only turns the two column labels into "highlight a path" buttons.
- **Motion:** contour lines drift slowly at different depths, the portrait ring moves slightly, and
  cards settle a few pixels into place as they arrive. Content is visible the whole time. With
  *reduce motion* turned on, the full trail is shown at once and nothing moves.
- **Layout:** responsive from 320 px upwards, without horizontal scrolling. The header stays at the
  top and keeps only the Contact button on phones.
- **Accessibility:** semantic landmarks, a skip link, one `<h1>` per page, visible focus outlines,
  WCAG AA colour contrast, descriptive alt text, and decorative graphics hidden from screen readers.
  Checked with axe-core at phone and desktop widths.
- **Performance:** no frameworks and no third-party requests. One preloaded font file, one
  stylesheet, one small deferred script, and AVIF/WebP portraits with declared dimensions.
- **Privacy:** no analytics, cookies, local storage or embeds. The portrait was re-encoded without
  metadata.
