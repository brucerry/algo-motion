Build a production-quality static website for interactive **3D algorithm visualization**, intended to be hosted on **GitHub Pages**.

The purpose of the website is to help users understand how algorithms actually operate by watching their states, transitions, search processes, particles, paths, trees, surfaces, or other algorithm-specific structures move and evolve in an interactive 3D environment.

The website must be educational, visually clear, extensible, fast, and usable without a backend.

# 1. Core technology

Use:

* React
* TypeScript
* Vite
* Three.js
* React Three Fiber
* @react-three/drei
* Tailwind CSS
* KaTeX for mathematical notation
* GitHub Actions for deployment
* GitHub Pages hosting

You may add lightweight libraries when they materially improve the implementation, but avoid unnecessary dependencies.

The final application must build successfully with:

```bash
npm install
npm run build
```

and must support deployment to GitHub Pages.

# 2. Main product concept

Create an application called:

**Algorithm Motion**

The website should present algorithms as interactive visual experiments.

A user should be able to:

* select an algorithm
* understand what problem it solves
* see the algorithm represented in 3D
* play the algorithm
* pause it
* advance one step
* go backward one step where practical
* restart it
* scrub through its execution timeline
* change execution speed
* modify algorithm parameters
* regenerate the experiment
* change camera angle
* inspect current algorithm state
* see synchronized pseudocode
* see an explanation of the current step
* view algorithm statistics and metrics
* reset parameters to sensible defaults

The visualization must be interactive rather than a prerecorded animation.

# 3. Parameter system — VERY IMPORTANT

The architecture must support **different adjustable parameters for every algorithm**.

Do NOT hard-code the control panel for individual algorithms.

Each algorithm should declare its own parameter schema.

For example:

```ts
type ParameterDefinition =
  | {
      type: "number";
      key: string;
      label: string;
      defaultValue: number;
      min?: number;
      max?: number;
      step?: number;
      description?: string;
    }
  | {
      type: "boolean";
      key: string;
      label: string;
      defaultValue: boolean;
      description?: string;
    }
  | {
      type: "select";
      key: string;
      label: string;
      defaultValue: string;
      options: {
        label: string;
        value: string;
      }[];
      description?: string;
    }
  | {
      type: "seed";
      key: string;
      label: string;
      defaultValue: number;
    };
```

The common parameter UI should automatically generate the appropriate controls from this schema.

Supported control types should include at minimum:

* slider
* numeric input
* checkbox/toggle
* dropdown/select
* random seed
* button/action where appropriate

The architecture should make it easy to add more types later.

Example A* parameters:

```text
Grid width
Grid depth
Grid height
Obstacle density
Heuristic
Diagonal movement
Heuristic weight
Random seed
```

Example RRT parameters:

```text
Maximum iterations
Step size
Goal bias
Goal threshold
Obstacle count
Workspace size
Random seed
```

Example gradient descent parameters:

```text
Learning rate
Starting X
Starting Y
Maximum iterations
Convergence tolerance
Surface/function
```

Changing important parameters should regenerate the simulation.

Use debouncing if continuous slider updates would make simulation regeneration expensive.

# 4. Reproducibility

Randomized algorithms must support deterministic random seeds.

Users should be able to:

* see the current seed
* change the seed manually
* randomize the seed
* reproduce the same simulation later using the same parameters and seed

Where practical, encode algorithm configuration into the URL so a visualization can be shared.

For example:

```text
/#/algorithm/rrt?stepSize=0.5&goalBias=0.15&seed=12345
```

A shared URL should reproduce the same experiment whenever possible.

# 5. Architecture

Strictly separate:

1. algorithm logic
2. simulation state
3. rendering
4. controls
5. educational content

Do not embed core algorithm logic inside React components or Three.js objects.

Use an architecture similar to:

```ts
interface AlgorithmModule<P, S, M = unknown> {
  id: string;
  name: string;
  category: string;

  description: string;

  parameters: ParameterDefinition[];

  defaultParameters: P;

  pseudocode: PseudocodeLine[];

  initialize(params: P): S;

  run(params: P): SimulationFrame<S>[];

  getMetrics?(
    frames: SimulationFrame<S>[],
    params: P
  ): M;
}
```

A simulation frame might resemble:

```ts
interface SimulationFrame<T> {
  index: number;

  state: T;

  activePseudocodeLines?: number[];

  explanation?: string;

  event?: string;

  timestamp?: number;
}
```

The renderer should consume these states without owning the algorithm itself.

# 6. Renderer abstraction

Different algorithms require different visualization styles.

Create reusable visualization systems such as:

```text
GraphRenderer
GridRenderer
Grid3DRenderer
TreeRenderer
SurfaceRenderer
ParticleRenderer
PathRenderer
GeometryRenderer
```

An algorithm should declare or provide its corresponding renderer.

Avoid creating one huge Three.js component containing all visualization logic.

# 7. Initial algorithms

Implement an MVP with at least these five algorithms:

## BFS

Visualize graph/grid exploration.

Controls could include:

* grid width
* grid depth
* obstacle density
* allow diagonal movement
* seed

Show:

* unvisited nodes
* queue/frontier
* visited nodes
* current node
* final path

## Dijkstra

Controls:

* grid dimensions
* obstacle density
* edge weighting mode
* diagonal movement
* seed

Show:

* frontier
* visited nodes
* tentative distances
* shortest path

## A*

Controls:

* grid dimensions
* obstacle density
* heuristic:

  * Manhattan
  * Euclidean
  * Chebyshev
* heuristic weight
* diagonal movement
* seed

Show:

* open set
* closed set
* current node
* f/g/h values when selected
* resulting path

## RRT

Use a true 3D workspace.

Controls:

* workspace size
* maximum iterations
* step size
* goal bias
* goal threshold
* obstacle count
* obstacle size range
* seed

Show:

* start position
* goal
* obstacles
* sampled points
* rejected samples
* tree edges
* newly expanded branch
* final path

The growth of the tree should be clearly animated.

## Gradient Descent

Display a 3D mathematical surface.

Controls:

* objective function
* learning rate
* starting X
* starting Y
* maximum iterations
* convergence tolerance

Include several selectable objective surfaces.

Show:

* surface mesh
* current point
* gradient direction
* movement trail
* convergence path
* current function value

# 8. Simulation controls

Every visualization should have a common transport control bar containing:

```text
|<   <
Play/Pause
>   >|
Reset
Speed
Timeline
```

At minimum support:

* Play
* Pause
* Previous step
* Next step
* Reset
* Timeline scrubber
* Execution speed

Suggested speeds:

```text
0.25x
0.5x
1x
2x
4x
```

The timeline should display:

```text
Step 37 / 142
```

Scrubbing should immediately render the selected algorithm frame.

# 9. Pseudocode synchronization

Each algorithm should have pseudocode.

Example:

```text
1  openSet ← {start}
2
3  while openSet is not empty
4      current ← lowest fScore node
5
6      if current = goal
7          return reconstructPath()
8
9      remove current from openSet
10     add current to closedSet
...
```

During visualization:

* highlight the currently executing line
* optionally highlight multiple lines when an operation spans them
* scroll the pseudocode panel automatically when necessary

The pseudocode and visualization must be synchronized through frame metadata.

# 10. Current-step explanation

Provide an explanation panel.

For example:

```text
Step 43

A* selected node (7, 4) because it currently has the
lowest f-score in the open set.

g(n) = 9
h(n) = 5
f(n) = 14
```

The explanation should be based on algorithm state rather than being generic static text.

# 11. Metrics panel

Each algorithm should display useful metrics.

Examples:

A*:

```text
Visited nodes
Frontier size
Path length
Current g-score
Current h-score
Current f-score
```

RRT:

```text
Iterations
Accepted samples
Rejected samples
Tree nodes
Distance to goal
Final path length
```

Gradient descent:

```text
Iteration
Current x
Current y
f(x,y)
Gradient magnitude
Distance moved
```

Keep metrics algorithm-specific through a common extensible interface.

# 12. Layout

Use a professional desktop-first layout similar to:

```text
┌──────────────────────────────────────────────────────────────┐
│ Algorithm Motion                           GitHub   About    │
├───────────────┬──────────────────────────────┬───────────────┤
│               │                              │               │
│ Algorithms    │                              │ Parameters    │
│               │                              │               │
│ Graph         │          3D VIEW             │ Grid size     │
│  BFS          │                              │ [ 30 ]        │
│  Dijkstra     │                              │               │
│  A*           │                              │ Density       │
│               │                              │ ─────●──      │
│ Planning      │                              │               │
│  RRT          │                              │ Heuristic     │
│               │                              │ [Euclidean ▼] │
│ Optimization  │                              │               │
│  Gradient     │                              │ Seed          │
│               │                              │ [12345][↻]    │
├───────────────┴──────────────────────────────┴───────────────┤
│  ◀  ▶   Play     Step 37 / 142       ━━━━━●━━━━━━━━       │
├───────────────────────────────────┬──────────────────────────┤
│ Pseudocode                        │ Explanation / Metrics    │
│                                   │                          │
│ > current ← lowest fScore         │ Current: (7,4)          │
│                                   │ g: 9                    │
│                                   │ h: 5                    │
└───────────────────────────────────┴──────────────────────────┘
```

Make the interface responsive.

On smaller screens, panels may collapse into tabs or drawers.

# 13. Visual design

Use a modern scientific/technical aesthetic.

Prefer:

* dark mode by default
* high contrast
* restrained color palette
* clean typography
* subtle panels
* good spacing
* smooth transitions
* minimal visual clutter

The visualization should remain the visual focus.

Use consistent semantic colors across algorithms, such as:

```text
Unvisited     gray
Active        yellow
Current       orange
Visited       blue
Solution      green
Obstacle      dark/red
Start         cyan
Goal          magenta
Rejected      muted red
```

Ensure color is not the only means of conveying critical state when practical.

# 14. 3D controls

Provide:

* orbit camera
* pan
* zoom
* reset camera
* top view
* side view
* perspective view

Where appropriate also provide:

* follow current node
* follow moving object

Do not allow camera movement to interfere with normal UI interaction.

# 15. Selection and inspection

Where practical, let users click 3D objects.

For example, clicking an A* node could show:

```text
Node: (7, 4)

State: Closed

g = 9
h = 5
f = 14

Parent: (6, 4)
```

Clicking an RRT node could show:

```text
Node #122

Position:
x: 3.17
y: 1.42
z: -0.93

Parent:
Node #97

Cost from root:
8.31
```

# 16. Educational content

Each algorithm page should contain:

## Overview

Explain what the algorithm does.

## Intuition

Explain the key idea in accessible language.

## Algorithm

Show pseudocode.

## Complexity

Show time and space complexity where appropriate.

## Parameters

Explain what each adjustable parameter changes.

## Visualization legend

Explain colors and symbols.

## Applications

Give real-world examples.

## References

Provide original papers or standard references when available.

For algorithms originating from research papers, clearly distinguish:

* original paper
* later variants
* implementation choices made by this website

Do not imply that visualization-specific implementation details are part of the original published algorithm unless they actually are.

# 17. Compare mode

Design the architecture so a future compare mode is possible.

Ideally implement at least a basic comparison for:

```text
BFS vs Dijkstra vs A*
```

using the same generated environment.

Show them side-by-side or allow switching between synchronized runs.

Potential comparison metrics:

```text
Nodes visited
Path length
Steps
Execution time
```

Do not treat JavaScript wall-clock timing alone as a scientifically rigorous benchmark.

# 18. Presets

Each algorithm should support presets.

Examples for A*:

```text
Easy Maze
Dense Obstacles
Open Field
Weighted Search
3D Maze
```

Examples for RRT:

```text
Open Space
Narrow Passage
Dense Obstacles
High Goal Bias
Low Goal Bias
```

Users should still be able to change parameters after loading a preset.

# 19. Randomization

Provide a clear:

```text
Randomize
```

button for applicable simulations.

Randomizing should primarily generate a new seed.

The resulting seed should remain visible so the scenario can be reproduced.

# 20. Performance

Target smooth performance on normal desktop browsers.

Use:

* InstancedMesh for large numbers of similar objects
* memoization where appropriate
* React refs for rapidly changing 3D state
* Web Workers for computationally expensive algorithms if useful
* requestAnimationFrame appropriately
* lazy loading for algorithm modules
* reasonable caps on parameter ranges

Do not cause React to rebuild the entire scene every animation frame unnecessarily.

# 21. Error handling

Parameter inputs must be validated.

Prevent unreasonable configurations such as:

```text
gridSize = 100000
iterations = Infinity
negative step size
NaN
```

Show clear validation feedback.

Set sensible upper bounds to prevent users from freezing their browser.

# 22. Accessibility

Provide:

* keyboard-accessible controls
* tooltips
* semantic HTML
* visible focus states
* sufficient contrast
* reduced-motion consideration

Important algorithm information should also be available as text and not exist solely as animation.

# 23. Keyboard shortcuts

Implement useful shortcuts such as:

```text
Space     Play / Pause
Right     Next step
Left      Previous step
R         Reset
C         Reset camera
F         Focus 3D view
```

Show shortcut information somewhere in the UI.

# 24. Persistence

Use localStorage or IndexedDB for lightweight user preferences such as:

```text
theme
last selected algorithm
panel sizes
camera preference
last parameters
animation speed
```

Do not require login.

# 25. GitHub Pages

Configure Vite correctly for GitHub Pages.

Provide GitHub Actions deployment.

The repository should support a workflow like:

```text
git push
     ↓
GitHub Actions
     ↓
npm ci
     ↓
npm run build
     ↓
GitHub Pages
```

If SPA routing is used, ensure routing works correctly on GitHub Pages.

Prefer hash routing if it avoids unnecessary deployment complexity.

# 26. PWA

If reasonably straightforward, make the website installable as a PWA.

Support offline use after the initial load.

Do not let PWA implementation delay or compromise the main visualization experience.

# 27. Suggested project structure

Use a clean structure similar to:

```text
src/
├── algorithms/
│   ├── bfs/
│   │   ├── algorithm.ts
│   │   ├── parameters.ts
│   │   ├── renderer.tsx
│   │   ├── content.ts
│   │   ├── types.ts
│   │   └── presets.ts
│   │
│   ├── dijkstra/
│   ├── astar/
│   ├── rrt/
│   └── gradient-descent/
│
├── engine/
│   ├── simulation.ts
│   ├── timeline.ts
│   ├── parameters.ts
│   ├── seededRandom.ts
│   └── registry.ts
│
├── renderers/
│   ├── GraphRenderer.tsx
│   ├── GridRenderer.tsx
│   ├── Grid3DRenderer.tsx
│   ├── TreeRenderer.tsx
│   ├── SurfaceRenderer.tsx
│   └── ParticleRenderer.tsx
│
├── components/
│   ├── AlgorithmSidebar.tsx
│   ├── VisualizationCanvas.tsx
│   ├── ParameterPanel.tsx
│   ├── SimulationControls.tsx
│   ├── Timeline.tsx
│   ├── PseudocodePanel.tsx
│   ├── ExplanationPanel.tsx
│   ├── MetricsPanel.tsx
│   └── CameraControls.tsx
│
├── pages/
├── hooks/
├── store/
├── utils/
├── styles/
└── App.tsx
```

Feel free to improve this structure if there is a better maintainable approach.

# 28. Adding a new algorithm

One major success criterion is that adding another algorithm should require minimal changes to existing code.

Ideally a developer should mainly create:

```text
algorithm.ts
parameters.ts
renderer.tsx
types.ts
content.ts
presets.ts
```

and register the module.

The shared application should automatically provide:

```text
Play/Pause
Timeline
Parameter UI
Reset
Speed
Pseudocode panel
Explanation panel
Metrics area
Camera controls
URL parameter handling
```

Do not require editing a large central switch statement every time an algorithm is added.

Use an algorithm registry/plugin-style architecture.

# 29. Algorithm metadata

Each algorithm should expose metadata similar to:

```ts
{
  id: "rrt",
  name: "Rapidly-exploring Random Tree",
  shortName: "RRT",
  category: "Motion Planning",
  description: "...",
  dimensionality: "3D",
  tags: [
    "robotics",
    "path planning",
    "sampling"
  ]
}
```

Use metadata to generate navigation automatically.

# 30. Future algorithm support

Architect the system with these future additions in mind:

Graph/search:

```text
DFS
Bellman-Ford
Floyd-Warshall
Prim
Kruskal
Bidirectional Search
D*
D* Lite
```

Motion planning:

```text
RRT*
RRT-Connect
PRM
Potential Fields
A* in continuous/voxel 3D space
```

Optimization:

```text
Momentum Gradient Descent
Adam
Simulated Annealing
Particle Swarm Optimization
Genetic Algorithms
```

Computational geometry:

```text
Convex Hull
Delaunay Triangulation
Voronoi
KD-Tree
Octree
Marching Cubes
```

Emergent algorithms:

```text
Boids
Ant Colony Optimization
Random Walk
Cellular Automata
```

The core architecture should not assume that every algorithm is graph based.

# 31. Quality requirements

The result should NOT feel like a basic tutorial demo.

It should feel like a polished technical visualization application.

Prioritize:

1. clarity
2. correctness
3. interaction
4. extensibility
5. performance
6. visual quality

Avoid:

* excessive animations unrelated to algorithm behavior
* giant gradients everywhere
* unnecessary glassmorphism
* overly decorative 3D assets
* UI clutter
* hard-coded per-algorithm control panels
* algorithm logic inside rendering components

# 32. Development process

Work incrementally.

First establish:

1. project scaffold
2. shared simulation engine
3. algorithm registry
4. parameter schema system
5. common visualization layout
6. timeline/player
7. pseudocode synchronization

Then implement algorithms one at a time.

Get one algorithm fully functional end-to-end before adding all others.

A* is a good first complete reference implementation.

After A* works correctly, use it to validate that the architecture is sufficiently generic before implementing RRT and gradient descent, since those require fundamentally different rendering models.

# 33. Testing

Add tests for core non-rendering logic.

Especially test:

* deterministic seeded random generation
* algorithm correctness
* parameter validation
* timeline behavior
* reset/replay behavior
* URL configuration serialization/deserialization

For pathfinding algorithms, verify the final path is valid.

For deterministic configurations, verify repeated runs with the same seed and parameters produce identical state sequences.

# 34. Documentation

Create a README covering:

* project purpose
* screenshots if available
* installation
* local development
* build
* GitHub Pages deployment
* architecture
* how algorithms are represented
* how to add a new algorithm
* how parameter schemas work

Include a concise developer example for adding a new algorithm.

# 35. Definition of done

The initial version is complete when:

* the site builds without errors
* deployment to GitHub Pages is configured
* users can select multiple algorithms
* at least BFS, Dijkstra, A*, RRT, and Gradient Descent work
* visualizations are interactive
* each implemented algorithm has meaningful adjustable parameters
* random algorithms support seeds
* Play/Pause works
* stepping works
* resetting works
* timeline scrubbing works
* speed control works
* pseudocode highlighting works
* current-step explanations work
* algorithm-specific metrics work
* camera controls work
* parameters can be reset
* changing parameters reliably regenerates simulations
* the architecture makes adding new algorithms straightforward
* the README explains how to extend the system

Do not stop after creating placeholder pages or static mockups.

Implement a functioning end-to-end application.

When making engineering decisions that are not specified here, choose the option that maximizes maintainability and makes future algorithms easier to add.

At the end, run the build/tests, fix errors, and provide a concise summary of:

* what was implemented
* architecture used
* how to run locally
* how to deploy
* how to add a new algorithm
* any remaining limitations
