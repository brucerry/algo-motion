# Grid Pathfinding Specification

## Purpose

Show how BFS, Dijkstra, and A* explore a reproducible grid, make decisions, and produce valid routes or a clear no-path result.

## Requirements

### Requirement: Reproducible grid environment
The three grid algorithms SHALL support adjustable width, depth, obstacle density, diagonal movement, and seed. Start and goal SHALL remain traversable and visibly distinct. Identical environment settings and seed SHALL produce the same grid; diagonal moves SHALL not pass through blocked corners.

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
Dijkstra SHALL support a nonnegative edge-weight mode, expose tentative distances, and return a minimum-cost valid path when the goal is reachable.

#### Scenario: Weighted route
- **WHEN** a lower-cost route has more steps than another route
- **THEN** Dijkstra selects the lower-cost route and reports its total cost

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
