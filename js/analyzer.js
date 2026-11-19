// Quantitative Readability & Cognitive Load Analyzer: pure metric core.
// No DOM access, so the same code runs in the browser and in Node (scripts/benchmark.js).
// Phase 1 ships the metric functions. Phase 2 adds the UI and chart on top.

/** Domain jargon lexicon (OS concurrency + general CS). Extend per subject in later phases. */
export const DEFAULT_JARGON = new Set([
  'multiprogrammed', 'concurrent', 'concurrency', 'synchronization', 'primitive',
  'non-deterministic', 'interleaving', 'preemptive', 'scheduler', 'critical',
  'mutex', 'mutexes', 'semaphore', 'monitor', 'atomicity', 'atomic', 'deadlock',
  'race', 'thread', 'process', 'mutable', 'context', 'semantics', 'acquisition',
  'circular', 'invariant', 'livelock', 'starvation', 'spinlock', 'mutual', 'exclusion',
]);

/** Remove light markdown (bold, bullets, headings) so formatting is not counted as words. */
export function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/^#+\s*/gm, '');
}

export function splitSentences(text) {
  return stripMarkdown(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => /[a-z]/i.test(s));
}

export function tokenizeWords(text) {
  return (stripMarkdown(text).toLowerCase().match(/[a-z]+(?:[-'][a-z]+)*/g) ?? []);
}

/**
 * Heuristic English syllable counter. Accurate to roughly +/-1 grade level when used in
 * Flesch-Kincaid; the error is documented rather than hidden.
 */
export function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w
    .replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '') // silent trailing e / es / ed
    .replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

const PASSIVE_RE =
  /\b(?:am|is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?(?:\w+ed|\w+en|built|done|held|kept|made|run|seen|shown|taken|given|known|written|chosen)\b/i;

export function isPassive(sentence) {
  return PASSIVE_RE.test(sentence);
}

function isJargon(word, lexicon) {
  if (lexicon.has(word)) return true;
  const singular = word.replace(/(?:es|s)$/, '');
  return lexicon.has(singular);
}

const clamp01 = (x) => Math.min(1, Math.max(0, x));

/**
 * Estimated Cognitive Load Score (0-100, higher = harder). A transparent composite we define:
 *   30 pts  sentence length      (0 at <= 8 words, max at >= 30 words)
 *   20 pts  word complexity      (0 at 1.3 syllables/word, max at 2.0)
 *   25 pts  jargon density       (max at >= 20% of words)
 *   15 pts  passive voice        (share of sentences that are passive)
 *   10 pts  missing structure    (no bold anchors / lists / paragraph breaks per 100 words)
 */
export function cognitiveLoadScore(m) {
  const sentence = clamp01((m.avgSentenceLength - 8) / 22) * 30;
  const syllable = clamp01((m.syllablesPerWord - 1.3) / 0.7) * 20;
  const jargon = clamp01(m.jargonDensity / 20) * 25;
  const passive = clamp01(m.passiveRatio) * 15;
  const structure = (1 - clamp01(m.anchorsPer100Words / 3)) * 10;
  return Math.round(sentence + syllable + jargon + passive + structure);
}

export function analyze(text, { jargon = DEFAULT_JARGON } = {}) {
  const sentences = splitSentences(text);
  const words = tokenizeWords(text);
  const wordCount = words.length;
  const sentenceCount = Math.max(1, sentences.length);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const avgSentenceLength = wordCount / sentenceCount;
  const syllablesPerWord = wordCount ? syllables / wordCount : 0;
  const fleschKincaidGrade = 0.39 * avgSentenceLength + 11.8 * syllablesPerWord - 15.59;
  const jargonCount = words.filter((w) => isJargon(w, jargon)).length;
  const jargonDensity = wordCount ? (jargonCount / wordCount) * 100 : 0;
  const passiveRatio = sentences.filter(isPassive).length / sentenceCount;

  const anchors =
    (text.match(/\*\*.+?\*\*/g) ?? []).length +
    (text.match(/^\s*(?:[-*+]|\d+\.)\s+/gm) ?? []).length +
    (text.match(/\n\s*\n/g) ?? []).length;
  const anchorsPer100Words = wordCount ? (anchors / wordCount) * 100 : 0;

  const metrics = {
    wordCount,
    sentenceCount: sentences.length,
    avgSentenceLength,
    syllablesPerWord,
    fleschKincaidGrade,
    jargonDensity,
    passiveRatio,
    anchorsPer100Words,
  };
  return { ...metrics, cognitiveLoad: cognitiveLoadScore(metrics) };
}
