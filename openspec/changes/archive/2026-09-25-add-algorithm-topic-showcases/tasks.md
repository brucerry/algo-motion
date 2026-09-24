# Tasks

## 1. Shared workbench support

- [x] 1.1 Add a distinct no-solution terminal outcome and final-status text while preserving success, no-path, limit, and error; verify outcome rendering tests distinguish all five states.
- [x] 1.2 Move default camera framing into optional module metadata with existing RRT, gradient, and grid views preserved; verify camera reset, top, and side controls in browser tests.
- [x] 1.3 Make category navigation expandable, keyboard accessible, and active-item aware on desktop and mobile; verify a browser test can reach every category and identify the selected algorithm without browsing a flat full list.
- [x] 1.4 Add or reuse bounded seeded input helpers for arrays, trees, and intervals, with separate deterministic streams where needed; verify repeated generation and parameter-boundary unit tests.

## 2. Graph Search and Sorting showcases

- [x] 2.1 Implement DFS on the existing seeded grid with deterministic neighbor order, backtracking frames, valid path reconstruction, and no shortest-path claim; verify reachable, blocked, and replay unit tests.
- [x] 2.2 Register the DFS module with grid scene state, parameters, guide, metrics, and inspection; verify a browser run can step, scrub, share its URL, and keep the existing three-way comparison unchanged.
- [x] 2.3 Implement stable Bubble Sort with comparison, swap, pass, and early-stop frames on bounded seeded arrays; verify sorted output, duplicate stability, already-sorted input, and replay unit tests.
- [x] 2.4 Add the illustrated Bubble Sort scene and module, including item inspection and guide content; verify comparison and swap frames, selection text, and both themes in a browser run.

## 3. Tree, dynamic programming, and backtracking showcases

- [x] 3.1 Implement seeded distinct-key BST construction and search frames with found and absent outcomes; verify ordering, visited path, missing target, and deterministic replay unit tests.
- [x] 3.2 Add the illustrated BST scene and module with bounded controls, node inspection, and guide content; verify selecting a node and scrubbing updates its state in a browser run.
- [x] 3.3 Implement 0/1 Knapsack table and deterministic reconstruction on bounded instances; verify cell recurrence and final weight/value against independent brute-force cases, including ties.
- [x] 3.4 Add the illustrated knapsack table scene and module with dependency cues, cell inspection, presets, and guide content; verify a browser run can inspect an intermediate cell and the final chosen subset.
- [x] 3.5 Implement deterministic N-Queens candidate, rejection, placement, and backtrack frames with bounded board sizes; verify non-attacking solutions, genuine unsolved sizes, replay, and frame-budget behavior.
- [x] 3.6 Add the illustrated N-Queens board scene and module with conflict marks, square inspection, and guide content; verify reversal and unsolved outcome frames in a browser run.

## 4. Greedy and array-technique showcases

- [x] 4.1 Implement interval scheduling with half-open endpoints and deterministic finish/start/ID tie order; verify non-overlap and maximum cardinality against brute-force small cases, including touching endpoints.
- [x] 4.2 Add the illustrated interval timeline scene and Optimization module with accepted/rejected inspection and a greedy guide; verify a browser run exposes each choice and reproduces a shared URL.
- [x] 4.3 Implement exact binary search that returns the first duplicate or a not-found outcome; verify range invariants, empty/missing cases, and replay unit tests.
- [x] 4.4 Implement sorted two-sum with distinct indices, deterministic pointer moves, and a no-pair outcome; verify pair sums, crossing pointers, duplicates, and replay unit tests.
- [x] 4.5 Add shared illustrated array primitives and separate Binary Search and Sorted Two-Sum modules under Array Techniques; verify both scenes show current indices, inspection, guide content, and correct found/not-found final states in browser runs.

## 5. Catalog delivery and regression

- [x] 5.1 Register all eight modules under the agreed categories and technique tags, with validated parameters, meaningful presets, and stable IDs; verify navigation contains only implemented algorithms and shared URLs reload matching inputs.
- [x] 5.2 Complete frame-synchronized pseudocode, explanations, metrics, legends, complexity notes, and references for each showcase; verify every active frame has readable text and selected-object inspection in unit or browser tests.
- [x] 5.3 Check worst allowed inputs for frame count, generation time, and memory, and adjust bounds or semantic frame recording without hiding a partial result; verify each maximum preset ends with an honest outcome and usable playback.
- [x] 5.4 Update README catalog and documentation screenshots for the expanded navigation and representative new scenes; verify screenshots show fully loaded scenes and documented names match the registry.
- [x] 5.5 Run `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`, `npx openspec validate add-algorithm-topic-showcases --strict`, and `git diff --check`; verify all pass and existing grid comparison, RRT, gradient descent, mobile, and accessibility tests remain green.

## 6. Larger showcase inputs

- [x] 6.1 Raise all eight showcase size controls to ten times their initial maximum and align seeded generators and runner validation.
- [x] 6.2 Keep large runs bounded and deterministic with honest terminal outcomes; verify the new maximum values, result correctness where completed, replay, generation time, and memory use.
- [x] 6.3 Keep large scenes legible and selectable with responsive scaling or instancing; verify maximum inputs in browser runs without page errors or unusable playback.
- [x] 6.4 Re-run typecheck, unit tests, build, browser tests, strict OpenSpec validation, and diff checks; update the README with the new limits and their trace budget behavior.

## 7. Complete scenes and original-algorithm limits

- [x] 7.1 Replace moving scene windows with complete item rendering, using instanced meshes for large boards and tables; verify maximum-size scenes remain selectable and navigable.
- [x] 7.2 Raise the original grid, RRT, and gradient-descent count and dimension maxima by ten times; align runner validation, scene capacity, camera access, and honest trace outcomes.
- [x] 7.3 Verify original and new maximum inputs with unit and browser tests; run typecheck, build, strict OpenSpec validation, and diff checks; update README limits.

## 8. Terminal prompts and dependent controls

- [x] 8.1 Show a visible final message beside the simulation for no-path, no-solution, limit, and error outcomes; verify seeded browser cases and preserve the runner's reason.
- [x] 8.2 Resolve numeric ranges from the current data size in one shared validator used by controls, URL loading, and saved settings; adjust dependent values and explain changes, while rejecting direct out-of-range edits.
- [x] 8.3 Verify dynamic bounds and special outcomes in unit and browser tests, then run typecheck, build, strict OpenSpec validation, and diff checks; document the behavior.

## 9. Faster playback and sorted menu

- [x] 9.1 Add 8×, 16×, and 32× to playback and saved preference validation; verify high speed advances and stops at the final frame.
- [x] 9.2 Sort topic headings and displayed algorithm entries lexicographically on desktop and mobile; verify active navigation still works.
- [x] 9.3 Update documentation and pass typecheck, unit tests, production build, browser tests, strict OpenSpec validation, and diff checks before syncing and archiving.
