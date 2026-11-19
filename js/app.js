// UI entry point. Wires DOM events to the pure modules.
import { SAMPLES } from '../data/benchmarks.js';

const textarea = document.getElementById('source-text');
const live = document.getElementById('live-region');

function load(sample) {
  textarea.value = sample.text;
  live.textContent = `Loaded: ${sample.label}`;
  textarea.focus();
}

document.getElementById('load-sample-a').addEventListener('click', () => load(SAMPLES.dense));
document.getElementById('load-sample-b').addEventListener('click', () => load(SAMPLES.plain));
