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

Rubik’s Cube supports **3×3 / 4×4 / 5×5** with all 26/56/98 exterior pieces and 54/96/150 stickers. A legal seeded scramble uses **0–100 turns**, defaulting to 20; larger cubes include inner and wide turns. A dedicated worker searches from the current state, independently of scramble history. The 3×3 stage uses [Kociemba’s two-phase algorithm](https://kociemba.org/math/twophase.htm). The initial puzzle remains inspectable and preparation/search can be cancelled.

| Stage   | Goal                                                                                   |
| ------- | -------------------------------------------------------------------------------------- |
| Phase 1 | Solve corner/edge orientations and place the four equatorial slice edges in that slice |
| Phase 2 | Solve permutations using U/D turns and side-face half turns                            |

For 4×4 and 5×5, deterministic setup commutators first restore canonical center colors and edge groups. The 4×4 corrects reduced orientation/permutation parity where required. The 5×5 groups each wing pair with its middle edge and handles last-wing parity while retaining centers and middle edges. Both then project to a valid 3×3 state, solve it and lift the outer turns. Stage boundaries and the final full-size state are checked; no smaller scene replaces the requested cube.

Every returned move sequence and actual phase boundary is independently checked before a successful replay. The animation shows the verified solution path and phase transitions; it does not record every internal search branch or pruning decision.

A half turn counts as one face turn. The result is **not guaranteed shortest**, and a longer scramble need not require a longer solution. The guide explains iterative deepening, move restrictions, and pruning-table lower bounds without inventing search-node counts.

### Move notation

Face letters stay fixed to the cube: **U** Up, **R** Right, **F** Front, **D** Down, **L** Left, **B** Back. A bare letter is clockwise when looking at that face; `′` means inverse and `2` means a half turn. Camera orbit does not change these meanings.

`2R` is the second layer from R; `Rw` turns the outer two layers together; `3Rw` turns three. A depth range such as `2-3R` turns those layers together. Each layer-span quarter or half turn counts once. The cube guide changes with the selected size. Old links without a size keep their original 3×3 input and seeds.

Forward and reverse stepping turn the correct layer. Scrubbing shows the exact requested state without accumulating rotation drift. Reduced motion snaps directly to the state. Scene selection and **Inspect cubie** expose identities, locations, and stickers, including hidden pieces.

### Implementation attribution

The solver is selectively vendored from [cube.js](https://github.com/ldez/cubejs/tree/6b3da493894d9aed54f4c8aafccadbe676e745b5). Its npm package is not required. [Vendor notes](../src/algorithms/backtracking/rubiks/vendor/README.md) record the pinned revision and local adaptations; its [MIT license](../public/licenses/cubejs-MIT.txt) is included in the deployed site.

## Mirror Cube

The showcase has 26 rigid unequal boxes and a single tactile metallic finish. Each axis uses the same 0.55 / 0.95 / 1.50 partitions, with the mechanism origin at the middle partition's center. These fixed dimensions describe this scene rather than a manufactured product. The six center faces are square. Mesh dimensions never change during turns; signed orientation bases move the home geometry around the mechanism origin.

Search uses the 3×3 correspondence, then an independent physical-box check verifies restoration of the exterior, including visible orientations. Genuine geometric symmetries are accepted. Scrambles use 0–100 face turns, default 20, with a separate deterministic seed stream. Notation and move counts match the 3×3 cube. See [GANCUBE's shape-based correspondence tutorial](https://www.gancube.com/pages/mirror-cube-tutorial).

## Square-1

Eight 60° corners, eight 30° edges and two middle halves retain their rigid square-outline geometry. Two exact twelve-sector rings track wedge identities. `(a,b)` rotates the top clockwise viewed above and bottom clockwise viewed below in 30° units; `/` makes a 180° slice. A corner spanning either cut blocks the slice. Both middle halves remain selectable and their orientation is part of the solved goal. See [Jaap Scherphuis's rules, notation and parity explanation](https://www.jaapsch.net/puzzles/square1.htm).

Phase 1 uses generated shape/parity coordinates (3,678 shapes × two parity classes) and iterative deepening to reach the actual cube-shape/parity goal. Phase 2 searches the corner/edge permutations, layer alignments and middle orientation using generated pruning tables. Search depth and replay length have no imposed ceiling. The solver accepts only current state, checks each legal operation and verifies the complete puzzle before success; results are not guaranteed shortest.

Length 0–100, default 20, counts legal rotation-pair/slice **scramble blocks**. Solution counts use one operation for a nonzero rotation pair and one for a slice; phase markers add none. These counts and cube face turns are different units in comparison.

Coordinate transitions derive from Chen Shuang's [sq12phase at pinned revision da3a445](https://github.com/cs0x7f/sq12phase/tree/da3a445fc103656c4e8668bce9c5c9ac41e26c41), using its MIT license grant. [The attribution and complete license](../public/licenses/sq12phase-MIT.txt) are distributed with the site. This implementation generates its own tables, adds alignment-aware pruning, removes upstream depth/path caps, validates against an independent ring oracle and uses its own exact pose model and scene.
