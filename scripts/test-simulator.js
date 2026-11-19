// Regression tests for the simulator's colour maths. Zero dependencies.
// Run with:  npm test

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CVD_MODES, feColorMatrixValues, simulateHex, deltaE, deltaEUnder } from '../js/simulator.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const SIMULATED = Object.keys(CVD_MODES).filter((k) => CVD_MODES[k].matrix);

test('every CVD mode has an SVG filter in index.html with identical values', () => {
  for (const mode of SIMULATED) {
    const re = new RegExp(`<filter id="cvd-${mode}"[^>]*color-interpolation-filters="linearRGB"[^>]*>\\s*<feColorMatrix type="matrix" values="([^"]+)"`);
    const m = html.match(re);
    assert.ok(m, `missing or wrong colour space for cvd-${mode}`);
    assert.equal(m[1], feColorMatrixValues(CVD_MODES[mode].matrix), mode);
  }
});

test('feColorMatrix values are 5x4 (20 numbers) with alpha untouched', () => {
  for (const mode of SIMULATED) {
    const v = feColorMatrixValues(CVD_MODES[mode].matrix).trim().split(/\s+/).map(Number);
    assert.equal(v.length, 20);
    assert.deepEqual(v.slice(15), [0, 0, 0, 1, 0]);
  }
});

test('white, black and greys survive every simulation (rows sum to about 1)', () => {
  for (const mode of SIMULATED) {
    assert.equal(simulateHex('#FFFFFF', mode), '#FFFFFF', mode);
    assert.equal(simulateHex('#000000', mode), '#000000', mode);
    assert.ok(deltaE(simulateHex('#777777', mode), '#777777') < 1, mode);
  }
});

test('typical vision returns the colour unchanged', () => {
  assert.equal(simulateHex('#b91c1c', 'none'), '#B91C1C');
});

// Findings from Phase 4, locked in so later changes cannot hide them.
// Under 8 = hard to tell apart. These pairs MUST keep a non-colour cue (icon, text or pattern).
test('documented collapses: our own red/green pairs fail without secondary cues', () => {
  assert.ok(deltaE('#B91C1C', '#065F46') > 25, 'clearly different with typical vision');
  assert.ok(deltaEUnder('protanopia', '#B91C1C', '#065F46') < 8, 'light-mode friction vs clarity, protanopia');
  assert.ok(deltaEUnder('achromatopsia', '#B91C1C', '#065F46') < 8, 'light-mode friction vs clarity, achromatopsia');
  assert.ok(deltaEUnder('deuteranopia', '#FCA5A5', '#6EE7B7') < 4, 'dark-mode friction vs clarity, deuteranopia');
  assert.ok(deltaEUnder('achromatopsia', '#6EE7B7', '#9CC3FF') < 8, 'dark-mode Low vs Moderate chart bars');
});

test('typical slide red/green cues collapse (measured, not assumed)', () => {
  // Dots: hard to separate with deuteranopia, identical in greyscale (e.g. a B&W printout).
  assert.ok(deltaEUnder('deuteranopia', '#D32F2F', '#2E7D32') < 8);
  assert.ok(deltaEUnder('achromatopsia', '#D32F2F', '#2E7D32') < 1);
  // ...but protanopia keeps them just apart. The collapse is not universal.
  assert.ok(deltaEUnder('protanopia', '#D32F2F', '#2E7D32') > 8);
  // Pale diff-line backgrounds are practically identical with deuteranopia.
  assert.ok(deltaEUnder('deuteranopia', '#F8C9C5', '#C3E6C6') < 2);
});
