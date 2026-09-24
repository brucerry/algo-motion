# Simulation Workbench Specification

## Purpose

Provide a shared, accessible visual workbench in which learners can choose an algorithm, inspect its 3D execution, and control each step of a simulation.

## Requirements

### Requirement: Algorithm navigation and responsive layout
The application SHALL list implemented algorithms by category and open a workbench containing the selected visualization, parameters, transport controls, and learning panels. The layout SHALL keep the visualization usable on desktop and small screens.

#### Scenario: Select algorithm
- **WHEN** a user selects an algorithm from navigation
- **THEN** its visualization, controls, parameters, and learning content are displayed without a full page reload

#### Scenario: Narrow viewport
- **WHEN** the viewport is too narrow for side panels
- **THEN** all controls and learning content remain reachable through a compact layout

### Requirement: Shared timeline controls
Every implemented algorithm SHALL support play, pause, previous step, next step, restart, scrubbing, and selectable speeds of 0.25x, 0.5x, 1x, 2x, and 4x. The workbench SHALL show the current and total step counts.

#### Scenario: Scrub execution
- **WHEN** the user moves the timeline to an earlier step
- **THEN** the scene and all frame-linked panels immediately show that step and playback stops

#### Scenario: Reach final frame
- **WHEN** playback reaches the final frame
- **THEN** playback stops without advancing beyond it, and replay can start from the beginning

#### Scenario: Reverse one step
- **WHEN** the user presses previous step after advancing
- **THEN** the preceding recorded state is restored, including its metrics and explanation

### Requirement: Opt-in step sound
The workbench SHALL offer an accessible control for short, gentle step sounds. Sound SHALL start muted on each page load and play only after the user enables it. While enabled, the workbench SHALL sound each displayed frame transition produced by playback or an explicit previous/next step action, including keyboard shortcuts, without delaying the simulation. The user SHALL be able to mute it immediately.

#### Scenario: Begin silently
- **WHEN** a user opens or reloads the workbench
- **THEN** playback and manual steps are silent until the sound control is enabled

#### Scenario: Hear playback and manual steps
- **WHEN** sound is enabled and playback or a previous/next step action displays a new frame
- **THEN** a brief cue accompanies that displayed step, including steps made with keyboard shortcuts

#### Scenario: Jump or reconfigure
- **WHEN** the user scrubs, jumps to the first or last frame, restarts, changes algorithm, or changes parameters
- **THEN** the workbench does not produce a burst of queued step sounds for frames it did not display in sequence

#### Scenario: Mute or audio unavailable
- **WHEN** the user mutes sound or the browser cannot play audio
- **THEN** the simulation and all text feedback remain usable without step sounds

#### Scenario: Page hidden
- **WHEN** the workbench is in a hidden browser tab
- **THEN** it does not play step cues or queue a burst to play when the tab returns

### Requirement: Camera interaction
The visualization SHALL support orbit, pan, zoom, camera reset, top view, side view, and perspective view. Camera input SHALL be confined to the visualization area so that operating controls does not move the scene.

#### Scenario: Reset camera
- **WHEN** the user selects camera reset after moving the view
- **THEN** the scene returns to the default framing for the current algorithm

### Requirement: Accessible operation
The workbench SHALL provide semantic controls, visible focus, sufficient contrast, accessible names and tooltips, keyboard operation, reduced-motion behavior, and text equivalents for important visual states. Space SHALL toggle playback, Left/Right SHALL step, R SHALL restart, and C SHALL reset the camera when shortcuts do not conflict with text input.

#### Scenario: Keyboard navigation
- **WHEN** a focused user presses Right outside an editable field
- **THEN** the next simulation frame and its text description are shown

#### Scenario: Reduced motion
- **WHEN** the user's environment requests reduced motion
- **THEN** decorative motion is reduced while step controls and state information remain available
