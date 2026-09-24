# Spec Delta

## ADDED Requirements

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
