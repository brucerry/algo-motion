import wasmUrl from '../../../../wasm/cube-solver/pkg/cube_solver.wasm?url'

type SolverExports = {
    memory: WebAssembly.Memory
    input_ptr(): number
    output_ptr(): number
    prepare(): number
    solve(): number
}
export type CubeEngine = {
    prepare(): number
    solve(facelets: string): { notation: string; phase1Length: number }
    memoryBytes(): number
}

export async function createCubeEngine(bytes: BufferSource): Promise<CubeEngine> {
    const { instance } = await WebAssembly.instantiate(bytes, {})
    const exports = instance.exports as unknown as SolverExports
    if (
        !(exports.memory instanceof WebAssembly.Memory) ||
        ['input_ptr', 'output_ptr', 'prepare', 'solve'].some(
            (key) => typeof instance.exports[key] !== 'function',
        )
    )
        throw new Error('Rust cube solver has an invalid module interface.')
    return {
        prepare: () => exports.prepare(),
        memoryBytes: () => exports.memory.buffer.byteLength,
        solve: (facelets) => {
            const input = new TextEncoder().encode(facelets)
            if (input.length !== 54) throw new Error('Cube input must contain 54 facelets.')
            new Uint8Array(exports.memory.buffer, exports.input_ptr(), 54).set(input)
            const length = exports.solve()
            if (length < 1 || length > 31)
                throw new Error('Rust cube solver rejected the state or found no solution.')
            // Preparation/search can grow memory. Always obtain a new view.
            const output = new Uint8Array(exports.memory.buffer, exports.output_ptr(), length)
            const phase1Length = output[0]
            if (phase1Length > length - 1 || output.subarray(1).some((move) => move >= 18))
                throw new Error('Rust cube solver returned invalid move metadata.')
            return {
                notation: Array.from(
                    output.subarray(1),
                    (move) => 'URFDLB'[Math.floor(move / 3)] + ['', '2', "'"][move % 3],
                ).join(' '),
                phase1Length,
            }
        },
    }
}

export async function loadCubeEngine(url = wasmUrl): Promise<CubeEngine> {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Unable to load Rust cube solver (${response.status}).`)
    return createCubeEngine(await response.arrayBuffer())
}

let engine: CubeEngine | undefined
let loading: Promise<CubeEngine> | undefined
export function initializeCubeSolver(bytes?: BufferSource): Promise<CubeEngine> {
    loading ??= (bytes ? createCubeEngine(bytes) : loadCubeEngine()).then(
        (ready) => (engine = ready),
        (error: unknown) => {
            loading = undefined
            throw error
        },
    )
    return loading
}

export function cubeEngine(): CubeEngine {
    if (!engine) throw new Error('Rust cube solver must be initialized before solving.')
    return engine
}
