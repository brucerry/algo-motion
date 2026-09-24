# Spec Delta

## Purpose

Teach two common array search techniques through bounded, reproducible inputs and visible changes to the active search range or pointer pair.

## ADDED Requirements

### Requirement: Exact binary search showcase
Array Techniques SHALL include exact binary search over an ascending array. The visualization SHALL show low, middle, and high positions, the discarded range after each comparison, and a matching index or a clear not-found result. For duplicate values, the showcase SHALL return the first matching index.

#### Scenario: Find the first duplicate
- **WHEN** the target occurs at multiple indices
- **THEN** the final result is the lowest matching index and every discarded range is consistent with that result

#### Scenario: Target absent
- **WHEN** the target is absent
- **THEN** the search range becomes empty and the run reports not found without pointing to an unrelated item

### Requirement: Sorted two-sum showcase
Array Techniques SHALL include a two-pointer search for two distinct indices in an ascending array whose values sum to a target. It SHALL show the left and right pointers, current sum, reason for each pointer move, and a matching pair or a clear no-pair result.

#### Scenario: Find a pair
- **WHEN** a valid pair exists
- **THEN** the reported indices are distinct, their displayed values sum to the target, and the pointer trace is consistent with ascending order

#### Scenario: No pair exists
- **WHEN** the pointers cross without a matching sum
- **THEN** the run reports that no pair exists and shows no fabricated result

### Requirement: Reproducible array experiments
Both showcases SHALL provide bounded array-size, seed, and target controls, presets, shareable configurations, and item selection details that match the current frame.

#### Scenario: Share an array search
- **WHEN** a user opens the same array showcase URL twice
- **THEN** the sorted values, target, pointer or range sequence, and result are identical
