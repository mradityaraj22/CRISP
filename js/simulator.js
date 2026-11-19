// Visual & Sensory Accessibility Simulator.
// Phase 4: colour-vision filters, visual crowding (Dyslexia spacing stress) and screen glare.
//
// Like analyzer.js, this module has two layers:
//   1. Pure colour maths (no DOM). Node uses it in scripts/test-simulator.js.
//   2. mountSimulator(): the live preview UI. It only touches the DOM when called.
//
// Colour-vision matrices: Machado, Oliveira & Fernandes (2009), "A Physiologically-based
// Model for Simulation of Color Vision Deficiency", severity 1.0. They operate on LINEAR
// RGB, which is why the SVG filters in index.html set color-interpolation-filters="linearRGB".

/* =========================================================================
   1. Colour-vision deficiency (CVD) matrices
   ========================================================================= */

export const CVD_MODES = Object.freeze({
  none: { label: 'Typical vision', note: 'no filter', matrix: null },
  protanopia: {
    label: 'Protanopia', note: 'red-blind, about 1% of men',
    matrix: [
      [0.152286, 1.052583, -0.204868],
      [0.114503, 0.786281, 0.099216],
      [-0.003882, -0.048116, 1.051998],
    ],
  },
  deuteranopia: {
    label: 'Deuteranopia', note: 'green-blind, about 1% of men',
    matrix: [
      [0.367322, 0.860646, -0.227968],
      [0.280085, 0.672501, 0.047413],
      [-0.011820, 0.042940, 0.968881],
    ],
  },
  tritanopia: {
    label: 'Tritanopia', note: 'blue-blind, rare',
    matrix: [
      [1.255528, -0.076749, -0.178779],
      [-0.078411, 0.930809, 0.147602],
      [0.004733, 0.691367, 0.303900],
    ],
  },
  achromatopsia: {
    label: 'Achromatopsia', note: 'no colour, very rare',
    // Every channel becomes relative luminance (Rec. 709 weights, linear light).
    matrix: [
      [0.2126, 0.7152, 0.0722],
      [0.2126, 0.7152, 0.0722],
      [0.2126, 0.7152, 0.0722],
    ],
  },
});

/**
 * Expand a 3x3 RGB matrix into the 5x4 (20 value) form <feColorMatrix type="matrix"> needs:
 *   R' = r1*R + r2*G + r3*B + 0*A + 0
 *   G' = ...
 *   B' = ...
 *   A' = 0*R + 0*G + 0*B + 1*A + 0     (alpha untouched)
 */
export function feColorMatrixValues(matrix) {
  const rows = matrix.map((r) => [...r, 0, 0]);
  rows.push([0, 0, 0, 1, 0]);
  return rows.map((r) => r.map((v) => String(v)).join(' ')).join('  ');
}

/* =========================================================================
   2. Colour maths (sRGB <-> linear, OKLab difference)
   ========================================================================= */

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

export function hexToLinear(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => toLinear(parseInt(h.slice(i, i + 2), 16) / 255));
}

export function linearToHex(rgb) {
  return '#' + rgb.map((c) => Math.round(toSrgb(clamp01(c)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Simulate how a colour looks under a CVD mode. Returns a hex string. */
export function simulateHex(hex, mode) {
  const m = CVD_MODES[mode]?.matrix;
  if (!m) return hex.toUpperCase();
  const l = hexToLinear(hex);
  return linearToHex(m.map((r) => r[0] * l[0] + r[1] * l[1] + r[2] * l[2]));
}

function oklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/**
 * Perceptual colour difference (OKLab distance x 100).
 * Rough guide: under 8 = hard to tell apart, under 3 = practically identical.
 */
export function deltaE(hexA, hexB) {
  const a = oklab(hexToLinear(hexA));
  const b = oklab(hexToLinear(hexB));
  return 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Difference between two colours as seen by someone with the given CVD. */
export function deltaEUnder(mode, hexA, hexB) {
  return deltaE(simulateHex(hexA, mode), simulateHex(hexB, mode));
}

/* =========================================================================
   3. Live simulator UI
   ========================================================================= */

/** Parse **bold** into <strong> safely (text nodes only, never innerHTML). */
function richText(text) {
  const frag = document.createDocumentFragment();
  text.split(/(\*\*[^*]+\*\*)/g).forEach((part) => {
    if (!part) return;
    if (part.startsWith('**') && part.endsWith('**')) {
      const s = document.createElement('strong');
      s.textContent = part.slice(2, -2);
      frag.append(s);
    } else {
      frag.append(document.createTextNode(part));
    }
  });
  return frag;
}

/** The colour-cue strip: the same meaning encoded by colour only vs colour + shape + text. */
const CUES_HTML = `
  <div class="cues">
    <p class="cue-title">Colour only</p>
    <div class="cue-row">
      <span class="cue-dot cue-bad"><span class="visually-hidden">Fail</span></span>
      <span class="cue-dot cue-good"><span class="visually-hidden">Pass</span></span>
      <code class="cue-diff cue-del">lock.release()<span class="visually-hidden"> (removed)</span></code>
      <code class="cue-diff cue-add">lock.tryRelease()<span class="visually-hidden"> (added)</span></code>
    </div>
    <p class="cue-title">Colour + shape + text</p>
    <div class="cue-row">
      <span class="cue-tag cue-bad">✕ Fail</span>
      <span class="cue-tag cue-good">✓ Pass</span>
      <code class="cue-diff cue-del">− lock.release()</code>
      <code class="cue-diff cue-add">+ lock.tryRelease()</code>
    </div>
    <p class="cue-title">LectureLens badges</p>
    <div class="cue-row">
      <span class="badge badge-low">● Low friction</span>
      <span class="badge badge-moderate">◆ Moderate friction</span>
      <span class="badge badge-high">▲ High friction</span>
    </div>
  </div>`;

/**
 * Mount the simulator.
 * @param {{ input: HTMLTextAreaElement, output: HTMLElement, live: HTMLElement }} opts
 */
export function mountSimulator({ input, output, live }) {
  output.classList.remove('placeholder');
  output.innerHTML = `
    <div class="sim-controls">
      <fieldset class="sim-cvd">
        <legend>Colour vision</legend>
        <div class="sim-options"></div>
      </fieldset>
      <fieldset class="sim-stress">
        <legend>Sensory stress</legend>
        <label class="sim-check"><input type="checkbox" name="sim-crowding"> Visual crowding (Dyslexia spacing stress)</label>
        <label class="sim-check"><input type="checkbox" name="sim-glare"> Low-brightness screen glare</label>
      </fieldset>
      <fieldset class="sim-scope">
        <legend>Self-test</legend>
        <label class="sim-check"><input type="checkbox" name="sim-page"> Apply the colour filter to the whole LectureLens page</label>
      </fieldset>
    </div>
    <div class="sim-compare">
      <section class="sim-pane" aria-labelledby="sim-base-h">
        <h4 id="sim-base-h">Accessible baseline</h4>
        <div class="slide-frame"><div class="slide" tabindex="0" aria-label="Baseline preview, scrollable"></div></div>
      </section>
      <section class="sim-pane" aria-labelledby="sim-sim-h">
        <h4 id="sim-sim-h">Simulated view <span class="sim-mode-label"></span></h4>
        <div class="slide-frame slide-frame-simulated"><div class="slide slide-simulated" tabindex="0" aria-label="Simulated preview, scrollable"></div></div>
      </section>
    </div>
    <p class="analyzer-note">Simulations are approximations based on Machado et al. (2009). Real vision varies from person to person.</p>`;

  const options = output.querySelector('.sim-options');
  for (const [key, mode] of Object.entries(CVD_MODES)) {
    const label = document.createElement('label');
    label.className = 'sim-radio';
    label.innerHTML = `<input type="radio" name="sim-cvd"><span class="sim-radio-text"><strong></strong><small></small></span>`;
    const radio = label.querySelector('input');
    radio.value = key;
    radio.checked = key === 'none';
    label.querySelector('strong').textContent = mode.label;
    label.querySelector('small').textContent = mode.note;
    options.append(label);
  }

  const [baseSlide, simSlide] = output.querySelectorAll('.slide');
  const modeLabel = output.querySelector('.sim-mode-label');
  const pageToggle = output.querySelector('input[name="sim-page"]');
  const simFrame = output.querySelector('.slide-frame-simulated');
  const state = { cvd: 'none', page: false, crowding: false, glare: false };

  function renderSlides() {
    const blocks = input.value.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    for (const slide of [baseSlide, simSlide]) {
      slide.replaceChildren();
      const h = document.createElement('p');
      h.className = 'slide-title';
      h.textContent = 'Lecture slide preview';
      slide.append(h);
      if (!blocks.length) {
        const p = document.createElement('p');
        p.className = 'slide-empty';
        p.textContent = 'Paste some text to preview it here.';
        slide.append(p);
      }
      for (const block of blocks) {
        const p = document.createElement('p');
        p.className = 'slide-text';
        p.append(richText(block.replace(/\n/g, ' ')));
        slide.append(p);
      }
      slide.insertAdjacentHTML('beforeend', CUES_HTML);
    }
  }

  function applyFilters() {
    const filter = state.cvd === 'none' ? 'none' : `url(#cvd-${state.cvd})`;
    // In whole-page mode the page filter already covers this pane; filtering twice would distort it.
    const parts = [];
    if (!state.page && state.cvd !== 'none') parts.push(filter);
    // Glare: a washed-out screen lowers contrast and lifts dark tones.
    if (state.glare) parts.push('contrast(0.7) brightness(1.12)');
    simSlide.style.filter = parts.join(' ') || 'none';
    simSlide.classList.toggle('stress-crowding', state.crowding);
    simFrame.classList.toggle('stress-glare', state.glare);
    document.documentElement.style.setProperty('--sim-page-filter', filter);
    document.documentElement.classList.toggle('sim-page', state.page && state.cvd !== 'none');
    const extras = [state.crowding && 'crowding', state.glare && 'glare'].filter(Boolean);
    modeLabel.textContent = `(${[CVD_MODES[state.cvd].label, ...extras].join(' + ')})`;
  }

  function announce() {
    const parts = [`Simulating ${CVD_MODES[state.cvd].label.toLowerCase()}`];
    if (state.page && state.cvd !== 'none') parts.push('on the whole page');
    if (state.crowding) parts.push('with crowded spacing');
    if (state.glare) parts.push('with screen glare');
    live.textContent = parts.join(', ') + '.';
  }

  output.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'sim-cvd') state.cvd = t.value;
    else if (t.name === 'sim-page') state.page = t.checked;
    else if (t.name === 'sim-crowding') state.crowding = t.checked;
    else if (t.name === 'sim-glare') state.glare = t.checked;
    else return;
    applyFilters();
    announce();
  });

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(renderSlides, 150);
  });

  renderSlides();
  applyFilters();

  return {
    update() { clearTimeout(timer); renderSlides(); },
    /** What a screen reader should hear after the preview updates. */
    summary() {
      const paragraphs = baseSlide.querySelectorAll('.slide-text').length;
      const extras = [state.crowding && 'crowded spacing', state.glare && 'screen glare'].filter(Boolean);
      return `Preview updated: ${paragraphs} ${paragraphs === 1 ? 'paragraph' : 'paragraphs'}, ` +
        `${CVD_MODES[state.cvd].label.toLowerCase()}${extras.length ? ' with ' + extras.join(' and ') : ''}.`;
    },
    state,
  };
}
