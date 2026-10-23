# Cube solver performance

The shared 3×3 two-phase search runs in [Rust/WASM](../wasm/cube-solver/README.md). The same engine solves Mirror Cube's abstract state and the final reduced stage of larger cubes. TypeScript continues to generate scrambles, reduce larger cubes, and independently verify every returned move and phase boundary.

## Reproduce

Use Node.js 24 or newer and the pinned Rust toolchain:

```sh
npm run benchmark:cube
```

The benchmark builds the release WASM module and runs three fresh processes for each backend, sequentially. Inputs use seeds `0`, `1`, `42`, `99`, `123`, and `4294967295`, each with scramble lengths `5`, `20`, `60`, and `100`. Each process solves those 24 fixtures twice. Reported values are medians across the three processes; warm median and p95 are computed from each process's 48 solves. Hashes of exact solution notation and phase boundaries must match across all processes and backends, and the returned moves are also checked against the reference cube model.

The compact JavaScript baseline uses the same reference search, coordinate methods, move ordering, and pruning generation. A benchmark-only source adapter changes move tables to flat typed arrays and pruning storage to `Uint32Array`. It is a controlled representation baseline, not an exhaustive optimization of JavaScript.

## Local result

Measured on 2026-10-23, macOS ARM64, Node.js 24.22.0, release Rust 1.90.0:

| Backend            | Cold preparation | Warm median solve | Warm p95 solve | Persistent table buffers |
| ------------------ | ---------------: | ----------------: | -------------: | -----------------------: |
| Legacy JavaScript  |         649.6 ms |          7.009 ms |      56.588 ms |         Nested JS arrays |
| Compact JavaScript |         606.7 ms |          6.613 ms |      53.955 ms |          5,319,924 bytes |
| Rust/WASM          |         321.1 ms |          0.465 ms |       3.777 ms |          5,319,888 bytes |

Rust preparation was approximately 2.0× faster than legacy and 1.9× faster than compact JavaScript; median warm solving was approximately 15.1× and 14.2× faster respectively on this fixture set. Exact notation and phase boundaries matched across all three implementations.

After forced garbage collection, legacy initialization retained approximately 30.4 MB of additional V8 heap. Compact JavaScript retained approximately 0.21 MB of additional heap and 5.32 MB of array buffers. Rust's WASM linear memory was 6,946,816 bytes (about 6.6 MiB), including its tables, stack, allocator overhead and reserved capacity; its JavaScript wrapper retained approximately 0.09 MB of additional heap. These are different storage measurements, not a claim about total process or whole-browser peak memory. The Rust table payload stays below the tested 6 MiB bound.

The generated WASM binary is 42,653 bytes, or 16,963 bytes compressed with Node's default gzip settings. Actual hosting compression can differ. Tables are generated in Rust rather than bundled as megabytes of precomputed data.

## Limits

Cold Rust preparation includes WASM instantiation/compilation and table initialization; JavaScript module parsing is outside the measurement. Network/file fetch, worker startup, larger-cube reduction, replay verification, rendering, and browser scheduling are excluded. Warm measurements reuse one initialized engine, while the app still terminates its worker after each solution or cancellation and therefore normally pays cold preparation for each run. Workers do not share their table memory.

These Node diagnostics establish implementation costs for a fixed workload. They are not end-to-end browser latency measurements, general algorithm rankings, or a guarantee for every device or input. Production browser tests separately verify real WASM loading under a repository subpath, successful independent replay, visible loading errors, and cancellation/input replacement. Native coordinate tests and differential unit tests cover illegal states, zero-depth phases, and seeded deterministic solutions.
