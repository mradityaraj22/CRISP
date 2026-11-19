// Visual & Sensory Accessibility Simulator (Phase 3).
// Modes: Protanopia, Deuteranopia, Tritanopia, Low-Brightness Glare,
// Dyslexia Simulation, ADHD Sensory Overload Simulation.

export const SIMULATION_MODES = Object.freeze([
  'none',
  'protanopia',
  'deuteranopia',
  'tritanopia',
  'glare',
  'dyslexia',
  'adhd',
]);

export function applySimulation(/* element, mode */) {
  throw new Error('applySimulation: not implemented until Phase 3');
}
