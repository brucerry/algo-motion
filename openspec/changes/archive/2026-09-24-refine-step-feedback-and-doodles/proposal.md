# Proposal

## Why

The free-floating doodles distract from the algorithm and can crowd content, while some pale sticker fills blend into the paper or chalkboard theme. The learning panels also need more playful feedback that follows the algorithm's steps without replacing the precise explanation and metrics.

## What Changes

- **BREAKING (visual behavior):** Remove the free-floating, spinning, collision-reactive doodle layer. Keep the intentionally placed stickers around the workbench.
- Revise sticker colors, ink outlines, and small drawn details so pale yellow and white motifs remain distinct from nearby surfaces in both themes.
- Add an opt-in, initially muted sound control. Once enabled, short cues accompany displayed playback steps and explicit manual forward/backward steps; silence remains available at any time.
- Add a hand-drawn computer server to the pseudocode panel. It starts ready, works as the run progresses, and reaches a playful burnout pose at the final frame.
- Add walking shoes to the Current step panel. Their pose follows frame movement and settles when stepping stops.
- Keep both characters decorative: pseudocode, explanation, metrics, outcome, controls, and responsive layout remain readable with sound off or reduced motion enabled.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `hand-drawn-visual-language`: Replace the floating-sticker behavior with placed, visually distinct doodles across both themes.
- `simulation-workbench`: Add optional per-step audio linked to the shared timeline.
- `learning-inspection`: Add frame-linked server and walking-shoe illustrations to the two learning panels.

## Impact

The change affects the decorative SVG kit and styles, the existing floating-sticker component and motion helpers, the shared timeline UI in `src/App.tsx`, and the pseudocode and Current step panels. It may add a small local audio helper and updates browser tests, screenshots, and documentation. Algorithm calculations, frame data, URL sharing, and the static deployment model remain unchanged.
