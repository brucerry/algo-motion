# Design

## Context

See [proposal.md](proposal.md) for the motivation and [hand-drawn visual language](specs/hand-drawn-visual-language/spec.md) for the behavior contract. The current app has one large tokenized stylesheet, a shared React workbench, and three separate React Three Fiber scenes: one reused by BFS, Dijkstra, and A*, one for RRT, and one for gradient descent. The scenes currently hard-code dark materials and colors; the canvas also has a hard-coded dark background. The theme preference defaults to dark, and browser tests assume that default.

The redesign is visual. Frame generation, selection identifiers, camera controls, formulas, routes, and the static GitHub Pages build must remain compatible. The intended audience includes curious younger learners, but the numerical and pseudocode content still needs to work for adult learners.

## Goals / Non-Goals

**Goals:**

- Give the workbench an authored, imperfect notebook feel without making controls inaccurate or text hard to scan.
- Make the background, illustrated stickers, and hand-drawn buttons and icons the clearest first impression across the whole site.
- Share a small visual vocabulary between the UI and the three scene renderers, including light paper and dark chalkboard themes.
- Keep decorative work cheap to render and deterministic across rerenders and shared URLs.

**Non-Goals:**

- Change algorithms, frames, parameters, layout information hierarchy, or URL encoding.
- Add a mascot, story mode, sound, user-generated drawing tool, or new algorithm.
- Make all body text handwritten or place decorative marks over data.

## Decisions

### 1. Use a paper-first design system with restrained handcrafted marks

Define a compact set of semantic tokens for paper, ink, muted text, outline, shadow, and algorithm-state accents. Rework the existing `.app` and `.theme-light` approach so light paper is the no-preference default, while a persisted dark choice maps the same roles to a chalkboard palette. Start with a visible, low-contrast notebook background: warm off-white paper, irregular ruled or graph-paper marks, crayon strokes, and drawn shapes. Repeat it across the full page rather than confining the treatment to the viewport. Use graphite-like borders, slightly irregular corner radii, and small offset shadows on surfaces above it. Keep the writing surfaces calm enough to read.

Use a licensed, locally bundled hand-lettered display face only for headings and select labels; retain a legible text face for controls, measurements, pseudocode, and KaTeX. If a suitable font cannot be verified, use the text fallback and carry the handmade character through shapes and linework. This avoids depending on a remote font host. A fully textured raster background and widespread handwriting were considered, but would add weight and harm readability.

### 2. Build a sticker and icon kit, then give buttons hand-cut character

Create a varied, locally bundled kit of intentionally imperfect SVG stickers and icons: suns, clouds, flowers, stars, squiggles, tape, pencil arrows, and a few algorithm-related marks. Place pinned stickers at several scales around the header, page background, navigation edge, panels, and footer, with some apparently stuck to safe panel corners. Use responsive rules that move or hide pinned stickers when space shrinks. Set decorative instances to `aria-hidden` and `pointer-events: none`; keep them out of headings, fields, and central 3D content. A single repeating texture was considered, but it would not create the user's requested scattered-sticker feel.

Restyle the prominent buttons first: uneven but stable outlines, marker-filled active states, small offset shadows, and hand-drawn-looking icons for playback, camera, theme, navigation, and utility actions. Keep accessible button labels and standard hit boxes beneath the visual shape. Share icon stroke weight and visual states across controls, including hover, focus, pressed, selected, disabled, and errors. Prefer authored vector/CSS details over per-render randomness or filters on every component; randomness would make screenshots unstable and could obscure interactive targets.

### 2a. Animate a bounded set of free-floating doodles

Add butterfly, rocket, fish, balloon, rainbow, and planet motifs to the local SVG kit. Keep the pinned stickers for page composition and render a separate, pointer-transparent fixed layer with a small number of moving stickers. Give each sticker a deterministic initial path, a slow velocity, and a gentle rotation. Resolve circle-versus-rectangle collisions against visible controls and content, protect the center of the 3D canvas, and resolve circle-versus-circle collisions with the current mouse position. Reflect velocity and push the sticker out of overlaps; clamp it within viewport edges. Re-measure DOM obstacles after layout changes, and use fewer, smaller stickers on narrow screens. Pause motion when the document is hidden and stop it entirely when reduced motion is requested. Animate transforms directly inside one requestAnimationFrame loop to avoid React rerenders and preserve input responsiveness.

### 3. Adapt the scenes through shared semantic color and mark roles

Pass the active theme into the shared canvas and scene renderers, and define one scene palette for semantic states. Change lighting and background to fit paper or chalkboard while retaining depth cues. Keep grid cells and RRT nodes instanced; add only a few lightweight accent meshes or lines for current, start, goal, selected, rejected, and solution states. Use stroke weight, outline/ring, dash, symbol, height, or trail style in addition to color for critical state distinctions. The grid can read as blocks on graph paper; RRT as a pencil-drawn branching sketch with marker obstacles; gradient descent as a lightly hatched surface with a visible drawn path and arrow. Purely flat 2D replacement scenes were considered, but would undermine orbit and depth exploration.

Keep these visual treatments driven by the current frame state and selection props. Do not alter pathfinding or optimization calculations to manufacture illustration effects. Visual assets used inside a scene should be resolved through bundled imports or the Vite base path, never site-root absolute URLs.

### 4. Verify style with visual review plus functional and accessibility gates

Update the existing browser tests that assume a dark default; explicitly exercise both themes, mobile tabs, focus, reduced motion, selection, playback, and shared URLs. Use automated contrast/accessibility checks, then inspect screenshots of the background, stickers, buttons, grid, RRT, and gradient views at desktop and narrow widths. Confirm decorative stickers never capture pointer input or cover labels. Include a production preview beneath a repository subpath to catch asset URL mistakes. Unit tests remain focused on algorithm logic; style-specific tests should check user-visible behavior rather than CSS implementation details.

## Risks / Trade-offs

- **Decoration competes with data** → Keep the page-wide pattern low contrast, place more colorful stickers in safe margins and corners, and use the existing text and metric hierarchy as the readability baseline.
- **Stickers crowd small screens or block canvas gestures** → Scope placement to layout regions, hide or relocate them at breakpoints, and disable pointer events on decorative instances.
- **Moving stickers distract from content** → Use a capped number of slow movers, bounce off text and controls, protect the canvas center, and honor reduced motion.
- **Handmade styling reduces precision or accessibility** → Use the display face sparingly; preserve straight text baselines, generous input targets, explicit labels, visible focus, and non-color state cues.
- **Extra 3D outlines reduce frame rate** → Reuse instanced geometry and shared materials, cap accent objects, and compare representative large grid and RRT runs with the current build.
- **Theme colors diverge between CSS and 3D** → Use semantic palette roles and review every algorithm in both themes, including comparison mode.
- **Locally bundled assets increase build size or break Pages paths** → Favor tiny vector/CSS details, verify licenses, and test the production build under a repository subpath.

## Migration Plan

1. Establish the palette and illustrated background, then create the sticker/icon kit and restyle buttons in both themes while the existing scenes remain functional.
2. Distribute stickers across the other workbench sections, restyle panels, and keep responsive and interaction states readable.
3. Restyle the shared canvas and each scene using the same semantic roles; update legends to match visible marks.
4. Update browser expectations and screenshots, run accessibility and performance checks, and verify a subpath production preview before release.

The change can be rolled back by reverting the visual token, markup, and renderer changes; stored algorithm configurations and URL links remain compatible. Users with a saved dark preference continue to see the dark theme.
