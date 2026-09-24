# Spec Delta

## MODIFIED Requirements

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
