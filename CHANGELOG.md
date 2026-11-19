# Changelog

All notable changes to LectureLens, grouped by build phase. Each phase also has a devlog in [`docs/devlog/`](docs/devlog/).

## [1.0.0] - 2026-11-19

First stable release. 0 runtime dependencies, 66 tests, 106 accessibility audit checks, works offline.

### Phase 9: Documentation and release
- `docs(readme)` Plain-English guide for lecturers and students, evidence tables, setup, limitations, roadmap. Honest v1.0 status added to `PROPOSAL.md`.
- `chore(release)` Version 1.0.0, MIT `LICENSE` file, this changelog, version label in the footer.

### Phase 8: Offline and hardening
- `feat(pwa)` Cache-first service worker (`sw.js`), web app manifest, app icons, offline badge, cache-completeness tests, content-hash cache versioning (`npm run stamp`).
- `fix(hardening)` Markdown export escapes `<`, `>`, `&` (pasted `<vector>` no longer vanishes); Unicode-aware words (naïve, café); large-paste guard (no task over 50 ms at 100,000 words); audit rule against `innerHTML` built from variables.

### Phase 7: Peer usability testing
- `feat(ux)` Plain-English verdict banner and meaning under every metric; four one-click sample presets; Sample C algorithm handout (messy notes became Sample D).
- `feat(diff)` Side-by-side original vs study cards, longest sentence highlighted.

### Phase 6: Accessibility audit
- `feat(audit)` `scripts/audit.js`: WCAG contrast for every token pair in every theme, ARIA structure, source rules.
- `fix(a11y)` Skip link now moves focus; one live-region announcer for the visible tab; automatic OS "more contrast" support.

### Phase 5: Restructurer
- `feat(restructurer)` Rule-based clause splitter, semantic anchors, key takeaway, study cards, fidelity check.
- `feat(focus-mode)` Bionic-style Focus mode with a safe text-node tokenizer; Markdown copy and download.
- `fix(focus-mode)` Anchors stay distinct when Focus mode bolds every word.

### Phase 4: Visual simulator
- `feat(simulator)` SVG `feColorMatrix` filters for four colour-vision deficiencies; whole-page self-test.
- `feat(sensory)` Visual crowding (Dyslexia spacing stress) and screen glare toggles.
- `fix(analyzer)` Chart levels use patterns and words, not colour alone.

### Phase 3: Live analyzer
- `feat(analyzer)` Real-time readability and cognitive load engine with an abbreviation-aware sentence splitter (13 → 5 sentences on messy notes) and 28 regression tests.
- `style(ui)` Responsive metric cards, friction badges, focus states.

### Phase 2: Architecture and scope
- `feat(design-tokens)` WCAG 2.1 colour, type and spacing tokens with computed contrast ratios.
- `feat(shell)` Semantic HTML5 layout and keyboard-accessible module tabs.
- `docs(proposal)` Bounded engineering proposal with exclusions, risk matrix and schedule.

### Phase 1: Benchmark
- `chore(init)` Repository scaffold.
- `feat(benchmark)` Readability dataset and comparison script: cognitive load 96 vs 14.
