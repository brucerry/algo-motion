# Spec Delta

## MODIFIED Requirements

### Requirement: Reproducible grid environment
BFS, Dijkstra, A*, and DFS SHALL support adjustable width, depth, obstacle density, diagonal movement, and seed. Start and goal SHALL remain traversable and visibly distinct. Identical environment settings and seed SHALL produce the same grid; diagonal moves SHALL not pass through blocked corners.

#### Scenario: Generate seeded grid
- **WHEN** the user regenerates a grid with unchanged settings and seed
- **THEN** obstacles, start, and goal occupy the same cells

## ADDED Requirements

### Requirement: DFS execution
DFS SHALL explore the seeded grid in a deterministic depth-first order, show the active cell, frontier, visited cells, and backtracking, and return a valid start-to-goal route when one is found. The guide SHALL explain that the first DFS route is not guaranteed to have the fewest hops or lowest cost.

#### Scenario: Reachable goal
- **WHEN** a traversable route exists
- **THEN** DFS ends with a contiguous start-to-goal route and its recorded traversal follows depth-first order

#### Scenario: No route
- **WHEN** the goal cannot be reached
- **THEN** DFS exhausts its frontier, reports no path, and does not show a solution route
