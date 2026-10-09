# Design notes

[Project overview](../README.md) · [User guide](user-guide.md) · [Architecture](architecture.md)

## Visual style and progress characters

The paper-notebook theme uses drawn controls, handwriting headings, and stationary colorful stickers. A saved chalkboard theme provides the dark alternative. Scene geometry keeps its algorithm meaning: grids retain cells, obstacles retain their collision shape, and optimization surfaces retain their mathematical form. Rounded edges and tactile surface textures add detail to those shapes.

The small server in Pseudocode moves from ready to working to playfully burned out at the end. Its meter advances with the displayed step, and its screen scans during playback. Walking shoes in Current step follow that same step. These characters make progress visible; the outcome badge and explanation communicate whether the algorithm succeeded, exhausted its choices, reached a budget, was cancelled, or failed.

Optional step sounds start muted and accompany playback or individual stepping. Seeking and switching experiments stay silent so inspecting a previous state does not trigger a sequence of cues.

The heading font is [Patrick Hand](https://github.com/google/fonts/tree/main/ofl/patrickhand), distributed under the SIL Open Font License. [Its license](../public/licenses/PatrickHand-OFL.txt) is included in the site. Text, code, and formulas retain readable fallback fonts.

## Camera motion

The shared camera allows continuous horizontal and vertical rotation through both poles while retaining OrbitControls drag sensitivity, damping, pan, and immediate wheel zoom. Drag directions follow the current view, including upside-down and rolled views; rotation axes update with each new orientation.

Camera orientation is independent of algorithm coordinates. A cube face letter or a path-planning axis retains its meaning as the camera moves. Top, Side, and default perspective presets restore an upright view.

The controls are adapted from three-stdlib 2.36.1. The [vendor notes](../src/visual/vendor/README.md) describe the local adaptations, and its [MIT license](../public/licenses/three-stdlib-MIT.txt) is distributed with the site. This preserves the familiar interaction while allowing the full rotation used by the scenes.

## Rubik’s Cube solving and replay

The full **3×3 cube** includes all 26 exterior cubies and 54 stickers. A legal seeded scramble uses **0–100 face turns**, defaulting to 20. A dedicated worker prepares pruning tables and searches with [Kociemba’s two-phase algorithm](https://kociemba.org/math/twophase.htm). The initial cube remains inspectable while it works, and solving can be cancelled.

| Stage   | Goal                                                                                   |
| ------- | -------------------------------------------------------------------------------------- |
| Phase 1 | Solve corner/edge orientations and place the four equatorial slice edges in that slice |
| Phase 2 | Solve permutations using U/D turns and side-face half turns                            |

Every returned move sequence and actual phase boundary is independently checked before a successful replay. The animation shows the verified solution path and phase transitions; it does not record every internal search branch or pruning decision.

A half turn counts as one face turn. The result is **not guaranteed shortest**, and a longer scramble need not require a longer solution. The guide explains iterative deepening, move restrictions, and pruning-table lower bounds without inventing search-node counts.

### Move notation

Face letters stay fixed to the cube: **U** Up, **R** Right, **F** Front, **D** Down, **L** Left, **B** Back. A bare letter is clockwise when looking at that face; `′` means inverse and `2` means a half turn. Camera orbit does not change these meanings.

Forward and reverse stepping turn the correct layer. Scrubbing shows the exact requested state without accumulating rotation drift. Reduced motion snaps directly to the state. Scene selection and **Inspect cubie** expose identities, locations, and stickers, including hidden pieces.

### Implementation attribution

The solver is selectively vendored from [cube.js](https://github.com/ldez/cubejs/tree/6b3da493894d9aed54f4c8aafccadbe676e745b5). Its npm package is not required. [Vendor notes](../src/algorithms/backtracking/rubiks/vendor/README.md) record the pinned revision and local adaptations; its [MIT license](../public/licenses/cubejs-MIT.txt) is included in the deployed site.
