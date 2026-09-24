# Spec Delta

## ADDED Requirements

### Requirement: Complete finite N-Queens search
For every valid board size, N-Queens SHALL continue deterministic backtracking until it finds its first complete solution or exhausts every valid branch. A fixed replay-step count SHALL not produce a limit outcome; every generated choice and reversal SHALL remain inspectable.

#### Scenario: Solution after former frame ceiling
- **WHEN** the first complete placement takes more than the former 12,000-step ceiling
- **THEN** the search continues and shows the first valid solution in its deterministic order

#### Scenario: No complete placement
- **WHEN** a valid board size has no solution
- **THEN** the search exhausts its branches and reports no solution
