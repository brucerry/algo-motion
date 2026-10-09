# Development and deployment

[Project overview](../README.md) · [Architecture](architecture.md) · [Algorithms and limits](algorithms.md)

## Local setup

Use Node.js 20.19.x or Node.js 22.12 or newer, and npm. The deployment workflow uses Node.js 24. The checked-in lockfile makes clean installs repeatable.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite.

## Validation and preview

```bash
npm run format:check
npm run typecheck
npm test
npm run build
npm run preview
```

Browser tests use Playwright and Chromium:

```bash
npx playwright install chromium
npm run test:e2e
```

On Linux, Chromium may need additional system libraries; use `npx playwright install --with-deps chromium`. GitHub Actions installs those dependencies. Browser coverage includes all eight topics, URL and parameter validation, comparison, mobile layout, camera controls, keyboard shortcuts, optional sound, learning-panel characters, cube solving/replay, and accessibility checks.

To format the documentation pages as well as the README:

```bash
npx prettier --write README.md "docs/*.md"
```

## Add an algorithm

1. Create a folder under [src/algorithms](../src/algorithms) with pure simulation logic, a renderer, and a module descriptor. Use the contracts in [types.ts](../src/engine/types.ts).
2. Supply metadata, parameter definitions/defaults, presets, pseudocode, educational content, a producer, a renderer, and an inspection function.
3. Register the module in [registry.ts](../src/engine/registry.ts). The shared shell provides playback, controls, URL validation, navigation, and learning panels.
4. Add correctness, validation, determinism, and edge-case coverage, then run the checks above. Update [the catalog](algorithms.md) for any new showcase or input limit.

A compact eager module:

```ts
const module: AlgorithmModule<MyState> = {
    meta: {
        id: 'example',
        name: 'Example',
        shortName: 'Example',
        category: 'Geometry',
        dimensionality: '3D',
        description: '...',
        tags: ['geometry'],
    },
    parameters: [
        {
            type: 'number',
            key: 'count',
            label: 'Count',
            defaultValue: 20,
            min: 1,
            max: 100,
            integer: true,
        },
    ],
    defaults: { count: 20 },
    presets: [{ name: 'Small', values: { count: 10 } }],
    pseudocode: [{ id: 1, text: 'initialize' }],
    education: {
        overview: '...',
        intuition: '...',
        complexity: '...',
        applications: '...',
        legend: [],
        references: [],
    },
    run: (params) => makeFrames(params),
    renderer: lazy(() => import('./ExampleScene')),
    inspect: (state, id) => inspectObject(state, id),
}
```

For long incremental runs, provide a pure `steps` generator and register its producer in [traceWorker.ts](../src/workers/traceWorker.ts). A custom worker-only module can provide `createTrace` instead of `run`; Rubik’s Cube uses that contract. See [frames and replay](architecture.md#frames-and-replay).

For randomized modules, derive separate seeded streams for environment generation and algorithm samples using [seededRandom.ts](../src/engine/seededRandom.ts) and [seededInputs.ts](../src/algorithms/common/seededInputs.ts). Validate expensive input sizes, keep every configured item visible, and use incremental generation when eager snapshots would be too large.

## GitHub Pages

[pages.yml](../.github/workflows/pages.yml) installs locked dependencies, checks formatting/types, runs unit and browser tests, builds, and publishes `dist` on pushes to `main`. Pull requests run validation without deploying. In **Settings → Pages**, set **Source** to **GitHub Actions**.

The published site is [brucerry.github.io/algo-motion](https://brucerry.github.io/algo-motion/). After deployment, the static app needs no server, database, account, or runtime API.

Vite derives the base path from the GitHub repository name. Project repositories use their repository subpath; a repository named `username.github.io` uses `/`. For another host or base path:

```bash
# Bash
BASE_PATH=/my-path/ npm run build
BASE_PATH=/my-path/ npm run preview
```

```powershell
$env:BASE_PATH = '/my-path/'
npm run build
npm run preview
```

Hash routes keep shared algorithm links working without server rewrite rules.
