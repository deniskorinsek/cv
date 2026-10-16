import { html } from './html.mjs';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "2023-05" → "May 2023", "2015" → "2015", null → "Present". */
export function formatDate(value, { long = false } = {}) {
  if (!value) return 'Present';
  const [year, month] = String(value).split('-');
  if (!month) return year;
  const names = long ? MONTHS_LONG : MONTHS;
  return `${names[Number(month) - 1]} ${year}`;
}

/** Plain-text range, for meta descriptions and other attributes. */
export function dateRangeText(start, end, options) {
  return `${formatDate(start, options)} – ${formatDate(end, options)}`;
}

/**
 * Range as HTML with machine-readable <time> elements. The dash is hidden
 * from assistive technology and replaced by the word "to".
 */
export function dateRange(start, end, options = {}) {
  const startHtml = html`<time datetime="${start}">${formatDate(start, options)}</time>`;
  const endHtml = end ? html`<time datetime="${end}">${formatDate(end, options)}</time>` : 'Present';
  return html`${startHtml}<span aria-hidden="true"> – </span><span class="visually-hidden"> to </span>${endHtml}`;
}

/** First year and last year (or "Present") across a list of dated items. */
export function careerSpan(items) {
  const starts = items.map((item) => String(item.start).slice(0, 4)).sort();
  const ongoing = items.some((item) => !item.end);
  const ends = items.filter((item) => item.end).map((item) => String(item.end).slice(0, 4)).sort();
  return `${starts[0]} – ${ongoing ? 'Present' : ends[ends.length - 1]}`;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
