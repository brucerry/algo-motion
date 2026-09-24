# Design

## Context

See [proposal.md](proposal.md) and the three delta specs for the requested behavior. `src/App.tsx` owns the shared frame index, playback timer, comparison selection, soundless transport, and both learning panels. The current decorative layer is `FloatingStickers` with viewport and pointer collision helpers; pinned SVG stickers come from `SketchArt.tsx`. The paper and chalkboard themes use `src/styles.css` and `src/illustrated.css`. A selected comparison run can finish before the shared comparison timeline, so its displayed frame may stop changing while the shared index continues.

## Goals / Non-Goals

**Goals:**

- Tie sound and panel-character reactions to the frame the learner actually sees, including comparison mode.
- Keep sound optional, low intensity, local to the static site, and independent of algorithm computation.
- Keep the server and shoes visually expressive while preserving panel reading space and reduced-motion access.

**Non-Goals:**

- Change simulation frame generation, algorithm outcomes, playback speed choices, or URL encoding.
- Add narration, music, recorded audio files, a volume mixer, or a persistent sound-on preference.
- Give the illustrations a gameplay role or use the burnout pose as an outcome indicator.

## Decisions

### 1. Remove only the roaming layer and repair the pinned SVG palette

Remove the `FloatingStickers` mount, component, collision helpers, floating CSS, and tests that assert drifting or pointer bounces. Retain the pinned placements and the useful SVG motifs in `SketchArt.tsx`. Audit every visible motif in both themes and replace pale-on-pale combinations with stronger fill separation, ink outlines, and small secondary marks; use theme-aware color tokens where one fixed fill cannot work in both themes. Review at actual rendered sticker sizes, not only enlarged SVG previews. Keeping static placement preserves the user's hand-stuck collage style without a pointer-following layer. Removing only the CSS animation while leaving the collision loop would retain unnecessary work and invisible behavior.

### 2. Sound the displayed transition, after an explicit opt-in

Add a labeled sound toggle near the transport controls. Its state starts muted on every load and is not persisted. Create or resume a small Web Audio context only from the toggle's user gesture; generate a soft, short synthesized cue with a quick decay rather than fetching audio files. Keep one audio helper owned by the workbench and close it on unmount. If audio is unsupported or blocked, leave simulation controls functional and communicate sound unavailability through the control or a polite status.

Record the cause of a frame change: playback, explicit next/previous action (including keyboard), or navigation/jump/reconfiguration. Compare the selected run's displayed `frame.index`, not only the shared timeline index, before emitting a cue. Emit one cue for each displayed playback or explicit step transition while enabled and visible; do not enqueue missed frames when a timer jumps or the page is hidden. First/last jumps, restart, scrub, algorithm and parameter changes, and comparison selection do not trigger a series of skipped-frame cues. A generic effect on every `index` change was considered, but it would sound on resets, scrubs, and comparison changes.

### 3. Derive character poses from current frame state

Create lightweight local SVG components for a computer server and a pair of shoes, then place them in reserved space in the pseudocode panel header and Current step content. Derive server phase from the selected run: ready at the first frame, working at intermediate frames, and comically burned out at the last frame, for any terminal outcome. A brief boot reaction can accompany the first move, a fan or status light can animate during playback, and smoke can settle at the end. The burnout pose must read as a visual joke, not an error badge; outcome text remains authoritative.

The shoes change their alternating pose on displayed step transitions and may mirror direction on a backward step. They stop after the brief reaction or when playback pauses, and they do not keep walking when a selected comparison run's displayed frame is already final. Rewinding, jumping, restarting, switching algorithms, and changing parameters derive a fresh pose from the new frame rather than replaying stale animation. With reduced motion, show the corresponding still server and shoes poses. Keep both SVGs `aria-hidden` because the nearby step and outcome text already carry the essential information. Continuous decorative loops unrelated to frame state were considered, but would distract from the explanation.

The server also shows a small numeric meter based on the selected run's displayed frame. Its screen shows code while working; during playback the drawing bobs and a scan line moves. These effects stop on pause, at the final frame, and under reduced motion. Manual steps update the meter and give a brief spark reaction, so progress stays visible without requiring playback.

### 4. Preserve responsive reading space and verify behavior

Reserve compact illustration slots beside existing headings instead of overlaying pseudocode lines, metrics, or controls. On narrow screens, shrink the drawings and allow the panel header to wrap without covering text. Update screenshots and README to describe the opt-in sound and new characters. Replace floating-sticker browser expectations with visual, keyboard, mobile, reduced-motion, and audio-toggle checks. Unit-test the transition-to-cue decision separately from browser audio support; browser checks can observe a stubbed audio context and confirm no cue before opt-in, on jumps, or after muting. Check both paper and chalkboard contrast and retain the existing accessibility audit and build gates.

## Risks / Trade-offs

- Browser audio policies or unavailable Web Audio → Unlock only from the sound-toggle gesture; fail silently for simulation and report sound unavailability without blocking steps.
- Rapid playback could produce overlapping cues → Use a short quiet envelope and sound only displayed transitions, with no queued catch-up burst.
- The burned-out server could look like an algorithm failure → Use a playful tired pose and keep the explicit outcome label clear beside it.
- Decorations could crowd mobile learning panels → Reserve layout space, reduce SVG sizes at breakpoints, and inspect real narrow screenshots.
- Animation could hinder accessibility or add render work → Use small vector assets, respect reduced motion, and avoid frame-by-frame React state for decorative effects.

## Migration Plan

1. Remove the roaming layer and its obsolete collision tests, then tune pinned sticker fills and outlines in both themes.
2. Add the opt-in audio control and frame-transition cue helper without altering algorithm state.
3. Add server and shoes illustrations, derive their poses from the displayed frame, and adjust panel layout and reduced-motion behavior.
4. Update tests, screenshots, and documentation; run formatting, type checking, unit tests, browser tests, strict OpenSpec validation, and the production build.

There is no data migration. Rolling back the UI and audio changes restores the prior visual behavior; stored algorithm settings and shared links remain compatible.
