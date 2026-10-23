// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import LegacyCube from './vendor/cube.js'
import './vendor/solve.js'
import { createCubeEngine, loadCubeEngine, type CubeEngine } from './wasm'
import { applyMoves, isSolved, parseMoves, solvedCube, threeFacelets } from './model'
import { initialCubeFrame, verifiedReplay } from './replay'

const bytes = new Uint8Array(
    readFileSync(new URL('../../../../wasm/cube-solver/pkg/cube_solver.wasm', import.meta.url)),
)
const solved = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
let engine: CubeEngine
beforeAll(async () => {
    engine = await createCubeEngine(bytes)
    LegacyCube.initSolver()
})
afterEach(() => vi.unstubAllGlobals())

it('matches exact legacy solutions and phase boundaries across seeded state-only inputs', () => {
    for (const seed of [0, 1, 42, 99, 123, 0xffffffff])
        for (const scrambleLength of [0, 1, 5, 20, 60, 100]) {
            const initial = initialCubeFrame({ seed, scrambleLength })
            const facelets = threeFacelets(initial.state.cube)
            const reference = LegacyCube.fromString(facelets)
            const notation = reference.solveUpright(30)
            const result = engine.solve(facelets)
            expect(result).toEqual({ notation, phase1Length: reference.solutionPhase1Length })
            expect(isSolved(verifiedReplay(initial, result).at(-1)!.state.cube)).toBe(true)
        }
}, 30000)

it('supports zero-depth phases, repeated preparation, and bounded persistent table storage', () => {
    const tableBytes = engine.prepare()
    expect(tableBytes).toBeLessThan(6 * 1024 * 1024)
    const memoryBytes = engine.memoryBytes()
    expect(engine.prepare()).toBe(tableBytes)
    expect(engine.memoryBytes()).toBe(memoryBytes)
    expect(engine.solve(solved)).toEqual({ notation: '', phase1Length: 0 })
    const cube = applyMoves(solvedCube(), parseMoves('U R2 D F2'))
    const result = engine.solve(threeFacelets(cube))
    expect(result.phase1Length).toBe(0)
    expect(isSolved(applyMoves(cube, parseMoves(result.notation)))).toBe(true)
})

it('rejects malformed facelets and impossible cubes before search', () => {
    expect(() => engine.solve('bad')).toThrow('54 facelets')
    expect(() => engine.solve('X'.repeat(54))).toThrow('rejected')
    const flipped = solved.split('')
    ;[flipped[5], flipped[10]] = [flipped[10], flipped[5]]
    expect(() => engine.solve(flipped.join(''))).toThrow('rejected')
})

it('loads the real binary and propagates missing, corrupt, and incompatible module errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(bytes)))
    const loaded = await loadCubeEngine('/repo/assets/cube_solver.wasm')
    expect(fetch).toHaveBeenCalledWith('/repo/assets/cube_solver.wasm')
    expect(loaded.solve(solved)).toEqual({ notation: '', phase1Length: 0 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))
    await expect(loadCubeEngine()).rejects.toThrow('404')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await expect(loadCubeEngine()).rejects.toThrow('offline')
    await expect(createCubeEngine(new Uint8Array([1, 2, 3]))).rejects.toThrow()
    await expect(createCubeEngine(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]))).rejects.toThrow(
        'invalid module interface',
    )
})
