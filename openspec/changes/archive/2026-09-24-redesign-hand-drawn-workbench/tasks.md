# Tasks

## 1. Illustrated foundation

- [x] 1.1 Define paper and chalkboard semantic color, ink, border, and shadow tokens and a visible notebook-pattern background in `src/styles.css`; verify both themes have readable foregrounds and the pattern appears across the full page without obscuring content.
- [x] 1.2 Create a varied, deterministic local kit of childlike stickers and drawn action icons, including unrelated motifs such as sun, cloud, flower, star, and squiggle, plus a licensed local display font if suitable; verify assets bundle locally, icons remain recognizable, and a font fallback is readable.
- [x] 1.3 Update theme initialization and persistence in `src/App.tsx` so new visitors see paper and saved dark-theme users retain chalkboard; verify both cases across reloads in a browser test.

## 2. Shared workbench treatment

- [x] 2.1 Restyle prominent transport, camera, theme, navigation, and utility buttons with hand-cut outlines, marker fills, drawn icons, and clear hover, focus, selected, disabled, and error states; verify their labels, hit areas, and actions remain usable by mouse and keyboard.
- [x] 2.2 Place varied stickers around the header, background, navigation, panel edges, and footer, with some unrelated to algorithms; verify multiple sections have visible stickers, decorative instances are ignored by assistive technology, and they never capture pointer input or cover controls.
- [x] 2.3 Restyle header, navigation, mobile tabs, experiment heading, and viewport frame around the background and stickers; verify the active algorithm, current view, and 3D camera gestures remain clear at desktop and narrow widths.
- [x] 2.4 Restyle timeline, comparison cards, and parameter inputs with the illustrated control system; verify scrubbing, comparison, presets, validation, and disabled controls remain readable and usable.
- [x] 2.5 Restyle pseudocode, explanation, metrics, guide, legends, formula, notices, loading/error states, and shortcut dialog; verify long text, formulas, and warnings stay readable in both themes.

## 3. Illustrated 3D scenes

- [x] 3.1 Introduce shared theme-aware scene color and mark roles through `VisualizationCanvas` and renderer props; verify switching themes updates the canvas and all three scene families without changing frame data.
- [x] 3.2 Restyle the shared grid scene as an illustrated graph-paper experiment with non-color marks for critical cell states and selection; verify BFS, Dijkstra, and A* playback, cell inspection, camera interaction, and comparison remain correct.
- [x] 3.3 Restyle the RRT scene with sketch-like branches, marker obstacles, and distinct sample, rejected, goal, solution, and selected marks; verify a seeded run, node inspection, and orbit controls in both themes.
- [x] 3.4 Restyle the gradient-descent surface, point, gradient direction, and trajectory with a coherent drawn treatment; verify objective switching, stepping, and current value labels still correspond to the rendered frame.
- [x] 3.5 Update the algorithm legends to name and show the actual revised colors and non-color marks; verify the displayed legend matches representative states in each scene.

## 4. Quality and delivery

- [x] 4.1 Extend browser checks for default paper, saved chalkboard, illustrated buttons, keyboard focus, reduced motion, narrow layout, sticker pointer pass-through, selection, and playback; verify the full browser suite passes without page errors.
- [x] 4.2 Review desktop and mobile screenshots of the background, stickers, buttons, grid, RRT, and gradient descent in both themes, correct crowding or low contrast, and run the existing accessibility audit; verify important states remain understandable without decoration or color alone.
- [x] 4.3 Compare representative maximum-size grid and RRT interactions with the current build and remove expensive decorative geometry if needed; verify navigation, scrubbing, and orbit remain responsive.
- [x] 4.4 Build and preview under a GitHub Pages repository subpath, check that every local font and motif loads, refresh README screenshots, and run formatting, type checking, unit tests, browser tests, and `npm run build`; verify all checks pass and a shared deep link opens correctly.

## 5. Floating doodles

- [x] 5.1 Add at least six new locally bundled childlike sticker motifs and distribute them among pinned and floating placements; verify they remain decorative and legible in both themes.
- [x] 5.2 Animate a bounded number of stickers with gentle translation and rotation, reflecting from visible content, the central visualization area, viewport edges, and the cursor; verify pointer input and camera gestures still work.
- [x] 5.3 Adapt the motion to narrow layouts and reduced-motion preference, and pause work when the page is hidden; verify stickers remain visible where room exists and reduced-motion stickers stay still.
- [x] 5.4 Add focused collision and browser checks, visually review desktop and mobile layouts, and run formatting, type checking, unit tests, browser tests, and the production build; verify all checks pass.
