# Phase 7: Navigating Blunt Peer Feedback and Fixing Designer Blind Spots

Until now, the only person who had used LectureLens was me. In Phase 7, I shared the live browser build with two peers and let them test it without guidance.

## While watching (reflection-in-action)

One peer loaded the dense sample, looked at the Analyzer and asked: "What does Grade 24.0 actually mean I should do?"

My first reaction was defensive. I wanted to explain Flesch-Kincaid, the syllable counter and the ±1 grade caveat. I stopped myself. The question was not about my maths. The number was correct, but it told nobody what to change.

So I listened instead of explaining. Three issues came out of the session:

- Raw numbers had no meaning attached.
- The study cards replaced the original, so there was no way to check them.
- New testers did not know which text to try.

The `feat(ux)` commit adds a verdict banner to `js/analyzer.js`. Sample A now reads "Dense academic wall: break it into shorter sentences, one idea each", followed by three concrete fixes. Every number gets a plain line too: 24.0 becomes "Postgraduate level, beyond the scale". The same commit puts four named presets above the text box in `index.html`, styled in `styles/main.css`.

The `feat(diff)` commit adds a side-by-side view to `js/restructurer.js`. The original sits next to the cards, with its 48-word sentence highlighted.

## After stepping back (reflection-on-action)

Polite praise feels good, but it gives me nothing to fix. One blunt question did more than any compliment.

The deeper lesson is designer myopia. I knew every metric, so I never explained one. I trusted my fidelity check, so I hid the source. Sample A was always loaded while I coded, so I never experienced a first visit. Each blind spot came from knowing too much.

## Summary

Two peers and one honest question exposed three blind spots I could not see alone. Feedback that stings is often the most useful kind. Put your work in front of real people early, and listen before you defend.

*Diagram: [`assets/diagrams/phase-7-diagram.html`](../../assets/diagrams/phase-7-diagram.html)*
