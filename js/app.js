// UI entry point. Wires the DOM to the modules. No logic that needs testing lives here.
import { SAMPLES } from '../data/benchmarks.js';
import { tokenizeWords, mountAnalyzer } from './analyzer.js';
import { mountSimulator } from './simulator.js';
import { mountRestructurer } from './restructurer.js';

const textarea = document.getElementById('source-text');
const live = document.getElementById('live-region');
const wordCount = document.getElementById('word-count');

// ---- Input ----
function updateWordCount() {
  const n = tokenizeWords(textarea.value).length;
  wordCount.textContent = `· ${n} ${n === 1 ? 'word' : 'words'}`;
}
textarea.addEventListener('input', updateWordCount);

// Start with the dense sample so first-time visitors see the problem immediately.
textarea.value = SAMPLES.dense.text;
updateWordCount();

// ---- Readability Analyzer (live, debounced) ----
const analyzer = mountAnalyzer({
  input: textarea,
  output: document.getElementById('analyzer-output'),
  live,
  announce: false, // the page-level announcer below speaks for the visible tab
});

// ---- Visual Simulator ----
const simulator = mountSimulator({
  input: textarea,
  output: document.getElementById('simulator-output'),
  live,
});

// ---- Plain-English Restructurer ----
const restructurer = mountRestructurer({
  input: textarea,
  output: document.getElementById('restructurer-output'),
  live,
});

// ---- One announcer for the whole page ----
// Every module updates on input, but only the VISIBLE module is announced. Before Phase 6
// the hidden analyzer announced its grade while the visible restructurer stayed silent.
const modules = { 'tab-analyzer': analyzer, 'tab-simulator': simulator, 'tab-restructurer': restructurer };
const activeModule = () => modules[document.querySelector('[role="tab"][aria-selected="true"]').id];
let lastAnnouncement = '';
let announceTimer;

function announce(message) {
  // Re-announcing identical text is ignored by some screen readers, so skip duplicates.
  if (!message || message === lastAnnouncement) return;
  live.textContent = message;
  lastAnnouncement = message;
}

textarea.addEventListener('input', () => {
  clearTimeout(announceTimer);
  // Wait until typing pauses (1 s), after the modules' 150 ms render has finished.
  announceTimer = setTimeout(() => announce(activeModule().summary()), 1000);
});

function loadSample(sample) {
  textarea.value = sample.text;
  updateWordCount();
  analyzer.update();
  simulator.update();
  restructurer.update();
  clearTimeout(announceTimer);
  announce(`Loaded ${sample.label}. ${activeModule().summary()}`);
}

document.getElementById('load-sample-a').addEventListener('click', () => loadSample(SAMPLES.dense));
document.getElementById('load-sample-b').addEventListener('click', () => loadSample(SAMPLES.plain));
document.getElementById('load-sample-c').addEventListener('click', () => loadSample(SAMPLES.messy));

// ---- Tabs (WAI-ARIA Authoring Practices: automatic activation) ----
const tabs = [...document.querySelectorAll('[role="tab"]')];

function selectTab(tab, { focus = true } = {}) {
  for (const t of tabs) {
    const selected = t === tab;
    t.setAttribute('aria-selected', String(selected));
    t.tabIndex = selected ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
  }
  if (focus) tab.focus();
}

for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(tab);
    const next = {
      ArrowRight: tabs[(i + 1) % tabs.length],
      ArrowLeft: tabs[(i - 1 + tabs.length) % tabs.length],
      Home: tabs[0],
      End: tabs[tabs.length - 1],
    }[e.key];
    if (next) {
      e.preventDefault();
      selectTab(next);
    }
  });
}
