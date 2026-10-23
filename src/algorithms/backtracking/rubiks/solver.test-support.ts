import { readFileSync } from 'node:fs'
import { initializeCubeSolver } from './wasm'

export async function initializeTestCubeSolver() {
    await initializeCubeSolver(
        new Uint8Array(
            readFileSync(
                new URL('../../../../wasm/cube-solver/pkg/cube_solver.wasm', import.meta.url),
            ),
        ),
    )
}
