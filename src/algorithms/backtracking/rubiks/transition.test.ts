// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { initialCubeFrame, verifiedReplay } from './replay'
import { inverse, notation, parseMoves, turn } from './model'
import { transitionDuration, turnAxisAngle, turnTransition } from './transition'

describe('cube frame transitions', () => {
    it('uses signed axes for quarter, inverse, and half turns', () => {
        expect(turnAxisAngle(parseMoves('R')[0])).toEqual({ axis: [1, 0, 0], angle: -Math.PI / 2 })
        expect(turnAxisAngle(parseMoves('L′')[0])).toEqual({ axis: [-1, 0, 0], angle: Math.PI / 2 })
        expect(turnAxisAngle(parseMoves('F2')[0]).angle).toBe(-Math.PI)
        for (const speed of [0.25, 1, 8, 16, 32])
            expect(transitionDuration(speed)).toBeLessThan(0.26 / speed)
    })
    it('reverses exact adjacent moves and snaps across annotations, jumps, new inputs, or reduced motion', () => {
        const initial = initialCubeFrame({ seed: 42, scrambleLength: 1 })
        const inputMove = parseMoves(initial.state.scramble)[0]
        const move = inverse(inputMove)
        const boundary = move.face === 'U' || move.face === 'D' || move.turns === 2 ? 0 : 1
        const frames = verifiedReplay(initial, { notation: notation(move), phase1Length: boundary })
        const index = frames.findIndex((frame) => frame.event === 'face-turn')
        const before = frames[index - 1].state,
            after = frames[index].state
        expect(turnTransition(before, after, index - 1, index, false)).toEqual(move)
        const back = turnTransition(after, before, index, index - 1, false)!
        expect(turn(after.cube, back)).toEqual(before.cube)
        expect(turnTransition(before, after, 0, 5, false)).toBeNull()
        expect(turnTransition(before, after, index - 1, index, true)).toBeNull()
        expect(
            turnTransition(before, { ...after, experiment: 'new' }, index - 1, index, false),
        ).toBeNull()
        expect(turnTransition(initial.state, frames[1].state, 0, 1, false)).toBeNull()
    })
})
