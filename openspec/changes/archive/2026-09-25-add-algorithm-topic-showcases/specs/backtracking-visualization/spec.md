# Spec Delta

## Purpose

Make tentative choices and reversals in a constraint search visible so learners can see why a branch is rejected or completed.

## ADDED Requirements

### Requirement: N-Queens backtracking showcase
The showcase SHALL attempt to place one queen per row on a bounded N-by-N board. It SHALL expose the candidate square, conflicts by column or diagonal, accepted placements, reversals, and the first complete solution found in deterministic search order. A completed solution SHALL contain N non-attacking queens.

#### Scenario: Reject a conflict
- **WHEN** a candidate square shares a column or diagonal with an existing queen
- **THEN** the frame identifies the conflict and the candidate is not added to the board

#### Scenario: Backtrack from a dead end
- **WHEN** no safe square remains in the current row
- **THEN** the displayed search returns to an earlier row and removes the queen whose choice is being reconsidered

#### Scenario: Board without a solution
- **WHEN** the bounded board size has no valid arrangement
- **THEN** the run finishes with an unsolved explanation and no fabricated final placement

### Requirement: Reproducible queen search
The showcase SHALL provide a validated board-size control, presets, frame-linked attempt and backtrack counts, and selection details for board squares. The same board size SHALL produce the same ordered search frames.

#### Scenario: Revisit a branch
- **WHEN** the user scrubs back to a prior candidate
- **THEN** placed queens, the active candidate, conflict marks, and counts match that prior frame
