/**
 * Light/dark switch support for the stylesheet.
 *
 * site.css keeps a single dark block: `@media (prefers-color-scheme: dark) { … }`. The build turns
 * it into two copies, so the source never has to repeat the dark values:
 *
 *   1. the system setting, unless the visitor chose light:
 *      @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) … }
 *   2. the visitor's choice of dark, whatever the system says:
 *      :root[data-theme="dark"] …
 *
 * `:root` selectors get the condition attached; any other selector is scoped below it.
 */
const MARKER = '@media (prefers-color-scheme: dark) {';

function closingBrace(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error('themes: unbalanced braces in the dark block of site.css');
}

function rules(block) {
  const text = block.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{', i);
    if (open < 0) break;
    const close = closingBrace(text, open);
    const selector = text.slice(i, open).trim();
    if (selector.startsWith('@')) throw new Error(`themes: nested at-rules are not supported (${selector})`);
    out.push({ selector, body: text.slice(open + 1, close) });
    i = close + 1;
  }
  return out;
}

function scope(selector, condition) {
  return selector
    .split(',')
    .map((s) => s.trim())
    .map((s) => (s === ':root' ? `:root${condition}` : s.startsWith(':root') ? s.replace(':root', `:root${condition}`) : `:root${condition} ${s}`))
    .join(', ');
}

export function themeable(css) {
  const start = css.indexOf(MARKER);
  if (start < 0) return css;
  const end = closingBrace(css, start + MARKER.length - 1);
  const list = rules(css.slice(start + MARKER.length, end));
  const bySystem = list.map((r) => `  ${scope(r.selector, ':not([data-theme="light"])')} {${r.body}}`).join('\n');
  const byChoice = list.map((r) => `${scope(r.selector, '[data-theme="dark"]')} {${r.body}}`).join('\n');
  return `${css.slice(0, start)}${MARKER}\n${bySystem}\n}\n${byChoice}${css.slice(end + 1)}`;
}
