# Phase 6: Why Passing a Contrast Checklist Is Not Enough for Real Accessibility

I built `scripts/audit.js` to prove LectureLens was accessible. It checks 72 colour pairs from `styles/tokens.css` across four themes, plus the landmarks, tabs and live region in `index.html`. Then I put my mouse away and tested by hand.

## While testing it (reflection-in-action)

I expected the tabs to fail. They did not. The arrow keys I added in Phase 2 moved between all three tabs, and Tab never got stuck.

Two other things did fail. My skip link left focus on `<body>`, so the next Tab started from the wrong place. The audit caught that one on its first run: 66 of 67 checks passed. Adding `tabindex="-1"` to `<main>` fixed it.

The second bug the audit could not see. On the Restructurer tab, I typed a sentence and logged what a screen reader would hear. It announced "Grade 20.0, high friction" from the hidden Analyzer tab. The visible update, "10 points in 4 cards", stayed silent.

The fix was one page-level announcer. Each module now offers a short `summary()`, `js/analyzer.js` stops announcing on its own, and the page speaks only for the visible tab, one second after typing stops.

## After stepping back (reflection-on-action)

The final audit passes 103 of 103 checks. Body text reaches 15.6:1. Yet contrast had zero failures while a real user was hearing the wrong thing. A checklist measures what is easy to count, not whether the interface makes sense.

Many products treat accessibility as a setting. You find "high contrast mode" three menus deep, and the disabled user does the work. LectureLens has no accessibility menu. Strong contrast, keyboard tabs and clear announcements are simply how it works. If the operating system asks for more contrast, the tokens follow automatically.

## Summary

The `feat(audit)` commit made the measurable parts provable. The `fix(a11y)` commit fixed what only a human test revealed. Automated checks are a floor, not a finish line. Test with the keyboard, listen to the announcements, and make the accessible version the only version.

*Diagram: [`assets/diagrams/phase-6-diagram.html`](../../assets/diagrams/phase-6-diagram.html)*
