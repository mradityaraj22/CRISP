# Phase 2: Why Saying "No" to Features Makes a Better Engineering Proposal

My first plan for LectureLens was much bigger. Upload a PDF, run it through a Python OCR backend, send the text to an LLM API, save it to a user account. It sounded impressive. Most of it had nothing to do with readers.

## While drafting it (reflection-in-action)

Writing the "Deliberate Exclusions" table in `PROPOSAL.md` was harder than I expected. Each row felt like giving something up. I hesitated longest over the LLM API, because an AI rewrite would demo well.

Then I filled in the "Why it is out" column. One phrase made the call for me: it sends user text to a third party. LectureLens promises that nothing leaves the browser. I could not keep both.

`styles/tokens.css` forced the same honesty. I did not guess colours. I computed every contrast ratio and wrote it next to its token. Body text reached 15.6:1. My warning red only reached 6.1:1, so I labelled it AA instead of pretending it was AAA. I also kept the old variable names, so the `feat(design-tokens)` commit would not break `main.css`.

## After stepping back (reflection-on-action)

My devlogs are free-flowing. I can write "this felt wrong" and move on. A proposal cannot do that. Every deliverable in `PROPOSAL.md` has an acceptance check someone else can repeat, and every risk needs a mitigation. That discipline exposed vague ideas fast.

The architecture contrast is just as clear. A cloud stack brings servers, keys, bills and privacy duties. A zero-dependency client app has one job: run in the browser. The `feat(shell)` commit shows it. `index.html` has working ARIA tabs, keyboard support and no build step.

Cutting features did not shrink the project. It made every remaining feature testable.

## Summary

Phase 2 turned a wish list into a bounded proposal. I cut cloud LLM APIs, a PDF-OCR backend and user accounts, and wrote down why. What is left runs offline, protects privacy and can be checked line by line. Saying "no" was my most useful decision this phase.

*Diagram: [`assets/diagrams/phase-2-diagram.html`](../../assets/diagrams/phase-2-diagram.html)*
