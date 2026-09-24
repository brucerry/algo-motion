# Learning Inspection Specification

## Purpose

Connect each rendered algorithm state to the corresponding reasoning, pseudocode, metrics, and reliable learning material in readable text.

## Requirements

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

### Requirement: Frame-linked learning companions
The pseudocode panel SHALL include a hand-drawn computer server that progresses from a ready or starting pose to a working pose and a playful burnout pose at the final frame. The Current step panel SHALL include a pair of walking shoes whose pose responds to step movement. These illustrations SHALL follow the displayed frame and playback state, remain decorative, and SHALL not replace or obscure pseudocode, explanations, metrics, or outcome text.

#### Scenario: Start a run
- **WHEN** the simulation is at its first frame
- **THEN** the server shows its starting pose and the shoes are at rest

#### Scenario: Advance and pause
- **WHEN** playback or manual stepping advances through intermediate frames
- **THEN** the server shows a working pose with a visible progress meter tied to the displayed frame, plays an obvious running animation during playback, and the shoes visibly take steps, settling when motion stops

#### Scenario: Reach the final frame
- **WHEN** the displayed frame is the last frame of a run, regardless of its outcome
- **THEN** the server shows a playful burnout pose and the shoes stop while the actual outcome remains readable in text

#### Scenario: Rewind or switch experiments
- **WHEN** the user rewinds, restarts, scrubs, switches algorithms, or changes parameters
- **THEN** both illustrations match the newly displayed frame without retaining a stale final or walking pose

#### Scenario: Reduced motion and narrow layout
- **WHEN** reduced motion is requested or the learning panels are shown on a narrow screen
- **THEN** the illustrations use still, compact poses without hiding the frame-linked learning content
