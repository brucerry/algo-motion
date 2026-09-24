# Spec Delta

## Purpose

Visualize seeded rapid exploration in a true 3D workspace so learners can inspect sampled points, collision decisions, tree growth, and the final route.

## ADDED Requirements

### Requirement: Configurable 3D planning
RRT SHALL provide bounded controls for workspace size, maximum iterations, step size, goal bias, goal threshold, obstacle count, obstacle size range, and seed. The start and goal SHALL be outside generated obstacles, and the same configuration SHALL reproduce obstacle geometry and sample order.

#### Scenario: Repeat seeded run
- **WHEN** the user reruns RRT with the same validated settings and seed
- **THEN** obstacles, samples, accepted branches, and outcome match

### Requirement: Collision-aware tree growth
Each accepted tree edge SHALL lie within workspace bounds and avoid obstacles. The visualization SHALL expose sampled points, rejected attempts, accepted tree edges, the newest branch, start, goal, and a final route if connected.

#### Scenario: Rejected extension
- **WHEN** an extension collides with an obstacle
- **THEN** the attempt is marked rejected and no colliding edge is added to the tree

#### Scenario: Goal connection
- **WHEN** the tree reaches and can connect to the goal
- **THEN** a collision-free path from start to goal is highlighted and its length is reported

#### Scenario: Iteration limit
- **WHEN** the iteration limit is reached without a goal connection
- **THEN** the run reports no path found within the configured budget

### Requirement: RRT node inspection
Selecting a tree node SHALL display its 3D position, parent, and cumulative cost from the root. The current frame SHALL expose iteration, accepted and rejected counts, node count, and distance to goal.

#### Scenario: Select tree node
- **WHEN** the user selects an RRT node
- **THEN** the node's coordinates, parent identifier, and root cost are shown
