# Tasks

## 1. Project foundation

- [x] 1.1 Scaffold the React, TypeScript, Vite, Tailwind, React Three Fiber, drei, and KaTeX application with npm scripts and a lockfile; verify `npm install` and `npm run build` succeed.
- [x] 1.2 Define typed algorithm metadata, parameter, frame, renderer, content, preset, and registry contracts; verify a type check accepts a sample module without algorithm-specific shell branches.
- [x] 1.3 Implement a deterministic seeded random utility and bounded run configuration; verify repeated seeds produce identical sequences and different seeds produce different sequences in unit tests.
- [x] 1.4 Add a shared validation and URL codec layer for all parameter types, including hash routes and safe fallback notices; verify round-trip, malformed, non-finite, and out-of-range cases in tests.

## 2. Shared simulation workbench

- [x] 2.1 Build registry-driven algorithm navigation and a responsive dark-default shell with an accessible 3D viewport and collapsible secondary panels; verify navigation and controls remain usable at desktop and narrow viewport widths.
- [x] 2.2 Implement immutable frame playback with play/pause, previous/next, restart, scrubber, step counts, and five speed choices; verify timeline boundary, replay, and scrub behavior in tests and the UI.
- [x] 2.3 Add generic parameter controls with draft/accepted validation, debounced continuous changes, presets, reset, seed editing, and Randomize; verify invalid values never start a run and valid changes reset the timeline.
- [x] 2.4 Add URL synchronization and local preference persistence with URL precedence; verify a copied seeded link recreates the same initial run after reload and preferences survive a reload.
- [x] 2.5 Add scoped orbit/pan/zoom, camera reset and view presets, keyboard shortcuts, focus states, tooltips, and reduced-motion behavior; verify mouse and keyboard operation without camera movement from panel interaction.
- [x] 2.6 Add shared pseudocode, explanation, metrics, legend, inspection, and educational-content panels with formula rendering; verify changing frames updates all frame-linked text and selected-object details.

## 3. A* reference slice and grid foundation

- [x] 3.1 Implement deterministic grid generation, reserved start/goal cells, neighbor rules, diagonal corner blocking, and optional nonnegative weights; verify known seeded maps and neighbor/cost edge cases in tests.
- [x] 3.2 Implement A* frames with open/closed sets, parent chain, g/h/f scores, stopping outcomes, and heuristic-weight labeling; verify valid routes, known shortest costs for admissible settings, and no-path behavior in tests.
- [x] 3.3 Build the reusable 3D grid scene with efficient repeated cells, semantic state cues, cell selection, path display, and camera framing; verify a complete A* run can be played, scrubbed, inspected, and reset in the browser.
- [x] 3.4 Complete A* parameters, presets, pseudocode, explanations, metrics, overview, complexity, legend, applications, and qualified references; verify every learning panel reflects the selected frame and the heuristic caveat appears when applicable.

## 4. Remaining grid algorithms

- [x] 4.1 Implement BFS against the shared environment with queue/frontier frames and path reconstruction; verify minimum-hop and no-path cases, including diagonal rules, in tests and the shared grid scene.
- [x] 4.2 Implement Dijkstra with deterministic weighted modes, tentative distances, and path reconstruction; verify minimum-cost paths on known weighted maps and no-path behavior in tests and the shared grid scene.
- [x] 4.3 Add BFS and Dijkstra schemas, presets, pseudocode, explanations, metrics, inspection data, and educational content; verify switching among all three grid algorithms updates controls and learning panels without shell changes.

## 5. 3D RRT

- [x] 5.1 Implement seeded 3D obstacle generation, bounded sampling, steering, segment collision checks, and safe goal connection; verify deterministic samples and that accepted edges and final paths avoid obstacles in tests.
- [x] 5.2 Emit RRT frames for samples, rejected attempts, new branches, success, and iteration-limit failure, including parent/cost metrics; verify frame sequences and both stopping outcomes in tests.
- [x] 5.3 Build a 3D RRT scene with selectable nodes, animated tree growth, obstacles, start/goal, and solution trail; verify a full seeded run can be played, scrubbed, and inspected in the browser.
- [x] 5.4 Add RRT controls, presets, pseudocode, explanations, metrics, legend, and educational content; verify changing each parameter regenerates a bounded run and the same seed reproduces it.

## 6. Gradient descent

- [x] 6.1 Implement multiple objective/gradient pairs and bounded descent with convergence, iteration-limit, and non-finite stopping reasons; verify values, gradients, repeatability, and stopping outcomes in tests.
- [x] 6.2 Emit per-iteration frames and render the selected 3D surface, moving point, gradient direction, and trajectory; verify scrub, reverse step, and objective switching in the browser.
- [x] 6.3 Add gradient-descent controls, presets, pseudocode, explanations, metrics, formulae, and educational content; verify displayed position and function value match the current frame.

## 7. Comparison, accessibility, and performance

- [x] 7.1 Add a BFS/Dijkstra/A* comparison view using one generated grid and a shared timeline with terminal-frame handling; verify all three receive identical terrain and retain independent search states.
- [x] 7.2 Add labeled per-algorithm visited, step, hop, and cost metrics with weighted-search caveats; verify labels remain accurate on weighted and unweighted examples.
- [x] 7.3 Audit responsive layout, keyboard access, focus, contrast, reduced motion, and text equivalents; verify core learning and playback remain usable without mouse interaction or animation.
- [x] 7.4 Measure representative grid and RRT presets, cap expensive inputs, and optimize repeated scene objects or generation where needed; verify controls remain responsive and no configured preset freezes the browser.

## 8. Delivery and release verification

- [x] 8.1 Write the README with setup, architecture, module and schema examples, local commands, GitHub Pages deployment, and known limitations; verify a developer can locate each extension point from the document.
- [x] 8.2 Configure Vite's repository base path, hash routing, and a GitHub Actions Pages workflow that runs checks and builds before publishing; verify the built asset paths and a shared deep link under a repository subpath.
- [x] 8.3 Run the full automated test suite, type check, and `npm run build`; fix failures and verify all five algorithms, URL replay, and core transport controls with an end-to-end smoke pass.
