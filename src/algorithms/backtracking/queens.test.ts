import { describe, expect, it } from 'vitest'
import { runQueens } from './queens'
import { queenSteps } from './steps'
import type { ProducedStep } from '../../engine/steps'
import type { QueensState } from './queens'

describe('N-Queens showcase', () => {
    it('finds valid deterministic placements and records reversals', () => {
        for (const size of [1, 4, 5, 6, 7, 8]) {
            const run = runQueens({ size })
            expect(run.outcome).toBe('success')
            const queens = run.frames.at(-1)!.state.queens
            expect(queens).toHaveLength(size)
            for (let row = 0; row < size; row++)
                for (let later = row + 1; later < size; later++) {
                    expect(queens[row]).not.toBe(queens[later])
                    expect(Math.abs(queens[row] - queens[later])).not.toBe(later - row)
                }
        }
        const four = runQueens({ size: 4 })
        expect(four.frames.some((frame) => frame.event === 'reject' && frame.state.conflict)).toBe(
            true,
        )
        expect(four.frames.some((frame) => frame.event === 'backtrack')).toBe(true)
        expect(four).toEqual(runQueens({ size: 4 }))
    })

    it('reports genuinely unsolved boards without a replay limit', () => {
        for (const size of [2, 3]) {
            const run = runQueens({ size })
            expect(run.outcome).toBe('no-solution')
            expect(run.frames.at(-1)!.state.queens.every((column) => column === -1)).toBe(true)
        }
        const solved = runQueens({ size: 8 })
        expect(solved.outcome).toBe('success')
        expect(solved.frames.some((frame) => frame.event === 'limit')).toBe(false)
    })

    it('continues past 12,000 steps to the first valid solution', () => {
        const steps = queenSteps({ size: 14 })
        let count = 0
        let last: ProducedStep<QueensState> | null = null
        for (;;) {
            const next = steps.next()
            if (next.done) {
                expect(next.value).toBe('success')
                break
            }
            count++
            last = next.value
        }
        expect(count).toBeGreaterThan(12000)
        const final = last!.materialize()
        expect(final.event).toBe('success')
        expect(new Set(final.state.queens).size).toBe(14)
    }, 15000)
})
