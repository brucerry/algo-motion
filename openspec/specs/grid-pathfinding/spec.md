# Grid Pathfinding Specification

## Purpose

Show how BFS, Dijkstra, A*, and DFS explore a reproducible grid, make decisions, and produce valid routes or a clear no-path result.

## Requirements

### Requirement: Reproducible grid environment
BFS, Dijkstra, A*, and DFS SHALL support adjustable width, depth, obstacle density, diagonal movement, and seed. Start and goal SHALL remain traversable and visibly distinct. Identical environment settings and seed SHALL produce the same grid; diagonal moves SHALL not pass through blocked corners.

#### Scenario: Generate seeded grid
- **WHEN** the user regenerates a grid with unchanged settings and seed
- **THEN** obstacles, start, and goal occupy the same cells

### Requirement: BFS execution
BFS SHALL explore traversable cells in queue order, visualize frontier, visited, current, and final path states, and return a minimum-hop route when one exists on its uniform-cost grid.

#### Scenario: Reachable goal
- **WHEN** a valid path exists on an unweighted grid
- **THEN** BFS returns a contiguous minimum-hop path from start to goal

#### Scenario: Blocked goal
- **WHEN** no traversable route exists
- **THEN** BFS ends with a no-path explanation and no fabricated solution path

### Requirement: Dijkstra execution
Dijkstra SHALL support nonnegative edge costs, settle the reachable frontier cell with the lowest tentative total cost, expose tentative distances and the chosen route's total cost, and return a minimum-cost valid path when the goal is reachable. The interface SHALL identify whether the current terrain is uniform or weighted and explain that Dijkstra can resemble BFS when every traversable edge has equal cost.

#### Scenario: Weighted route
- **WHEN** a lower-cost route has more steps than another route
- **THEN** Dijkstra selects the lower-cost route and reports its total cost

#### Scenario: Uniform terrain
- **WHEN** all traversable edges have equal cost and diagonal movement is off
- **THEN** Dijkstra finds a minimum-hop route and the interface explains why its result can match BFS

#### Scenario: Weighted route differs from BFS
- **WHEN** weighted terrain makes a longer route cheaper than the route with fewest hops
- **THEN** Dijkstra's displayed route has the lower total cost and the comparison makes the route and cost difference visible

### Requirement: A* execution
A* SHALL expose Manhattan, Euclidean, and Chebyshev heuristics and an adjustable heuristic weight; it SHALL show open and closed sets, current node, resulting path, and selected node's g, h, and f values. The interface SHALL explain that a heuristic weight above one can trade optimality for speed; it SHALL not claim shortest-path optimality for such runs.

#### Scenario: Inspect candidate
- **WHEN** the user selects an explored A* cell
- **THEN** its status, g, h, f, and parent values are displayed when available

#### Scenario: Weighted heuristic
- **WHEN** heuristic weight is greater than one
- **THEN** the run remains valid and the interface identifies its optimality caveat

### Requirement: Shared grid visualization
The grid scene SHALL distinguish unvisited, frontier, current, visited, obstacle, start, goal, and solution cells using a consistent legend and non-color cues where practical. Selecting a cell SHALL reveal its algorithm-specific state.

#### Scenario: Select grid cell
- **WHEN** a user selects a visible cell
- **THEN** the inspection panel identifies the cell and its current algorithm state

### Requirement: DFS execution
DFS SHALL explore the seeded grid in a deterministic depth-first order, show the active cell, frontier, visited cells, and backtracking, and return a valid start-to-goal route when one is found. The guide SHALL explain that the first DFS route is not guaranteed to have the fewest hops or lowest cost.

#### Scenario: Reachable goal
- **WHEN** a traversable route exists
- **THEN** DFS ends with a contiguous start-to-goal route and its recorded traversal follows depth-first order

#### Scenario: No route
- **WHEN** the goal cannot be reached
- **THEN** DFS exhausts its frontier, reports no path, and does not show a solution route

### Requirement: Complete finite grid searches
For every valid grid configuration, BFS, Dijkstra, A*, and DFS SHALL continue until they find the goal or exhaust reachable cells, regardless of how many replay steps that takes. Their ordered exploration and final route or no-path outcome SHALL be deterministic for identical inputs. A fixed replay-step count SHALL not produce a limit outcome.

#### Scenario: Goal after former frame ceiling
- **WHEN** a reachable grid search needs more than the former 3,000- or 12,000-step ceiling
- **THEN** it continues to the goal and returns a valid route rather than a limit result

#### Scenario: Exhaustion after former frame ceiling
- **WHEN** an unreachable grid search needs more than the former ceiling to exhaust its frontier
- **THEN** it continues to a no-path result without showing a fabricated route
