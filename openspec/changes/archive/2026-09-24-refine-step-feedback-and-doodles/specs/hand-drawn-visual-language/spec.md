# Spec Delta

## ADDED Requirements

### Requirement: Placed stickers with distinct colors
The workbench SHALL retain a varied collection of childlike drawn stickers at intentional positions across the background and multiple sections. It SHALL not display a free-floating, continuously moving sticker layer. Sticker fills, outlines, and small details SHALL remain visually distinct from adjacent paper and chalkboard surfaces, including pale yellow and white motifs. Stickers SHALL remain decorative, pointer-transparent, and clear of essential text, controls, and camera gestures.

#### Scenario: Explore the page
- **WHEN** a user views the workbench on a desktop screen
- **THEN** different drawn stickers appear around more than one section without drifting across the page

#### Scenario: Change theme
- **WHEN** a user switches between paper and chalkboard themes
- **THEN** the visible sticker shapes and details remain distinguishable against their nearby surfaces

#### Scenario: Use a narrow screen
- **WHEN** the layout becomes narrow
- **THEN** stickers remain placed, reposition, reduce, or disappear as needed to keep learning text and controls usable

#### Scenario: Move the pointer
- **WHEN** the cursor passes a decorative sticker
- **THEN** the sticker does not chase or bounce away from it and the underlying control remains operable

## REMOVED Requirements

### Requirement: Playful stickers throughout the site
**Reason**: Its floating-sticker and pointer-collision scenarios conflict with the requested stationary composition.
**Migration**: Keep the placed stickers and follow the new Placed stickers with distinct colors requirement; remove floating-only behavior and checks.
