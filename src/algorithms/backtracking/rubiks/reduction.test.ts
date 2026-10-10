// @vitest-environment node
import { describe, expect, it } from 'vitest'
import SolverCube from './vendor/cube.js'
import './vendor/solve.js'
import {
    applyMoves,
    facelets,
    inverse,
    isSolved,
    parseMoves,
    scramble,
    solvedCube,
    validateCube,
    type CubeSize,
} from './model'
import { reduceCube } from './reduction'
import {
    centersSolved,
    cubeFromFacelets,
    edgesGrouped,
    reducedCoordinates,
    reducedFacelets,
} from './reductionState'
import {
    axialCycle,
    centerCycle,
    cycleCatalog,
    orientationParity,
    permutationParityMoves,
    wingCycle,
    type OrbitKind,
} from './reductionMacros'
import { oracleFacelets, oraclePermutation } from './faceletOracle.test-support'

describe('state-only constructive reduction', () => {
    for (const size of [4, 5] as CubeSize[]) {
        it(`verifies every ${size}×${size} primitive macro and representative conjugates independently`, () => {
            for (const kind of (size === 4
                ? ['diagonal centers', 'wings']
                : ['diagonal centers', 'axial centers', 'wings']) as OrbitKind[]) {
                const catalog = cycleCatalog(size, kind)
                for (const moves of [
                    catalog.primitive,
                    catalog.cycle(0, 7, 23),
                    catalog.cycle(21, 1, 10),
                    catalog.cycle(7, 4, 19),
                ]) {
                    const cube = applyMoves(solvedCube(size), moves)
                    validateCube(cube)
                    expect(facelets(cube)).toBe(oracleFacelets(size, moves))
                    expect(
                        oraclePermutation(size, moves).filter((value, i) => value !== i),
                    ).toHaveLength(kind === 'wings' ? 6 : 3)
                    expect(isSolved(applyMoves(cube, [...moves].reverse().map(inverse)))).toBe(true)
                    if (kind === 'wings') expect(centersSolved(cube)).toBe(true)
                }
            }
        })
        it(`restores centers, edge groups, and all ${6 * size * size} stickers on diverse seeded states`, () => {
            SolverCube.initSolver()
            for (const scrambleLength of [0, 5, 20, 60, 100])
                for (const seed of [0, 42, 123, 4294967295]) {
                    const input = applyMoves(
                        solvedCube(size),
                        scramble({ size, seed, scrambleLength }),
                    )
                    const reduction = reduceCube(input)
                    expect(centersSolved(reduction.cube)).toBe(true)
                    expect(edgesGrouped(reduction.cube)).toBe(true)
                    expect(reducedCoordinates(reducedFacelets(reduction.cube))).toMatchObject({
                        oll: false,
                        pll: false,
                    })
                    const abstract = cubeFromFacelets(reducedFacelets(reduction.cube))
                    expect(facelets(abstract)).toBe(reducedFacelets(reduction.cube))
                    const solution = SolverCube.fromString(facelets(abstract)).solveUpright(30)
                    expect(solution).not.toBeNull()
                    const moves = [...reduction.moves, ...parseMoves(solution!)]
                    const terminal = applyMoves(input, moves)
                    validateCube(terminal)
                    expect(isSolved(terminal)).toBe(true)
                    expect(facelets(terminal)).toBe(
                        oracleFacelets(size, [
                            ...scramble({ size, seed, scrambleLength }),
                            ...moves,
                        ]),
                    )
                }
        }, 60000)
    }
    it('recognizes and corrects isolated and combined 4×4 parity without disturbing reduction', () => {
        for (const notation of [
            '',
            orientationParity,
            permutationParityMoves,
            `${orientationParity} ${permutationParityMoves}`,
        ]) {
            const cube = applyMoves(solvedCube(4), parseMoves(notation, 4))
            expect(centersSolved(cube)).toBe(true)
            expect(edgesGrouped(cube)).toBe(true)
            const state = reducedCoordinates(reducedFacelets(cube))
            expect(state.oll).toBe(notation.includes(orientationParity))
            expect(state.pll).toBe(notation.includes(permutationParityMoves))
            const reduced = reduceCube(cube)
            expect(reducedCoordinates(reducedFacelets(reduced.cube))).toMatchObject({
                oll: false,
                pll: false,
            })
        }
    })
    it('rejects false reduction boundaries and checks the independent 3×3 adapter', () => {
        expect(() => reducedFacelets(applyMoves(solvedCube(4), parseMoves('2R', 4)))).toThrow(
            'invariants',
        )
        expect(() => cubeFromFacelets('U'.repeat(54))).toThrow('inventory')
        for (const seed of [0, 42, 123]) {
            const cube = applyMoves(solvedCube(), scramble({ seed, scrambleLength: 20 }))
            expect(facelets(cubeFromFacelets(facelets(cube)))).toBe(facelets(cube))
            const coordinates = reducedCoordinates(facelets(cube)),
                solver = SolverCube.fromString(facelets(cube))
            expect(coordinates.corners).toEqual(solver.cp)
            expect(coordinates.edges).toEqual(solver.ep)
            expect(coordinates.oll).toBe(false)
            expect(coordinates.pll).toBe(false)
        }
        expect([centerCycle, axialCycle, wingCycle]).toHaveLength(3)
    })
    it('retains completed center colors and solves legal 5×5 middle and full-span states', () => {
        SolverCube.initSolver()
        for (const notation of ['3R', '3U 3F2', '5Rw 2U 3F′ Rw D2', '2-4R U 3D′ Fw']) {
            const input = applyMoves(solvedCube(5), parseMoves(notation, 5))
            const result = reduceCube(input)
            expect(centersSolved(result.cube)).toBe(true)
            const suffix = SolverCube.fromString(reducedFacelets(result.cube)).solveUpright(30)!
            expect(isSolved(applyMoves(input, [...result.moves, ...parseMoves(suffix)]))).toBe(true)
        }
    }, 30000)
    it('corrects the last 5×5 wing pair while retaining middle edges and both center orbits', () => {
        const moves = parseMoves(orientationParity, 5)
        const input = applyMoves(solvedCube(5), moves)
        expect(centersSolved(input)).toBe(true)
        expect(edgesGrouped(input)).toBe(false)
        expect(facelets(input)).toBe(oracleFacelets(5, moves))
        const result = reduceCube(input)
        expect(edgesGrouped(result.cube)).toBe(true)
        expect(isSolved(result.cube)).toBe(true)
        expect(result.cube.filter((p) => p.stickers.length === 2 && p.home.includes(0))).toEqual(
            input.filter((p) => p.stickers.length === 2 && p.home.includes(0)),
        )
    })
})
