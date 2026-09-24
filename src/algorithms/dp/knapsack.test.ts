import { describe, expect, it } from 'vitest'
import { runKnapsack, type KnapsackItem } from './knapsack'

const oracle = (items: KnapsackItem[], capacity: number) => {
    let best = 0
    for (let mask = 0; mask < 1 << items.length; mask++) {
        const chosen = items.filter((_, index) => mask & (1 << index))
        const weight = chosen.reduce((sum, item) => sum + item.weight, 0)
        if (weight <= capacity)
            best = Math.max(
                best,
                chosen.reduce((sum, item) => sum + item.value, 0),
            )
    }
    return best
}

describe('0/1 Knapsack showcase', () => {
    it('fills the recurrence and reconstructs an optimum on small cases', () => {
        const items = [
            { id: 0, weight: 2, value: 3 },
            { id: 1, weight: 3, value: 4 },
            { id: 2, weight: 4, value: 7 },
        ]
        for (let capacity = 0; capacity <= 9; capacity++) {
            const run = runKnapsack({ count: items.length, capacity, seed: 1 }, items)
            const final = run.frames.at(-1)!.state
            expect(final.table[items.length][capacity]).toBe(oracle(items, capacity))
            const chosen = items.filter((item) => final.selected.includes(item.id))
            expect(chosen.reduce((sum, item) => sum + item.weight, 0)).toBeLessThanOrEqual(capacity)
            expect(chosen.reduce((sum, item) => sum + item.value, 0)).toBe(oracle(items, capacity))
        }
    })

    it('keeps a fixed tie rule and seeded replay', () => {
        const tied = [
            { id: 0, weight: 1, value: 2 },
            { id: 1, weight: 1, value: 2 },
        ]
        expect(
            runKnapsack({ count: 2, capacity: 1, seed: 1 }, tied).frames.at(-1)!.state.selected,
        ).toEqual([0])
        const params = { count: 6, capacity: 12, seed: 29 }
        expect(runKnapsack(params)).toEqual(runKnapsack(params))
    })
})
