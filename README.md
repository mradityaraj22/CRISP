# LectureLens

A cognitive load and visual accessibility simulator for dense technical and lecture content.

Paste dense text to:

1. **Measure** its readability and cognitive load.
2. **Simulate** how it looks with Protanopia, Deuteranopia, Tritanopia, glare, Dyslexia and ADHD sensory overload.
3. **Restructure** it into short, scannable cards.

Zero dependencies. No backend. Everything runs in your browser.

## Run it

```bash
npm run serve        # then open http://localhost:8080
npm run benchmark    # prints the Phase 1 readability comparison
npm test             # runs all regression tests (no dependencies)
npm run audit        # WCAG contrast + ARIA structure audit (exit code 1 on failure)
```

ES modules do not load from `file://`, so use a local server.
