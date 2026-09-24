# Spec Delta

## Purpose

Reveal how a dynamic programming table reuses smaller subproblems and how the final answer is reconstructed from those recorded choices.

## ADDED Requirements

### Requirement: 0/1 Knapsack showcase
The showcase SHALL solve a bounded 0/1 Knapsack instance with integer item weights, item values, and capacity. Each item SHALL be chosen at most once. The visualization SHALL expose the active table cell, the skip and take candidates where applicable, the chosen value, and the reconstruction of an optimal item subset.

#### Scenario: Compute a table cell
- **WHEN** an item fits within the active capacity
- **THEN** the displayed cell value is the greater of skipping that item and taking it once with the appropriate prior-row value

#### Scenario: Reconstruct an optimum
- **WHEN** the final table cell is reached
- **THEN** the selected items have total weight within capacity and total value equal to the displayed optimum

### Requirement: Reproducible bounded knapsack
The showcase SHALL provide bounded item-count, capacity, and seed controls, meaningful presets, a shareable configuration, and selectable table cells with their row, capacity, value, and decision context.

#### Scenario: Repeat an instance
- **WHEN** a user reopens a knapsack configuration with the same seed
- **THEN** the items, table values, reconstruction, and frame order are unchanged
