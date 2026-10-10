// @vitest-environment node
import { expect, it } from 'vitest'
import { indexedCubeReplay, initialCubeFrame, verifiedReplay } from './replay'
import { applyMoves, inverse, notation, parseMoves, solvedCube } from './model'
import { findCubeSolution } from './solver'

it('reconstructs long complete cube paths exactly without counting phase frames as moves', async () => {
    const initial = initialCubeFrame({ seed: 42, scrambleLength: 1 })
    const inverseInput = parseMoves(initial.state.scramble).map(inverse)
    const solution = {
        notation: [...inverseInput, ...parseMoves(Array(200).fill('R2 R2').join(' '))]
            .map(notation)
            .join(' '),
        phase1Length: 0,
    }
    const direct = verifiedReplay(initial, solution)
    const replay = await indexedCubeReplay(initial, solution)
    expect(replay.length).toBe(direct.length)
    for (const i of [0, 1, 2, 32, 63, 97, 301, direct.length - 1, 100, 1])
        expect(await replay.frame(i)).toEqual(direct[i])
    expect(direct.at(-1)!.state.applied).toBe(401)
    expect(direct.filter((f) => f.event !== 'face-turn').every((f) => f.state.move === null)).toBe(
        true,
    )
})
it('rejects false larger-cube reduction claims and reconstructs each complete stage exactly', async () => {
    const initial = initialCubeFrame({ size: 4, seed: 123, scrambleLength: 100 })
    const solution = findCubeSolution(initial, () => {})
    const direct = verifiedReplay(initial, solution)
    const replay = await indexedCubeReplay(initial, solution)
    for (const index of [
        0,
        1,
        42,
        97,
        direct.length - 1,
        ...direct
            .filter((f) => f.event.endsWith('-complete') || f.event === 'phase-boundary')
            .map((f) => f.index),
    ])
        expect(await replay.frame(index)).toEqual(direct[index])
    for (const invalid of [
        { ...solution, reduction: undefined },
        { ...solution, reduction: { centers: 0, edges: 0, parity: 0 } },
        { ...solution, reduction: { centers: 2, edges: 1, parity: 0 } },
        { ...solution, notation: solution.notation.split(' ').slice(0, -1).join(' ') },
    ])
        await expect(
            Promise.resolve().then(() => indexedCubeReplay(initial, invalid)),
        ).rejects.toThrow()
}, 30000)
it('rejects a solved terminal state with false intermediate phase metadata', async () => {
    const initial = {
        ...initialCubeFrame({ seed: 42, scrambleLength: 0 }),
        state: {
            ...initialCubeFrame({ seed: 42, scrambleLength: 0 }).state,
            cube: applyMoves(solvedCube(), parseMoves('R')),
            phase: 'Input' as const,
        },
    }
    expect(() => indexedCubeReplay(initial, { notation: 'R′', phase1Length: 0 })).toThrow(
        'invariants',
    )
    expect(() => indexedCubeReplay(initial, { notation: 'R′', phase1Length: 1.5 })).toThrow(
        'boundary',
    )
    expect(() => indexedCubeReplay(initial, { notation: '', phase1Length: 0 })).toThrow(
        'invariants',
    )
})
