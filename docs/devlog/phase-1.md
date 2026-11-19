# Phase 1: Why Dense Technical Writing Creates Hidden Cognitive Friction

I learned to write in CBSE exam prep. The safest answer was the longest one, packed with keywords from the model answer. Years later, I still assumed hard-to-read meant serious.

## While building it (reflection-in-action)

In `data/benchmarks.js`, I wrote one concept, race conditions and deadlock, in two ways. Sample A came out fast. That speed worried me. Dense prose was my default, not my effort.

Writing `scripts/benchmark.js`, I made small calls that shaped the numbers. I stripped the `**bold**` markers so formatting would not count as words. When the passive-voice check flagged all three of Sample A's sentences, I assumed a bug. I checked each sentence by hand. The code was right. My writing was the problem.

Then my own chart failed a colour check. My red and green were too close for red-blind readers. I added hatching to the dense bars.

## After the numbers (reflection-on-action)

The `feat(benchmark)` commit produced this:

- Sentence length: 42.7 → 7.9 words
- Flesch-Kincaid grade: 24.0 → 2.6
- Cognitive load: 96 → 14 (out of 100)
- Jargon density: 18.0% → 10.9%

Jargon fell the least. Sample B still says "thread", "mutex" and "deadlock". Plain English kept the ideas and dropped the friction. Dense writing is not smarter engineering. It moves the work onto the reader, and readers with Dyslexia or ADHD pay the most.

My formula has flaws too. Sample B's bold headings count as short sentences, which flatters it. Grade 24 is beyond what Flesch-Kincaid was built to measure. And I picked the cognitive load weights myself. These numbers describe text, not real readers.

## Summary

Rewriting the same concept cut the reading grade from 24.0 to 2.6 and cognitive load from 96 to 14, while keeping the key technical terms. Density is not depth. Exams taught me to impress a marker. Phase 1 taught me to measure the reader's cost, and to stay honest about what my measurements cannot see.

*Chart: [`assets/diagrams/phase-1-diagram.html`](../../assets/diagrams/phase-1-diagram.html)*
