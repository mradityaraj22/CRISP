# Phase 4: Testing My Own UI Through Colour-Blindness Filters Exposed a Blind Spot

I have typical colour vision. I have never had to wonder whether red and green look different. Phase 4 made me wonder.

## While building it (reflection-in-action)

I added four `<feColorMatrix>` filters to `index.html`: Protanopia, Deuteranopia, Tritanopia and Achromatopsia. The matrices in `js/simulator.js` come from published research (Machado et al., 2009). A test checks that the HTML and JavaScript use identical numbers.

Then I pointed the filters at LectureLens itself. Under Deuteranopia in dark mode, my red "High friction" and green "Low friction" turned into two beige shades. Their colour difference fell from 22.6 to 3.4: practically identical. Only the ▲ and ● icons and the words still told them apart. I had added those in Phase 3 almost as decoration. Every colour in `styles/tokens.css` passed its contrast check. Contrast was never the problem. Hue was.

My chart was not so lucky. In greyscale, "Low" and "Moderate" bars looked the same, because only "High" had a pattern. That became the `fix(analyzer)` commit: dots for Moderate and a level word on every bar.

I was also wrong once. I assumed classic slide red and green collapse for everyone. Measured, they collapse under Deuteranopia and greyscale, but stay just apart under Protanopia. I changed my test to match the data.

## After stepping back (reflection-on-action)

Lecture slides do this constantly. Red means wrong, green means right. Diffs and chart lines differ only by hue. About 1 in 12 men has some colour-vision deficiency. For them, the key meaning simply disappears.

The `feat(sensory)` commit exposed a second habit. Tight, justified text looked "neat" to me. With crowding on, it opened rivers of white space that make lines hard to track.

I designed for eyes like mine because mine were the only eyes I tested with.

## Summary

The `feat(simulator)` commit let me see my own interface through other eyes, and it failed in two places. Colour must never carry meaning alone. Add a shape, a pattern or a word, and test with filters before trusting your own eyes.

*Diagram: [`assets/diagrams/phase-4-diagram.html`](../../assets/diagrams/phase-4-diagram.html)*
