import { describe, expect, it } from 'vitest'
import { runBubble } from './sorting/bubble'
import { runBst } from './tree/bst'
import { runKnapsack } from './dp/knapsack'
import { runIntervals } from './greedy/intervals'
import { runBinary } from './array/binary'
import { runTwoSum } from './array/twoSum'

const largestRuns = [
    ['Bubble Sort', () => runBubble({ count: 140, seed: 42 })],
    ['BST search', () => runBst({ count: 120, seed: 42, target: 1000 })],
    ['Knapsack', () => runKnapsack({ count: 80, capacity: 180, seed: 42 })],
    ['Interval scheduling', () => runIntervals({ count: 120, seed: 42 })],
    ['Binary search', () => runBinary({ count: 160, target: 21, seed: 42 })],
    ['Sorted two-sum', () => runTwoSum({ count: 160, target: 41, seed: 42 })],
] as const

describe('largest showcase inputs', () => {
    for (const [name, run] of largestRuns) {
        it(`${name} terminates with an inspectable final frame`, () => {
            const started = performance.now()
            const result = run()
            expect(result.frames.length).toBeGreaterThan(0)
            expect(result.outcome).not.toBe('error')
            expect(result.frames.at(-1)!.index).toBe(result.frames.length - 1)
            expect(JSON.stringify(result.frames.at(-1)).length).toBeLessThan(1_000_000)
            expect(performance.now() - started).toBeLessThan(5000)
        }, 15000)
    }

    it('shares unchanged array and table snapshots across semantic frames', () => {
        const bubble = runBubble({ count: 140, seed: 42 })
        expect(bubble.frames[0].state.items).toBe(bubble.frames[1].state.items)
        const firstSwap = bubble.frames.findIndex((frame) => frame.event === 'swap')
        expect(firstSwap).toBeGreaterThan(1)
        expect(bubble.frames[firstSwap].state.items).not.toBe(
            bubble.frames[firstSwap - 1].state.items,
        )

        const knapsack = runKnapsack({ count: 80, capacity: 180, seed: 42 })
        expect(knapsack.frames[0].state.table).not.toBe(knapsack.frames[1].state.table)
        expect(knapsack.frames[0].state.table[0]).toBe(knapsack.frames[1].state.table[0])
        expect(knapsack.frames[0].state.table[1]).not.toBe(knapsack.frames[1].state.table[1])
    })
})
