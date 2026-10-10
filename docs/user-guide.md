# User guide

[Project overview](../README.md) · [Algorithms and limits](algorithms.md) · [Screenshots](screenshots.md)

## Choose and inspect an algorithm

Expand a topic and choose an algorithm. Topics and entries appear in alphabetical order. On smaller screens, use the compact navigation and panels to reach the same controls.

The scene, Current step, pseudocode, and metrics describe the displayed frame. Click a scene item to inspect its state. Rubik’s Cube, Mirror Cube and Square-1 also provide piece selectors for every exterior piece, including those hidden behind visible faces.

## Playback and camera

Use the transport bar to play, pause, step forward or backward, restart, or scrub. Playback speeds range from **0.25× to 32×**. Scrubbing stops playback and restores the selected state.

| Action                  | Mouse or keyboard                   | Touch            |
| ----------------------- | ----------------------------------- | ---------------- |
| Rotate                  | Drag the scene                      | One-finger drag  |
| Zoom                    | Scroll                              | Two-finger pinch |
| Pan                     | Right-drag                          | Two-finger drag  |
| Restore an upright view | Default, Top, Side, or Reset camera | Same buttons     |

Rotation is continuous through 360° horizontally and vertically. Drag directions follow the current view even upside down; camera rotation does not change algorithm coordinates or cube move notation. See [camera design](design-notes.md#camera-motion) for implementation details.

| Shortcut     | Action               |
| ------------ | -------------------- |
| Space        | Play or pause        |
| Left / Right | Previous / next step |
| R            | Restart              |
| C            | Reset camera         |

Shortcuts do not activate while editing fields. Reduced-motion mode displays exact states without animated transitions.

## Parameters, presets, and sharing

Each algorithm has its own controls. Numeric fields show their allowed range. Search targets, knapsack capacity, and RRT geometry ranges adjust with input size. When a size change leaves a dependent value outside its range, the value moves to the nearest allowed value with a notice. Direct out-of-range edits are rejected.

Accepted changes regenerate the run and reset the timeline. Presets remain editable. **Randomize** chooses and displays a new seed; repeating validated parameters and seed reproduces the experiment.

The URL stores the algorithm and its validated parameters, including seed. Copy it to share the experiment. Malformed values fall back to safe defaults with feedback. An explicit URL takes precedence over locally saved preferences such as the last algorithm, speed, and theme.

Every configured item remains in the scene and can be selected. Large arrays wrap across rows; large trees wrap in-order ranks across a 3D layout, with height showing depth. Large scenes open with an overview; zoom and pan for details. Labels thin out when they would overlap. See [input limits](algorithms.md#input-limits).

## Generation and outcomes

While a worker generates steps, the timeline shows a pending total and allows inspection of available frames, including earlier ones. You can cancel a long run; cancellation is marked incomplete. Changing the experiment discards obsolete results.

Grid search and N-Queens continue until they find a result or exhaust their search, without a fixed recorded-step ceiling. RRT and Gradient Descent retain adjustable iteration budgets. A message beside the scene explains no route, no match, no solution, a configured limit, cancellation, or an execution error, including when the Guide tab is open.

Twisty puzzles keep their initial scramble inspectable while tables and a verified solution are prepared. Their replay has no imposed step ceiling. Cube presets retain the selected size and all puzzle presets retain the seed. See [puzzle strategies and notation](design-notes.md#rubiks-cube-solving-and-replay) for what the animation represents.

## Comparison

**Compare topic** is available for topics with at least two algorithms; Graph Search labels it **Compare searches**. Every implemented algorithm in the selected topic is included.

| Topic               | Inputs used in comparison                                                        |
| ------------------- | -------------------------------------------------------------------------------- |
| Array Techniques    | One sorted array; separate target value and target sum                           |
| Backtracking        | Separate Mirror Cube, N-Queens, 3×3–5×5 Rubik’s Cube, Square-1 and Sudoku inputs |
| Dynamic Programming | Separate knapsack and coin-change inputs                                         |
| Graph Search        | One grid, with identical obstacles, terrain costs, seed, and movement rules      |
| Motion Planning     | One workspace and obstacle set for RRT and RRT*                                  |
| Optimization        | Separate Gradient Descent and Interval Scheduling inputs                         |
| Sorting             | One seeded starting array for all four strategies                                |
| Trees               | One seeded BST for search and traversal                                          |

Shared controls use the common valid range. For example, entering Array Techniques comparison from Binary Search above 160 items adjusts the shared size to 160 with a notice.

Changing a case's own parameters regenerates just that case; shared-input changes regenerate every affected member. The shared timeline aligns replay positions, not equivalent algorithm operations. A run that finishes first holds its final state. Each retains its own outcome and cancellation status. Metrics for different problems are labeled separately and are not ranked against each other; browser execution time is not a rigorous algorithm benchmark.

For a useful weighted-path example, open Dijkstra’s **Weighted detour** preset and choose **Compare searches**. See [why BFS and Dijkstra can look alike](algorithms.md#graph-search).

## Themes and optional sound

Choose the paper-notebook or chalkboard theme; the preference is saved locally. Step sound starts muted each time the page opens. Select **Sound off** to enable short cues during playback and individual Next/Previous steps, including keyboard stepping. Scrubbing, jumping, restarting, and switching experiments stay silent.

The small server in Pseudocode and shoes in Current step follow the displayed progress. The outcome badge and explanation communicate the actual result. Read more in [visual design notes](design-notes.md#visual-style-and-progress-characters).
