import { describe, expect, it } from 'vitest'
import { runBubble } from './bubble'

const params = { count: 5, seed: 7 }

describe('Bubble Sort showcase', () => {
    it('sorts stably with only adjacent out-of-order swaps', () => {
        const run = runBubble(params, [3, 1, 3, 2, 1])
        expect(run.outcome).toBe('success')
        const final = run.frames.at(-1)!.state.items
        expect(final.map((item) => item.value)).toEqual([1, 1, 2, 3, 3])
        expect(final.filter((item) => item.value === 3).map((item) => item.id)).toEqual([0, 2])
        for (let index = 1; index < run.frames.length; index++) {
            if (run.frames[index].event !== 'swap') continue
            const before = run.frames[index - 1].state.items
            const after = run.frames[index].state.items
            const changed = after
                .map((item, position) => (item.id !== before[position].id ? position : -1))
                .filter((value) => value >= 0)
            expect(changed).toHaveLength(2)
            expect(changed[1]).toBe(changed[0] + 1)
            expect(before[changed[0]].value).toBeGreaterThan(before[changed[1]].value)
        }
    })

    it('stops early on sorted input and replays seeded input', () => {
        const sorted = runBubble(params, [1, 2, 3, 4, 5])
        expect(sorted.frames.some((frame) => frame.event === 'early-stop')).toBe(true)
        expect(sorted.frames.at(-1)!.state.swaps).toBe(0)
        expect(runBubble(params)).toEqual(runBubble(params))
    })
})
