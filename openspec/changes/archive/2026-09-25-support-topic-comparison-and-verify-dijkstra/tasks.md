# Tasks

## 1. Dijkstra audit and examples

- [x] 1.1 Add an independent weighted shortest-path reference and crafted grids for cheaper longer routes, ties, diagonals, and unreachable goals; verify Dijkstra's cost and outcome against the reference in focused unit tests.
- [x] 1.2 Compare eager and worker-produced Dijkstra traces on uniform and seeded weighted grids, including settled cost order and final path cost; verify matching outcomes and representative steps in tests, fixing search logic only if a failing case proves a defect.
- [x] 1.3 Add a deterministic weighted example and explain uniform-cost similarity to BFS in the grid workbench; verify a browser test shows the distinct weighted route and cost, and that the comparison weighting control works when entered from any Graph Search algorithm.

## 2. Topic comparison data and input policies

- [x] 2.1 Replace fixed BFS/Dijkstra/A* comparison membership with registry-derived members for the active topic; verify unit tests include all four Graph Search algorithms, both Array Techniques algorithms, and both Optimization algorithms while hiding comparison for single-member topics.
- [x] 2.2 Define validated comparison inputs per topic: a common weighted or uniform grid, a common sorted array with separate target value and target sum, and separate Optimization inputs; verify shared instances and algorithm-specific values in focused tests.
- [x] 2.3 Generalize compared trace creation, subscription, replacement, and disposal to a member-keyed collection; verify pending progress, early completion, cancellation, stale-result rejection, and unbounded grid replay in trace-level tests.

## 3. Workbench interaction and reporting

- [x] 3.1 Render dynamic comparison tabs, each member's 3D scene and inspection, and grouped shared versus algorithm-specific parameter controls; verify keyboard and narrow-screen browser tests can reach every member and edit only valid parameters.
- [x] 3.2 Preserve shared play, pause, step, and scrub with per-member available and terminal frames; verify browser tests hold an early finisher, show generating and cancelled states, and do not display old frames after input or topic changes.
- [x] 3.3 Add problem-specific comparison summaries and input labels for grid, array, and Optimization runs; verify browser tests distinguish hops from weighted cost, target value from target sum, and unrelated optimization metrics without ranking them together.

## 4. Integration verification

- [x] 4.1 Update user guidance for topic comparison and Dijkstra's uniform versus weighted behavior; verify examples and control labels agree with the running workbench.
- [x] 4.2 Run the full unit and browser suites, `npm run typecheck`, `npm run build`, strict OpenSpec validation, and `git diff --check`; verify all pass and existing single-algorithm and Graph Search comparison flows remain usable.
