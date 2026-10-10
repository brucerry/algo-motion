// @vitest-environment node
import { expect, it } from 'vitest'
import {
    applyMoves,
    facelets,
    inverse,
    isSolved,
    parseMoves,
    solvedCube,
    turn,
    type Basis,
} from '../rubiks/model'
import { findCubeSolution } from '../rubiks/solver'
import { homeGeometry, isMirrorSolved, physicalBox } from './model'
import { initialMirrorFrame, inspectMirror, mirrorReplay } from './replay'

it('tiles the fixed exterior with unequal boxes and six square center faces', () => {
    const cube = solvedCube(),
        boxes = cube.map(physicalBox)
    expect(boxes).toHaveLength(26)
    expect(isMirrorSolved(cube)).toBe(true)
    expect(homeGeometry([-2, 0, 2])).toEqual({
        dimensions: [0.55, 0.95, 1.5],
        center: [-0.75, 0, 1.225],
    })
    expect(
        boxes.reduce((sum, box) => sum + box.dimensions.reduce((volume, d) => volume * d, 1), 0),
    ).toBeCloseTo(27 - 0.95 ** 3, 10)
    for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++)
            expect(
                [0, 1, 2].some(
                    (axis) =>
                        Math.min(boxes[i].maximum[axis], boxes[j].maximum[axis]) -
                            Math.max(boxes[i].minimum[axis], boxes[j].minimum[axis]) <
                        1e-10,
                ),
            ).toBe(true)
    for (const p of cube.filter((p) => p.stickers.length === 1)) {
        const dimensions = homeGeometry(p.home).dimensions.filter((_, i) => p.home[i] === 0)
        expect(dimensions).toEqual([0.95, 0.95])
    }
})
it('uses full orientation to move the offset physical center and preserves intrinsic dimensions', () => {
    const cube = solvedCube(),
        move = parseMoves('R')[0],
        changed = turn(cube, move)
    const piece = changed.find((p) => p.id === '2,0,-2')!
    expect(physicalBox(piece).center).toEqual([1.225, -0.75, 0])
    expect(physicalBox(piece).dimensions).toEqual([1.5, 0.55, 0.95])
    expect(homeGeometry(piece.home).dimensions).toEqual([1.5, 0.95, 0.55])
    expect(isMirrorSolved(changed)).toBe(false)
    expect(turn(changed, inverse(move))).toEqual(cube)
})
it('rejects visible orientation errors even when the hidden abstract colors claim solved', async () => {
    const initial = initialMirrorFrame({ seed: 42, scrambleLength: 0 })
    const corrupt = initial.state.cube.map((p) =>
        p.id === '2,0,-2'
            ? {
                  ...p,
                  basis: [
                      [1, 0, 0],
                      [0, 0, -1],
                      [0, 1, 0],
                  ] as Basis,
              }
            : p,
    )
    expect(isSolved(corrupt)).toBe(true)
    expect(isMirrorSolved(corrupt)).toBe(false)
    await expect(
        mirrorReplay(
            { ...initial, state: { ...initial.state, cube: corrupt } },
            { notation: '', phase1Length: 0 },
        ),
    ).rejects.toThrow()
})
it('allows genuine geometric symmetries without inventing extra center orientation goals', async () => {
    const initial = initialMirrorFrame({ seed: 42, scrambleLength: 0 })
    const centerTurns = applyMoves(solvedCube(), parseMoves(Array(6).fill('R U R′ U′').join(' ')))
    expect(isMirrorSolved(centerTurns)).toBe(true)
    const queue = [{ cube: solvedCube(), moves: '' }],
        seen = new Set<string>()
    let symmetric = solvedCube()
    for (let i = 0; i < queue.length; i++) {
        const state = queue[i],
            key = facelets(state.cube)
        if (seen.has(key)) continue
        seen.add(key)
        if (!isSolved(state.cube) && isMirrorSolved(state.cube)) {
            symmetric = state.cube
            break
        }
        for (const move of parseMoves('3Rw 3Uw 3Fw'))
            queue.push({ cube: turn(state.cube, move), moves: state.moves })
    }
    expect(isSolved(symmetric)).toBe(false)
    const replay = await mirrorReplay(
        { ...initial, state: { ...initial.state, cube: symmetric } },
        { notation: '', phase1Length: 0 },
    )
    expect(replay.length).toBe(1)
    expect((await replay.frame(0))!.state.phase).toBe('Solved')
})
it('solves state-only short, standard, long, and maximum scrambles and verifies the silhouette', async () => {
    for (const scrambleLength of [0, 5, 20, 60, 100])
        for (const seed of [0, 42, 123]) {
            const initial = initialMirrorFrame({ seed, scrambleLength })
            expect(initial).toEqual(initialMirrorFrame({ seed, scrambleLength }))
            const solution =
                initial.state.phase === 'Solved'
                    ? { notation: '', phase1Length: 0 }
                    : findCubeSolution(initial, () => {})
            const replay = await mirrorReplay(initial, solution)
            expect(isMirrorSolved((await replay.frame(replay.length - 1))!.state.cube)).toBe(true)
            expect((await replay.frame(0))!.state.cube).toEqual(initial.state.cube)
            for (const p of initial.state.cube)
                expect(inspectMirror(initial.state, p.id)).not.toBeNull()
        }
}, 30000)
