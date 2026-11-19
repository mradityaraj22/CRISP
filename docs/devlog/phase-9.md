# Phase 9: Nine Phases Later—What Building LectureLens Taught Me About Engineering for Humans

The last job was the README. It was the hardest test of the project.

## While writing it (reflection-in-action)

My first instinct was to describe features as I built them: "SVG `feColorMatrix` colour-vision simulation" and "Flesch-Kincaid grade 24.0". A lecturer would stop reading there.

So I translated. The simulator became "shows your text the way about 1 in 12 men see colour". Grade 24.0 became "postgraduate level". The opening of `README.md` now has no code terms, and three steps get a teacher from a link to a verdict in 30 seconds.

Writing the limits section was harder. `PROPOSAL.md` now ends with an honest scorecard: 6 of 9 deliverables fully done, 3 partial. The ADHD simulation I promised in Phase 2 was never built. I wrote that down instead of hiding it.

## Looking back (reflection-on-action)

In Phase 1, `scripts/benchmark.js` measured my own writing habit: cognitive load 96 for dense prose, 14 for plain. That habit came from CBSE exams, where longer answers looked smarter.

Across 32 commits, the habit that replaced it was measuring before claiming. I measured colour differences instead of trusting my eyes, and milliseconds instead of guessing. `scripts/audit.js` passes 106 checks, yet I still found two bugs only by testing with a keyboard. And `sw.js` was only "offline ready" once I switched the server off and watched it load.

v1.0 still has real limits. Syllables are guessed by rules. The restructurer can split and label text, but it cannot explain anything. Two peers tested it, but no real class has. Next time, I would put real users in Phase 1, not Phase 7.

These lessons travel. In future AI work, I will check every model output against its source, just as the fidelity check does. And I will make accessibility the default, not a setting.

## Summary

LectureLens began as a test of my own writing and ended as an offline tool with zero dependencies, 66 tests and an honest list of what it cannot do. The biggest change was not in the code. It was learning to measure, to listen, and to write for the person reading.

*Diagram: [`assets/diagrams/phase-9-diagram.html`](../../assets/diagrams/phase-9-diagram.html)*
