# Design

## Context

See `proposal.md` for motivation and the delta specs for behavior. The current app registers five `AlgorithmModule`s in `src/engine/registry.ts`; each synchronous `run` returns precomputed frames with scene state, active pseudocode lines, explanation, and metrics. `App.tsx` groups navigation by the module's single `meta.category`, and the BFS/Dijkstra/A* comparison is explicitly grid-only. `VisualizationCanvas.tsx` chooses default camera framing by a few hard-coded IDs. Parameters, URL state, theme, transport, and inspection already come from shared contracts. The existing uncommitted tactile-scene edits are separate work and are not a prerequisite for this change.

## Goals / Non-Goals

**Goals:**
- Fit eight new simulations into the existing workbench contract without changing existing algorithm IDs or URLs.
- Make each decision, reversal, and terminal result inspectable at an exact timeline frame.
- Keep input generation and playback deterministic and bounded on a static, browser-only site.
- Reuse existing scenes or visual primitives where their state meaning matches, while giving each technique a legible motion language.

**Non-Goals:**
- A generic user-authored algorithm editor, arbitrary uploaded datasets, or all five candidates for every topic.
- Adding unrelated algorithms to the existing three-way grid comparison.
- Claiming measured browser execution time as a complexity benchmark.

## Decisions

### 1. Use one navigation home per module and technique tags

Register DFS under Graph Search, interval scheduling under Optimization, and binary search plus sorted two-sum under Array Techniques. Add Sorting, Trees, Dynamic Programming, and Backtracking as the other new categories. Keep stable module IDs and a `tags` entry for `dfs`, `greedy`, `binary-search`, or `two-pointers` so the technique remains explicit in its title and guide. Use accessible expandable category headings in the sidebar; keep the active category open and preserve mobile access. This builds on the existing category contract. Alternative considered: eight new top-level topics, which would duplicate Graph Search and Optimization concepts and make the sidebar longer before those topics have multiple entries.

### 2. Keep pure per-algorithm runners and bounded frame snapshots

Each showcase gets a pure runner with immutable frame state, plus a module descriptor, education content, and a lazy scene renderer. Seeded input generation happens before stepping, and the URL carries only validated parameters and seed, never the entire frame list. Cap inputs and frame counts so synchronous precomputation remains responsive; a budget hit ends as `limit` with an honest explanation, never as a partial success. Prefer semantic frames (comparison, swap, table fill, placement, reject, reversal, pointer move) over a frame per animation tick. Alternative considered: a streaming runner, which would require redesigning reverse stepping and URL replay for this first catalog expansion.

### 3. Share geometry only when the state model is shared

Extend the current grid runner/scene for DFS while keeping its traversal order and non-optimality explanation distinct. Bubble Sort, binary search, and two-sum can reuse numbered array item primitives while retaining separate runners and decision marks. Use linked node and branch marks for BST search, table cells and dependency cues for knapsack, a board with tentative and placed queen marks for N-Queens, and a time axis with interval cards for greedy scheduling. Keep the existing paper/chalkboard palette, tactile-looking surfaces, selection feedback, reduced-motion behavior, and text equivalents. Alternative considered: one universal scene for all eight, which would obscure technique-specific relationships.

### 4. Define deterministic ties and unsuccessful results

Bubble Sort swaps only when left value is greater, preserving duplicate order. BST keys are distinct and insertion order comes from the seed; search chooses exactly one child per comparison. Knapsack uses prior-row values and a fixed tie policy during reconstruction. N-Queens checks columns in ascending order and reports the first solution or a genuine unsolved board. Interval scheduling uses half-open intervals `[start, end)`, sorted by end then start then stable ID, and accepts a start equal to the previous end. Binary search continues left after a match to return the first duplicate. Two-sum begins at both ends and moves exactly one pointer based on the sum. Add a shared `no-solution` terminal outcome for absent matches and unsolved instances, while preserving `no-path` for grid routes. Alternative considered: overloading `success` or `no-path`, which would make final status misleading for array and board problems.

### 5. Make camera framing module data

Add a small optional camera preset or bounds field to module metadata, with a default matching the current grid view, then use it in `VisualizationCanvas`. This avoids growing an ID-based conditional for array rows, tree branches, DP tables, boards, and intervals. Existing RRT and gradient framing must retain their current views. Alternative considered: more special cases keyed by module ID, which would make every future showcase change shared canvas code.

### 6. Scale showcase input controls to ten times their original maximum

Raise the eight newly added showcases' size controls: DFS grid width/depth 24→240, Bubble Sort items 14→140, BST nodes 12→120, knapsack items 8→80 and capacity 18→180, N-Queens board 8→80, interval activities 12→120, and both array-technique lengths 16→160. Expand the original modules' count and dimension controls to ten times their previous maxima: BFS/Dijkstra/A* width/depth 240, RRT workspace 200, iteration count 6000, obstacle count 180, and gradient-descent iteration count 3000. Keep probabilities, radii, rates, and coordinate bounds semantically valid. Replace repeated full-state copies where necessary with immutable shared snapshots and bound expensive grid search traces with an explicit `limit` outcome.

### 7. Render the complete configured input

Show all array items, tree nodes and edges, knapsack cells, board squares, intervals, grid cells, obstacles, and RRT nodes in their scenes. Scale the overview to fit the complete input; allow zoom and pan for inspection. Use instanced meshes for large rectangular grids and sparse labels where text would overlap. Labels may be selective, but geometry and item selection must not be cropped to a moving focus window.

### 8. Resolve dependent parameter ranges and surface terminal outcomes

Keep fixed safety bounds in each numeric schema and derive tighter bounds from the current parameters where the generated data changes the useful range. Array targets grow with generated value ranges, BST targets track its key pool, knapsack capacity tracks the maximum possible item weight, and RRT step and radius controls fit its workspace. Use the same resolver for the panel, URL values, and saved preferences. When a size change invalidates another value, clamp the dependent value and tell the user what changed. Keep direct edits outside the displayed range invalid. Show a persistent final message beside the simulation for no-path, no-solution, limit, and error outcomes, using the runner's explanation.

### 9. Extend playback speeds and sort navigation

Add 8×, 16×, and 32× to the shared speed list so both the selector and saved-preference validation accept them. The existing elapsed-time playback loop can advance multiple semantic frames per animation callback at high speed and still stops at the final frame. Sort topic headings by displayed category text and entries within each topic by displayed short name; keep registry IDs and the default algorithm unchanged.

## Risks / Trade-offs

- **Large snapshots for DP and N-Queens** -> Bound item count, capacity, and board size; use semantic frames and a measured frame budget; test worst allowed presets for memory and responsiveness.
- **A visually correct but mathematically wrong result** -> Test final invariants against independent small-input oracles: sorted stable output, BST path, knapsack brute force, queen attacks, interval subset optimum, DFS path validity, and array indices.
- **Expanded sidebar crowds the viewport** -> Use collapsed accessible groups, verify active-item visibility and keyboard behavior at desktop and narrow widths.
- **Tenfold size controls amplify frame memory and scene density** -> Share immutable state across frames, use instancing and overview scaling for large scenes, and test the new maximum settings in unit and browser runs. A budget hit remains an explicit limit rather than a claimed solution.
- **Shared outcome and camera changes affect existing modules** -> Keep existing outcome strings and framing as defaults; run regression browser tests for all five current algorithms and the grid comparison.
- **Illustrated motion hides the current state** -> Use shape or outline cues and synchronized text alongside color, with the same frame meaning in still and reduced-motion modes.

## Migration Plan

Additive client-side rollout: existing URLs, preferences, and module IDs remain valid. New IDs appear only after their runner, scene, guide, and tests are complete. A rollback removes the new registrations and shared optional metadata while leaving old routes intact; stored preferences pointing to a removed ID already fall back through the registry lookup.
