# Algorithm Configuration Specification

## Purpose

Let each algorithm expose its own validated controls while preserving reproducible experiments through seeds, presets, local preferences, and shareable links.

## Requirements

### Requirement: Algorithm-defined parameter controls
The parameter panel SHALL derive numeric, slider, toggle, select, seed, and applicable action controls from the selected algorithm's parameter definitions rather than requiring algorithm-specific panel code. It SHALL show descriptions and default values.

#### Scenario: Change algorithm
- **WHEN** the user switches from A* to RRT
- **THEN** the panel shows RRT's controls and no irrelevant A* controls

### Requirement: Validated regeneration
The application SHALL reject non-finite, out-of-range, or otherwise invalid parameter values with clear feedback and SHALL cap resource-intensive dimensions and iteration counts. Accepted changes SHALL regenerate the simulation and return the timeline to its initial frame; continuous input MAY be debounced.

#### Scenario: Invalid value
- **WHEN** the user enters a negative RRT step size or a non-finite iteration count
- **THEN** the value is rejected with an explanation and no invalid simulation runs

#### Scenario: Accepted change
- **WHEN** the user changes a valid parameter
- **THEN** the scene, frames, metrics, and shareable configuration reflect the new run

### Requirement: Deterministic seeds and presets
Randomized algorithms SHALL expose a visible editable seed and a Randomize action that selects and displays a new seed. Re-running the same algorithm with the same parameters and seed SHALL yield the same environment and ordered simulation states. Each algorithm SHALL provide meaningful presets whose values remain editable, plus a reset-to-defaults action.

#### Scenario: Repeat experiment
- **WHEN** a user repeats a run with unchanged parameters and seed
- **THEN** the generated environment and simulation frame sequence match

#### Scenario: Randomize experiment
- **WHEN** the user selects Randomize
- **THEN** a new visible seed is used to regenerate the experiment

#### Scenario: Edit preset
- **WHEN** the user loads a preset and then changes one parameter
- **THEN** the edited value is used without locking the other preset values

### Requirement: Shareable configuration and preferences
The URL SHALL identify the selected algorithm and encode supported parameter values, including seed, so reopening a link reproduces the same run. Malformed or unsupported URL values SHALL fall back to validated defaults with clear feedback. Lightweight preferences such as last algorithm, playback speed, and theme SHALL persist locally without an account, while an explicit URL takes precedence.

#### Scenario: Open shared link
- **WHEN** a user opens a valid link to a seeded RRT run
- **THEN** the same algorithm, parameters, seed, and initial scene are loaded

#### Scenario: Bad URL parameter
- **WHEN** a URL contains an out-of-range grid dimension
- **THEN** the application uses a safe default and reports the correction
