# Design

## Context

The repository contains `instruction.md` and OpenSpec files, with no application code or existing specs. The product must run entirely in a browser, build with npm, and deploy under a GitHub Pages repository path. See `proposal.md` for motivation and the eight delta specs for observable behavior.

## Goals / Non-Goals

**Goals:**

- Make algorithm computations deterministic and independent of React and Three.js.
- Give every algorithm the same transport, parameter, learning, URL, and inspection infrastructure while allowing distinct state and renderer types.
- Keep scene updates responsive for bounded workloads and permit future algorithm modules without a central algorithm switch.
- Establish an A* end-to-end reference before adding the other algorithm families.

**Non-Goals:**

- A backend, accounts, or cloud-saved experiments.
- Scientifically comparable execution-time benchmarks.
- Implementing the future algorithm catalog or true voxel-grid pathfinding in this initial change. Grid searches use a 2D logical grid rendered in a manipulable 3D scene; RRT and gradient descent use genuinely 3D scenes.
- Making PWA support a release gate. It can follow once core behavior and Pages deployment are stable.

## Decisions

### 1. Module contract and registration

Use React + TypeScript + Vite for the shell, React Three Fiber/Three.js and drei for scenes, Tailwind CSS for UI, and KaTeX for formulas. An algorithm module exports metadata, a typed parameter schema and defaults, presets, educational content, pseudocode, a pure deterministic run function, frame metrics/inspection selectors, and a lazily loaded renderer. A registry holds these module descriptors and produces navigation and routes. Shared components consume a type-erased registry boundary but each module keeps strongly typed parameters and state internally. Distinct renderer components may share grid, tree, surface, path, and marker primitives.

This keeps the core independent of scene objects. Alternatives considered: algorithm logic inside React scenes, which couples correctness to rendering; and one universal scene component, which would accumulate family-specific branches.

### 2. Frame model and playback

Each run produces immutable, indexed frames with a serializable algorithm state, active pseudocode line IDs, a concise explanation, event type, and metric values. The timeline stores the selected frame index, play state, and speed; it never mutates previous frames. Playback uses elapsed time to advance at the chosen rate and stops at the final frame. Scrubbing pauses and displays an existing frame immediately. Changing algorithm or valid parameters creates a new run and resets selection and timeline. Renderers interpolate only visual transitions between discrete states, and honor reduced-motion preferences.

For the bounded initial algorithms, precomputing frames makes reverse stepping, scrubbing, and deterministic replay straightforward. Alternative: a streaming generator with checkpoints, which saves memory for very large runs but complicates arbitrary backward seeks. Define the run boundary so checkpointing can replace precomputation later if measured memory use warrants it.

### 3. Parameter, seed, and URL handling

A discriminated schema drives controls and validates finite numeric ranges, select membership, booleans, and integer seeds. Validate at input, URL decoding, preset loading, and run entry. Keep draft values separate from accepted values so invalid input never reaches a simulation; debounce slider commits. Use a deterministic seeded PRNG with independent, stable derivation for environment generation and algorithm sampling. Use hash-based algorithm routes with query parameters, canonical serialization, and schema-based decoding. Explicit URL values override locally stored preferences; invalid values fall back to defaults with an inline notice. Store only lightweight preferences in localStorage.

Alternative: browser randomness and bespoke per-algorithm forms, which would break replay and extension. Do not serialize frame arrays or camera pose into the URL.

### 4. Grid-search semantics

Build one seeded grid-environment generator shared by BFS, Dijkstra, A*, and comparison. Start and goal are reserved before placing obstacles. Orthogonal moves cost one; diagonal movement uses consistent geometry and cannot cut blocked corners. BFS optimizes hop count on uniform-cost grid runs. Dijkstra uses nonnegative costs, including deterministic weighted modes. A* offers Manhattan, Euclidean, and Chebyshev choices plus a weight; show an optimality guarantee only when the chosen heuristic is admissible for the movement/cost model and weight is one. A* with weight above one is explicitly presented as a speed/optimality trade-off. Tests use small known maps and a reference shortest-path cost to verify outputs.

Alternative: three separate environment generators, which could produce incomparable maps and drift in movement rules.

### 5. 3D RRT and surface descent

RRT uses bounded 3D coordinates, a seeded sample stream, nearest-node selection, bounded steering, obstacle-segment intersection checks, and explicit collision checking on the goal connection. Store parent IDs and cumulative costs for inspection and path reconstruction. Show rejected attempts as frame events without inserting invalid edges. Gradient descent defines objective and analytic gradient together for each supported surface, then records point, gradient, value, movement, and stopping reason per iteration. Bounds and non-finite checks stop runaway simulations with a readable error.

Alternative: visual-only RRT growth or numerical differentiation for all surfaces. Both would weaken correctness and reproducibility of the initial teaching examples.

### 6. Scene and application composition

The shell is desktop-first with algorithm navigation, a dominant 3D viewport, schema-driven parameters, transport, pseudocode, explanation/metrics, and educational content. On narrow screens, secondary panels become tabs or drawers. Scene modules expose selection events to a shared inspection panel. Cameras use orbit/pan/zoom controls plus presets and scoped pointer handling. Repeated grid cells, nodes, and markers use instancing where it materially reduces draw calls; stable geometries and materials are reused. Frame selection updates scene instance data without rebuilding the full React tree on every animation tick. Use lazy imports for algorithm modules and renderers.

Alternative: a single global scene for every algorithm. Separate scene adapters let graph grids, trees, and surfaces evolve independently.

### 7. Comparison and educational data

Comparison reuses one generated grid and runs all three searches independently against it. A shared index selects each run's frame at that index or its terminal frame if shorter; per-run progress remains visible. Show visited nodes, steps, path hops, and weighted cost when applicable. Educational content lives alongside each module, with references labeled as original research, later variants, or this site's implementation choice. Formula text has a readable fallback and metric/explanation panels expose state independently of animation.

Alternative: forcing all three into one mutable simulation, which risks cross-contamination of search state.

### 8. Build, tests, and deployment

Use a deterministic package lock, npm scripts for development, tests, and production build, and unit tests for the pure engine, algorithms, URL codec, and timeline. Add a small browser smoke check for route loading and core playback if practical. Configure Vite's base path for the repository name (with an environment override for other Pages paths), use hash routing for direct links, and publish `dist/` through a GitHub Actions Pages workflow after checks and build pass. Document local use, architecture, deployment, and adding an algorithm in the README.

Alternative: history routing, which needs server rewrites unavailable on standard GitHub Pages.

## Risks / Trade-offs

- [Precomputed runs consume memory at high iteration counts] → Enforce conservative limits, measure representative workloads, and move expensive generation to a worker or checkpointed stream if needed.
- [3D scenes can become inaccessible or slow] → Keep synchronized text, keyboard controls, reduced-motion support, instancing, and bounded scene complexity.
- [Heuristic and diagonal choices can invalidate shortest-path claims] → Label guarantees only for verified admissible settings and test cost/path validity on known grids.
- [Generated obstacles can make routes impossible] → Surface a clear no-path outcome; ensure start/goal are free, but never fabricate a path.
- [GitHub Pages subpath and cache behavior can break links after deploy] → Use a configurable Vite base path, hash routes, and validate a production build before publishing.

## Migration Plan

There is no existing application to migrate. Build and verify the static site, configure Pages, then deploy from the repository's configured branch. If a release fails after publication, redeploy the previous known-good build or revert the release commit; no server data requires migration.
