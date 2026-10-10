// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
    canSlice,
    canonical,
    moveSquare,
    parseSquare,
    shapeReady,
    solvedSquare,
    squareScramble,
    squareSolved,
    validateSquare,
    type SquarePuzzle,
    type SquareMove,
} from './model'
import {
    componentRotation,
    prepareSquareTables,
    rankPermutation,
    shapeIndex,
    squareCoordinates,
    unrankPermutation,
} from './tables'
import { findSquareSolution } from './solver'
import { initialSquareFrame, squareReplay } from './replay'
// Independent sector permutation oracle, with no production move or pose helpers.
function oracle(p: { top: number[]; bottom: number[]; middle: number }, raw: number) {
    const top = [...p.top],
        bottom = [...p.bottom]
    if (raw > 0) top.push(...top.splice(0, raw))
    else if (raw < 0) bottom.push(...bottom.splice(0, -raw))
    else {
        const a = top.splice(6),
            b = bottom.splice(0, 6)
        top.push(...b)
        bottom.unshift(...a)
    }
    return { top, bottom, middle: raw === 0 ? 1 - p.middle : p.middle }
}
describe('state-only Square-1 search and independently checked coordinates', () => {
    it('generates reachable tables and bijective permutations', () => {
        const t = prepareSquareTables()
        expect(t.masks).toHaveLength(3678)
        for (const a of [t.shapeDistance, t.edgeDistance, t.cornerDistance])
            expect(a.includes(255)).toBe(false)
        for (let i = 0; i < 40320; i++) expect(rankPermutation(unrankPermutation(i))).toBe(i)
        expect(t.bytes).toBeLessThan(1000000)
    })
    it('matches shape, parity and permutation transitions against independently moved rings', () => {
        const t = prepareSquareTables()
        for (let seed = 0; seed < 40; seed++) {
            const p = squareScramble({ seed, scrambleLength: 20 }).reduce(
                    moveSquare,
                    solvedSquare(),
                ),
                index = shapeIndex(p, t)
            for (const [table, sign] of [
                [t.shapeTop, 1],
                [t.shapeBottom, -1],
            ] as const) {
                const encoded = table[index],
                    raw = (encoded & 15) * sign,
                    next = oracle(p, raw) as SquarePuzzle
                expect(shapeIndex(next, t)).toBe(encoded >> 4)
            }
            expect(shapeIndex(oracle(p, 0) as SquarePuzzle, t)).toBe(t.shapeSlice[index])
            // Prepare transition fixtures directly with legal cube-shape moves.
            let reduced = solvedSquare()
            for (let step = 0; step < 12; step++) {
                const choices: SquareMove[] = [{ kind: 'slice' }]
                for (let amount = 1; amount < 12; amount++) {
                    choices.push(
                        { kind: 'rotate', top: canonical(amount), bottom: 0 },
                        { kind: 'rotate', top: 0, bottom: canonical(amount) },
                    )
                }
                const legal = choices.filter(
                    (move) =>
                        (move.kind !== 'slice' || canSlice(reduced)) &&
                        shapeReady(moveSquare(reduced, move)),
                )
                reduced = moveSquare(reduced, legal[(seed * 17 + step * 11) % legal.length])
            }
            expect(shapeReady(reduced)).toBe(true)
            const coords = squareCoordinates(reduced)
            for (const layer of [0, 1] as const) {
                const e = componentRotation(coords.edge, coords.flags, layer, true, t),
                    c = componentRotation(coords.corner, coords.flags, layer, false, t),
                    next = squareCoordinates(
                        oracle(reduced, (layer === 0 ? 1 : -1) * e.amount) as SquarePuzzle,
                    )
                expect(next).toEqual({ edge: e.perm, corner: c.perm, flags: e.flags })
            }
            if (Boolean(coords.flags & 4) === Boolean(coords.flags & 2))
                expect(squareCoordinates(oracle(reduced, 0) as SquarePuzzle)).toEqual({
                    edge: t.slice[coords.edge],
                    corner: t.slice[coords.corner],
                    flags: coords.flags ^ 1,
                })
        }
    }, 60000)
    it('has admissible shape lower bounds on an exhaustive small legal neighborhood', () => {
        const t = prepareSquareTables(),
            frontier = [{ p: solvedSquare(), depth: 0 }],
            seen = new Set<string>()
        for (let i = 0; i < frontier.length; i++) {
            const { p, depth } = frontier[i],
                key = JSON.stringify([
                    p.top.map((v) => v & 1),
                    p.bottom.map((v) => v & 1),
                    shapeIndex(p, t) & 1,
                ])
            if (seen.has(key)) continue
            seen.add(key)
            expect(t.shapeDistance[shapeIndex(p, t)]).toBeLessThanOrEqual(depth)
            if (depth === 3) continue
            for (let amount = 1; amount < 12; amount++)
                for (const layer of [0, 1]) {
                    const next = moveSquare(p, {
                        kind: 'rotate',
                        top: layer === 0 ? canonical(amount) : 0,
                        bottom: layer === 1 ? canonical(amount) : 0,
                    })
                    if (canSlice(next)) frontier.push({ p: next, depth: depth + 1 })
                }
            frontier.push({ p: moveSquare(p, { kind: 'slice' }), depth: depth + 1 })
        }
        expect(seen.size).toBeGreaterThan(20)
    })
    it('solves diverse short, standard, long, maximum and parity/middle fixtures with exact replay', async () => {
        for (const seed of [0, 42, 123, 0xffffffff])
            for (const scrambleLength of [0, 5, 20, 60, 100]) {
                const initial = initialSquareFrame({ seed, scrambleLength }),
                    solution = findSquareSolution(initial.state.puzzle)
                const moves = parseSquare(solution.notation)
                let expected = initial.state.puzzle
                for (const move of moves) {
                    const raw =
                        move.kind === 'slice'
                            ? [0]
                            : [
                                  move.top > 0 ? move.top : move.top + 12,
                                  -(move.bottom > 0 ? move.bottom : move.bottom + 12),
                              ].filter((_, i) =>
                                  i === 0 ? Boolean(move.top) : Boolean(move.bottom),
                              )
                    let independently = {
                        top: expected.top,
                        bottom: expected.bottom,
                        middle: expected.middle as number,
                    }
                    for (const r of raw) independently = oracle(independently, r)
                    expected = moveSquare(expected, move)
                    validateSquare(expected)
                    expect([expected.top, expected.bottom, expected.middle]).toEqual([
                        independently.top,
                        independently.bottom,
                        independently.middle,
                    ])
                }
                expect(squareSolved(expected)).toBe(true)
                const replay = await squareReplay(initial, solution),
                    terminal = await replay.frame(replay.length - 1)
                expect(terminal?.state.puzzle).toEqual(expected)
                expect(terminal?.state.applied).toBe(moves.length)
                for (const i of [
                    0,
                    Math.floor(replay.length / 2),
                    replay.length - 1,
                    Math.min(1, replay.length - 1),
                    replay.length - 1,
                ])
                    expect((await replay.frame(i))?.index).toBe(i)
            }
        for (const p of [
            { ...solvedSquare(), middle: 1 as const },
            moveSquare(solvedSquare(), { kind: 'rotate', top: 2, bottom: 1 }),
        ]) {
            const solution = findSquareSolution(p)
            expect(squareSolved(parseSquare(solution.notation).reduce(moveSquare, p))).toBe(true)
            expect(solution).toEqual(findSquareSolution(p))
        }
    }, 180000)
    it('rejects blocked slices, false boundaries and incomplete middle-layer claims', async () => {
        const initial = initialSquareFrame({ seed: 42, scrambleLength: 5 }),
            solution = findSquareSolution(initial.state.puzzle)
        expect(() => squareReplay(initial, { ...solution, phase1Length: -1 })).toThrow('boundary')
        expect(() => squareReplay(initial, { notation: '(1,0) /', phase1Length: 0 })).toThrow()
        expect(() =>
            squareReplay(
                {
                    ...initial,
                    state: { ...initial.state, puzzle: { ...solvedSquare(), middle: 1 } },
                },
                { notation: '', phase1Length: 0 },
            ),
        ).toThrow('middle')
    })
})
