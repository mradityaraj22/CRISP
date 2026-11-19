// UI entry point. Wires the DOM to the pure modules. No logic that needs testing lives here.
import { SAMPLES } from '../data/benchmarks.js';
import { tokenizeWords } from './analyzer.js';

const textarea = document.getElementById('source-text');
const live = document.getElementById('live-region');
const wordCount = document.getElementById('word-count');

// ---- Input ----
function updateWordCount() {
  const n = tokenizeWords(textarea.value).length;
  wordCount.textContent = `· ${n} ${n === 1 ? 'word' : 'words'}`;
}

function loadSample(sample, { announce = true } = {}) {
  textarea.value = sample.text;
  updateWordCount();
  if (announce) live.textContent = `Loaded ${sample.label}.`;
}

textarea.addEventListener('input', updateWordCount);
document.getElementById('load-sample-a').addEventListener('click', () => loadSample(SAMPLES.dense));
document.getElementById('load-sample-b').addEventListener('click', () => loadSample(SAMPLES.plain));

// Start with the dense sample so first-time visitors see the problem immediately.
loadSample(SAMPLES.dense, { announce: false });

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
