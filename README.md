# LectureLens

**See how hard your lecture notes are to read, see them the way other readers see them, and turn them into short, clear study cards. Free, private, and it works without internet.**

---

## For lecturers and students: what is this?

You paste in some text: lecture notes, a handout, a slide, a page of documentation.

LectureLens then tells you three things:

1. **How hard it is to read**, in plain words. For example: *"Dense academic wall. Break it into shorter sentences, one idea each."* It also tells you what to fix first.
2. **How it looks to other people.** About 1 in 12 men cannot tell some colours apart. LectureLens shows your text and colour labels the way they see them. It can also show how crowded text or a glaring screen feels to read.
3. **A clearer version.** It splits long, tangled paragraphs into short points on study cards, with the key idea at the top. **It never changes your words.** It only splits and labels them, and it checks that every word is still there.

Your text never leaves your computer. There is no account, no upload and no tracking. After the first visit, LectureLens keeps working with no internet at all.

### Try it

1. Open LectureLens on your own computer (two minutes, see [Run it on your own computer](#run-it-on-your-own-computer)).
2. Click **"Sample A: OS Concurrency"** at the top. It is a real, dense textbook paragraph.
3. Read the red **Verdict** box. Then click **"Restructure this text →"** to see the same paragraph as study cards.

To check your own material, paste it into the big text box. Everything updates as you type.

### What each part does

| Tab | In plain words | Good for |
|---|---|---|
| **Readability Analyzer** | Gives a reading level (like "Postgraduate level"), the average sentence length and how much technical vocabulary there is, then a verdict and the top fixes. | Checking a handout before you share it |
| **Visual Simulator** | Shows your text as people with colour-blindness see it, plus crowded spacing (common difficulty for readers with Dyslexia) and screen glare. | Checking slides that use red/green or tight spacing |
| **Plain-English Restructurer** | Splits long sentences into short points, names each point, picks a key takeaway, and lets you compare with the original. Optional Focus mode bolds the start of each word. Copy or download the result as notes. | Turning dense notes into revision cards |

---

## Does it actually help? The evidence

The same computer-science concept (race conditions and deadlock), written two ways and measured by [`scripts/benchmark.js`](scripts/benchmark.js):

| Measure | Sample A: dense textbook style | Sample B: plain, structured | Change |
|---|---:|---:|---:|
| Average sentence length | 42.7 words | 7.9 words | −82% |
| Reading grade (Flesch-Kincaid) | 24.0 (postgraduate+) | 2.6 (primary school) | −89% |
| Technical terms per 100 words | 18.0 | 10.9 | −39% |
| Estimated cognitive load (0–100) | **96** | **14** | **−85%** |

Both versions keep the key technical terms. Plain English removed the friction, not the ideas.

**LectureLens itself is built to be accessible,** and this is checked automatically by [`scripts/audit.js`](scripts/audit.js):

| Check | Result |
|---|---|
| Body text contrast | 15.6 : 1 light, 17.0 : 1 dark (WCAG AAA needs 7 : 1) |
| Secondary text contrast | 8.2 : 1 (AAA) |
| Colour pairs audited | 72 across light, dark and high-contrast themes |
| Status shown by colour alone | None. Every badge has an icon and a word. |
| Keyboard | All tabs and controls work with Tab, arrow keys, Home and End |
| Screen readers | One polite announcement for the visible tab |
| Total | **106 / 106 audit checks pass**, **66 / 66 tests pass** |

---

## Features

- **Live readability analysis:** reading grade with a plain-English meaning, sentence length, jargon density, passive voice and a published cognitive load formula, with a colour-blind-safe chart.
- **Colour-vision simulation:** Protanopia, Deuteranopia, Tritanopia and Achromatopsia using research-based colour matrices (Machado et al., 2009).
- **Sensory stress simulation:** visual crowding (Dyslexia spacing stress) and low-brightness screen glare.
- **Rule-based restructuring:** study cards, bold anchors, a key takeaway and a before/after view. A built-in check proves every original word is kept, in order.
- **Focus mode:** optional bionic-style reading, off by default.
- **Export:** copy or download notes as Markdown, safely escaped.
- **Offline and installable:** a service worker caches the whole app. It can be installed like an app.
- **Private by design:** no server, no accounts, no network calls with your text.
- **Zero dependencies:** plain HTML, CSS and JavaScript. Nothing to install to use it.

---

## Run it on your own computer

You need a browser and any simple local web server. (Opening `index.html` directly does not work, because browsers block JavaScript modules on `file://`.)

```bash
git clone https://github.com/mradityaraj22/CRISP.git
cd CRISP
python3 -m http.server 8080
```

Then open **http://localhost:8080**. After that first visit, LectureLens works offline.

**Install it as an app:** in Chrome or Edge, use the install icon in the address bar. On a phone, use "Add to Home Screen".

### For developers

Node.js is only needed for the checks, not for the app.

```bash
npm test             # 66 regression tests (node:test, no dependencies)
npm run audit        # WCAG contrast + ARIA structure + XSS rules (exit 1 on failure)
npm run benchmark    # the Phase 1 readability comparison table
npm run stamp        # re-hash sw.js after changing any cached file
```

### Architecture

```
index.html ── js/app.js  (wires the page, one screen-reader announcer, tabs)
               ├── js/analyzer.js      readability engine + verdicts + chart       (pure core, Node-testable)
               ├── js/simulator.js     colour matrices + crowding + glare preview
               └── js/restructurer.js  clause splitter, anchors, takeaway, Focus mode, export
            styles/tokens.css   WCAG-checked design tokens (light, dark, more-contrast)
            sw.js + manifest.json   offline cache-first service worker, installable app
            data/benchmarks.js  Samples A–D        scripts/  tests, audit, benchmark, stamp
```

Every module keeps its logic in pure functions with no DOM access, so the same code runs in the browser and in the Node tests. User text only ever reaches the page through `textContent`, and the audit fails any `innerHTML` built from variables.

---

## Known limitations

LectureLens v1.0 is honest about what it cannot do:

- **Readability scores are estimates.** Syllables are counted by rules, not a dictionary, so the grade is about ±1 level. Some words are miscounted ("processes" counts as 2 syllables). These are listed in the tests as known limits.
- **It reads patterns, not meaning.** It cannot tell a hard idea from a long word.
- **English only**, and the jargon list knows computer science best.
- **The restructurer only splits and labels.** It cannot explain a concept or rewrite a confusing definition. That is deliberate: it never changes your words.
- **Simulations are approximations.** Real vision and reading experiences vary from person to person.
- **Not built yet:** the ADHD sensory-overload simulation promised in [`PROPOSAL.md`](PROPOSAL.md), and a contrast checker for *your own* colours.
- **Not yet tested:** Firefox, Safari, a real screen reader (VoiceOver or NVDA), and installation on phones.
- **Very long documents** show cards for the first ~20,000 words only, with a clear notice.

## v2.0 roadmap

1. ADHD sensory-overload simulation (motion and competing-attention stress), respecting reduced-motion settings.
2. A contrast checker where you paste your own slide colours.
3. Per-subject jargon lists (biology, law, maths) and user-defined abbreviations.
4. An offline syllable dictionary for common words.
5. Cross-browser and real screen-reader testing, plus a Lighthouse accessibility score.
6. A proper user study with a real class, beyond the two-peer test in Phase 7.

---

## How it was built

LectureLens was built in nine phases, each with working code, small Git commits and a reflective devlog. Each devlog is in [`docs/devlog/`](docs/devlog/) as Markdown and as a Word document with diagrams.

| Phase | Focus | Devlog |
|:-:|---|---|
| 1 | Benchmarking dense vs plain writing | [phase-1.md](docs/devlog/phase-1.md) |
| 2 | Scope, proposal and design tokens | [phase-2.md](docs/devlog/phase-2.md) · [PROPOSAL.md](PROPOSAL.md) |
| 3 | Live readability analyzer | [phase-3.md](docs/devlog/phase-3.md) |
| 4 | Colour-vision and sensory simulator | [phase-4.md](docs/devlog/phase-4.md) |
| 5 | Rule-based restructurer and Focus mode | [phase-5.md](docs/devlog/phase-5.md) |
| 6 | Accessibility audit and keyboard testing | [phase-6.md](docs/devlog/phase-6.md) |
| 7 | Peer usability testing and v2 UX | [phase-7.md](docs/devlog/phase-7.md) |
| 8 | Offline PWA and input hardening | [phase-8.md](docs/devlog/phase-8.md) |
| 9 | Documentation and v1.0 release | [phase-9.md](docs/devlog/phase-9.md) |

See [`CHANGELOG.md`](CHANGELOG.md) for every change by phase.

## Licence

[MIT](LICENSE). Free to use, change and share, including in teaching.
