# Spec Delta

## Purpose

Connect each rendered algorithm state to the corresponding reasoning, pseudocode, metrics, and reliable learning material in readable text.

## ADDED Requirements

### Requirement: Frame-synchronized pseudocode and explanation
Each algorithm SHALL provide pseudocode. The current frame SHALL highlight its active line or lines and show a state-specific explanation; moving to another frame SHALL update both, and long pseudocode SHALL keep the active line visible.

#### Scenario: Advance frame
- **WHEN** the user advances one algorithm step
- **THEN** the highlighted pseudocode and explanation correspond to the newly rendered state

### Requirement: Algorithm-specific metrics and inspection
The workbench SHALL display metrics appropriate to the selected algorithm and current frame. Where selectable scene objects exist, selection SHALL show their current state and relationships in text, including available scores, parent, cost, or coordinates.

#### Scenario: Scrub with selection
- **WHEN** a user scrubs to an earlier frame while an object is selected
- **THEN** inspection and metrics reflect that frame or clearly state that the object did not yet exist

### Requirement: Educational algorithm content
Each implemented algorithm SHALL provide an overview, intuition, pseudocode, applicable complexity, parameter explanations, visualization legend, applications, and references. Claims about original research, later variants, and this site's implementation choices SHALL be distinguished.

#### Scenario: Open algorithm guide
- **WHEN** a user opens an algorithm's learning content
- **THEN** they can read all applicable sections and identify the source of research claims

### Requirement: Mathematical notation and text access
Mathematical expressions SHALL render readably and have accessible textual meaning. Important algorithm state SHALL remain available without relying solely on color or animation.

#### Scenario: Inspect step without animation
- **WHEN** the user pauses the visualization
- **THEN** the current state, explanation, and metrics remain readable as text
