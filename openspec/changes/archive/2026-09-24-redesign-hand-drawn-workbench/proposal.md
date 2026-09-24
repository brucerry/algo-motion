# Proposal

## Why

The current dark, geometric dashboard feels generic and detached from the playful, exploratory way this site should teach algorithms. A lively hand-drawn visual identity, including the sort of unrelated little pictures children add to a notebook, can give the site a distinct personality while keeping the algorithm explanations precise and readable.

## What Changes

- Begin with the page background and buttons: use a warm illustrated paper canvas with visible doodle patterns, and give prominent controls hand-cut shapes, marker fills, drawn icons, and expressive interaction states.
- Scatter a varied collection of childlike stickers around the entire workbench, including playful motifs unrelated to algorithms such as suns, clouds, flowers, stars, and squiggles. Let them overlap safe margins and panel edges without covering content or intercepting controls.
- Add more doodle motifs and a few gently floating, spinning stickers that bounce away from visible workbench elements, viewport edges, and the mouse cursor; keep them still for reduced-motion users.
- Carry the same illustrated language through navigation, timeline, learning panels, legends, empty and error states, and all five algorithms' 3D scenes; use distinct marks and shapes to reinforce algorithm states.
- Make the light theme the default illustrated notebook and retain a complementary dark chalkboard theme, including persisted theme choice.
- Keep controls, text, mathematical notation, focus states, and algorithm state cues legible at desktop and mobile sizes. Refresh documentation screenshots after implementation.
- Preserve algorithm logic, parameters, simulation behavior, URL sharing, and GitHub Pages delivery.

## Capabilities

### New Capabilities

- `hand-drawn-visual-language`: Consistent notebook-inspired styling for backgrounds, buttons, icons, decorative stickers, the rest of the workbench, and 3D scenes, including readable interaction and simulation states.

### Modified Capabilities

None. Existing behavior contracts for navigation, simulation, learning content, and accessible operation remain applicable.

## Impact

The change primarily affects `src/styles.css`, shared workbench markup and action icons in `src/App.tsx` and `src/components/`, and the grid, RRT, and gradient-descent scene renderers. It will add local vector stickers and icon assets, may add a local font, update screenshot documentation, and extend visual and accessibility browser checks. The simulation engine, algorithm math, parameter schemas, and URL format need no changes.
