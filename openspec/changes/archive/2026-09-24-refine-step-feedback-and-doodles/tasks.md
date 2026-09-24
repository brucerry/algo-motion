# Tasks

## 1. Stationary illustrated details

- [x] 1.1 Remove the free-floating sticker mount, component, motion helpers, floating CSS, and motion-only tests while retaining pinned stickers; verify the page has no roaming layer and the existing controls and 3D camera gestures still work.
- [x] 1.2 Revise the pinned SVG fills, outlines, and small details in `SketchArt.tsx` and theme styles so pale yellow and white motifs stand apart from nearby surfaces; verify every visible motif at normal size in paper and chalkboard screenshots.
- [x] 1.3 Update browser assertions for placed, pointer-transparent stickers at desktop and narrow widths; verify stickers stay fixed when the cursor moves and do not cover controls or learning text.

## 2. Opt-in step sound

- [x] 2.1 Add a small local step-cue helper and a labeled, initially muted sound toggle near transport; verify fresh loads are silent, enabling works from a user gesture, muting stops cues, and unavailable audio leaves playback usable.
- [x] 2.2 Connect cues to displayed playback and explicit forward/backward frame transitions, including keyboard actions; verify one brief cue per displayed step and no cue when the selected comparison run is already at its final frame.
- [x] 2.3 Exclude scrubs, first/last jumps, restart, reconfiguration, comparison selection, and hidden-tab catch-up from queued step sounds; verify these cases in focused unit and browser checks at slow and fast playback speeds.

## 3. Learning-panel characters

- [x] 3.1 Add a hand-drawn computer server in reserved pseudocode-panel space with ready, working, and playful burnout poses; verify first, intermediate, and final frames for success and non-success outcomes retain readable pseudocode and explicit outcome text.
- [x] 3.2 Add walking shoes beside Current step that react to displayed forward and backward steps, settle on pause or final frame, and reset on rewind or experiment changes; verify comparison mode follows the selected run's displayed frame.
- [x] 3.3 Make server and shoes compact on narrow screens, decorative to assistive technology, and still under reduced motion; verify mobile screenshots, keyboard operation, and the accessibility audit in both themes.
- [x] 3.4 Make the computer's progress obvious with a frame-linked meter and visible playback motion; verify step, play, pause, restart, comparison, reduced-motion, and mobile behavior.

## 4. Integration and delivery

- [x] 4.1 Replace obsolete floating-sticker browser coverage with end-to-end checks for sound opt-in, muted behavior, character phases, theme switching, mobile panels, and all algorithm families; verify the full browser suite passes without page errors.
- [x] 4.2 Refresh README descriptions and workbench screenshots, then run formatting, type checking, unit tests, browser tests, strict OpenSpec validation, and the production build; verify every check passes.
