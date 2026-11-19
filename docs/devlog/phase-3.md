# Phase 3: Building a Zero-Dependency Text Analyzer—What Works and Where Regex Breaks

My Phase 1 benchmark worked perfectly. Then I fed it real lecture notes.

## While building it (reflection-in-action)

I added a messy sample to `data/benchmarks.js`: five sentences full of "Dr.", "e.g.", "Fig. 2", "2.5 ms" and a URL. My splitter counted **13 sentences**. "Dr." became a sentence on its own. The grade fell to 2.9 for clearly dense notes.

So I wrote an abbreviation guard in `js/analyzer.js`. Each fix exposed the next trap. "Ms." is a title, but "2.5 ms." is milliseconds. "etc." sometimes ends a sentence and sometimes does not. I settled on simple rules: a unit after a number may end a sentence, and "etc." ends one only before a capital letter.

Testing caught two bugs I would have shipped. My guard re-scanned the whole text at every period, so 10,000 words took **207 ms**. Scanning locally cut that to **5.9 ms**. Then "Short text. It is easy." scored a grade of **-0.5**, so the shown grade now floors at 0.

After the fixes, the messy sample reads as 5 sentences, grade 6.8 and load 35. All 28 tests in `scripts/test-analyzer.js` pass, and the Phase 1 numbers did not move.

## After testing it (reflection-on-action)

Textbook formulas assume clean prose. Real lecture text has units, citations, code and links. Most of my work was cleaning, not scoring.

A custom parser has real strengths. It is fast, private, offline and easy to test. But it only sees patterns, not meaning. It still counts "processes" as two syllables, and it cannot tell a hard idea from a long word. An NLP library would handle more cases, but it would break the zero-dependency rule in `PROPOSAL.md`.

Next, I would add per-subject word lists, an offline syllable dictionary and user-defined abbreviations.

## Summary

The `feat(analyzer)` commit made the analyzer live with debounced scoring. The `style(ui)` commit added friction badges and an accessible chart in `styles/main.css`. The lesson: a heuristic tool is only as honest as the edge cases you test and the limits you admit.

*Diagram: [`assets/diagrams/phase-3-diagram.html`](../../assets/diagrams/phase-3-diagram.html)*
