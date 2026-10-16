/**
 * Tiny HTML templating helpers (no dependencies).
 *
 * Every value interpolated into html`` is HTML-escaped, unless it is itself
 * the result of html`` or raw(). Arrays are rendered item by item, and
 * null / undefined / booleans render as nothing, so `${condition && html`…`}`
 * works as a conditional.
 */
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export class SafeHtml {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

export const raw = (value) => new SafeHtml(String(value));

function render(value) {
  if (value === null || value === undefined || typeof value === 'boolean') return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  return escapeHtml(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) out += render(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}

/** Serialises data for a <script type="application/ld+json"> block. */
export function jsonLd(data) {
  const json = JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
  return raw(`<script type="application/ld+json">\n${json}\n</script>`);
}
