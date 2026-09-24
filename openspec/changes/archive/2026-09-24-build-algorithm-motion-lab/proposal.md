# Proposal

## Why

The project currently has a detailed product brief but no application. Learners need a working, reproducible 3D workbench that connects algorithm behavior to each visual step, while developers need a structure that can grow beyond the first five algorithms.

## What Changes

- Build Algorithm Motion Lab as a responsive, accessible, browser-only application with interactive 3D scenes and shared playback controls.
- Add an algorithm registry, typed simulation frames, algorithm-specific parameter schemas, deterministic seeds, presets, and shareable URL configuration.
- Implement BFS, Dijkstra, and A* grid searches; true 3D RRT motion planning; and gradient descent on selectable 3D surfaces.
- Synchronize pseudocode, explanations, metrics, legends, and object inspection with the current frame, and provide a basic shared-environment comparison of BFS, Dijkstra, and A*.
- Add automated tests, developer documentation, and a GitHub Pages deployment workflow. An installable offline PWA is a follow-on enhancement if it does not compromise the core workbench.

## Capabilities

### New Capabilities

- `simulation-workbench`: Algorithm navigation, 3D viewing, camera controls, timeline playback, and responsive accessible layout.
- `algorithm-configuration`: Schema-driven parameters, validation, presets, seeded regeneration, URL sharing, and lightweight preferences.
- `grid-pathfinding`: BFS, Dijkstra, and A* execution and visualization on reproducible grid environments.
- `rrt-planning`: Reproducible 3D RRT growth, collision-aware planning, and path visualization.
- `gradient-descent`: Stepwise descent on selectable mathematical surfaces.
- `learning-inspection`: Synchronized pseudocode, state explanations, algorithm metrics, legends, educational content, and object inspection.
- `algorithm-comparison`: Basic BFS, Dijkstra, and A* comparison on the same generated environment.
- `static-delivery`: Browser-only build, quality checks, documentation, and GitHub Pages deployment.

### Modified Capabilities

None; the project has no existing specs.

## Impact

The repository gains a React, TypeScript, Vite, Three.js/React Three Fiber application; Tailwind CSS and KaTeX presentation; algorithm and rendering modules; tests; a README; and a GitHub Actions Pages workflow. No backend or account system is required. The existing `instruction.md` remains the product brief.
