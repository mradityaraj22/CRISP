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
