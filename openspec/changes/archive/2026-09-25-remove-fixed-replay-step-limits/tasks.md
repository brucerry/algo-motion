# Tasks

## 1. Trace contract and step producers

- [x] 1.1 Add a trace-source contract with available count, optional final total and outcome, asynchronous frame lookup, progress subscription, and cancellation; verify unit tests distinguish generating, complete, cancelled, and error states.
- [x] 1.2 Add an adapter for existing eager `SimulationRun` modules; verify their frame order, timeline behavior, and configured RRT/gradient iteration-limit outcomes remain unchanged in focused tests.
- [x] 1.3 Extract incremental BFS, Dijkstra, A*, and DFS step producers without fixed frame ceilings; verify deterministic frame order and correct path/no-path results on known maps, including a trace beyond the old 3,000/12,000-step limits.
- [x] 1.4 Extract an incremental N-Queens step producer without the 12,000-frame ceiling; verify valid first solutions, genuine no-solution boards, deterministic step order, and a trace beyond the former budget.

## 2. Background generation and replay

- [x] 2.1 Implement cooperative, cancellable module-worker generation for grid and N-Queens with generation IDs and progress; verify a long run yields to control messages and a cancelled or replaced run cannot publish late results.
- [x] 2.2 Add bounded recent-frame/checkpoint caches and deterministic regeneration for uncached steps; verify early, middle, late, and reverse lookups match a direct reference trace after cache eviction, without a total-step ceiling.
- [x] 2.3 Keep large grid producer state compact and replace expensive frontier selection where needed; verify representative largest supported inputs can generate progress without main-thread blocking or replay memory growing with every full snapshot.

## 3. Workbench integration

- [x] 3.1 Move normal workbench playback, scrub, step, restart, metrics, pseudocode, inspection, and terminal status to the trace source; verify the UI labels an unknown total as pending, waits when playback catches generation, and reaches the actual final frame.
- [x] 3.2 Add visible generation progress, pending-seek feedback, cancellation, and stale-run cleanup on parameter changes, algorithm switches, and unmount; verify these flows in browser tests, including a cancelled run never showing success or no path.
- [x] 3.3 Migrate BFS/Dijkstra/A* comparison to incremental traces with fair progress and final-frame holding only after completion; verify all three final outcomes, synchronized controls, and rapid comparison toggles on a long grid run.

## 4. Verification and documentation

- [x] 4.1 Replace tests that expect budget-based `limit` outcomes or at-most-30,000 frames with completion, cancellation, responsiveness, and replay-equivalence checks; verify the full unit and browser test suites pass.
- [x] 4.2 Update README behavior and architecture notes for unbounded recorded steps, pending totals, cancellation, and retained configured iteration limits; verify `npm run typecheck`, `npm run build`, and strict OpenSpec validation pass.
