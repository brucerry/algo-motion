import { describe, expect, it } from 'vitest'
import { runBinary } from './binary'
import { runTwoSum } from './twoSum'

describe('array search showcases', () => {
    it('returns the first duplicate and discards only impossible binary ranges', () => {
        const values = [1, 2, 2, 2, 5, 8]
        const run = runBinary({ count: values.length, target: 2, seed: 1 }, values)
        expect(run.outcome).toBe('success')
        expect(run.frames.at(-1)!.state.found).toBe(1)
        for (const frame of run.frames) {
            if (frame.event !== 'discard-left' && frame.event !== 'discard-right') continue
            expect(frame.state.low).toBeLessThanOrEqual(1)
        }
        const absent = runBinary({ count: values.length, target: 4, seed: 1 }, values)
        expect(absent.outcome).toBe('no-solution')
        expect(absent.frames.at(-1)!.state.low).toBeGreaterThan(absent.frames.at(-1)!.state.high)
        expect(runBinary({ count: 0, target: 1, seed: 1 }, []).outcome).toBe('no-solution')
    })

    it('moves two distinct pointers and reports a true pair or no pair', () => {
        const values = [1, 2, 2, 4, 8]
        const found = runTwoSum({ count: values.length, target: 4, seed: 1 }, values)
        expect(found.outcome).toBe('success')
        const pair = found.frames.at(-1)!.state.pair!
        expect(pair[0]).toBeLessThan(pair[1])
        expect(values[pair[0]] + values[pair[1]]).toBe(4)
        const missing = runTwoSum({ count: values.length, target: 99, seed: 1 }, values)
        expect(missing.outcome).toBe('no-solution')
        expect(missing.frames.at(-1)!.state.left).toBeGreaterThanOrEqual(
            missing.frames.at(-1)!.state.right,
        )
        expect(runTwoSum({ count: 1, target: 2, seed: 1 }, [1]).outcome).toBe('no-solution')
    })

    it('replays seeded array experiments', () => {
        const params = { count: 12, target: 14, seed: 77 }
        expect(runBinary(params)).toEqual(runBinary(params))
        expect(runTwoSum(params)).toEqual(runTwoSum(params))
    })
})
