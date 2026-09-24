# Proposal

## Why

Large valid grid and N-Queens inputs can stop at an arbitrary replay frame budget before the algorithm establishes a result. The workbench should let these finite searches use every step they require and report the actual outcome.

## What Changes

- Remove fixed recorded-frame ceilings from BFS, Dijkstra, A*, DFS, and N-Queens. A valid run continues until it finds a result or exhausts its search space.
- Make long traces responsive to generate and replay without requiring every full frame snapshot in memory at once. Preserve step-by-step inspection, reverse stepping, scrubbing, comparison, and deterministic shared URLs.
- Show generation progress and a usable cancellation path for lengthy runs. A cancelled or failed run must never be presented as a completed algorithm result.
- Keep input-size validation and the user-configured iteration limits for RRT and gradient descent; these are algorithm settings, not replay frame ceilings.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `simulation-workbench`: Long traces are not cut off by a fixed frame count, and playback can handle a trace while it is being generated.
- `grid-pathfinding`: Each grid search reaches a real success or no-path result on valid inputs regardless of the number of recorded steps.
- `backtracking-visualization`: N-Queens reaches its first solution or exhausts the search on valid board sizes regardless of trace length.

## Impact

Grid and N-Queens runners, shared run/frame contracts, workbench playback and comparison state, their tests, and documentation. The static browser deployment model remains unchanged. This change may require a worker-backed or incremental trace representation so large runs do not block the UI or exhaust memory.
