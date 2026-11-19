// Quantitative Readability & Cognitive Load Analyzer.
//
// Two layers in one module:
//   1. A pure metric engine (no DOM access). Node imports it for scripts/benchmark.js and
//      scripts/test-analyzer.js, so the browser and the benchmark always agree.
//   2. mountAnalyzer(): the live browser UI. It only touches the DOM when called.

/* =========================================================================
   1. Lexicons
   ========================================================================= */

/** Domain jargon lexicon (OS concurrency + general CS). Matched case-insensitively. */
export const DEFAULT_JARGON = new Set([
  'multiprogrammed', 'concurrent', 'concurrency', 'synchronization', 'primitive',
  'non-deterministic', 'interleaving', 'preemptive', 'scheduler', 'critical',
  'mutex', 'mutexes', 'semaphore', 'monitor', 'atomicity', 'atomic', 'deadlock',
  'race', 'thread', 'process', 'mutable', 'context', 'semantics', 'acquisition',
  'circular', 'invariant', 'livelock', 'starvation', 'spinlock', 'mutual', 'exclusion',
  // Phase 3: broader CS lecture vocabulary
  'algorithm', 'heuristic', 'asymptotic', 'polymorphism', 'recursion', 'recursive',
  'latency', 'throughput', 'quantum', 'round-robin', 'kernel', 'syscall', 'cache',
  'pipeline', 'serialization', 'idempotent', 'abstraction', 'instantiation', 'traversal',
  'cpu', 'sjf', 'api', 'ram',
]);

/**
 * Abbreviations whose trailing period must NOT end a sentence.
 * Stored lowercase, including their dots.
 */
const ABBREVIATIONS = new Set([
  // Titles
  'dr.', 'mr.', 'mrs.', 'ms.', 'prof.', 'jr.', 'sr.', 'st.',
  // Academic references
  'fig.', 'figs.', 'eq.', 'eqs.', 'sec.', 'ch.', 'p.', 'pp.', 'no.', 'vol.', 'ref.', 'refs.',
  'ed.', 'eds.', 'dept.', 'univ.', 'approx.', 'est.', 'avg.', 'min.', 'max.', 'cf.', 'vs.',
  // Latin
  'e.g.', 'i.e.', 'etc.', 'al.', 'viz.',
  // Organisations and time
  'inc.', 'ltd.', 'co.', 'corp.', 'a.m.', 'p.m.', 'u.s.', 'u.k.', 'ph.d.',
]);

/** Abbreviations that often DO end a sentence. They end one only when a capital letter follows. */
const SENTENCE_FINAL_ABBREVIATIONS = new Set(['etc.', 'al.']);

/**
 * Ambiguous tokens that are units after a number ("2.5 ms.", "5 p.m.") but abbreviations
 * elsewhere ("Ms. Rao"). After a number they can end a sentence.
 */
const UNITS_AFTER_NUMBER = new Set(['ms.', 'min.', 'sec.', 'a.m.', 'p.m.']);

/* =========================================================================
   2. Text cleaning
   ========================================================================= */

/** Remove light markdown (bold, bullets, headings) so formatting is not counted as words. */
export function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/^#+\s*/gm, '');
}

/** Remove code (fenced blocks and inline), and collapse URLs and emails into one word each. */
export function stripNoise(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' code ')
    .replace(/\b(?:https?:\/\/|www\.)[^\s<>"')]+[^\s<>"').,;:!?]/gi, 'link')
    .replace(/\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g, 'email');
}

const clean = (text) => stripMarkdown(stripNoise(text));

/* =========================================================================
   3. Sentence splitting with an abbreviation guard
   ========================================================================= */

/**
 * Decide whether the punctuation at `index` really ends a sentence.
 * Only called for terminators followed by whitespace, so decimals (2.5), versions (v1.2)
 * and dotted names (notes.html) are never candidates in the first place.
 */
const isSpace = (ch) => ch === ' ' || ch === '\t' || ch === '\r' || ch === ' ';

/** Start index of the whitespace-delimited token ending at `end` (exclusive). Scans backwards. */
function tokenStart(block, end) {
  let i = end;
  while (i > 0 && !isSpace(block[i - 1])) i--;
  return i;
}

// Linear time: every helper scans locally around the candidate instead of slicing the
// whole prefix or suffix, which made 10,000-word input quadratic (207 ms -> see tests).
function isSentenceEnd(block, start, end, punct) {
  if (/[!?]/.test(punct)) return true;

  let j = end;
  while (j < block.length && isSpace(block[j])) j++;
  const next = block.charAt(j);
  // A sentence never starts with a lowercase letter or digit: "approx. every", "Fig. 2".
  if (/[a-z0-9]/.test(next)) return false;

  const wordStart = tokenStart(block, end);
  const word = block.slice(wordStart, end).replace(/^[("'[]+/, '').replace(/['")\]]+$/, '').toLowerCase();

  if (UNITS_AFTER_NUMBER.has(word)) {
    const prevEnd = wordStart - 1;
    const prev = block.slice(tokenStart(block, prevEnd), prevEnd);
    if (/^\d+(?:\.\d+)?$/.test(prev)) return /[A-Z]/.test(next);
  }
  if (SENTENCE_FINAL_ABBREVIATIONS.has(word)) return /[A-Z]/.test(next);
  if (ABBREVIATIONS.has(word)) return false;
  // Dotted initialisms not in the list: "U.N.", "B.Sc."
  if (/^(?:[a-z]{1,3}\.){2,}$/.test(word)) return false;
  // Single initials: "J. Smith". (Trade-off: "Plan B. Next..." is missed.)
  if (/^[a-z]\.$/.test(word) && /[A-Z]/.test(next)) return false;
  return true;
}

/**
 * @param {string} text
 * @param {{ keepNoise?: boolean }} [opts] keepNoise: leave URLs, emails and code untouched
 *   (the restructurer needs the reader's exact words; scoring does not).
 */
export function splitSentences(text, { keepNoise = false } = {}) {
  const sentences = [];
  const prepared = keepNoise ? stripMarkdown(text) : clean(text);
  // Line breaks always end a sentence, so headings and bullet points stay separate.
  for (const block of prepared.split(/\n+/)) {
    let start = 0;
    const blockEnd = block.trimEnd().length;
    const terminator = /[.!?]+['")\]]*(?=\s|$)/g;
    let m;
    while ((m = terminator.exec(block))) {
      const end = m.index + m[0].length;
      const atEnd = end >= blockEnd;
      if (atEnd || isSentenceEnd(block, start, end, m[0])) {
        sentences.push(block.slice(start, end));
        start = end;
      }
    }
    sentences.push(block.slice(start));
  }
  return sentences.map((s) => s.trim()).filter((s) => /[a-z]/i.test(s));
}

/* =========================================================================
   4. Words and syllables
   ========================================================================= */

/** Words keep their original case, so acronyms (CPU) can be detected. */
export function tokenizeWords(text) {
  return clean(text)
    .replace(/\b(?:[A-Za-z]{1,3}\.){2,}/g, (abbr) => abbr.replace(/\./g, '')) // e.g. -> eg
    .match(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g) ?? [];
}

const LETTER_SYLLABLES = { w: 3 };

/**
 * Heuristic English syllable counter. Accurate to roughly +/-1 grade level when used in
 * Flesch-Kincaid. Known misses are listed in scripts/test-analyzer.js as KNOWN_LIMITS.
 */
export function countSyllables(word) {
  // Acronyms are spelled out letter by letter: CPU = see-pee-you = 3.
  if (/^[A-Z]{2,5}s?$/.test(word)) {
    return [...word.replace(/s$/, '').toLowerCase()].reduce((n, ch) => n + (LETTER_SYLLABLES[ch] ?? 1), 0);
  }
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w
    .replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '') // silent trailing e / es / ed
    .replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

/* =========================================================================
   5. Passive voice and jargon
   ========================================================================= */

const PASSIVE_RE =
  /\b(?:am|is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?(?:\w+ed|\w+en|built|done|held|kept|made|run|seen|shown|taken|given|known|written|chosen)\b/i;

export function isPassive(sentence) {
  return PASSIVE_RE.test(sentence);
}

function isJargon(word, lexicon) {
  const w = word.toLowerCase();
  if (lexicon.has(w)) return true;
  return lexicon.has(w.replace(/(?:es|s)$/, ''));
}

/* =========================================================================
   6. Scores
   ========================================================================= */

const clamp01 = (x) => Math.min(1, Math.max(0, x));

/**
 * Estimated Cognitive Load (0-100, higher = harder). A transparent composite we define.
 * Returns each component so the UI can show where the points come from.
 */
export function cognitiveLoadBreakdown(m) {
  return [
    { id: 'sentence', label: 'Sentence length', max: 30, rule: '0 at 8 words or fewer, full at 30+', points: clamp01((m.avgSentenceLength - 8) / 22) * 30 },
    { id: 'syllable', label: 'Word complexity', max: 20, rule: '0 at 1.3 syllables per word, full at 2.0', points: clamp01((m.syllablesPerWord - 1.3) / 0.7) * 20 },
    { id: 'jargon', label: 'Jargon density', max: 25, rule: 'Full at 20% of words', points: clamp01(m.jargonDensity / 20) * 25 },
    { id: 'passive', label: 'Passive voice', max: 15, rule: 'Share of passive sentences', points: clamp01(m.passiveRatio) * 15 },
    { id: 'structure', label: 'Missing structure', max: 10, rule: 'No bold anchors, lists or paragraph breaks', points: (1 - clamp01(m.anchorsPer100Words / 3)) * 10 },
  ];
}

export function cognitiveLoadScore(m) {
  return Math.round(cognitiveLoadBreakdown(m).reduce((sum, c) => sum + c.points, 0));
}

export function analyze(text, { jargon = DEFAULT_JARGON } = {}) {
  const sentences = splitSentences(text);
  const words = tokenizeWords(text);
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const safeSentences = Math.max(1, sentenceCount);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const avgSentenceLength = wordCount / safeSentences;
  const syllablesPerWord = wordCount ? syllables / wordCount : 0;
  // The raw formula goes below zero for very simple text ("Short text. It is easy." = -0.5).
  // A negative school grade means nothing to readers, so the shown grade floors at 0.
  const fleschKincaidRaw = wordCount ? 0.39 * avgSentenceLength + 11.8 * syllablesPerWord - 15.59 : 0;
  const fleschKincaidGrade = Math.max(0, fleschKincaidRaw);
  const jargonCount = words.filter((w) => isJargon(w, jargon)).length;
  const jargonDensity = wordCount ? (jargonCount / wordCount) * 100 : 0;
  const passiveRatio = sentences.filter(isPassive).length / safeSentences;

  const anchors =
    (text.match(/\*\*.+?\*\*/g) ?? []).length +
    (text.match(/^\s*(?:[-*+]|\d+\.)\s+/gm) ?? []).length +
    (text.match(/\n\s*\n/g) ?? []).length;
  const anchorsPer100Words = wordCount ? (anchors / wordCount) * 100 : 0;

  const metrics = {
    wordCount,
    sentenceCount,
    avgSentenceLength,
    syllablesPerWord,
    fleschKincaidGrade,
    fleschKincaidRaw,
    jargonDensity,
    passiveRatio,
    anchorsPer100Words,
  };
  const breakdown = wordCount ? cognitiveLoadBreakdown(metrics) : [];
  const cognitiveLoad = wordCount ? cognitiveLoadScore(metrics) : 0;
  return { ...metrics, cognitiveLoad, breakdown };
}

/* =========================================================================
   7. Friction levels (shared by badges, chart colours and announcements)
   ========================================================================= */

/** Thresholds: value <= moderate is Low, <= high is Moderate, above is High friction. */
export const FRICTION_SCALES = Object.freeze({
  avgSentenceLength: { label: 'Average sentence length', unit: 'words', moderate: 15, high: 25, max: 50, dp: 1 },
  fleschKincaidGrade: { label: 'Flesch-Kincaid grade', unit: 'grade', moderate: 8, high: 12, max: 25, dp: 1 },
  jargonDensity: { label: 'Jargon density', unit: '%', moderate: 5, high: 12, max: 25, dp: 1 },
  cognitiveLoad: { label: 'Cognitive load', unit: '/ 100', moderate: 35, high: 65, max: 100, dp: 0 },
});

export function frictionLevel(key, value) {
  const s = FRICTION_SCALES[key];
  if (value <= s.moderate) return 'low';
  if (value <= s.high) return 'moderate';
  return 'high';
}

/* =========================================================================
   8. Live browser UI
   ========================================================================= */

const LEVEL_TEXT = { low: 'Low friction', moderate: 'Moderate friction', high: 'High friction' };
const LEVEL_ICON = { low: '●', moderate: '◆', high: '▲' };
const LEVEL_SHORT = { low: 'Low', moderate: 'Moderate', high: 'High' };
const NS = 'http://www.w3.org/2000/svg';

export function debounce(fn, ms) {
  let t;
  const debounced = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  debounced.cancel = () => clearTimeout(t);
  return debounced;
}

const fmt = (key, v) => {
  const s = FRICTION_SCALES[key];
  return v.toFixed(s.dp) + (s.unit === '%' ? '%' : '');
};

function svgEl(tag, attrs = {}, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

/**
 * Build the SVG bar chart. Two layouts so text stays readable when the SVG scales down:
 * wide = label left of the bar; compact (phones) = label above the bar in a narrower viewBox.
 */
function buildChart(svg, compact) {
  svg.replaceChildren();
  const W = compact ? 340 : 640;
  const LEFT = compact ? 0 : 190;
  const RIGHT = compact ? 104 : 128; // room for "24.0 · High" labels
  const ROW = compact ? 72 : 52;
  const BAR = 22;
  const TOP = compact ? 24 : 8;
  const plotW = W - LEFT - RIGHT;
  const keys = Object.keys(FRICTION_SCALES);
  svg.setAttribute('viewBox', `0 0 ${W} ${TOP + keys.length * ROW + (compact ? -12 : 8)}`);

  const defs = svgEl('defs');
  const pat = svgEl('pattern', { id: 'll-hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pat.append(svgEl('rect', { width: 6, height: 6, class: 'bar-high-fill' }),
             svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 6, class: 'bar-hatch-line' }));
  // Moderate bars get dots, so Low / Moderate / High differ by pattern as well as colour.
  // (Phase 4 self-test: Low and Moderate were identical under achromatopsia in dark mode.)
  const dots = svgEl('pattern', { id: 'll-dots', width: 7, height: 7, patternUnits: 'userSpaceOnUse' });
  dots.append(svgEl('rect', { width: 7, height: 7, class: 'bar-moderate-fill' }),
              svgEl('circle', { cx: 3.5, cy: 3.5, r: 1.4, class: 'bar-dot' }));
  defs.append(pat, dots);
  svg.append(defs);

  const rows = {};
  keys.forEach((key, i) => {
    const s = FRICTION_SCALES[key];
    const y = TOP + i * ROW;
    const g = svgEl('g', { class: 'chart-row' });
    g.append(compact
      ? svgEl('text', { x: 0, y: y - 8, class: 'chart-label' }, s.label)
      : svgEl('text', { x: LEFT - 12, y: y + BAR / 2 + 5, 'text-anchor': 'end', class: 'chart-label' }, s.label));
    g.append(svgEl('rect', { x: LEFT, y, width: plotW, height: BAR, rx: 4, class: 'chart-track' }));
    // Threshold markers at the Moderate and High boundaries
    for (const t of [s.moderate, s.high]) {
      const x = LEFT + (t / s.max) * plotW;
      g.append(svgEl('line', { x1: x, x2: x, y1: y - 4, y2: y + BAR + 4, class: 'chart-threshold' }));
      g.append(svgEl('text', { x, y: y + BAR + 16, 'text-anchor': 'middle', class: 'chart-tick' }, String(t)));
    }
    const bar = svgEl('rect', { x: LEFT, y, width: 0, height: BAR, rx: 4, class: 'chart-bar' });
    const value = svgEl('text', { x: LEFT + 8, y: y + BAR / 2 + 5, class: 'chart-value' });
    g.append(bar, value);
    svg.append(g);
    rows[key] = { bar, value, s, y };
  });

  return function update(result) {
    for (const [key, { bar, value, s }] of Object.entries(rows)) {
      const v = result[key];
      const w = Math.max(0, Math.min(1, v / s.max)) * plotW;
      const level = frictionLevel(key, v);
      bar.setAttribute('width', w.toFixed(1));
      bar.setAttribute('class', `chart-bar bar-${level}`);
      value.setAttribute('x', (LEFT + Math.min(w, plotW) + 8).toFixed(1));
      // The level word is a text cue that survives any colour-vision deficiency.
      value.textContent = `${fmt(key, v)}${v > s.max ? '+' : ''} · ${LEVEL_SHORT[level]}`;
    }
  };
}

const CARD_DEFS = [
  { key: 'wordCount', label: 'Words', format: (r) => String(r.wordCount) },
  { key: 'sentenceCount', label: 'Sentences', format: (r) => String(r.sentenceCount) },
  { key: 'avgSentenceLength', label: 'Avg sentence length', format: (r) => `${r.avgSentenceLength.toFixed(1)} words` },
  { key: 'fleschKincaidGrade', label: 'Flesch-Kincaid grade', format: (r) => r.fleschKincaidGrade.toFixed(1) },
  { key: 'jargonDensity', label: 'Jargon density', format: (r) => `${r.jargonDensity.toFixed(1)}%` },
  { key: 'cognitiveLoad', label: 'Cognitive load', format: (r) => `${r.cognitiveLoad} / 100` },
];

/** The sentence a screen reader hears about a result. */
export function analyzerSummary(r) {
  if (!r.wordCount) return 'No text to analyse.';
  return `Grade ${r.fleschKincaidGrade.toFixed(1)}, ${LEVEL_TEXT[frictionLevel('fleschKincaidGrade', r.fleschKincaidGrade)].toLowerCase()}. ` +
    `Cognitive load ${r.cognitiveLoad} out of 100, ${LEVEL_TEXT[frictionLevel('cognitiveLoad', r.cognitiveLoad)].toLowerCase()}.`;
}

/**
 * Mount the live analyzer.
 * Announcements: by default the analyzer announces its own updates. When several modules
 * share one live region, pass announce: false and let the page announce summary() for
 * whichever module is visible (Phase 6: the hidden analyzer used to talk over the others).
 * @param {{ input: HTMLTextAreaElement, output: HTMLElement, live: HTMLElement,
 *           computeDelay?: number, announceDelay?: number, announce?: boolean }} opts
 */
export function mountAnalyzer({ input, output, live, computeDelay = 150, announceDelay = 1000, announce: shouldAnnounce = true }) {
  output.classList.remove('placeholder');
  output.innerHTML = `
    <div class="metric-grid" role="list"></div>
    <figure class="chart-card">
      <figcaption>
        <span class="chart-title">Friction profile</span>
        <span class="chart-legend" aria-hidden="true">
          <span><i class="swatch swatch-low"></i>Low</span>
          <span><i class="swatch swatch-moderate"></i>Moderate</span>
          <span><i class="swatch swatch-high"></i>High</span>
        </span>
      </figcaption>
      <svg class="metric-chart" role="img" aria-labelledby="chart-summary"></svg>
      <p id="chart-summary" class="chart-summary"></p>
    </figure>
    <details class="breakdown">
      <summary>How is the cognitive load score calculated?</summary>
      <table>
        <thead><tr><th scope="col">Component</th><th scope="col" class="num">Points</th><th scope="col">Rule</th></tr></thead>
        <tbody></tbody>
      </table>
    </details>
    <p class="analyzer-note">Heuristic estimates. Grade level is approximate (about ±1 grade). Jargon uses a computer-science word list.</p>`;

  const grid = output.querySelector('.metric-grid');
  const cards = {};
  for (const def of CARD_DEFS) {
    const card = document.createElement('div');
    card.className = 'metric-card';
    card.setAttribute('role', 'listitem');
    card.innerHTML = `<span class="metric-label"></span><span class="metric-value"></span><span class="badge" hidden></span>`;
    card.querySelector('.metric-label').textContent = def.label;
    grid.append(card);
    cards[def.key] = card;
  }

  const chartSvg = output.querySelector('.metric-chart');
  const chartCard = output.querySelector('.chart-card');
  const isCompact = () => chartCard.clientWidth > 0 && chartCard.clientWidth < 520;
  let compact = isCompact();
  let updateChart = buildChart(chartSvg, compact);
  let lastResult = null;
  // Rebuild only when crossing the breakpoint, then redraw the last result.
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      const next = isCompact();
      if (next !== compact && chartCard.clientWidth > 0) {
        compact = next;
        updateChart = buildChart(chartSvg, compact);
        if (lastResult) updateChart(lastResult);
      }
    }).observe(chartCard);
  }
  const summary = output.querySelector('#chart-summary');
  const tbody = output.querySelector('.breakdown tbody');

  let lastAnnouncement = '';
  const announce = debounce((r) => {
    if (!r.wordCount) return;
    const msg = analyzerSummary(r);
    if (msg !== lastAnnouncement) {
      live.textContent = msg;
      lastAnnouncement = msg;
    }
  }, announceDelay);

  function render() {
    const r = analyze(input.value);
    output.dataset.empty = String(r.wordCount === 0);

    for (const def of CARD_DEFS) {
      const card = cards[def.key];
      card.querySelector('.metric-value').textContent = r.wordCount ? def.format(r) : '–';
      const badge = card.querySelector('.badge');
      if (def.key in FRICTION_SCALES && r.wordCount) {
        const level = frictionLevel(def.key, r[def.key]);
        badge.hidden = false;
        badge.className = `badge badge-${level}`;
        badge.textContent = `${LEVEL_ICON[level]} ${LEVEL_TEXT[level]}`;
      } else {
        badge.hidden = true;
      }
    }

    lastResult = r;
    updateChart(r);
    summary.textContent = r.wordCount
      ? Object.keys(FRICTION_SCALES)
        .map((k) => `${FRICTION_SCALES[k].label}: ${fmt(k, r[k])} (${LEVEL_TEXT[frictionLevel(k, r[k])].toLowerCase()})`)
        .join('. ') + '.'
      : 'Paste some text to see its friction profile.';

    tbody.replaceChildren(...r.breakdown.map((c) => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<th scope="row"></th><td class="num"></td><td></td>';
      tr.children[0].textContent = c.label;
      tr.children[1].textContent = `${c.points.toFixed(1)} / ${c.max}`;
      tr.children[2].textContent = c.rule;
      return tr;
    }));

    if (shouldAnnounce) announce(r);
    return r;
  }

  const scheduled = debounce(render, computeDelay);
  input.addEventListener('input', scheduled);
  render();

  return {
    /** Re-score immediately (used when a sample is loaded). */
    update() { scheduled.cancel(); return render(); },
    /** What a screen reader should hear about the current text. */
    summary() { return lastResult ? analyzerSummary(lastResult) : ''; },
    destroy() { scheduled.cancel(); announce.cancel(); input.removeEventListener('input', scheduled); },
  };
}
