// LectureLens accessibility audit. Zero dependencies.
// Run with:  npm run audit     (exit code 1 if anything fails)
//
// Three parts:
//   1. WCAG 2.1 contrast for every token pair in styles/tokens.css, in every theme.
//   2. Static structure checks on index.html (landmarks, tabs, live region, labels, skip link).
//   3. Source checks: no colour-only status, no removed focus outlines, reduced motion.
//
// What it CANNOT check: real keyboard behaviour, focus order, or what a screen reader
// actually says at runtime. Those need a human (see docs/devlog/phase-6.md).

import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

/* =========================================================================
   1. Colour maths (WCAG 2.1 relative luminance and contrast ratio)
   ========================================================================= */

export function relativeLuminance(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* =========================================================================
   2. Parse tokens.css into themes
   ========================================================================= */

function parseVars(block) {
  const vars = {};
  for (const m of block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

/** Return the body of the first `{ ... }` block after `index`, honouring nesting. */
function blockAfter(css, index) {
  const start = css.indexOf('{', index);
  let depth = 0;
  for (let i = start; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(start + 1, i);
  }
  return '';
}

export function parseThemes(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const light = parseVars(blockAfter(clean, clean.indexOf(':root')));
  const themes = { light };
  for (const [name, query] of [['dark', 'prefers-color-scheme: dark'], ['more-contrast', 'prefers-contrast: more']]) {
    const at = clean.indexOf(query);
    if (at >= 0) themes[name] = { ...light, ...parseVars(blockAfter(blockAfter(clean, at), 0)) };
  }
  // A theme that only overrides some tokens inherits the rest; 'more-contrast' also
  // applies on top of dark mode in a real browser, so audit that combination too.
  if (themes.dark && themes['more-contrast']) {
    const extra = parseVars(blockAfter(blockAfter(clean, clean.indexOf('prefers-contrast: more')), 0));
    themes['dark + more-contrast'] = { ...themes.dark, ...extra };
  }
  return themes;
}

function resolve(vars, name, seen = new Set()) {
  const v = vars[name];
  if (v == null) throw new Error(`token --${name} is not defined`);
  const ref = v.match(/^var\(--([\w-]+)\)$/);
  if (!ref) return v;
  if (seen.has(name)) throw new Error(`circular token --${name}`);
  seen.add(name);
  return resolve(vars, ref[1], seen);
}

/* =========================================================================
   3. The pairs the UI actually uses
   ========================================================================= */

const AAA = 7, AA = 4.5, NON_TEXT = 3;

/** [foreground token, background token, required ratio, where it is used] */
export const PAIRS = [
  ['color-text', 'color-bg', AAA, 'body text on page'],
  ['color-text', 'color-surface', AAA, 'body text on cards'],
  ['color-text', 'color-surface-alt', AAA, 'text on toolbars, selected radios'],
  ['color-text-muted', 'color-bg', AAA, 'hints, inactive tabs'],
  ['color-text-muted', 'color-surface', AAA, 'labels, notes'],
  ['color-text-muted', 'color-surface-alt', AAA, 'focus-mode hint'],
  ['color-accent-text', 'color-accent', AAA, 'skip link'],
  ['color-clarity', 'color-surface', AA, 'chart and labels'],
  ['color-clarity', 'color-clarity-tint', AA, 'Low friction badge, takeaway label'],
  ['color-text', 'color-clarity-tint', AAA, 'takeaway text'],
  ['color-friction', 'color-surface', AA, 'warnings'],
  ['color-friction', 'color-friction-tint', AA, 'High friction badge'],
  ['color-focus', 'color-bg', NON_TEXT, 'focus ring on page'],
  ['color-focus', 'color-surface', NON_TEXT, 'focus ring on cards'],
  ['color-border', 'color-bg', NON_TEXT, 'input and card borders'],
  ['color-border', 'color-surface', NON_TEXT, 'card borders'],
  ['color-border', 'color-surface-alt', NON_TEXT, 'toolbar borders'],
  ['color-accent', 'color-surface', NON_TEXT, 'button outlines, selected tab'],
];

export function auditContrast(css) {
  const rows = [];
  for (const [theme, vars] of Object.entries(parseThemes(css))) {
    for (const [fg, bg, need, use] of PAIRS) {
      const a = resolve(vars, fg);
      const b = resolve(vars, bg);
      const ratio = contrastRatio(a, b);
      rows.push({ theme, pair: `--${fg} on --${bg}`, ratio, need, pass: ratio >= need, use });
    }
  }
  return rows;
}

/* =========================================================================
   4. Structure checks on index.html
   ========================================================================= */

const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].slice(1).map((m) => [m[1], m[2] ?? '']));

export function auditHtml(html) {
  const checks = [];
  const check = (name, pass, detail = '') => checks.push({ name, pass: Boolean(pass), detail });

  check('<html lang> is set', /<html[^>]*\slang="[a-z-]+"/i.test(html));
  check('<title> is present', /<title>[^<]+<\/title>/.test(html));
  for (const landmark of ['header', 'main', 'footer']) check(`<${landmark}> landmark exists`, new RegExp(`<${landmark}[\\s>]`).test(html));

  const tablist = html.match(/<[^>]+role="tablist"[^>]*>/);
  check('role="tablist" exists with an aria-label', tablist && /aria-label="[^"]+"/.test(tablist[0]));

  const tabs = [...html.matchAll(/<button[^>]*role="tab"[^>]*>/g)].map((m) => attrs(m[0]));
  check('three module tabs exist', tabs.length === 3, `${tabs.length} found`);
  check('exactly one tab is aria-selected="true"', tabs.filter((t) => t['aria-selected'] === 'true').length === 1);
  check('roving tabindex: selected tab 0, others -1',
    tabs.every((t) => (t['aria-selected'] === 'true' ? t.tabindex === '0' : t.tabindex === '-1')));
  for (const t of tabs) {
    const panel = html.match(new RegExp(`<[^>]+id="${t['aria-controls']}"[^>]*>`));
    check(`tab #${t.id} controls a tabpanel labelled by it`,
      panel && /role="tabpanel"/.test(panel[0]) && panel[0].includes(`aria-labelledby="${t.id}"`));
  }

  const live = html.match(/<[^>]+aria-live="(polite|assertive)"[^>]*>/);
  check('an aria-live region exists in the initial HTML', live, live ? live[1] : 'none');
  check('the live region is polite (does not interrupt)', live && live[1] === 'polite');

  const skip = html.match(/<a[^>]*class="skip-link"[^>]*href="#([\w-]+)"/);
  const target = skip && html.match(new RegExp(`<[^>]+id="${skip[1]}"[^>]*>`));
  check('skip link points at an existing element', target, skip ? `#${skip[1]}` : 'no skip link');
  check('skip link target can receive focus (tabindex="-1")', target && /tabindex="-1"/.test(target[0]),
    'without it, focus stays on <body> after the skip link');

  for (const m of html.matchAll(/<(textarea|input|select)\b[^>]*>/g)) {
    const a = attrs(m[0]);
    const labelled = a['aria-label'] || a['aria-labelledby'] || (a.id && html.includes(`for="${a.id}"`));
    check(`<${m[1]}${a.id ? ' #' + a.id : ''}> has a label`, labelled);
  }
  for (const m of html.matchAll(/<button\b[^>]*>/g)) check(`button ${attrs(m[0]).id ?? ''} has type="button"`.replace('  ', ' '), /type="button"/.test(m[0]));
  const filters = html.match(/<svg[^>]*id="cvd-filters"[^>]*>/);
  check('decorative SVG filter defs are aria-hidden', filters && /aria-hidden="true"/.test(filters[0]));
  return checks;
}

/* =========================================================================
   5. Source checks (status meaning, focus, motion)
   ========================================================================= */

export function auditSource({ analyzer, css, js = '' }) {
  const checks = [];
  const check = (name, pass, detail = '') => checks.push({ name, pass: Boolean(pass), detail });
  // Phase 8 (XSS): user text must reach the page through textContent, never the HTML parser.
  // Static markup in innerHTML is fine; a template literal with ${...} inside is not.
  const unsafe = js.match(/(?:innerHTML\s*=|insertAdjacentHTML\([^,]+,)\s*`[^`]*\$\{/g) ?? [];
  check('no innerHTML / insertAdjacentHTML built from variables (XSS)', unsafe.length === 0, unsafe.join(' | '));
  check('no eval() or new Function()', !/\beval\(|new Function\(/.test(js));
  check('friction badges show icon + text, not colour alone', /\$\{LEVEL_ICON\[level\]\} \$\{LEVEL_TEXT\[level\]\}/.test(analyzer));
  check('chart bars carry a level word', /LEVEL_SHORT\[level\]/.test(analyzer));
  check('chart levels differ by pattern (hatch + dots)', analyzer.includes("'ll-hatch'") && analyzer.includes("'ll-dots'"));
  check('no CSS rule removes the focus outline', !/outline\s*:\s*(none|0)\b/.test(css));
  check(':focus-visible style is defined', /:focus-visible\s*\{[^}]*outline/.test(css));
  check('prefers-reduced-motion is respected', /prefers-reduced-motion:\s*reduce/.test(css));
  check('touch targets use a 44px minimum', /min-height:\s*var\(--tap-target\)/.test(css));
  return checks;
}

/* =========================================================================
   6. Report
   ========================================================================= */

const isMain = typeof process !== 'undefined' && process.argv?.[1] &&
  decodeURIComponent(new URL(import.meta.url).pathname) === process.argv[1];

if (isMain) {
  const tokens = read('styles/tokens.css');
  const contrast = auditContrast(tokens);
  const html = auditHtml(read('index.html'));
  const js = ['js/app.js', 'js/analyzer.js', 'js/simulator.js', 'js/restructurer.js', 'sw.js'].map(read).join('\n');
  const source = auditSource({ analyzer: read('js/analyzer.js'), css: read('styles/main.css') + tokens, js });

  const mark = (ok) => (ok ? 'PASS' : 'FAIL');
  console.log('\nLectureLens accessibility audit\n');
  console.log('1. Contrast (WCAG 2.1)');
  let theme = '';
  for (const r of contrast) {
    if (r.theme !== theme) { theme = r.theme; console.log(`\n   [${theme}]`); }
    const level = r.need === AAA ? 'AAA 7:1' : r.need === AA ? 'AA 4.5:1' : 'non-text 3:1';
    console.log(`   ${mark(r.pass)}  ${r.ratio.toFixed(2).padStart(5)}:1  ${r.pair.padEnd(42)} ${level.padEnd(12)} ${r.use}`);
  }
  for (const [title, list] of [['2. Structure (index.html)', html], ['3. Source (js, css)', source]]) {
    console.log(`\n${title}`);
    for (const c of list) console.log(`   ${mark(c.pass)}  ${c.name}${!c.pass && c.detail ? `  -> ${c.detail}` : ''}`);
  }
  const all = [...contrast, ...html, ...source];
  const failed = all.filter((x) => !x.pass).length;
  console.log(`\n${all.length - failed} passed, ${failed} failed.`);
  console.log('Not covered: real keyboard flow and screen-reader output. Test those by hand.\n');
  process.exitCode = failed ? 1 : 0;
}
