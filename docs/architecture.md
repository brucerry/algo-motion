# Architecture

[Project overview](../README.md) · [Development](development.md) · [Design notes](design-notes.md)

Algorithm Motion is a static React and TypeScript application built with Vite. Three.js and React Three Fiber render the scenes. Computation, state, rendering, controls, and learning content have separate responsibilities.

## Application structure

| Area             | Location                                                          | Responsibility                                                                        |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Engine           | [src/engine](../src/engine)                                       | Typed module/frame contracts, seeds, validation, URLs, traces, timeline, and registry |
| Grid search      | [src/algorithms/grid](../src/algorithms/grid)                     | Shared environment and neighbor rules, search runners, and grid scene                 |
| Motion planning  | [src/algorithms/rrt](../src/algorithms/rrt)                       | 3D sampling, collision checks, tree frames, and RRT/RRT* scenes                       |
| Gradient descent | [src/algorithms/gradient](../src/algorithms/gradient)             | Objective/gradient pairs, descent frames, and surface scene                           |
| Topic algorithms | [src/algorithms](../src/algorithms)                               | Sorting, tree, DP, backtracking, greedy, and array runners and scenes                 |
| Seeded inputs    | [src/algorithms/common](../src/algorithms/common)                 | Deterministic arrays, distinct keys, intervals, and shared input limits               |
| Workers          | [src/workers](../src/workers)                                     | Incremental trace generation and dedicated cube solving                               |
| Shared UI        | [src/components](../src/components) and [App.tsx](../src/App.tsx) | Parameters, viewport, transport, inspection, learning panels, and comparison          |

## Frames and replay

Every displayed frame contains algorithm state, active pseudocode lines, an event, a current-step explanation, and metrics. The renderer consumes one frame and does not execute the algorithm.

[moduleTrace.ts](../src/engine/moduleTrace.ts) chooses among three producers:

- `run` returns immutable indexed frames for eager replay.
- `steps` supplies a pure generator executed by the shared trace worker.
- `createTrace` supplies a custom trace, such as the dedicated cube worker.

Grid search, N-Queens, Insertion/Quick/Merge Sort, In-order Traversal, Coin Change, Sudoku, and RRT* generate steps incrementally in a browser worker. The worker keeps bounded frame caches and regenerates uncached states deterministically when seeking. Cache eviction does not impose a timeline ceiling.

Rubik’s Cube uses a dedicated worker for table preparation and search. Cancellation terminates that worker. It publishes a compact solution path that is independently verified before successful replay. See [the solver explanation](design-notes.md#rubiks-cube-solving-and-replay).

## Parameters and reproducibility

[types.ts](../src/engine/types.ts) defines number, boolean, select, and seed parameters. The same definitions drive the panel and input/URL validation. Numeric definitions declare minimum, maximum, optional step and slider presentation, and optional bounds derived from other parameters.

Accepted inputs are validated before a trace is created. Shared links encode the algorithm and validated parameters. Deterministic streams from [seededRandom.ts](../src/engine/seededRandom.ts) and [seededInputs.ts](../src/algorithms/common/seededInputs.ts) keep environment generation and algorithm samples reproducible.

## Registration and comparison

[registry.ts](../src/engine/registry.ts) holds the module descriptors. Their metadata creates alphabetically sorted topic navigation. Modules supply defaults, presets, pseudocode, education, lazy-loaded scenes, camera framing, and inspection.

[comparison.ts](../src/engine/comparison.ts) chooses every registered module in a topic with multiple entries. Compatible problems share input keys and use their common valid numeric ranges. Other problems retain separate inputs. [comparisonTrace.ts](../src/engine/comparisonTrace.ts) supports one replay timeline while each run preserves its own state and lifecycle.

See [Development](development.md#add-an-algorithm) for the module contract and extension steps.
