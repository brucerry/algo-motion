# Algorithm Motion

A static, browser-only workbench for learning algorithms through interactive 3D simulations. Explore each algorithm one frame at a time, inspect its state, tune parameters, and share a deterministic experiment by URL.

**Live site:** [brucerry.github.io/algo-motion](https://brucerry.github.io/algo-motion/)

![Current A* workbench with the algorithm catalog and a completed route](docs/screenshots/workbench.png)

More captures from the live site: [Graph Search comparison](docs/screenshots/comparison.png) · [3D RRT](docs/screenshots/rrt.png) · [Gradient Descent](docs/screenshots/gradient-descent.png) · [Bubble Sort](docs/screenshots/bubble-sort.png) · [0/1 Knapsack](docs/screenshots/knapsack.png) · [N-Queens](docs/screenshots/n-queens.png)

## What is included

- Graph Search: BFS, Dijkstra, A*, and Depth-First Search on seeded grids rendered in 3D
- Collision-aware RRT in a true 3D workspace
- Optimization: gradient descent on three selectable objective surfaces and greedy interval scheduling
- Sorting: stable Bubble Sort with comparisons, swaps, and early stopping
- Trees: Binary Search Tree Search with seeded keys and a visible search path
- Dynamic Programming: 0/1 Knapsack with table dependencies and subset reconstruction
- Backtracking: N-Queens with candidate, rejection, placement, and reversal steps
- Array Techniques: Binary Search and Sorted Two-Sum with visible indices and pointer moves
- Playback, reverse stepping, scrubbing, speed control, camera controls, and scene selection
- Algorithm-specific parameters, presets, visible random seeds, URL sharing, and local preferences
- Synchronized pseudocode, explanations, metrics, legends, references, and comparison across algorithms in the same topic
- Responsive dark and light layouts, keyboard controls, and reduced-motion support
- A paper-notebook theme with drawn controls and stationary, colorful stickers, plus a saved chalkboard theme
- Optional step sounds that start muted, a hand-drawn server in Pseudocode, and walking shoes in Current step

The site does not need a server, database, account, or API after the static files are deployed.

The handwriting display face is [Patrick Hand](https://github.com/google/fonts/tree/main/ofl/patrickhand), distributed under the SIL Open Font License. Its license is included at `public/licenses/PatrickHand-OFL.txt`. Text, code, and formulas retain readable fallback fonts.

## Requirements and local development

Use Node.js 20.19.x or Node.js 22.12 or newer, and npm. The checked-in lockfile makes installs repeatable.

```bash
npm install
npm run dev
```

Open the local address printed by Vite. To validate or preview a production build:

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

Browser tests use Playwright:

```bash
npx playwright install chromium
npm run test:e2e
```

On Linux, Chromium may also need system libraries. GitHub Actions installs these with Playwright's dependency installer. The browser tests exercise all eight topics, URLs, parameters, mobile layout, keyboard controls, optional sound, learning-panel characters, and accessibility checks.

## Using the workbench

Expand a topic on the left and choose an algorithm. Topics and algorithms appear in alphabetical order. Use the transport bar to play, pause, step, restart, or scrub. Set the speed from 0.25× to 32×. Drag the 3D view to orbit, scroll to zoom, and use the camera buttons for top, side, or default perspective. Click a scene item to inspect its current state.

Step sound is off each time the page opens. Select **Sound off** in the transport bar to enable short cues during playback or individual Next/Previous steps, including keyboard stepping. You can mute it again at any time. Scrubbing, jumping, restarting, and switching experiments stay silent. The server in Pseudocode changes from ready to working to playfully burned out at the end of a run. Its meter advances with the displayed step, and its screen scans during playback. The shoes in Current step follow the displayed step. The outcome badge and explanation give the actual result.

The parameter panel is generated from each algorithm's schema. Numeric controls show their allowed range. Dependent ranges update with the data size: search targets, knapsack capacity, and RRT geometry controls adjust when their input changes. An out-of-range dependent value moves to the nearest allowed value with a notice; a direct out-of-range edit is rejected. Valid changes rebuild the run and reset the timeline. Presets are editable after loading. Randomize chooses a new visible seed. The URL records the algorithm and its validated parameters, including seed; copying it reproduces the experiment. A malformed value falls back to a safe default and shows a notice.

Grid search and N-Queens generate every step until they find a result or exhaust their search. During generation, the timeline shows a pending total and lets you inspect available steps, including earlier ones. You can cancel a long search; cancellation is shown as incomplete. RRT and gradient descent retain their adjustable iteration limits. When a run ends without a route or solution, reaches a configured limit, is cancelled, or fails, a message beside the simulation explains the result even if the Guide tab is open.

Compare is available when a topic has at least two implemented algorithms. **Graph Search** compares BFS, DFS, Dijkstra, and A* on one grid, including the same obstacles, terrain costs, and movement rules. **Array Techniques** uses one sorted array for Binary Search and Two Pointers, with separate target value and target sum controls. **Optimization** shows Gradient Descent and Interval Scheduling with their own inputs and clearly labeled results; their metrics are not ranked against each other. The shared timeline aligns replay positions, not equivalent operations. A run that finishes early holds its final frame, and each run retains its own outcome and cancellation status.

Dijkstra's default uniform grid can produce the same minimum-hop route as BFS. Choose its **Weighted detour** preset, then **Compare searches**, to see a deterministic case where BFS takes 9 hops at terrain cost 27 while Dijkstra takes 11 hops at cost 20. The comparison panel separates hop counts from weighted costs. Browser execution time is not treated as a rigorous benchmark.

Shortcuts: Space plays or pauses; Left and Right step; R restarts; C resets the camera. Shortcuts do not activate while editing fields.

## Architecture

The application keeps computation, state, rendering, UI controls, and learning content separate:

| Area             | Location                                                      | Responsibility                                                                           |
| ---------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Engine           | src/engine                                                    | Typed module/frame contracts, seed generation, validation, URL codec, timeline, registry |
| Grid search      | src/algorithms/grid                                           | Shared environment and neighbor rules, BFS/Dijkstra/A*/DFS runs, 3D grid scene           |
| RRT              | src/algorithms/rrt                                            | 3D sampling, collision checks, tree frames, RRT scene                                    |
| Gradient descent | src/algorithms/gradient                                       | Objective/gradient pairs, descent frames, surface scene                                  |
| New showcases    | src/algorithms/sorting, tree, dp, backtracking, greedy, array | Pure runners, illustrated scenes, and learning content for seven new non-grid algorithms |
| Seeded inputs    | src/algorithms/common                                         | Bounded deterministic arrays, distinct keys, and intervals                               |
| Shared UI        | src/components and src/App.tsx                                | Schema-driven controls, viewport, playback, learning panels                              |

Every displayed frame contains algorithm state, active pseudocode lines, an event, a current-step explanation, and metrics. Grid search and N-Queens generate frames incrementally in a browser worker and recreate uncached steps deterministically when you seek backward. Other algorithms still return immutable, indexed frames. The renderer consumes one frame's state and never runs the algorithm itself. This supports reverse stepping, scrubbing, and deterministic replay without keeping every large search snapshot in memory.

The parameter schema is a discriminated union of number, boolean, select, and seed definitions. It drives both the panel and input/URL validation. Numeric definitions declare finite minimum and maximum values, a step, and an optional slider control. Algorithms can add their own parameter keys without changing the shared panel.

The registry in src/engine/registry.ts holds module descriptors. Module metadata creates expandable topic navigation automatically; modules provide their renderer, camera framing, presets, pseudocode, educational content, and an inspection function. New showcase scenes are lazy loaded.

## Add an algorithm

1. Create a folder under src/algorithms with pure simulation logic, a renderer, and a module descriptor. Use the contracts in src/engine/types.ts.
2. Give the module metadata, parameter definitions and defaults, presets, pseudocode, educational content, a deterministic run function, a renderer, and an inspection function.
3. Register the module in src/engine/registry.ts. The shared shell will provide playback, parameter controls, timeline, URL values, camera controls, learning panels, and navigation.
4. Add unit tests for correctness, validation, deterministic replay, and edge cases; then run the checks above.

A compact module shape:

```ts
const module: AlgorithmModule<MyState> = {
    meta: {
        id: 'example',
        name: 'Example',
        shortName: 'Example',
        category: 'Geometry',
        dimensionality: '3D',
        description: '...',
        tags: ['geometry'],
    },
    parameters: [
        {
            type: 'number',
            key: 'count',
            label: 'Count',
            defaultValue: 20,
            min: 1,
            max: 100,
            integer: true,
        },
    ],
    defaults: { count: 20 },
    presets: [{ name: 'Small', values: { count: 10 } }],
    pseudocode: [{ id: 1, text: 'initialize' }],
    education: {/* overview, intuition, complexity, applications, legend, references */},
    run: (params) => makeFrames(params),
    renderer: lazy(() => import('./ExampleScene')),
    inspect: (state, id) => inspectObject(state, id),
}
```

For randomized modules, derive separate seeded streams for environment generation and algorithm samples through src/engine/seededRandom.ts and src/algorithms/common/seededInputs.ts. Keep expensive inputs validated and bounded; use an incremental worker trace when a search can produce too many snapshots for eager replay.

## GitHub Pages deployment

The workflow at .github/workflows/pages.yml checks types, runs unit and browser tests, builds, and publishes dist on pushes to main. In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**. After a successful deployment, the site is available at [brucerry.github.io/algo-motion](https://brucerry.github.io/algo-motion/).

Vite derives the repository subpath from the GitHub repository name, so a project repository is served from its usual Pages subpath. A repository named like username.github.io uses the root path. For a different static host or custom path, set BASE_PATH during the build:

```bash
BASE_PATH=/my-path/ npm run build
BASE_PATH=/my-path/ npm run preview
```

Hash routes keep algorithm links working without server rewrite rules. The source repository is [brucerry/algo-motion](https://github.com/brucerry/algo-motion).

## Current limits

Grid algorithms use a 2D logical grid presented in a 3D scene; RRT and gradient descent operate in true 3D scenes. Grid and N-Queens searches have no recorded-step ceiling; other runs use their configured algorithm bounds and validated input sizes. A* optimality depends on the heuristic and movement costs; the UI labels settings that lose an optimality guarantee. DFS demonstrates traversal and does not promise the shortest path. The catalog offers one or two showcases per topic for now, not every algorithm in each family.

The showcases and original algorithms allow these maximum input sizes:

| Showcase                         | Maximum                                        |
| -------------------------------- | ---------------------------------------------- |
| DFS                              | 240 × 240 grid                                 |
| Bubble Sort                      | 140 items                                      |
| BST Search                       | 120 nodes                                      |
| 0/1 Knapsack                     | 80 items and capacity 180                      |
| N-Queens                         | 80 × 80 board                                  |
| Interval Scheduling              | 120 activities                                 |
| Binary Search and Sorted Two-Sum | 160 items each                                 |
| BFS, Dijkstra, and A*            | 240 × 240 grid                                 |
| RRT                              | Workspace 200, 180 obstacles, 6,000 iterations |
| Gradient Descent                 | 3,000 iterations                               |

Every configured item remains in the scene, including all grid cells, table cells, board squares, tree nodes, array items, and RRT obstacles and nodes. Large scenes start with a scaled overview; zoom and pan to inspect details. Labels thin out when they would overlap. A long grid or N-Queens search can take time, but it continues until a result unless you cancel it or the browser reports an error.
