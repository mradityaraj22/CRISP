# LectureLens: Engineering Project Proposal

| | |
|---|---|
| **Project** | LectureLens: Cognitive Load & Visual Accessibility Simulator |
| **Type** | Open source, client-side web app |
| **Stack** | HTML5, CSS3 (custom properties), vanilla JavaScript (ES modules) |
| **Dependencies** | None at runtime |
| **Delivery** | 9 phases, each with code, Git commits and a devlog |
| **Status** | Phase 2 of 9: architecture and scope approved |

---

## 1. Problem Statement

Lecture slides, handouts and technical docs are often written as long, passive, jargon-heavy paragraphs. That style makes reading slow for everyone. It is hardest for readers with Dyslexia, ADHD, colour-vision deficiency, or English as a second language.

The Phase 1 benchmark (`scripts/benchmark.js`) measured the same OS-concurrency concept written two ways:

| Metric | Dense (A) | Plain (B) | Change |
|---|---:|---:|---:|
| Average sentence length (words) | 42.7 | 7.9 | -82% |
| Flesch-Kincaid grade level | 24.0 | 2.6 | -89% |
| Estimated cognitive load (0-100) | 96 | 14 | -85% |
| Jargon density | 18.0% | 10.9% | -39% |

The technical terms stayed. The friction around them did not. Writers rarely see this cost because no tool shows it to them in one place.

**LectureLens makes the cost visible and fixable:** measure it, show how it feels, and suggest a clearer structure.

## 2. Target Users

| User | Need | What LectureLens gives them |
|---|---|---|
| **Students** | Understand dense notes faster | Plain-English restructuring and Focus reading mode |
| **Educators** | Check slides before class | Readability scores and accessibility simulation |
| **Technical writers** | Evidence for clearer docs | Measurable before/after metrics |
| **Accessibility advocates** | Show the problem to others | Side-by-side Protanopia, Deuteranopia, Tritanopia, Dyslexia and ADHD views |

## 3. Design Principles

1. **Offline-first and private.** Text never leaves the browser.
2. **Zero runtime dependencies.** Open `index.html` through any static server and it works.
3. **Pure core, thin UI.** All metrics live in DOM-free functions (`js/analyzer.js`), shared by the browser and the Node benchmark.
4. **Accessible by default.** WCAG 2.1 AA everywhere, AAA for body text (see `styles/tokens.css`).
5. **Honest metrics.** Every formula and weight is published. Limitations are shown in the interface.

## 4. Verifiable Deliverables (In Scope)

Each deliverable has a check anyone can repeat.

| # | Deliverable | Acceptance check |
|---|---|---|
| D1 | Readability Analyzer | Shows word count, sentence length, syllables per word, Flesch-Kincaid grade, jargon density, passive ratio and cognitive load. Matches `npm run benchmark` output exactly for both samples. |
| D2 | Metrics comparison chart | Accessible SVG chart with a data table fallback. Identity is never colour alone. |
| D3 | Colour-vision simulator | Protanopia, Deuteranopia and Tritanopia via SVG `feColorMatrix` (Machado et al., 2009). Renders in current Chrome, Firefox and Safari. |
| D4 | Glare, Dyslexia and ADHD simulation | Low-brightness glare, Dyslexia crowding and spacing stress, ADHD sensory overload. All motion respects `prefers-reduced-motion`. |
| D5 | WCAG contrast auditor | Reports contrast ratios for text/background pairs, matching the WCAG 2.1 formula to one decimal place. |
| D6 | Plain-English Restructurer | Splits prose into cards with bold anchors and key takeaways. Extractive only: it never invents content. |
| D7 | Focus reading mode | Optional fixation emphasis. Off by default. |
| D8 | Accessible shell | Landmarks, ARIA tabs with arrow-key support, live region, skip link, 44px targets. Fully usable by keyboard. |
| D9 | Documentation | README, this proposal, architecture diagram and 9 devlogs. |

## 5. Deliberate Exclusions (Out of Scope)

These were considered and **rejected on purpose**. They are not "later" features.

| Excluded | Why it is out |
|---|---|
| **External LLM APIs** (for example GPT or Claude rewrites) | Sends user text to a third party, which breaks the privacy promise. Adds cost, network latency, API keys and output we cannot verify. A rule-based restructurer is weaker but testable and honest. |
| **Python PDF-OCR backend** | Needs a server, hosting and a deploy pipeline. OCR errors would pollute every metric downstream. Users can paste text instead. |
| **User accounts and a database** | Storing documents means storing personal data, plus auth, security and GDPR-style duties. Nothing in the core goal needs it. |
| **Frameworks and build tooling** (React, bundlers) | The UI is small. A framework adds weight and a build step without solving a real problem here. |
| **Languages other than English** | Flesch-Kincaid and the syllable heuristic are English-specific. Supporting more languages would need different formulas. |

**Rule for new ideas:** a feature joins the scope only if it runs offline, adds no runtime dependency, and fits inside an existing phase.

## 6. Technical Risk Matrix

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|:-:|:-:|---|
| R1 | **Heuristic readability edge cases.** Syllable counting, abbreviations ("e.g."), code snippets, lists and headings skew scores. | High | Medium | Fixed regression samples in `data/benchmarks.js`. Show "approximate (±1 grade)" in the UI. Strip markdown and code before scoring. Document known failure cases. |
| R2 | **SVG filter cross-browser rendering.** `feColorMatrix` colour space and filter support differ between browsers. Safari is the usual outlier. | Medium | High | Set `color-interpolation-filters` explicitly. Test the same reference swatch in Chrome, Firefox and Safari. Fall back to a CSS `filter` with a visible notice if SVG filters fail. |
| R3 | **Schedule bottlenecks.** Simulator and restructurer are the hardest phases and could overrun. | Medium | High | Each phase ships a working slice. Strict scope rule (section 5). If a phase overruns, cut polish, never tests or accessibility. |
| R4 | **Misleading simulations.** Dyslexia and ADHD views could be read as medically exact. | Medium | Medium | Label them as experiential approximations with a short methodology note. |
| R5 | **Cognitive load score bias.** The weights are author-chosen. | High | Low | Publish the formula and weights. Show each component, not just the total. |
| R6 | **Performance on long text.** Live scoring on every keystroke may lag on very long input. | Low | Medium | Debounce input (about 150 ms). Linear-time algorithms only. Test with a 10,000-word sample. |

## 7. Architecture

```
Text input (textarea / samples)
        │
        ▼
┌──────────────────── Browser only, zero dependencies ────────────────────┐
│  js/analyzer.js      → metrics, grade level, jargon, cognitive load     │
│  js/simulator.js     → SVG feColorMatrix, glare, Dyslexia, ADHD          │
│  js/restructurer.js  → chunked cards, anchors, Focus mode                │
└──────────────────────────────────────────────────────────────────────────┘
        │
        ▼
Accessible output (ARIA tabs, live region, chart + table)

Excluded: Cloud LLM APIs · PDF-OCR server · User auth / database
```

See `assets/diagrams/phase-2-diagram.html` for the full diagram.

## 8. Nine-Phase Milestone Schedule

| Phase | Milestone | Key output | Done when |
|:-:|---|---|---|
| 1 | Problem discovery and benchmarking | `scripts/benchmark.js`, dataset, devlog | Benchmark runs and numbers are published ✅ |
| 2 | Architecture, scope and proposal | `PROPOSAL.md`, `styles/tokens.css`, `index.html` | Proposal merged, accessible shell works by keyboard ✅ |
| 3 | Readability Analyzer and chart | Live analyzer UI | D1 and D2 pass their checks |
| 4 | Colour-vision and glare simulator | SVG filters | D3 passes in three browsers |
| 5 | Dyslexia, ADHD simulation and contrast auditor | Typography stress modes, auditor | D4 and D5 pass |
| 6 | Plain-English Restructurer | Card output | D6 passes on both samples |
| 7 | Focus mode and UX refinements | Focus mode, polish | D7 and D8 pass a keyboard-only and screen-reader walkthrough |
| 8 | Testing and accessibility audit | Regression tests, audit report | All acceptance checks pass. No known AA failures. |
| 9 | Documentation and retrospective | README, architecture docs, final devlog | D9 complete, v1.0 tagged |

## 9. Success Criteria

- Every deliverable in section 4 passes its acceptance check.
- The app works with the network turned off.
- Lighthouse accessibility score of 100 on the main page.
- No runtime dependencies in the shipped code.
