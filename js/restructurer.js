// Scannable Plain-English Restructurer.
//
// Deterministic rules only. The restructurer may SPLIT text, LABEL it and change
// punctuation or capital letters at chunk edges. It never adds, drops, reorders or
// paraphrases a word. checkFidelity() proves that on every render.
//
// Two layers, like analyzer.js:
//   1. Pure functions (no DOM). Node tests them in scripts/test-restructurer.js.
//   2. mountRestructurer(): the live UI.

import { splitSentences, DEFAULT_JARGON } from './analyzer.js';

/* =========================================================================
   1. Settings
   ========================================================================= */

/** A point longer than this gets split again at a comma near its middle. */
export const MAX_POINT_WORDS = 20;
/** Never create a point shorter than this (it would lose its meaning). */
const MIN_POINT_WORDS = 4;

/**
 * Clause boundaries. The marker word stays at the START of the next point, so the
 * logic it carries ("although", "whereby", "since") is never lost.
 */
const CLAUSE_SPLIT = /,\s+(?=(?:although|though|whereby|since|because|while|whereas|which|unless|but|yet|so that|rather than|where)\b)|;\s+|\s+[—–]\s+/gi;

/** Multi-word technical terms (anchor priority 3). */
const PHRASES = [
  'race condition', 'critical section', 'mutual exclusion', 'context switches', 'context switch',
  'circular wait', 'forward progress', 'synchronization primitives', 'shared variable',
  'shared data', 'time quantum', 'mutable state', 'program semantics',
];
/** Generic phrases: useful as a last resort only (priority 1). */
const WEAK_PHRASES = ['operating system'];

/** Words that signal a conclusion or definition. Used to pick the key takeaway. */
const CUE_RE = /\b(consequently|therefore|thus|as a result|in summary|in short|key|important|must|means|we call|is called)\b/i;

const STOPWORDS = new Set(('a an the and or but if of in on at to for by with from as is are was were be been being ' +
  'that this these those it its into than then there their them they we you he she can could may might ' +
  'will would should must not no so such only one two more most other each both all any some very').split(' '));

/* =========================================================================
   2. Helpers
   ========================================================================= */

const words = (s) => s.trim().split(/\s+/).filter(Boolean);
const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);
/** Label case: keep acronyms (CPU, SJF) as written, otherwise sentence case. */
const labelCase = (term) => (/^[A-Z]{2,6}s?$/.test(term) ? term : capitalise(term.toLowerCase()));
/** Tidy a point's edges: drop a trailing comma/semicolon/dash, capitalise the first letter. */
const tidy = (s) => capitalise(s.trim().replace(/[,;:—–]+$/, '').trim());

/** Split one chunk at the comma closest to its middle, if both halves stay meaningful. */
function splitAtMiddleComma(chunk) {
  const w = words(chunk);
  if (w.length <= MAX_POINT_WORDS) return [chunk];
  let best = -1;
  let bestDist = Infinity;
  w.forEach((token, i) => {
    if (!token.endsWith(',')) return;
    const left = i + 1;
    const right = w.length - left;
    if (left < MIN_POINT_WORDS + 1 || right < MIN_POINT_WORDS + 1) return;
    const dist = Math.abs(left - w.length / 2);
    if (dist < bestDist) { best = left; bestDist = dist; }
  });
  if (best < 0) return [chunk];
  return [
    ...splitAtMiddleComma(w.slice(0, best).join(' ')),
    ...splitAtMiddleComma(w.slice(best).join(' ')),
  ];
}

/**
 * Stage 1, clause splitter: one sentence -> short, single-idea points.
 * Pass 1 splits at clause markers. Pass 2 splits anything still long at a middle comma.
 * Pass 3 merges fragments that are too short to stand alone.
 */
export function chunkSentence(sentence) {
  const pass1 = sentence.split(CLAUSE_SPLIT).filter((c) => c && c.trim());
  const pass2 = pass1.flatMap(splitAtMiddleComma);
  const merged = [];
  for (const c of pass2) {
    if (merged.length && words(c).length < MIN_POINT_WORDS) merged[merged.length - 1] += ' ' + c.trim();
    else merged.push(c.trim());
  }
  return merged.map(tidy);
}

/**
 * Stage 2, semantic anchor extractor: the term that best names a point.
 * Priority: technical phrase > jargon word > weak phrase > longest content word.
 * The anchor is always copied from the point's own words, so it adds no new facts.
 */
export function findAnchor(text, jargon = DEFAULT_JARGON) {
  const lower = text.toLowerCase();
  const candidates = [];
  for (const p of PHRASES) {
    const i = lower.indexOf(p);
    if (i >= 0) candidates.push({ term: text.slice(i, i + p.length), score: 3, at: i });
  }
  const re = /[A-Za-z][A-Za-z-]*/g;
  let m;
  while ((m = re.exec(text))) {
    const w = m[0].toLowerCase();
    if (jargon.has(w) || jargon.has(w.replace(/(?:es|s)$/, ''))) candidates.push({ term: m[0], score: 2, at: m.index });
  }
  for (const p of WEAK_PHRASES) {
    const i = lower.indexOf(p);
    if (i >= 0) candidates.push({ term: text.slice(i, i + p.length), score: 1, at: i });
  }
  if (!candidates.length) {
    // Fallback: longest content word, ignoring URLs and emails ("example.edu" is not a topic).
    const plain = text.replace(/\S+@\S+|\b(?:https?:\/\/|www\.)\S+/gi, ' ');
    const content = (plain.match(/[A-Za-z][A-Za-z-]{3,}/g) ?? []).filter((w) => !STOPWORDS.has(w.toLowerCase()));
    const longest = content.sort((a, b) => b.length - a.length)[0];
    return longest ? labelCase(longest) : null;
  }
  candidates.sort((a, b) => b.score - a.score || a.at - b.at);
  return labelCase(candidates[0].term);
}

/** Score a point as a takeaway candidate: jargon-rich, conclusive, readable length. */
function takeawayScore(text, jargon, isFirstCard) {
  const w = words(text);
  const jargonCount = w.filter((t) => {
    const x = t.toLowerCase().replace(/[^a-z-]/g, '');
    return jargon.has(x) || jargon.has(x.replace(/(?:es|s)$/, ''));
  }).length;
  let score = 2 * jargonCount + (CUE_RE.test(text) ? 3 : 0) + (isFirstCard ? 1 : 0);
  if (w.length < 6 || w.length > 24) score -= 5;
  return score;
}

/* =========================================================================
   3. The full transformation
   ========================================================================= */

/**
 * Turn text into study cards.
 * Blocks separated by blank lines become cards. A block that starts with **bold text**
 * uses it as the card title. A single dense block becomes one card per sentence.
 * @returns {{ cards: {title: string, titleFromText: boolean, points: {anchor: string|null, text: string}[]}[],
 *             takeaway: {text: string, card: number} | null }}
 */
export function restructure(text, { jargon = DEFAULT_JARGON } = {}) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const cards = [];

  const makeCard = (title, titleFromText, sentences) => {
    const points = sentences.flatMap(chunkSentence).map((t) => ({ anchor: findAnchor(t, jargon), text: t }));
    if (points.length) cards.push({ title: title ?? findAnchor(sentences.join(' '), jargon) ?? `Point ${cards.length + 1}`, titleFromText, points });
  };

  for (const block of blocks) {
    const heading = block.match(/^\*\*(.+?)\*\*\s*/);
    const body = heading ? block.slice(heading[0].length) : block;
    const sentences = splitSentences(body, { keepNoise: true });
    if (heading) makeCard(heading[1].replace(/[.:]\s*$/, ''), true, sentences);
    else if (blocks.length === 1) sentences.forEach((s) => makeCard(null, false, [s]));
    else makeCard(null, false, sentences);
  }

  let takeaway = null;
  let best = -Infinity;
  cards.forEach((card, ci) => card.points.forEach((p) => {
    const s = takeawayScore(p.text, jargon, ci === 0);
    if (s > best) { best = s; takeaway = { text: p.text, card: ci }; }
  }));

  return { cards, takeaway };
}

/* =========================================================================
   4. Fidelity check
   ========================================================================= */

/** Words with edge punctuation and case removed: what fidelity is measured on. */
export function fidelityTokens(text) {
  return text
    .replace(/\*\*/g, '')
    .split(/\s+/)
    .map((t) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').toLowerCase())
    .filter(Boolean);
}

/**
 * Compare the original words with the card content (titles that came from the text,
 * plus every point). Anchors are labels copied from the point itself, so they are excluded.
 */
export function checkFidelity(original, result) {
  const input = fidelityTokens(original);
  const output = result.cards.flatMap((c) => [
    ...(c.titleFromText ? fidelityTokens(c.title) : []),
    ...c.points.flatMap((p) => fidelityTokens(p.text)),
  ]);
  let firstMismatch = -1;
  const n = Math.max(input.length, output.length);
  for (let i = 0; i < n; i++) {
    if (input[i] !== output[i]) { firstMismatch = i; break; }
  }
  return { inputWords: input.length, outputWords: output.length, identical: firstMismatch === -1, firstMismatch };
}

/* =========================================================================
   5. Live UI
   ========================================================================= */

/**
 * @param {{ input: HTMLTextAreaElement, output: HTMLElement, live: HTMLElement }} opts
 */
export function mountRestructurer({ input, output, live }) {
  output.classList.remove('placeholder');
  output.innerHTML = `
    <div class="rs-toolbar"></div>
    <p class="rs-stats" aria-live="off"></p>
    <aside class="takeaway" aria-labelledby="takeaway-label">
      <p id="takeaway-label" class="takeaway-label">Key takeaway <span class="takeaway-source"></span></p>
      <p class="takeaway-text"></p>
    </aside>
    <div class="rs-cards"></div>
    <p class="analyzer-note">Rule-based: every word comes from your text, in the same order. Nothing is rewritten or sent anywhere.</p>`;

  const stats = output.querySelector('.rs-stats');
  const takeawayBox = output.querySelector('.takeaway');
  const takeawayText = output.querySelector('.takeaway-text');
  const takeawaySource = output.querySelector('.takeaway-source');
  const cardsEl = output.querySelector('.rs-cards');
  let last = null;

  function render() {
    const text = input.value;
    const result = restructure(text);
    const fidelity = checkFidelity(text, result);
    last = { text, result, fidelity };

    cardsEl.replaceChildren(...result.cards.map((card, i) => {
      const article = document.createElement('article');
      article.className = 'rs-card';
      article.setAttribute('aria-labelledby', `rs-card-${i}`);
      const h = document.createElement('h4');
      h.id = `rs-card-${i}`;
      h.textContent = card.title;
      const ul = document.createElement('ul');
      for (const p of card.points) {
        const li = document.createElement('li');
        if (p.anchor) {
          const strong = document.createElement('strong');
          strong.className = 'rs-anchor';
          strong.textContent = `${p.anchor}:`;
          li.append(strong, ' ');
        }
        li.append(p.text);
        ul.append(li);
      }
      article.append(h, ul);
      return article;
    }));

    takeawayBox.hidden = !result.takeaway;
    if (result.takeaway) {
      takeawayText.textContent = result.takeaway.text;
      takeawaySource.textContent = `(from card ${result.takeaway.card + 1}, quoted exactly)`;
    }

    const points = result.cards.flatMap((c) => c.points);
    const longest = Math.max(0, ...points.map((p) => words(p.text).length));
    const longestSentence = Math.max(0, ...splitSentences(text, { keepNoise: true }).map((s) => words(s).length));
    stats.textContent = points.length
      ? `${points.length} points in ${result.cards.length} cards · longest point ${longest} words (longest sentence was ${longestSentence}) · ` +
        (fidelity.identical
          ? `${fidelity.outputWords} of ${fidelity.inputWords} words kept, in order, none added`
          : `fidelity check failed at word ${fidelity.firstMismatch + 1}`)
      : 'Paste some text to restructure it.';
    output.dataset.fidelity = String(fidelity.identical);
    return last;
  }

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(render, 150);
  });
  render();

  return {
    update() { clearTimeout(timer); return render(); },
    get last() { return last; },
    toolbar: output.querySelector('.rs-toolbar'),
    cards: cardsEl,
    live,
  };
}
