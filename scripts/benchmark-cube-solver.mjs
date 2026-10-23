import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.endsWith('.wasm?url'))
            return {
                url:
                    'data:text/javascript,' +
                    encodeURIComponent(
                        'export default ' +
                            JSON.stringify(new URL(specifier.slice(0, -4), context.parentURL).href),
                    ),
                shortCircuit: true,
            }
        try {
            return nextResolve(specifier, context)
        } catch (error) {
            if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier))
                return nextResolve(specifier + '.ts', context)
            throw error
        }
    },
})

const median = (values) => values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)]
const rounded = (n) => Math.round(n * 1000) / 1000
const variant = process.argv[3]
if (process.argv[2] !== '--worker') {
    const results = []
    let referenceDigest
    for (const kind of ['legacy-js', 'compact-js', 'rust-wasm']) {
        const samples = []
        for (let trial = 0; trial < 3; trial++) {
            const child = spawnSync(
                process.execPath,
                [
                    '--expose-gc',
                    '--experimental-transform-types',
                    fileURLToPath(import.meta.url),
                    '--worker',
                    kind,
                ],
                { encoding: 'utf8' },
            )
            if (child.status !== 0) {
                process.stderr.write(child.stderr)
                process.exit(child.status || 1)
            }
            const sample = JSON.parse(child.stdout)
            referenceDigest ??= sample.solutionDigest
            if (sample.solutionDigest !== referenceDigest)
                throw new Error('Benchmark backends returned different solution paths')
            samples.push(sample)
        }
        const keys = Object.keys(samples[0]).filter((key) => typeof samples[0][key] === 'number')
        results.push({
            variant: kind,
            ...Object.fromEntries(
                keys.map((key) => [key, rounded(median(samples.map((sample) => sample[key])))]),
            ),
        })
    }
    console.log(
        JSON.stringify(
            {
                node: process.version,
                platform: `${process.platform}/${process.arch}`,
                trials: 3,
                fixtures: 'six seeds; scramble lengths 5,20,60,100; two passes (48 solves)',
                exactSolutionParity: true,
                note: 'Separate processes; medians of per-process results. Cold WASM includes instantiation. File/network fetch, worker startup, rendering, and replay verification excluded. Memory deltas are retained after GC, not whole-browser peak memory.',
                results,
            },
            null,
            2,
        ),
    )
} else {
    const { initialCubeFrame } = await import('../src/algorithms/backtracking/rubiks/replay.ts')
    const { threeFacelets } = await import('../src/algorithms/backtracking/rubiks/model.ts')
    const fixtures = [0, 1, 42, 99, 123, 0xffffffff].flatMap((seed) =>
        [5, 20, 60, 100].map((scrambleLength) =>
            threeFacelets(initialCubeFrame({ seed, scrambleLength }).state.cube),
        ),
    )
    const binary = readFileSync(
        new URL('../wasm/cube-solver/pkg/cube_solver.wasm', import.meta.url),
    )
    let Cube
    let createCubeEngine
    if (variant === 'rust-wasm')
        ({ createCubeEngine } = await import('../src/algorithms/backtracking/rubiks/wasm.ts'))
    else if (variant === 'compact-js')
        Cube = await (await import('./compact-cube-reference.mjs')).compactCubeReference()
    else {
        Cube = (await import('../src/algorithms/backtracking/rubiks/vendor/cube.js')).default
        await import('../src/algorithms/backtracking/rubiks/vendor/solve.js')
    }
    global.gc()
    const before = process.memoryUsage()
    const start = performance.now()
    let engine
    let tableBytes = 0
    if (variant === 'rust-wasm') {
        engine = await createCubeEngine(new Uint8Array(binary))
        tableBytes = engine.prepare()
    } else {
        Cube.initSolver()
        if (variant === 'compact-js')
            tableBytes = [
                ...Object.values(Cube.moveTables),
                ...Object.values(Cube.pruningTables),
            ].reduce((n, table) => n + table.byteLength, 0)
    }
    const coldPrepareMs = performance.now() - start
    global.gc()
    const after = process.memoryUsage()
    const timings = []
    const outputs = []
    for (let pass = 0; pass < 2; pass++)
        for (const input of fixtures) {
            const begin = performance.now()
            let result
            if (engine) result = engine.solve(input)
            else {
                const cube = Cube.fromString(input)
                result = {
                    notation: cube.solveUpright(30),
                    phase1Length: cube.solutionPhase1Length,
                }
            }
            timings.push(performance.now() - begin)
            if (pass === 0) outputs.push(result)
            else {
                const index = (timings.length - 1) % fixtures.length
                if (JSON.stringify(result) !== JSON.stringify(outputs[index]))
                    throw new Error('Non-deterministic solution')
            }
        }
    // Verify physical states outside the measured work. The parent also compares
    // hashes of the exact notation and phase boundary across every backend.
    if (variant !== 'legacy-js') {
        const reference = (await import('../src/algorithms/backtracking/rubiks/vendor/cube.js'))
            .default
        for (let i = 0; i < fixtures.length; i++) {
            if (!reference.fromString(fixtures[i]).move(outputs[i].notation).isSolved())
                throw new Error('Invalid benchmark solution')
        }
    }
    const sorted = timings.toSorted((a, b) => a - b)
    console.log(
        JSON.stringify({
            variant,
            solutionDigest: createHash('sha256').update(JSON.stringify(outputs)).digest('hex'),
            coldPrepareMs,
            warmMedianMs: median(timings),
            warmP95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
            tableBytes,
            retainedHeapDeltaBytes: after.heapUsed - before.heapUsed,
            retainedArrayBufferDeltaBytes: after.arrayBuffers - before.arrayBuffers,
            wasmLinearMemoryBytes: engine?.memoryBytes() || 0,
            wasmBinaryBytes: binary.length,
            wasmGzipBytes: gzipSync(binary).length,
        }),
    )
}
