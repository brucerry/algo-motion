# Spec Delta

## MODIFIED Requirements

### Requirement: Shared-environment comparison
The application SHALL compare BFS, Dijkstra, A*, and DFS on the same grid, including start, goal, obstacles, terrain weights, movement rules, and seed. Comparison SHALL use a common step control and allow users to inspect each run's state, whether shown side by side or by switching views. Every algorithm SHALL use its own search rule and retain its own terminal outcome.

#### Scenario: Start comparison
- **WHEN** the user starts a comparison from a generated grid
- **THEN** all four algorithms run against the same traversability and start/goal configuration, terrain weights, and movement rules

#### Scenario: Scrub comparison
- **WHEN** the user scrubs the shared timeline
- **THEN** each algorithm shows the state at that step or its terminal state if it finished earlier

#### Scenario: Include depth-first search
- **WHEN** the user opens Graph Search comparison
- **THEN** DFS is available alongside BFS, Dijkstra, and A* and its first route is not labeled as a shortest route

### Requirement: Qualified comparison metrics
The comparison SHALL show each algorithm's outcome, completed step count, and metrics meaningful for its problem and current step. On grids it SHALL show visited-node count and path hops or cost, distinguish cost from hop count on weighted terrain, and explain when uniform terrain can make Dijkstra and BFS look alike. Metrics from different problem domains SHALL remain clearly labeled and SHALL not be presented as directly comparable measurements. JavaScript wall-clock measurements SHALL not be presented as rigorous algorithm benchmarks.

#### Scenario: Compare weighted paths
- **WHEN** edge weights vary across the shared environment
- **THEN** the display identifies BFS as a hop-based search and labels weighted path costs separately

#### Scenario: Compare unlike optimization problems
- **WHEN** Gradient Descent and Interval Scheduling appear in one comparison
- **THEN** each card names its own input and outcome and does not rank unlike objective values or schedule sizes against each other

#### Scenario: Uniform grid comparison
- **WHEN** all traversable grid edges have equal cost and diagonal movement is off
- **THEN** the comparison explains why Dijkstra and BFS can return the same minimum-hop route

## ADDED Requirements

### Requirement: Topic-wide comparison
For every topic with at least two implemented algorithms, the workbench SHALL offer comparison containing every implemented algorithm in that topic and no algorithm from another topic. Algorithms that can solve the same input SHALL receive one shared generated input while retaining their own algorithm-specific controls. Algorithms solving different kinds of problems SHALL retain separate validated inputs, which the comparison SHALL identify. A topic with only one implemented algorithm SHALL not offer a misleading comparison action.

#### Scenario: Compare array techniques
- **WHEN** the user compares Binary Search and Sorted Two-Sum
- **THEN** both runs inspect the same sorted array while each uses its own validated target meaning and value

#### Scenario: Compare optimization algorithms
- **WHEN** the user compares Gradient Descent and Interval Scheduling
- **THEN** both are available with their own inputs and their results are identified by problem type

#### Scenario: Topic membership changes
- **WHEN** another implemented algorithm is added to a topic
- **THEN** that algorithm appears in the topic's comparison without an unrelated topic's algorithm appearing

### Requirement: Comparison replay and run lifecycle
Comparison SHALL preserve shared play, pause, stepping, and scrubbing while each run advances only through available states. A run that finishes earlier SHALL hold its terminal state while other runs continue. Generation progress, cancellation, no-result outcomes, configured limits, and errors SHALL remain identifiable per run. Changing topic or comparison inputs SHALL replace obsolete runs without showing their late results in the new comparison. Shared step numbers SHALL be described as replay positions, not equivalent operations across different algorithms.

#### Scenario: One run finishes first
- **WHEN** one compared run completes before another
- **THEN** the completed run stays at its terminal state as the shared timeline advances

#### Scenario: Cancel a generating run
- **WHEN** the user cancels a generating run in comparison
- **THEN** that run is marked incomplete and cannot be mistaken for a valid result

#### Scenario: Change comparison input
- **WHEN** the user changes a validated input while comparison is active
- **THEN** affected runs restart with that input and results from obsolete runs do not appear
