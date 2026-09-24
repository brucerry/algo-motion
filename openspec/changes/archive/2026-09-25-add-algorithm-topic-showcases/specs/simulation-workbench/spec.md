# Spec Delta

## MODIFIED Requirements

### Requirement: Algorithm navigation and responsive layout
The application SHALL list implemented algorithms by category and open a workbench containing the selected visualization, parameters, transport controls, and learning panels. With the expanded catalog, categories and their displayed algorithm entries SHALL appear in lexicographical order, remain compactly browsable and keyboard accessible, and keep the active algorithm discoverable. The layout SHALL keep the visualization usable on desktop and small screens. Unimplemented future algorithms SHALL not appear as selectable placeholders.

#### Scenario: Select algorithm
- **WHEN** a user selects an algorithm from navigation
- **THEN** its visualization, controls, parameters, and learning content are displayed without a full page reload

#### Scenario: Narrow viewport
- **WHEN** the viewport is too narrow for side panels
- **THEN** all controls and learning content remain reachable through a compact layout

#### Scenario: Browse expanded categories
- **WHEN** a user navigates the expanded catalog by keyboard or on a narrow screen
- **THEN** they can reveal each implemented category and identify the currently active algorithm without scrolling through every algorithm at once

#### Scenario: Browse sorted menu
- **WHEN** the algorithm menu is shown on desktop or mobile
- **THEN** topic headings and the displayed entries within each topic are in lexicographical order

### Requirement: Shared timeline controls
Every implemented algorithm SHALL support play, pause, previous step, next step, restart, scrubbing, and selectable speeds of 0.25x, 0.5x, 1x, 2x, 4x, 8x, 16x, and 32x. The workbench SHALL show the current and total step counts.

#### Scenario: Scrub execution
- **WHEN** the user moves the timeline to an earlier step
- **THEN** the scene and all frame-linked panels immediately show that step and playback stops

#### Scenario: Reach final frame
- **WHEN** playback reaches the final frame
- **THEN** playback stops without advancing beyond it, and replay can start from the beginning

#### Scenario: Reverse one step
- **WHEN** the user presses previous step after advancing
- **THEN** the preceding recorded state is restored, including its metrics and explanation

#### Scenario: Select faster playback
- **WHEN** a user selects 8x, 16x, or 32x playback
- **THEN** the simulation advances at that speed without stepping beyond the final frame, and the selection survives a reload

## ADDED Requirements

### Requirement: Clear terminal outcomes across topics
The workbench SHALL distinguish a valid result, an instance with no route, match, or solution, a configured run limit, and an execution error in its final status and explanation. A special terminal outcome SHALL display a visible message near the simulation even when the learning panel is showing its guide. An unsuccessful search SHALL not be presented as success.

#### Scenario: Search ends without a match
- **WHEN** binary search, tree search, two-sum, or N-Queens exhausts its valid choices without a result
- **THEN** the final status states that no match or solution was found and the scene contains no fabricated answer

#### Scenario: Route cannot be reached
- **WHEN** a grid search exhausts its reachable cells without finding the goal
- **THEN** the workbench shows a no-path message with the runner's explanation beside the simulation

#### Scenario: Run cannot finish
- **WHEN** a run hits its iteration or replay budget, or encounters an execution error
- **THEN** the workbench shows the limit or error reason beside the simulation without claiming a solution

### Requirement: Dependent numeric parameter ranges
Every numeric control SHALL show and enforce its current minimum and maximum. When a data-size setting changes a dependent range, the control and validated URL state SHALL update together. Existing dependent values outside the new range SHALL be adjusted to its nearest allowed value with a visible explanation. Direct edits outside the current range SHALL be rejected.

#### Scenario: Shrink generated data
- **WHEN** a user reduces an array, BST, knapsack, or RRT workspace size while a dependent value exceeds its new maximum
- **THEN** the dependent value is adjusted into range, its displayed bound changes, and the simulation remains valid

#### Scenario: Load a shared link with stale dependent values
- **WHEN** a shared URL contains a size and a dependent value outside the resulting range
- **THEN** the value is adjusted into range and the workbench tells the user about the adjustment

### Requirement: Tenfold showcase input capacity
The eight new showcases SHALL accept size controls up to ten times their initially implemented maxima: DFS width and depth 240, Bubble Sort count 140, BST node count 120, knapsack item count 80 and capacity 180, N-Queens board size 80, interval count 120, and binary-search and sorted-two-sum array lengths 160. Existing graph searches SHALL accept width and depth 240; RRT SHALL accept workspace size 200, 180 obstacles, and 6000 iterations; gradient descent SHALL accept 3000 iterations. Large scenes SHALL show every configured item, keep objects selectable, and support camera zoom and pan. If a bounded trace cannot finish the algorithm, the final outcome SHALL report a limit rather than success or no solution.

#### Scenario: Reopen a maximum-size showcase
- **WHEN** a user loads a URL containing a valid maximum-size input for one of the new showcases
- **THEN** the parameter is retained, the run produces deterministic replay frames, and the scene remains operable

#### Scenario: Trace budget ends before the answer
- **WHEN** a large grid search or N-Queens run exhausts its recorded frame budget before establishing a result
- **THEN** the final status identifies an incomplete run without claiming success, no path, or no solution

#### Scenario: View maximum-size input
- **WHEN** a user loads a maximum-size array, tree, table, board, grid, RRT, or interval input
- **THEN** every item is present in the scene overview, and the camera can zoom and pan to inspect its details
