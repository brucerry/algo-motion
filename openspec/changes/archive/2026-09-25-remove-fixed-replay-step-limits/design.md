# Design

## Context

See [proposal.md](proposal.md). `runGrid` and `runQueens` currently build complete `Frame[]` arrays synchronously. Grid searches stop after 3,000 or 12,000 frames; N-Queens stops after 12,000. The workbench reads `frames.length` as the final total, indexes frames directly, and runs all three comparison searches in `useMemo`. Grid frames copy frontier, visited cells, and score maps; simply removing the checks would make large runs block the main thread and allocate many full-state copies. The app is deployed as static browser files and must preserve deterministic URL replay.

## Goals / Non-Goals

**Goals:**

- Let finite grid and N-Queens searches reach their algorithmic conclusion without a recorded-step ceiling.
- Keep main-thread controls responsive and retain deterministic access to any generated step with bounded resident replay memory.
- Give the workbench a coherent pending/complete/cancelled/error state while the final step count is unknown.

**Non-Goals:**

- Remove validated input-size bounds or the RRT and gradient-descent `maxIterations` settings.
- Promise a fixed completion time for exponential searches or a finite RRT route when sampling cannot find one.
- Persist full traces in URLs or browser storage.

## Decisions

### Incremental trace source

Introduce a workbench-facing trace source with current available step count, optional final total and outcome, an asynchronous step lookup, progress notifications, and cancellation. Adapt existing eager `SimulationRun` modules to that interface; grid and N-Queens use incremental sources. The UI must not equate the latest generated frame with a terminal frame until the source reports completion. Its slider spans available steps during generation and the final total afterwards. Playback waits when it catches the producer, while reverse, restart, and earlier-step inspection remain usable. The existing full-array contract can remain for small algorithms behind the adapter.

Alternative considered: raise or remove only the numeric checks. That preserves the current API but leaves synchronous work and full-state snapshots unbounded in browser memory.

### Cooperative worker generation and replay

Move grid and N-Queens state machines to a module worker. Advance them in bounded *time slices* that yield to the worker event loop; a slice limits how long one batch monopolizes the worker, never how many algorithm steps the run may take. Publish monotonic progress and the final outcome. Assign each request a generation ID so parameter changes or cancellation terminate stale work and late messages are ignored. In compare mode, schedule BFS, Dijkstra, and A* fairly so one search cannot prevent the others from progressing.

The worker retains only algorithm state, a small recent-frame cache, and a bounded set of replay checkpoints. To serve an older step outside the cache, deterministically regenerate from the nearest retained checkpoint (or the beginning) and return the requested state, explanation, pseudocode lines, and metrics. Checkpoints and caches are evicted by memory policy; eviction never changes the number of algorithm steps or its result. The main thread keeps only the displayed frame and a small neighbor cache. This may make a distant seek slower, so the UI shows a pending seek until the frame arrives. No fixed recording quota, sampling, or skipped semantic events is allowed.

Alternatives considered: storing every full frame uses memory proportional to steps times state size; persisting every event to IndexedDB adds quota and lifecycle failure modes. Deterministic regeneration preserves every step without requiring full history to stay resident.

### Preserve algorithm order and outcome semantics

Extract step-producing state machines from the current grid and queen runners, retaining neighbor order, tie breaking, seeded inputs, and event order. Remove frame-budget exceptions and their `limit` outcomes. Continue to mark goal, exhausted frontier, complete placement, and exhausted branches as distinct terminal states. Keep `limit` for configured RRT and gradient-descent iteration endpoints. A user cancellation is a separate incomplete status; a worker or generation failure is an error. Do not report `no-path` or `no-solution` merely because generation is slow or cancelled.

Alternative considered: collapse long traces to milestones. That loses the steps the user specifically wants to inspect and changes the educational behavior.

### Step counts, comparison, and lifecycle

Represent an unknown final total explicitly, rather than guessing it from the generated count. Comparison uses each search's available count and freezes a search only after its actual terminal step; the shared comparison timeline grows until all three sources complete. When a source is behind the selected shared step, show its latest available step with a generating marker. New configuration, algorithm switch, comparison toggle, and unmount cancel old workers and reset timeline state. Shared URLs continue to encode only validated inputs; replay regenerates deterministically.

## Risks / Trade-offs

- **Very long or exponential searches** -> Keep progress, cancellation, and responsive controls; never describe an unfinished search as a result.
- **Distant seeks may require recomputation** -> Retain recent frames and bounded checkpoints; test seek behavior on traces well past the former caps.
- **Large grid state and slow frontier selection** -> Profile worst supported grids, use compact state and suitable queue/priority data structures, and avoid full-state copying per produced step.
- **Worker messages arriving after configuration changes** -> Tag requests and discard stale responses; test rapid switches and cancellation.
- **Browser worker or memory failure** -> Surface an error with no fabricated success/no-path result; keep smaller eager algorithms operational.
- **Unknown total during generation** -> Label it pending and constrain scrubbing to steps already available.

## Migration Plan

Add the trace-source adapter, migrate grid and N-Queens, then migrate the workbench and comparison consumers. Update budget-based tests and documentation. Build the worker through Vite's bundled module-worker path so static hosting requires no server endpoint. Roll back the change as one unit if the incremental trace path regresses interaction or final-outcome correctness.
