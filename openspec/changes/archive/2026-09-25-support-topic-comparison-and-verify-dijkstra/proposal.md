# Proposal

## Why

Comparison is currently hard-coded to BFS, Dijkstra, and A*, leaving DFS and the other multi-algorithm topics unavailable. Dijkstra can appear identical to BFS on the default uniform grid; learners need a clear way to see when their route choices differ and confidence that the weighted behavior is correct.

## What Changes

- Offer comparison for every topic with at least two implemented algorithms: Graph Search, Array Techniques, and Optimization in the current catalog. Include every implemented algorithm in the selected topic, including DFS in Graph Search.
- Use the same generated input when algorithms can consume one fairly: a shared weighted or uniform grid for Graph Search and a shared sorted array for Array Techniques. Keep algorithm-specific controls and targets distinct. Optimization algorithms use their own inputs because their problem domains differ; show those inputs and qualify their metrics.
- Keep shared playback, per-algorithm inspection, terminal outcomes, progress, and cancellation usable across the compared runs. Do not imply that matching step numbers represent equivalent operations.
- Verify Dijkstra against weighted shortest-path cases and an independent reference. Make uniform-cost equivalence to BFS explicit, and provide a visible weighted example that can produce a different, lower-cost route.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `algorithm-comparison`: Extend topic comparison, shared-input rules, replay, and qualified results beyond the current three grid searches.
- `grid-pathfinding`: Make Dijkstra's weighted behavior and uniform-grid relationship to BFS observable and verifiable.

## Impact

Comparison state and UI in `src/App.tsx`, catalog metadata and algorithm runners, grid and sorted-array input generation, per-algorithm result summaries, and focused unit/browser tests. No new algorithm or external dependency is required.
