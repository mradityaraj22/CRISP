# Phase 5: Why Deterministic Text Chunking Beats AI Rewriting for Technical Notes

The obvious way to simplify lecture notes today is to ask an AI to rewrite them. I chose not to. Phase 5 showed me why.

## While building it (reflection-in-action)

`js/restructurer.js` follows one rule: it may split, label and tidy punctuation, but it never adds, drops or changes a word. `checkFidelity()` proves this on every render. For Sample A it reports 128 of 128 words kept, in order. The Restructurer tab in `index.html` shows that line live.

The clause splitter cuts at markers like ", whereby" and keeps the marker at the start of the next point, so the logic survives. Sample A's 48-word sentence became points of 16 words each. One point stayed at 24 words because it had no comma to cut at. I left it rather than guess.

Focus mode surprised me. My first attempt ran a regex over the card HTML. It bolded inside tags (`<<b>l</b>i>`), split entities (`&#<b>3</b>9;`) and broke "2.5" and "e.g.". I rewrote it as a tokenizer that only touches text nodes and skips code, numbers and acronyms.

Then a second problem appeared. With every word half-bold, my bold anchors vanished. In `styles/main.css`, Focus mode now moves each anchor onto its own line.

## After stepping back (reflection-on-action)

An AI summary is fluent, but it can quietly swap "mutual exclusion" for "locking", or drop the "although" that carries a warning. In engineering notes, the exact term is the fact. A rule-based tool is less clever, but it is fast, private, offline and checkable.

The trade-off is real. My restructurer cannot explain a concept or fix a confusing definition. It can only expose structure that was already there.

This phase was about translating HCI ideas into code. Chunking became one idea per point. Visual hierarchy became one strong takeaway on top and quiet cards below.

## Summary

The `feat(restructurer)` and `feat(focus-mode)` commits turn dense prose into scannable cards without changing a single word. For technical notes, faithful beats fluent.

*Diagram: [`assets/diagrams/phase-5-diagram.html`](../../assets/diagrams/phase-5-diagram.html)*
