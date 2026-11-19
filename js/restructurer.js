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
const CLAUSE_SPLIT = /,\s+(?=(?:although|though|whereby|wherein|since|because|while|whereas|which|unless|but|yet|so that|rather than|where)\b)|;\s+|\s+[—–]\s+/gi;

/** Multi-word technical terms (anchor priority 3). */
const PHRASES = [
  'race condition', 'critical section', 'mutual exclusion', 'context switches', 'context switch',
  'circular wait', 'forward progress', 'synchronization primitives', 'shared variable',
  'shared data', 'time quantum', 'mutable state', 'program semantics',
  'priority queue', 'edge weights', 'distance estimate', 'inductive invariant', 'shortest-path distance',
];
/** Generic phrases: useful as a last resort only (priority 1). */
const WEAK_PHRASES = ['operating system'];

/** Points starting like this depend on the previous point. */
const DEPENDENT_START = /^(?:for which|in which|whereby|wherein|which|although|though|since|because|while|whereas|unless|but|yet|so that|rather than|where)\b/i;

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
  // A point that opens with a connector ("For which...", "Whereby...") leans on the point
  // before it, so it cannot stand alone as a takeaway (Phase 7, Sample C).
  if (DEPENDENT_START.test(text)) score -= 4;
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
   5. Focus mode (bionic-style fixation emphasis)
   ========================================================================= */

/**
 * How many letters to bold at the start of a word. Short words get 1, long words ~40%.
 * Research on fixation bolding is mixed, so the UI keeps this optional and off by default.
 */
export function fixationLength(word) {
  const n = word.replace(/[^A-Za-z]/g, '').length;
  if (n <= 3) return 1;
  if (n === 4) return 2;
  if (n <= 7) return 3;
  return Math.ceil(n * 0.4);
}

/** A whole word, including hyphens and apostrophes inside it: non-deterministic, Rao's. */
const WORD_RE = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;

/**
 * Safe text-node tokenizer. Works on PLAIN TEXT (one DOM text node), never on HTML,
 * so tags, attributes and entities cannot be damaged.
 * Returns segments whose texts concatenate back to the exact input.
 * Skips: acronyms (CPU), single letters in abbreviations (e.g.), and anything with digits.
 * @returns {{text: string, bold?: boolean}[]}
 */
export function focusSegments(text) {
  const out = [];
  let last = 0;
  let m;
  WORD_RE.lastIndex = 0;
  while ((m = WORD_RE.exec(text))) {
    const word = m[0];
    const before = text[m.index - 1] ?? '';
    const after = text[m.index + word.length] ?? '';
    const isAcronym = /^[A-Z]{2,6}s?$/.test(word);
    const isAbbrevLetter = word.length === 1 && (after === '.' || before === '.');
    const touchesDigit = /\d/.test(before) || /\d/.test(after);
    if (isAcronym || isAbbrevLetter || touchesDigit) continue;
    const k = fixationLength(word);
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: word.slice(0, k), bold: true });
    if (k < word.length) out.push({ text: word.slice(k) });
    last = m.index + word.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/* =========================================================================
   6. Markdown export
   ========================================================================= */

export function toMarkdown(result) {
  const lines = ['# Restructured notes', ''];
  if (result.takeaway) lines.push(`> **Key takeaway:** ${result.takeaway.text}`, '');
  for (const card of result.cards) {
    lines.push(`## ${card.title}`, '');
    for (const p of card.points) lines.push(`- ${p.anchor ? `**${p.anchor}:** ` : ''}${p.text}`);
    lines.push('');
  }
  lines.push('_Restructured with LectureLens. Every word is from the original, in the same order._', '');
  return lines.join('\n');
}

/* =========================================================================
   7. Live UI
   ========================================================================= */

/** Apply Focus mode to every text node inside `root`, skipping code and existing bold. */
export function applyFocus(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (node.parentElement.closest('code, strong, b, .no-focus')
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const frag = document.createDocumentFragment();
    for (const seg of focusSegments(node.nodeValue)) {
      if (seg.bold) {
        const b = document.createElement('b');
        b.className = 'fx';
        b.textContent = seg.text;
        frag.append(b);
      } else {
        frag.append(document.createTextNode(seg.text));
      }
    }
    node.replaceWith(frag);
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers or contexts without the async clipboard API.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

/**
 * @param {{ input: HTMLTextAreaElement, output: HTMLElement, live: HTMLElement }} opts
 */
export function mountRestructurer({ input, output, live }) {
  output.classList.remove('placeholder');
  output.innerHTML = `
    <div class="rs-toolbar">
      <label class="sim-check rs-focus-toggle">
        <input type="checkbox" name="rs-focus" aria-describedby="rs-focus-hint"> Focus mode (bionic-style reading)
      </label>
      <div class="actions">
        <button type="button" class="btn btn-secondary" data-action="copy">Copy as Markdown</button>
        <button type="button" class="btn btn-secondary" data-action="download">Download .md</button>
      </div>
      <p id="rs-focus-hint" class="hint">Bolds the start of each word to guide your eyes. Research on this is mixed, so keep it only if it helps you.</p>
    </div>
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
  let focus = false;

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

    if (focus) {
      applyFocus(cardsEl);
    }
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
    if (focus) applyFocus(takeawayText);
    return last;
  }

  output.querySelector('input[name="rs-focus"]').addEventListener('change', (e) => {
    focus = e.target.checked;
    render();
    live.textContent = focus ? 'Focus mode on.' : 'Focus mode off.';
  });

  output.querySelector('.rs-toolbar').addEventListener('click', async (e) => {
    const action = e.target.closest('button')?.dataset.action;
    if (!action || !last) return;
    const md = toMarkdown(last.result);
    const count = last.result.cards.reduce((n, c) => n + c.points.length, 0);
    if (action === 'copy') {
      const ok = await copyText(md);
      live.textContent = ok ? `Copied ${count} points as Markdown.` : 'Copy failed. Use Download instead.';
    } else if (action === 'download') {
      const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lecturelens-notes.md';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      live.textContent = `Downloaded ${count} points as lecturelens-notes.md.`;
    }
  });

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(render, 150);
  });
  render();

  return {
    update() { clearTimeout(timer); return render(); },
    /** What a screen reader should hear after the cards update. */
    summary() {
      if (!last || !last.result.cards.length) return 'No text to restructure.';
      const points = last.result.cards.reduce((n, c) => n + c.points.length, 0);
      const f = last.fidelity;
      return `${points} points in ${last.result.cards.length} cards. ` +
        (f.identical ? `All ${f.inputWords} words kept in order.` : 'Fidelity check failed.');
    },
    get last() { return last; },
  };
}
