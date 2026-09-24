# Spec Delta

## ADDED Requirements

### Requirement: Complete finite grid searches
For every valid grid configuration, BFS, Dijkstra, A*, and DFS SHALL continue until they find the goal or exhaust reachable cells, regardless of how many replay steps that takes. Their ordered exploration and final route or no-path outcome SHALL be deterministic for identical inputs. A fixed replay-step count SHALL not produce a limit outcome.

#### Scenario: Goal after former frame ceiling
- **WHEN** a reachable grid search needs more than the former 3,000- or 12,000-step ceiling
- **THEN** it continues to the goal and returns a valid route rather than a limit result

#### Scenario: Exhaustion after former frame ceiling
- **WHEN** an unreachable grid search needs more than the former ceiling to exhaust its frontier
- **THEN** it continues to a no-path result without showing a fabricated route
