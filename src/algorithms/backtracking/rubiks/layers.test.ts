// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
    affectedLayer,
    applyMoves,
    facelets,
    faces,
    inverse,
    notation,
    parseMoves,
    scramble,
    solvedCube,
    turn,
    validateCube,
    type CubeSize,
    type Move,
} from './model'
import { oracleFacelets, oraclePermutation } from './faceletOracle.test-support'

describe('exact NxN lattice and orientation', () => {
    for (const size of [3, 4, 5] as CubeSize[]) {
        it(`preserves all pieces and stickers for every ${size}×${size} primitive`, () => {
            const solved = solvedCube(size)
            expect(solved).toHaveLength(size ** 3 - (size - 2) ** 3)
            expect(solved.flatMap((p) => p.stickers)).toHaveLength(6 * size ** 2)
            validateCube(solved)
            const labelled = solved.map((p) => ({
                ...p,
                stickers: p.stickers.map((s) => ({
                    ...s,
                    color: `${p.id}/${s.color} ` as typeof s.color,
                })),
            }))
            const labels = facelets(labelled).trim().split(' ')
            for (const face of faces)
                for (let depth = 1; depth <= size; depth++)
                    for (let width = 1; width <= size - depth + 1; width++)
                        for (const turns of [1, 2, 3] as const) {
                            const move: Move = { face, depth, width, turns }
                            const changed = turn(solved, move)
                            validateCube(changed)
                            expect(facelets(changed)).toBe(oracleFacelets(size, [move]))
                            expect(facelets(turn(labelled, move)).trim()).toBe(
                                oraclePermutation(size, [move])
                                    .map((i) => labels[i])
                                    .join(' '),
                            )
                            expect(turn(changed, inverse(move))).toEqual(solved)
                            expect(
                                applyMoves(solved, Array(4).fill({ ...move, turns: 1 })),
                            ).toEqual(solved)
                            expect(
                                changed.filter((p) => affectedLayer(p.position, move, size)),
                            ).toHaveLength(
                                solved.filter((p) => affectedLayer(p.position, move, size)).length,
                            )
                            expect(parseMoves(notation(move), size)[0]).toEqual({
                                face,
                                turns,
                                ...(depth > 1 ? { depth } : {}),
                                ...(width > 1 ? { width } : {}),
                            })
                            expect(new Set(oraclePermutation(size, [move])).size).toBe(
                                6 * size ** 2,
                            )
                        }
        }, 30000)
        it(`matches independent permutations on seeded ${size}×${size} sequences`, () => {
            for (const scrambleLength of [0, 5, 20, 60, 100])
                for (const seed of [0, 42, 123]) {
                    const moves = scramble({ size, seed, scrambleLength })
                    expect(moves).toEqual(scramble({ size, seed, scrambleLength }))
                    expect(moves).toHaveLength(scrambleLength)
                    const cube = applyMoves(solvedCube(size), moves)
                    validateCube(cube)
                    expect(facelets(cube)).toBe(oracleFacelets(size, moves))
                    expect(applyMoves(cube, [...moves].reverse().map(inverse))).toEqual(
                        solvedCube(size),
                    )
                    if (size > 3 && scrambleLength >= 20) {
                        expect(moves.some((m) => m.depth === 2)).toBe(true)
                        expect(moves.some((m) => m.width === 2)).toBe(true)
                    }
                }
        })
    }
    it('distinguishes inner depth, wide width, and half-turn suffixes', () => {
        expect(parseMoves('2R R2 Rw 3Rw2', 5).map(notation)).toEqual(['2R', 'R2', 'Rw', '3Rw2'])
        for (const token of ['0R', '6R', '6Rw', 'R3', '2Rw3', 'X', 'Rww'])
            expect(() => parseMoves(token, 5)).toThrow()
        for (const move of [
            { face: 'R', turns: 1, depth: 0 },
            { face: 'U', turns: 1, depth: 3, width: 2 },
            { face: 'F', turns: 4 },
        ])
            expect(() => turn(solvedCube(), move as Move)).toThrow()
    })
    it('rejects duplicate inventory, reflected bases, misplaced stickers, and inconsistent poses', () => {
        const cube = solvedCube(4)
        for (const corrupt of [
            [...cube.slice(1), cube[1]],
            cube.map((p, i) =>
                i
                    ? p
                    : {
                          ...p,
                          basis: [
                              [-1, 0, 0],
                              [0, 1, 0],
                              [0, 0, 1],
                          ],
                      },
            ),
            cube.map((p, i) => (i ? p : { ...p, position: [1, 1, 1] })),
            cube.map((p, i) => (i ? p : { ...p, stickers: [] })),
        ])
            expect(() => validateCube(corrupt as typeof cube)).toThrow()
    })
})
