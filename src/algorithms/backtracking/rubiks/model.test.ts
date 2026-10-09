// @vitest-environment node
import { describe, expect, it } from 'vitest'
import SolverCube from './vendor/cube.js'
import {
    applyMoves,
    facelets,
    faces,
    inPhase2,
    inverse,
    isSolved,
    parseMoves,
    scramble,
    solvedCube,
    turn,
} from './model'

describe('exact Rubik cube model', () => {
    it('matches the independent solver model for all 18 face turns and their combinations', () => {
        for (const face of faces)
            for (const suffix of ['', '2', "'"]) {
                const moves = parseMoves(face + suffix)
                const cube = applyMoves(solvedCube(), moves)
                expect(facelets(cube)).toBe(new SolverCube().move(face + suffix).asString())
                expect(isSolved(turn(cube, inverse(moves[0])))).toBe(true)
                expect(cube).toHaveLength(26)
                expect(cube.flatMap((c) => c.stickers)).toHaveLength(54)
                expect(cube.filter((c) => c.stickers.length === 1).map((c) => c.position)).toEqual(
                    solvedCube()
                        .filter((c) => c.stickers.length === 1)
                        .map((c) => c.position),
                )
                expect(
                    isSolved(
                        applyMoves(solvedCube(), parseMoves(`${face} ${face} ${face} ${face}`)),
                    ),
                ).toBe(true)
            }
        const sequence = "R U F2 L' B D R2 U'"
        expect(facelets(applyMoves(solvedCube(), parseMoves(sequence)))).toBe(
            new SolverCube().move(sequence).asString(),
        )
        expect(() => parseMoves('X R3')).toThrow()
    })
    it('validates seeded scrambles and preserves deterministic legal inputs', () => {
        for (const scrambleLength of [0, 5, 20, 60, 100]) {
            const params = { seed: 42, scrambleLength }
            const moves = scramble(params)
            expect(moves).toEqual(scramble(params))
            expect(moves).toHaveLength(scrambleLength)
            expect(moves.every((move, i) => move.face !== moves[i - 1]?.face)).toBe(true)
        }
        for (const scrambleLength of [-1, 0.5, 101])
            expect(() => scramble({ seed: 42, scrambleLength })).toThrow()
        expect(isSolved(applyMoves(solvedCube(), parseMoves('R L R′ L′')))).toBe(true)
    })
    it('agrees with solver orientation and slice coordinates on seeded inputs', () => {
        for (let seed = 0; seed < 50; seed++) {
            const cube = applyMoves(solvedCube(), scramble({ seed, scrambleLength: seed % 21 }))
            const solver = SolverCube.fromString(facelets(cube))
            expect(inPhase2(cube)).toBe(
                solver.co.every((x) => x === 0) &&
                    solver.eo.every((x) => x === 0) &&
                    solver.ep.slice(8).every((x) => x >= 8),
            )
        }
        expect(inPhase2(applyMoves(solvedCube(), parseMoves('U R2 D F2 L2 B2')))).toBe(true)
    })
})
