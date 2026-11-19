// Regression tests for the analyzer engine. Zero dependencies: node:test + node:assert.
// Run with:  npm test

import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, splitSentences, tokenizeWords, countSyllables, frictionLevel } from '../js/analyzer.js';
import { SAMPLES } from '../data/benchmarks.js';

const round = (n, dp) => Number(n.toFixed(dp));

test('Phase 1 benchmark numbers stay stable (golden values)', () => {
  const a = analyze(SAMPLES.dense.text);
  const b = analyze(SAMPLES.plain.text);
  assert.deepEqual(
    [a.wordCount, round(a.avgSentenceLength, 1), round(a.fleschKincaidGrade, 1), round(a.jargonDensity, 1), a.cognitiveLoad],
    [128, 42.7, 24.0, 18.0, 96],
  );
  assert.deepEqual(
    [b.wordCount, round(b.avgSentenceLength, 1), round(b.fleschKincaidGrade, 1), round(b.jargonDensity, 1), b.cognitiveLoad],
    [110, 7.9, 2.6, 10.9, 14],
  );
});

test('messy lecture notes split into the true 5 sentences', () => {
  assert.equal(splitSentences(SAMPLES.messy.text).length, SAMPLES.messy.expectedSentences);
});

const SENTENCE_CASES = [
  ['abbreviation e.g.', 'Use a lock, e.g. a mutex. Then test it.', 2],
  ['abbreviation i.e.', 'Pick one, i.e. the fastest. It wins.', 2],
  ['title Dr.', 'Dr. Smith teaches OS. She is great.', 2],
  ['title Prof. + et al.', 'Prof. Iyer et al. found a bug. It was rare.', 2],
  ['figure and page refs', 'See Fig. 2 on p. 14 for the graph. It is clear.', 2],
  ['decimals', 'The quantum is 2.5 ms. That is short.', 2],
  ['version numbers', 'Install v1.2.3 first. Then run it.', 2],
  ['URL with dots', 'Read https://example.edu/a.html today. It helps.', 2],
  ['email address', 'Email ta@uni.edu for help. Replies are fast.', 2],
  ['ellipsis then capital', 'Wait for it... The lock frees.', 2],
  ['ellipsis then lowercase', 'Wait for it... and then retry.', 1],
  ['etc. mid-sentence', 'Threads, locks, etc. are covered. Next week is memory.', 2],
  ['etc. at sentence end', 'We cover threads, locks, etc. Next week is memory.', 2],
  ['approx. and vs.', 'It takes approx. 10 ms vs. 100 ms before. Good.', 2],
  ['initials', 'J. R. Smith wrote it. Read it.', 2],
  ['dotted initialism', 'The U.S. team won. They celebrated.', 2],
  ['question and exclamation', 'Is it safe? No! It deadlocks.', 3],
  ['line breaks as boundaries', '**Heading**\nA sentence here.', 2],
  ['fenced code ignored', 'Run this.\n```\nx = 1. y = 2.\n```\nDone.', 2],
];

for (const [name, text, expected] of SENTENCE_CASES) {
  test(`sentence split: ${name}`, () => {
    assert.equal(splitSentences(text).length, expected, JSON.stringify(splitSentences(text)));
  });
}

test('URLs, emails and dotted abbreviations do not become fake words', () => {
  assert.deepEqual(tokenizeWords('See https://example.edu/os/notes.html now'), ['See', 'link', 'now']);
  assert.deepEqual(tokenizeWords('Mail ta@uni.edu today'), ['Mail', 'email', 'today']);
  assert.deepEqual(tokenizeWords('e.g. this'), ['eg', 'this']);
});

test('acronyms are counted letter by letter', () => {
  assert.equal(countSyllables('CPU'), 3);
  assert.equal(countSyllables('SJF'), 3);
  assert.equal(countSyllables('WWW'), 9);
  assert.equal(countSyllables('APIs'), 3);
});

test('empty and whitespace input is safe', () => {
  for (const t of ['', '   ', '\n\n']) {
    const r = analyze(t);
    assert.equal(r.wordCount, 0);
    assert.equal(r.fleschKincaidGrade, 0);
    assert.equal(r.cognitiveLoad, 0);
  }
});

test('very simple text never shows a negative grade', () => {
  const r = analyze('Short text. It is easy.');
  assert.ok(r.fleschKincaidRaw < 0, 'raw formula is negative');
  assert.equal(r.fleschKincaidGrade, 0);
});

test('friction levels use inclusive thresholds', () => {
  assert.equal(frictionLevel('fleschKincaidGrade', 8), 'low');
  assert.equal(frictionLevel('fleschKincaidGrade', 8.1), 'moderate');
  assert.equal(frictionLevel('fleschKincaidGrade', 12.1), 'high');
});

test('10,000-word input scores in under 50 ms', () => {
  const big = Array(Math.ceil(10000 / 128)).fill(SAMPLES.dense.text).join(' ');
  const t0 = performance.now();
  analyze(big);
  const ms = performance.now() - t0;
  assert.ok(ms < 50, `took ${ms.toFixed(1)} ms`);
});

// Known limits of the regex syllable counter. Documented, not fixed in Phase 3: fixing them
// would silently change the published Phase 1 numbers. Each entry is [word, counted, real].
export const KNOWN_LIMITS = [
  ['processes', 2, 3],
  ['wanted', 1, 2],
  ['while', 2, 1],
  ['RAM', 3, 1], // acronym spoken as a word
];

test('known limits are still what we documented', () => {
  for (const [word, counted] of KNOWN_LIMITS) assert.equal(countSyllables(word), counted, word);
});

// ---- Phase 7: plain-English verdicts ----
import { verdict, gradeMeaning, analyzerSummary } from '../js/analyzer.js';

test('verdicts turn numbers into a plain-English call to action', () => {
  const a = verdict(analyze(SAMPLES.dense.text));
  assert.equal(a.headline, 'Dense academic wall');
  assert.match(a.fixes[0], /Your sentences average 43 words/);
  assert.equal(verdict(analyze(SAMPLES.plain.text)).headline, 'Clear and scannable');
  assert.equal(verdict(analyze(SAMPLES.algorithm.text)).level, 'high');
  assert.equal(verdict(analyze('')).level, 'empty');
});

test('grade levels map to school stages people recognise', () => {
  assert.deepEqual([2.6, 6.8, 11, 14, 24].map(gradeMeaning), [
    'Primary school level', 'Middle school level', 'High school level', 'University level',
    'Postgraduate level, beyond the scale',
  ]);
});

test('the screen-reader summary leads with the verdict', () => {
  assert.match(analyzerSummary(analyze(SAMPLES.dense.text)), /^Dense academic wall\. Grade 24\.0/);
});

// ---- Phase 8: Unicode and odd input ----
test('accented and non-Latin words count as whole words; emoji are ignored', () => {
  assert.deepEqual(tokenizeWords('Naïve café 🚀 résumé'), ['Naïve', 'café', 'résumé']);
  assert.equal(tokenizeWords('नमस्ते दुनिया').length, 2);
  assert.ok(countSyllables('नमस्ते') >= 1, 'non-Latin words are not counted as zero syllables');
});

test('odd inputs never throw', () => {
  for (const t of ['🚀🚀🚀', '<<<>>>', 'x'.repeat(5000), '​​', '.....', '\t\n\r']) {
    assert.doesNotThrow(() => analyze(t), JSON.stringify(t.slice(0, 10)));
  }
});
