# Spec Delta

## MODIFIED Requirements

### Requirement: Illustrated algorithm scenes
The grid, RRT, gradient-descent, and new showcase visualizations SHALL share the illustrated style through hand-drawn-looking marks, outlines, or surface treatments appropriate to each scene. Start, goal, obstacle, frontier, visited, current, solution, rejected, selected, trajectory, and gradient states SHALL remain distinguishable wherever they apply, including by a cue beyond color for critical states. New scenes SHALL also distinguish considered, accepted, backtracked, and completed states wherever they apply. Visual restyling SHALL preserve scene selection, camera interaction, and correspondence with the current simulation frame.

#### Scenario: Compare algorithm families
- **WHEN** a user switches between a grid search, RRT, and gradient descent
- **THEN** each 3D scene has a recognizable illustrated treatment and its active and completed states remain understandable

#### Scenario: Inspect a marked object
- **WHEN** a user selects a cell or RRT node in the restyled scene
- **THEN** the selected object is visibly marked and its existing inspection text describes the correct current state

#### Scenario: Switch to a new showcase
- **WHEN** a user opens a sorting, tree, dynamic programming, backtracking, greedy, or array-technique showcase
- **THEN** its illustrated scene distinguishes the current decision from completed and rejected elements, and selection text matches the current frame
