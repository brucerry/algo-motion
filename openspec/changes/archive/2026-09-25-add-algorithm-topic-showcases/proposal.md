# Proposal

## Why

The workbench currently teaches five algorithms across Graph Search, Motion Planning, and Optimization. A first showcase for each requested technique will broaden what learners can explore while testing how the shared timeline and illustrated scenes handle arrays, trees, tables, and search decisions.

## What Changes

- Add eight playable showcases: Bubble Sort, binary search tree search, 0/1 Knapsack, N-Queens, greedy interval scheduling, depth-first grid search, exact binary search, and sorted two-sum.
- Place DFS in Graph Search and interval scheduling in Optimization. Add Sorting, Trees, Dynamic Programming, Backtracking, and Array Techniques categories; place binary search and two-sum together under Array Techniques. Keep technique tags and guides so the eight requested topics remain discoverable.
- Give each showcase bounded, reproducible inputs, a distinct frame-by-frame illustrated scene, parameters and presets, inspectable state, pseudocode, metrics, and a shareable URL.
- Make the larger category list navigable on desktop and mobile and report unsuccessful searches or unsolved instances accurately.
- Expand the scene-style requirement to cover the new visualizations. Keep existing algorithms and the BFS/Dijkstra/A* comparison intact.
- Show every configured item in each scene, even at maximum input size. Raise the original graph-search, RRT, and gradient-descent count or dimension limits to ten times their former values, with honest replay limits where needed.
- Show an explicit message when a run ends without a route or solution, hits a limit, or fails. Keep every numeric control within its current allowed range as size-dependent settings change.
- Add 8×, 16×, and 32× playback and alphabetize topic headings and their displayed algorithm entries.

This change delivers one implemented showcase per requested topic. It does not add the remaining algorithms from the larger five-per-topic catalog or empty placeholders for them.

## Capabilities

### New Capabilities

- `sorting-visualization`: Bubble Sort execution and item-level visualization.
- `tree-algorithms`: Binary search tree search on a reproducible tree.
- `dynamic-programming-visualization`: 0/1 Knapsack table construction and solution reconstruction.
- `backtracking-visualization`: N-Queens placement, rejection, and backtracking.
- `greedy-optimization`: Interval scheduling by earliest finishing time.
- `array-techniques`: Exact binary search and sorted two-sum on bounded arrays.

### Modified Capabilities

- `grid-pathfinding`: Add DFS to the shared seeded grid, with its own traversal and path semantics.
- `simulation-workbench`: Keep expanded categories accessible and distinguish a completed run with no solution from success or an execution error.
- `hand-drawn-visual-language`: Apply the existing illustrated scene principles to the added algorithm families.

## Impact

- New pure simulation modules, lazy scene renderers, educational content, and tests under `src/algorithms/`; registration through `src/engine/registry.ts`.
- Navigation, run-outcome display, and camera framing updates in the shared engine, `src/App.tsx`, and `src/components/VisualizationCanvas.tsx`.
- README/catalog documentation and browser coverage for all eight showcases. No service, account, or new runtime dependency is expected.
