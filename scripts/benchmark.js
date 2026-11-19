// Phase 1 empirical readability benchmark.
// Zero dependencies. Run with:  node scripts/benchmark.js
// In the browser, import { runBenchmark } and render the rows however you like.

import { analyze } from '../js/analyzer.js';
import { SAMPLES } from '../data/benchmarks.js';

const ROWS = [
  ['Word Count', 'wordCount', 0],
  ['Avg Sentence Length (words)', 'avgSentenceLength', 1],
  ['Syllables per Word', 'syllablesPerWord', 2],
  ['Flesch-Kincaid Grade Level', 'fleschKincaidGrade', 1],
  ['Jargon Density (%)', 'jargonDensity', 1],
  ['Passive Sentences (%)', 'passivePct', 0],
  ['Est. Cognitive Load (0-100)', 'cognitiveLoad', 0],
];

export function runBenchmark(samples = SAMPLES) {
  const a = analyze(samples.dense.text);
  const b = analyze(samples.plain.text);
  a.passivePct = a.passiveRatio * 100;
  b.passivePct = b.passiveRatio * 100;

  return ROWS.map(([label, key, dp]) => {
    const change = a[key] === 0 ? 0 : ((b[key] - a[key]) / Math.abs(a[key])) * 100;
    return {
      metric: label,
      denseA: a[key].toFixed(dp),
      plainB: b[key].toFixed(dp),
      change: `${change > 0 ? '+' : ''}${change.toFixed(0)}%`,
    };
  });
}

export function formatTable(rows) {
  const header = { metric: 'Metric', denseA: 'A: Dense', plainB: 'B: Plain', change: 'Change' };
  const all = [header, ...rows];
  const keys = Object.keys(header);
  const widths = keys.map((k) => Math.max(...all.map((r) => String(r[k]).length)));
  const line = (r) =>
    '| ' + keys.map((k, i) => (i === 0 ? String(r[k]).padEnd(widths[i]) : String(r[k]).padStart(widths[i]))).join(' | ') + ' |';
  const rule = '|' + widths.map((w) => '-'.repeat(w + 2)).join('|') + '|';
  return [line(header), rule, ...rows.map(line)].join('\n');
}

// Print only when executed directly with Node (not when imported in the browser).
const isNodeMain =
  typeof process !== 'undefined' &&
  process.argv?.[1] &&
  decodeURIComponent(new URL(import.meta.url).pathname) === process.argv[1];

if (isNodeMain) {
  console.log('\nLectureLens · Phase 1 Readability Benchmark');
  console.log('Topic: OS concurrency (race conditions, locks, deadlock)\n');
  console.log(formatTable(runBenchmark()));
  console.log('\nNotes: syllable counts are heuristic (about +/-1 grade level).');
  console.log('Cognitive Load is a documented composite. See cognitiveLoadScore() in js/analyzer.js.\n');
}
