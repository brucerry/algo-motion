import { describe, expect, it } from 'vitest'
import { runIntervals } from './intervals'
import type { Interval } from '../common/seededInputs'

const optimum = (items: Interval[]) => {
    let best = 0
    for (let mask = 0; mask < 1 << items.length; mask++) {
        const chosen = items
            .filter((_, index) => mask & (1 << index))
            .sort((a, b) => a.start - b.start)
        if (chosen.every((item, index) => !index || chosen[index - 1].end <= item.start))
            best = Math.max(best, chosen.length)
    }
    return best
}

describe('greedy interval scheduling', () => {
    it('uses earliest finish and permits touching endpoints', () => {
        const items = [
            { id: 0, start: 0, end: 4 },
            { id: 1, start: 0, end: 2 },
            { id: 2, start: 2, end: 3 },
            { id: 3, start: 3, end: 5 },
        ]
        const run = runIntervals({ count: 4, seed: 1 }, items)
        expect(run.frames.at(-1)!.state.accepted).toEqual([1, 2, 3])
        expect(run.frames.at(-1)!.state.order).toEqual([1, 2, 0, 3])
    })

    it('matches brute-force cardinality on small seeded instances and replays', () => {
        for (let seed = 0; seed < 20; seed++) {
            const run = runIntervals({ count: 8, seed })
            const final = run.frames.at(-1)!.state
            expect(final.accepted).toHaveLength(optimum(final.intervals))
            expect(run).toEqual(runIntervals({ count: 8, seed }))
        }
    })
})
