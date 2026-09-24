# Spec Delta

## MODIFIED Requirements

### Requirement: Shared timeline controls
Every implemented algorithm SHALL support play, pause, previous step, next step, restart, scrubbing, and selectable speeds of 0.25x, 0.5x, 1x, 2x, 4x, 8x, 16x, and 32x. The workbench SHALL show the current step and the total step count once known. While a trace is still being generated, it SHALL identify the total as pending and allow control of steps already available.

#### Scenario: Scrub execution
- **WHEN** the user moves the timeline to an earlier available step
- **THEN** the scene and all frame-linked panels show that step and playback stops

#### Scenario: Reach final frame
- **WHEN** playback reaches the final frame of a completed trace
- **THEN** playback stops without advancing beyond it, and replay can start from the beginning

#### Scenario: Reverse one step
- **WHEN** the user presses previous step after advancing
- **THEN** the preceding recorded state is restored, including its metrics and explanation

#### Scenario: Select faster playback
- **WHEN** a user selects 8x, 16x, or 32x playback
- **THEN** the simulation advances at that speed without stepping beyond an available frame, and the selection survives a reload

#### Scenario: Playback catches generation
- **WHEN** playback reaches the newest available step before generation is complete
- **THEN** it waits for more steps without presenting that step as the final result

### Requirement: Clear terminal outcomes across topics
The workbench SHALL distinguish a valid result, an instance with no route, match, or solution, a configured algorithm iteration limit, a user-cancelled run, and an execution error in its status and explanation. A special terminal outcome SHALL display a visible message near the simulation even when the learning panel is showing its guide. An unsuccessful or incomplete search SHALL not be presented as success.

#### Scenario: Search ends without a match
- **WHEN** binary search, tree search, two-sum, or N-Queens exhausts its valid choices without a result
- **THEN** the final status states that no match or solution was found and the scene contains no fabricated answer

#### Scenario: Route cannot be reached
- **WHEN** a grid search exhausts its reachable cells without finding the goal
- **THEN** the workbench shows a no-path message with the runner's explanation beside the simulation

#### Scenario: Run cannot finish
- **WHEN** a run reaches a configured iteration limit, is cancelled, or encounters an execution error
- **THEN** the workbench shows the corresponding reason beside the simulation without claiming a solution

### Requirement: Tenfold showcase input capacity
The eight new showcases SHALL accept size controls up to ten times their initially implemented maxima: DFS width and depth 240, Bubble Sort count 140, BST node count 120, knapsack item count 80 and capacity 180, N-Queens board size 80, interval count 120, and binary-search and sorted-two-sum array lengths 160. Existing graph searches SHALL accept width and depth 240; RRT SHALL accept workspace size 200, 180 obstacles, and 6000 iterations; gradient descent SHALL accept 3000 iterations. Large scenes SHALL show every configured item, keep objects selectable, and support camera zoom and pan. Grid search and N-Queens SHALL not stop because of a fixed recorded-step budget. RRT and gradient descent SHALL report a configured iteration limit as an incomplete result when reached, without claiming success.

#### Scenario: Reopen a maximum-size showcase
- **WHEN** a user loads a URL containing a valid maximum-size input for one of the new showcases
- **THEN** the parameter is retained, the run produces deterministic replay steps, and the scene remains operable

#### Scenario: Trace budget ends before the answer
- **WHEN** a valid grid or N-Queens run requires more than its former recorded-step budget
- **THEN** generation continues to an algorithmic result, and the user can inspect steps beyond the former budget

#### Scenario: View maximum-size input
- **WHEN** a user loads a maximum-size array, tree, table, board, grid, RRT, or interval input
- **THEN** every item is present in the scene overview, and the camera can zoom and pan to inspect its details

## ADDED Requirements

### Requirement: Responsive long-trace generation
While generating a long grid or N-Queens trace, the workbench SHALL keep its controls responsive, show that generation is in progress, and offer cancellation. The user SHALL be able to inspect generated steps while generation continues. Cancellation SHALL stop further generation and identify the run as incomplete; it SHALL not fabricate a search result. Reopening an unchanged configuration SHALL reproduce the same ordered steps.

#### Scenario: Inspect during generation
- **WHEN** a valid long run has generated some steps but has not finished
- **THEN** the user can inspect an available step and continue using the workbench while generation progresses

#### Scenario: Cancel generation
- **WHEN** the user cancels a generating run
- **THEN** no further steps are generated for that run and the workbench identifies it as cancelled rather than solved or exhausted

#### Scenario: Replace an active run
- **WHEN** the user changes the algorithm or parameters during generation
- **THEN** work for the old configuration stops and its late results do not appear in the new run
