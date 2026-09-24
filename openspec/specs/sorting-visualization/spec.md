# Sorting Visualization Specification

## Purpose

Show how a familiar sorting algorithm changes an array through inspectable comparisons and swaps, using the shared step-by-step workbench.

## Requirements

### Requirement: Bubble Sort showcase
Bubble Sort SHALL sort a bounded array into ascending order by comparing adjacent values and swapping only out-of-order pairs. The run SHALL expose the compared pair, each swap, completed passes, and the final sorted array. Equal values SHALL retain their original relative order.

#### Scenario: Sort duplicate values
- **WHEN** an array contains duplicate and out-of-order values
- **THEN** the final array is ascending, equal values retain their relative order, and each displayed swap matches the adjacent comparison that caused it

#### Scenario: Already sorted array
- **WHEN** the input array is already ascending
- **THEN** the run completes without unnecessary swaps and explains why no further pass is needed

### Requirement: Reproducible sorting experiment
The showcase SHALL provide bounded array-size and seed controls, editable presets, a shareable configuration, frame-linked comparison and swap metrics, and selection details for visible items.

#### Scenario: Replay a shared sort
- **WHEN** a user opens the same Bubble Sort URL twice
- **THEN** both runs show the same input array and ordered sequence of comparison and swap states