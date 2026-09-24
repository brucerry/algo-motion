# Algorithm Comparison Specification

## Purpose

Let learners compare BFS, Dijkstra, and A* on one generated environment with aligned progress and meaningful, qualified metrics.

## Requirements

### Requirement: Shared-environment comparison
The application SHALL offer a basic comparison of BFS, Dijkstra, and A* using the same start, goal, obstacles, movement rules, and seed. Comparison SHALL use a common step control and allow users to inspect each run's state, whether shown side by side or by switching views.

#### Scenario: Start comparison
- **WHEN** the user starts a comparison from a generated grid
- **THEN** all three algorithms run against the same traversability and start/goal configuration

#### Scenario: Scrub comparison
- **WHEN** the user scrubs the shared timeline
- **THEN** each algorithm shows the state at that step or its terminal state if it finished earlier

### Requirement: Qualified comparison metrics
The comparison SHALL show visited-node count, path length or cost, and step count for each algorithm. It SHALL distinguish cost from hop count on weighted grids and SHALL not present JavaScript wall-clock measurements as rigorous algorithm benchmarks.

#### Scenario: Compare weighted paths
- **WHEN** edge weights vary across the shared environment
- **THEN** the display identifies BFS as a hop-based search and labels weighted path costs separately
