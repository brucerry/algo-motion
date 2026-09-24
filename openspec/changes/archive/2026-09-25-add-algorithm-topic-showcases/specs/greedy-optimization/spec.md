# Spec Delta

## Purpose

Show why a locally chosen interval can form a globally maximum-size set of non-overlapping activities.

## ADDED Requirements

### Requirement: Interval scheduling showcase
The Optimization category SHALL include an interval scheduling showcase that orders a bounded set of activities by finishing time and greedily accepts each compatible activity. Intervals SHALL use a stated endpoint convention so activities that touch at an endpoint are handled consistently. The final selection SHALL have maximum cardinality among compatible subsets.

#### Scenario: Choose an earlier finish
- **WHEN** overlapping activities have different finishing times
- **THEN** the algorithm considers the earlier-finishing activity first and explains its accept or reject decision

#### Scenario: Touching endpoints
- **WHEN** one activity ends exactly when another begins
- **THEN** both may be selected under the displayed endpoint convention

### Requirement: Reproducible interval inspection
The showcase SHALL provide bounded activity-count and seed controls, presets, a shareable configuration, and selectable intervals showing start, end, order, and accept or reject status at the current frame.

#### Scenario: Replay a greedy decision
- **WHEN** the same configuration is loaded twice
- **THEN** activity data, consideration order, accepted set, and explanation frames match
