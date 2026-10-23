# Vendored cube.js

Source: https://github.com/ldez/cubejs
Revision: `6b3da493894d9aed54f4c8aafccadbe676e745b5`
Files: `lib/cube.js`, `lib/solve.js`.
License: MIT, preserved in `public/licenses/cubejs-MIT.txt` and distributed with the site.

Local adaptations:

- ESM import/export wrappers replace CommonJS/global wrappers.
- `solveUpright` records `solutionPhase1Length` for the accepted solution.
- Both phase searches permit zero-depth completion; phase-2 initialization also merges root coordinates when phase 1 has zero moves.
- Formatting follows repository Prettier configuration. Move ordering and pruning tables are unchanged.

These files are retained as a differential-test and benchmark reference. Production cube and Mirror workers use the [Rust/WASM port](../../../../../wasm/cube-solver/README.md) and do not import this JavaScript search. The npm package is not installed; its unrelated npm dependency is unnecessary here.
