# Rust cube solver

Dependency-free port of the shared 3×3 two-phase coordinate tables and deterministic search. Cube, Mirror Cube, and the reduced stage of 4×4/5×5 use this engine. Scrambling, reduction, independent verification, learning text, and rendering remain in TypeScript.

Install Rust through [rustup](https://rust-lang.org/tools/install/). The root `rust-toolchain.toml` pins the compiler, formatter, and WASM target. From the repository root:

```sh
npm run wasm:build
npm run test:rust
cargo fmt --manifest-path wasm/cube-solver/Cargo.toml --check
cargo clippy --locked --release --manifest-path wasm/cube-solver/Cargo.toml -- -D warnings
```

`npm run dev`, `npm test`, and `npm run build` build the WASM asset automatically. Generated `pkg/` and `target/` are ignored. No binding generator or Rust package dependencies are required. Browser users download a normal static `.wasm` asset and need no Rust installation.

## ABI

Each worker owns one module instance. All exported functions are synchronous and must not be called concurrently or reentrantly.

- `memory`: WebAssembly linear memory. Refresh views after calls that may grow memory.
- `input_ptr()`: address of a fixed 54-byte input buffer. Write ASCII facelets in `URFDLB` face order, matching the TypeScript adapter.
- `prepare()`: initialize tables once and return persistent table payload bytes. This excludes allocator, stack, and other linear-memory overhead.
- `solve()`: validate input and search to depth 30. Return `-1` for invalid/unsupported input or search failure; otherwise return output byte length, 1–31.
- `output_ptr()`: output starts with the actual phase-1 length followed by zero to thirty move codes. Code `3 * face + power` uses faces `URFDLB` and powers quarter/half/inverse. Copy the result before another solve.

The TypeScript adapter checks the ABI result and the existing independent replay verifier checks every move, phase boundary, and final geometry. A WASM load/trap/search failure follows the existing worker error path; there is no silent JavaScript fallback. Worker termination cancels loading, preparation, or search and releases its memory.

## Attribution

Coordinate conventions, move definitions, pruning-table layout, and search order are adapted from [ldez/cubejs](https://github.com/ldez/cubejs), revision `6b3da493894d9aed54f4c8aafccadbe676e745b5`, by Petri Lehtinen and Ludovic Fernandez. Its MIT notice is preserved in [public/licenses/cubejs-MIT.txt](../../public/licenses/cubejs-MIT.txt) and distributed with the site. Repository contributions are GPL-3.0-only. The vendored reference remains in `src/algorithms/backtracking/rubiks/vendor` for differential tests and benchmarks; production workers do not import it.
