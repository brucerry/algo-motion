# Tree Algorithms Specification

## Purpose

Let learners follow a binary search tree decision from its root to a matching value or an empty branch in an inspectable scene.

## Requirements

### Requirement: Binary search tree search showcase
The showcase SHALL build a bounded reproducible binary search tree with distinct keys and search for a target by choosing the left or right child according to key comparison. It SHALL expose the current node, visited path, comparison direction, and found or absent result without claiming that an unbalanced tree has logarithmic worst-case search time.

#### Scenario: Find a present key
- **WHEN** the target key is in the tree
- **THEN** the displayed path follows valid binary search tree comparisons and ends at the matching node

#### Scenario: Search for an absent key
- **WHEN** the target key is absent
- **THEN** the path ends at the appropriate empty child and the workbench reports that no match was found

### Requirement: Reproducible tree inspection
The showcase SHALL provide bounded tree-size, seed, and target controls, presets, a shareable configuration, and selectable nodes that reveal their key, relationships, and current search state.

#### Scenario: Inspect an earlier decision
- **WHEN** a user selects a node and scrubs to an earlier frame
- **THEN** its inspection text describes its state at that frame without retaining a later visited or found mark