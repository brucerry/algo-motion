// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { solveCube } from './solver'
import { initialCubeFrame, verifiedReplay } from './replay'
import { applyMoves, facelets, isSolved, parseMoves, solvedCube } from './model'

describe('verified two-phase solver', () => {
    it('solves real short, standard, long, and maximum scrambles deterministically', () => {
        for (const scrambleLength of [5, 20, 60, 100]) {
            const initial = initialCubeFrame({ seed: 42, scrambleLength })
            const messages: string[] = []
            const frames = solveCube(initial, (message) => messages.push(message))
            expect(messages).toEqual([
                'Preparing solver tables…',
                'Searching for a two-phase solution…',
            ])
            expect(isSolved(frames.at(-1)!.state.cube)).toBe(true)
            expect(frames.at(-1)!.state.applied).toBe(frames.at(-1)!.state.solutionLength)
            expect(facelets(frames[0].state.cube)).toBe(facelets(initial.state.cube))
            expect(frames).toEqual(solveCube(initial, () => {}))
        }
    }, 30000)
    it('handles zero-depth phases and already solved inputs without invented moves', () => {
        const initial = initialCubeFrame({ seed: 42, scrambleLength: 0 })
        expect(
            solveCube(initial, () => {
                throw new Error('No initialization needed')
            }),
        ).toEqual([initial])
        const phase2 = {
            ...initial,
            state: {
                ...initial.state,
                cube: applyMoves(solvedCube(), parseMoves('U R2 D F2')),
                phase: 'Input' as const,
            },
        }
        const frames = solveCube(phase2, () => {})
        expect(frames[1].state.phase).toBe('Phase 2')
        expect(isSolved(frames.at(-1)!.state.cube)).toBe(true)
    }, 30000)
    it('rejects incorrect results and phase metadata before replay publication', () => {
        const initial = initialCubeFrame({ seed: 42, scrambleLength: 5 })
        for (const solution of [
            { notation: 'X', phase1Length: 0 },
            { notation: '', phase1Length: -1 },
            { notation: 'R', phase1Length: 0 },
            { notation: '', phase1Length: 0 },
        ])
            expect(() => verifiedReplay(initial, solution)).toThrow()
    })
    it('validates complete larger-cube moves and every reduction boundary before publication', () => {
        for (const size of [4, 5] as const) {
            const initial = initialCubeFrame({ size, seed: 42, scrambleLength: 20 })
            const frames = solveCube(initial, () => {})
            expect(isSolved(frames.at(-1)!.state.cube)).toBe(true)
            expect(frames.map((f) => f.event)).toEqual(
                expect.arrayContaining([
                    'centers-complete',
                    'edges-complete',
                    'parity-complete',
                    'phase-boundary',
                    'solved',
                ]),
            )
            expect(frames.at(-1)!.state.applied).toBe(
                frames.filter((f) => f.event === 'face-turn').length,
            )
        }
    }, 30000)
})
