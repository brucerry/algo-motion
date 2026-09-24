# Spec Delta

## ADDED Requirements

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
