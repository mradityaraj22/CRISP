# Phase 8: What Preparing LectureLens for Offline Use Taught Me About Real-World Software

Every test so far used clean samples and a working network. Phase 8 asked a harder question: what happens in a basement lecture hall, with a messy paste?

## While hardening it (reflection-in-action)

I added `manifest.json` and a cache-first `sw.js`, registered in `index.html`, then switched my local server off and reloaded. LectureLens still loaded and ran. Two details nearly broke it. `cache.addAll` fails if even one file is missing, so a test now checks every file the page loads is cached. And the first load after an update still ran the old code, so the cache version is now a hash of the files.

Then I pasted a C++ lecture snippet: `#include <vector>`. The study cards showed it correctly, because since Phase 3 every render uses `textContent`, never `innerHTML`. But the Markdown export wrote `<vector>` raw. Any Markdown preview reads that as an HTML tag and deletes it. A pasted `<script>` would land in the file too.

The fix in `js/restructurer.js` escapes `<`, `>` and `&` in every export, and the audit now fails any `innerHTML` built from variables. Stress testing found two more bugs: "naïve" split into "na" and "ve", and a 100,000-word paste blocked the page for 162 ms. Both are fixed in the `fix(hardening)` commit.

## After stepping back (reflection-on-action)

Classroom code assumes clean input, stable Wi-Fi and a short life. It gets graded once and deleted. Industry code assumes the opposite. Inputs are hostile or strange, networks drop, and someone maintains it for years.

None of these fixes added a visible feature. They made the tool trustworthy.

Extending this to a real campus is now realistic. The `feat(pwa)` commit means a university can host LectureLens as static files. Students install it once and use it offline in exam halls, and no text ever leaves their device.

## Summary

Production quality lives in the edge cases: dropped networks, angle brackets, accents and giant pastes. Test for the world your users actually live in, not the clean one you wish they had.

*Diagram: [`assets/diagrams/phase-8-diagram.html`](../../assets/diagrams/phase-8-diagram.html)*
