# Design

## Context

See `proposal.md` for motivation and the two delta specs for behavior. `src/App.tsx` currently stores comparison as a fixed BFS/Dijkstra/A* record, creates three grid worker traces, and renders fixed tabs and result cards. The registry already knows each module's topic. Grid runners accept a shared `GridEnvironment`; Binary Search and Sorted Two-Sum accept optional sorted input at the runner level but currently generate it with different seed namespaces. Gradient Descent and Interval Scheduling solve unrelated optimization problems. `gridSteps` already uses weighted neighbor costs and a priority frontier for Dijkstra; its default `weightMode` is uniform. The focused grid suite currently includes one weighted route that differs from BFS and passes.

## Goals / Non-Goals

**Goals:**

- Keep compared algorithm membership tied to registry topics, with one well-defined input policy per topic.
- Reuse the existing trace, timeline, parameter validation, rendering, and inspection contracts while allowing heterogeneous run states.
- Verify Dijkstra's route optimality independently of its own implementation and make the uniform/weighted distinction visible in the workbench.

**Non-Goals:**

- Numerical ranking between algorithms that solve different problems.
- A browser-timing benchmark or an assertion that equal replay indices mean equal amounts of work.
- New algorithms or a redesign of individual 3D scenes.

## Decisions

### 1. Build comparison membership from the registry

Resolve the current module's category with `algorithmsInCategory`; show Compare when at least two modules exist. Replace fixed grid IDs, tab lists, and `TraceSet.comparison` fields with an ordered collection keyed by algorithm ID. Keep selected algorithm, loaded frame, summary, and outcome per member. Switching topic exits the old comparison and disposes its traces. This avoids adding another hard-coded list as the catalog grows. The alternative of one hand-maintained comparison table would drift from navigation.

### 2. Use explicit input policies, not one universal parameter object

Graph Search creates one environment with a comparison-level grid shape, obstacles, seed, diagonal rule, and uniform/terrain weighting; all four runners receive it. Heuristic settings stay with A*. Array Techniques creates one sorted value array from a shared count and seed, while Binary Search's target value and Two-Sum's target sum remain independently validated. The shared array is passed to their runners rather than relying on their current different seed namespaces. Optimization runs each algorithm with its own validated parameter set and labels the two inputs separately. Keep common controls and algorithm-specific controls visibly grouped, so changing one parameter reruns only affected members where practical. The alternative of passing the selected module's `params` to every member would silently drop or misinterpret fields.

### 3. Generalize trace control and result summaries

Use a collection of `TraceSource` instances with the existing available/total/status contract. A shared index addresses each member's available step or held terminal step, while cards and the selected 3D scene read their own frame and status. Use domain-specific summary adapters: graph route hops, weighted cost, visited count and steps; array comparisons, found index/pair and steps; optimization objective/convergence or accepted intervals and steps. Show outcome and input identity on every card, plus a note that replay steps are aligned positions rather than equivalent operations. Keep cancellation per generating run and dispose old sources on replacement. For large grids, bound concurrent background generation and retain existing cache eviction without introducing a replay-step ceiling. The alternative of forcing every module into grid-specific `path` and `visited` fields would misreport non-grid results.

### 4. Audit Dijkstra before changing its search logic

Add a separate shortest-path reference in tests and exercise crafted weighted maps, seeded terrain, ties, diagonal costs, unreachable goals, and worker/eager parity. Confirm that the settled order follows nondecreasing tentative cost and that the final route cost matches the reference. Change `gridSteps` only if those checks reveal a defect; otherwise update teaching text and controls. Keep a uniform example explaining why Dijkstra and BFS can coincide, and provide a deterministic weighted example where BFS's shorter route costs more. Expose terrain weights and route cost clearly in comparison, including when entering from BFS, DFS, or A*. This checks the reported similarity without declaring correct uniform-cost behavior a bug.

## Risks / Trade-offs

- **Four long grid traces compete for resources** → Schedule generation with bounded concurrency, preserve worker cancellation and frame cache limits, and test maximum supported settings for responsive controls.
- **A common step index can imply equal work** → Label it as a replay position and keep per-run step counts and outcomes visible.
- **Shared array targets mean different questions** → Display target value versus target sum and never imply their success rates are directly comparable.
- **Independent Optimization inputs weaken direct comparison** → Display the input and problem type on each card and omit a cross-algorithm rank.
- **Changing parameters while workers are active can surface stale frames** → Key each comparison generation and dispose prior traces before accepting new frames.

## Migration Plan

Replace the fixed comparison state and UI in place. Existing single-algorithm URLs and saved per-algorithm parameters remain valid. Keep comparison transient as it is today. Verify existing Graph Search comparison before enabling the new topics; rollback consists of reverting this feature's implementation while retaining the previous single-run behavior.
