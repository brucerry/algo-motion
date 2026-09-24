# Spec Delta

## Purpose

Give the algorithm workbench a distinctive illustrated-notebook character through drawn backgrounds, stickers, icons, and controls while keeping mathematical content and simulation states clear.

## ADDED Requirements

### Requirement: Illustrated workbench identity
The application SHALL use a consistent hand-drawn visual language across navigation, parameter controls, transport, comparison, learning panels, dialogs, notices, loading states, and the viewport frame. Its default theme SHALL resemble a warm paper notebook with visible drawn background patterns, ink-like outlines, and imperfect hand-made shapes; the optional dark theme SHALL provide a corresponding chalkboard interpretation, and the selected theme SHALL continue to persist.

#### Scenario: First visit
- **WHEN** a user opens the site without a stored theme choice
- **THEN** the workbench appears in the paper-themed illustrated style across its visible sections

#### Scenario: Switch theme
- **WHEN** a user switches to the dark theme and reloads
- **THEN** the same sections use the coordinated chalkboard style and the dark choice remains selected

### Requirement: Playful stickers throughout the site
The workbench SHALL display a varied collection of childlike drawn stickers across the background and around multiple sections of the page. Some motifs SHALL be playful objects unrelated to algorithms, such as suns, clouds, flowers, stars, or squiggles. Stickers SHALL appear intentionally placed, remain decorative rather than communicating essential state, and SHALL not block text, controls, pointer input, or camera interaction.

#### Scenario: Explore the page
- **WHEN** a user views the workbench on a desktop screen
- **THEN** different drawn stickers are visible in the page background and around more than one workbench section, including motifs unrelated to algorithms

#### Scenario: Use a narrow screen
- **WHEN** the layout becomes narrow
- **THEN** stickers reposition, reduce, or disappear where necessary so the viewport, navigation, buttons, and learning text stay usable

#### Scenario: Floating stickers meet the workbench or pointer
- **WHEN** an animated sticker reaches a visible content element, viewport edge, or mouse cursor
- **THEN** it reflects away while continuing to float and spin, without intercepting input or hiding essential content

#### Scenario: Reduced motion
- **WHEN** the user requests reduced motion
- **THEN** floating stickers remain still while the same decorative motifs stay available

### Requirement: Drawn buttons and icons
Prominent action buttons, navigation cues, and camera or transport controls SHALL use a coherent children's-drawing-inspired icon and button style. Their labels and symbols SHALL remain recognizable, and hover, focus, pressed or selected, disabled, and error states SHALL be visually distinct without relying on color alone.

#### Scenario: Operate transport controls
- **WHEN** a user plays, pauses, steps, or resets the simulation
- **THEN** each action remains identifiable through its drawn icon or label and its current interaction state is clear

#### Scenario: Navigate by keyboard
- **WHEN** a user tabs among illustrated buttons
- **THEN** the focused button has an obvious visible focus mark that does not obscure its icon or label

### Requirement: Illustrated algorithm scenes
The grid, RRT, and gradient-descent visualizations SHALL share the illustrated style through hand-drawn-looking marks, outlines, or surface treatments appropriate to each scene. Start, goal, obstacle, frontier, visited, current, solution, rejected, selected, trajectory, and gradient states SHALL remain distinguishable wherever they apply, including by a cue beyond color for critical states. Visual restyling SHALL preserve scene selection, camera interaction, and correspondence with the current simulation frame.

#### Scenario: Compare algorithm families
- **WHEN** a user switches between a grid search, RRT, and gradient descent
- **THEN** each 3D scene has a recognizable illustrated treatment and its active and completed states remain understandable

#### Scenario: Inspect a marked object
- **WHEN** a user selects a cell or RRT node in the restyled scene
- **THEN** the selected object is visibly marked and its existing inspection text describes the correct current state

### Requirement: Readable decorative treatment
Decorative patterns and irregular shapes SHALL remain secondary to headings, controls, pseudocode, formulas, metrics, error messages, and the 3D experiment. Functional text and controls SHALL retain sufficient contrast, visible focus, clear disabled and selected states, and usable hit areas at desktop and narrow widths. Essential information SHALL not depend on recognizing a decorative motif, texture, or color alone.

#### Scenario: Narrow viewport
- **WHEN** the workbench is used on a narrow screen
- **THEN** the illustrated details do not cover or crowd the viewport, transport, parameters, or learning text

#### Scenario: Keyboard and reduced motion
- **WHEN** a user navigates by keyboard or requests reduced motion
- **THEN** focus and current state remain clear without relying on animated doodles or scene motion

### Requirement: Reliable static visual assets
Any fonts, patterns, or illustrative assets needed for the visual language SHALL load as part of the deployed static site under a GitHub Pages repository subpath. If an optional decorative asset fails to load, the workbench SHALL remain usable and readable.

#### Scenario: Open a shared link after deployment
- **WHEN** a user opens a shared algorithm URL from a repository-path deployment
- **THEN** the illustrated UI and scenes load without requiring a separate asset service
