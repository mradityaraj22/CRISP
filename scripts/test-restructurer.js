// Regression tests for the restructurer. Zero dependencies.
// Run with:  npm test

import test from 'node:test';
import assert from 'node:assert/strict';
import { restructure, checkFidelity, chunkSentence, findAnchor, MAX_POINT_WORDS } from '../js/restructurer.js';
import { SAMPLES } from '../data/benchmarks.js';

const wc = (s) => s.trim().split(/\s+/).length;

for (const [key, sample] of Object.entries(SAMPLES)) {
  test(`fidelity: every word of ${sample.label} survives, in order, none added`, () => {
    const f = checkFidelity(sample.text, restructure(sample.text));
    assert.ok(f.identical, `first mismatch at word ${f.firstMismatch + 1}`);
    assert.equal(f.outputWords, f.inputWords);
  });
}

test('the 48-word dense sentence becomes short points', () => {
  const points = restructure(SAMPLES.dense.text).cards.flatMap((c) => c.points);
  assert.ok(points.length >= 8, `only ${points.length} points`);
  // Splits only at clause markers or commas, so a comma-free run may exceed the target a little.
  assert.ok(Math.max(...points.map((p) => wc(p.text))) <= MAX_POINT_WORDS + 5);
});

test('clause markers start the next point, so the logic word is kept', () => {
  const pts = chunkSentence('Locks were added to the scheduler code, although they can cause a deadlock in rare cases.');
  assert.equal(pts.length, 2);
  assert.match(pts[1], /^Although they can cause/);
});

test('short fragments are merged back instead of standing alone', () => {
  const pts = chunkSentence('The kernel runs the scheduler for every core in the machine, which helps.');
  assert.ok(pts.every((p) => wc(p) >= 4), JSON.stringify(pts));
});

test('anchors prefer technical phrases and keep acronyms', () => {
  assert.equal(findAnchor('a race condition is introduced'), 'Race condition');
  assert.equal(findAnchor('The CPU switches context often'), 'CPU');
  assert.equal(findAnchor('See https://example.edu/notes.html for details'), 'Details');
});

test('the key takeaway is quoted exactly from the input', () => {
  for (const sample of Object.values(SAMPLES)) {
    const { takeaway } = restructure(sample.text);
    assert.ok(takeaway, sample.label);
    const flat = sample.text.replace(/\*\*/g, '').replace(/\s+/g, ' ').toLowerCase();
    const quote = takeaway.text.replace(/[.,;:]$/, '').toLowerCase();
    assert.ok(flat.includes(quote), `not verbatim: ${takeaway.text}`);
  }
});

test('bold headings become card titles', () => {
  const titles = restructure(SAMPLES.plain.text).cards.map((c) => c.title);
  assert.deepEqual(titles, ['The problem: shared data', 'What goes wrong: race conditions', 'The fix: locks', 'The catch: deadlock']);
});

test('empty input gives no cards and no takeaway', () => {
  const r = restructure('   ');
  assert.equal(r.cards.length, 0);
  assert.equal(r.takeaway, null);
});

// ---- Focus mode and export (Phase 5, second commit) ----
import { focusSegments, fixationLength, toMarkdown } from '../js/restructurer.js';

const join = (segs) => segs.map((s) => s.text).join('');
const bolded = (segs) => segs.filter((s) => s.bold).map((s) => s.text);

test('focus segments always rebuild the exact original text', () => {
  for (const sample of Object.values(SAMPLES)) assert.equal(join(focusSegments(sample.text)), sample.text);
});

test('focus mode never touches the traps the naive regex broke', () => {
  const segs = focusSegments("Dr. Rao's quantum of 2.5 ms, e.g. CPU & non-deterministic");
  const b = bolded(segs);
  assert.ok(b.includes('Ra'), "Rao's is one word");
  assert.ok(!b.includes('s'), "the s in Rao's is not bolded on its own");
  assert.ok(!b.includes('C') && !b.includes('CP'), 'acronyms stay plain');
  assert.ok(!b.includes('e') && !b.includes('g'), 'e.g. stays plain');
  assert.ok(b.includes('non-det') && !b.includes('de'), 'hyphenated word is one word');
  assert.ok(!segs.some((s) => s.bold && /\d/.test(s.text)), 'numbers are never bolded');
});

test('fixation length grows with word length', () => {
  assert.deepEqual(['a', 'lock', 'thread', 'algorithm', 'concurrency'].map(fixationLength), [1, 2, 3, 4, 5]);
});

test('markdown export contains every point verbatim', () => {
  const r = restructure(SAMPLES.dense.text);
  const md = toMarkdown(r);
  for (const p of r.cards.flatMap((c) => c.points)) assert.ok(md.includes(p.text), p.text);
  assert.match(md, /^# Restructured notes/);
  assert.match(md, /> \*\*Key takeaway:\*\*/);
});

// ---- Phase 8: hardening ----
import { escapeMarkdown } from '../js/restructurer.js';
import { limitWords, LIVE_WORD_LIMIT } from '../js/analyzer.js';

/** What a Markdown renderer shows for our escaped text: entities and backslashes undone. */
const renderMd = (s) => s.replace(/\\([\\`*_[\]#>+\-])/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const CPP = 'In C++ you write #include <vector> before std::vector<int> v when 3 < 5 && a*b_c > 2.';

test('markdown export keeps <vector> visible instead of letting renderers eat it', () => {
  const esc = escapeMarkdown(CPP);
  assert.ok(!/<vector>|<int>/.test(esc), 'raw tags must not reach the Markdown');
  assert.equal(renderMd(esc), CPP, 'renders back to exactly the original characters');
});

test('pasted <script> and event handlers are neutralised in the export', () => {
  const esc = escapeMarkdown('<script>alert(1)</script> <b onmouseover="x()">hi</b>');
  assert.ok(!esc.includes('<'), esc);
});

test('a full restructure of HTML/C++ text keeps fidelity and escapes the export', () => {
  const r = restructure(CPP);
  assert.ok(checkFidelity(CPP, r).identical);
  assert.ok(toMarkdown(r).includes('&lt;vector&gt;'));
});

test('focus mode handles accented and non-Latin words as whole words', () => {
  const segs = focusSegments('Naïve café ideas, 🚀 naïve again');
  assert.equal(segs.map((s) => s.text).join(''), 'Naïve café ideas, 🚀 naïve again');
  assert.ok(segs.some((s) => s.bold && s.text === 'Naï'), JSON.stringify(segs));
  assert.ok(!segs.some((s) => s.bold && /🚀/.test(s.text)), 'emoji are never bolded');
});

test('limitWords cuts huge text at a sentence end and reports the totals', () => {
  const big = Array(200).fill(SAMPLES.dense.text).join(' '); // 25,600 words
  const l = limitWords(big, LIVE_WORD_LIMIT);
  assert.equal(l.truncated, true);
  assert.equal(l.totalWords, 25600);
  assert.ok(l.keptWords <= LIVE_WORD_LIMIT && l.keptWords > LIVE_WORD_LIMIT * 0.8);
  assert.match(l.text, /[.!?]$/, 'ends at a full sentence');
  assert.equal(limitWords('short text', 10).truncated, false);
});

test('a 100,000-word paste restructures (after the limit) in well under a second', () => {
  const big = Array(782).fill(SAMPLES.dense.text).join('\n\n');
  const t0 = performance.now();
  const l = limitWords(big, LIVE_WORD_LIMIT);
  const r = restructure(l.text);
  checkFidelity(l.text, r);
  const ms = performance.now() - t0;
  assert.ok(ms < 500, `took ${ms.toFixed(0)} ms`);
});
