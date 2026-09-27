import { describe, expect, it, vi } from 'vitest'
import { ComparisonTraceSet } from './comparisonTrace'
import { MutableTrace, eagerTrace } from './trace'
import type { Frame } from './types'

const frame = (index: number): Frame<number> => ({
    index,
    state: index,
    activeLines: [],
    event: 'step',
    explanation: `Step ${index}`,
    metrics: [],
})

describe('comparison trace collection', () => {
    it('holds an early finisher while another run is pending', async () => {
        const early = eagerTrace({ frames: [frame(0), frame(1)], outcome: 'success' })
        const long = new MutableTrace(async (index) => frame(index), vi.fn())
        const change = vi.fn()
        const collection = new ComparisonTraceSet({ early, long }, change)
        long.update({ available: 4, total: null, status: 'generating', outcome: null })
        expect(collection.available()).toBe(4)
        expect(collection.totalKnown()).toBe(false)
        expect(collection.allSettled()).toBe(false)
        expect((await collection.frame('early', 3))?.index).toBe(1)
        long.update({ available: 5, total: 5, status: 'complete', outcome: 'no-path' })
        expect(collection.totalKnown()).toBe(true)
        expect(collection.allSettled()).toBe(true)
        expect(change).toHaveBeenCalledTimes(2)
        collection.dispose()
    })

    it('keeps cancellation incomplete and rejects late frames after replacement', async () => {
        let release!: (value: Frame<number>) => void
        const lookup = () =>
            new Promise<Frame<number>>((resolve) => {
                release = resolve
            })
        const stop = vi.fn()
        const old = new MutableTrace(lookup, stop)
        old.update({ available: 100001, total: null, status: 'generating', outcome: null })
        const change = vi.fn()
        const collection = new ComparisonTraceSet({ old }, change)
        const pending = collection.frame('old', 100000)
        collection.cancel('old')
        expect(old.snapshot()).toMatchObject({ status: 'cancelled', outcome: null })
        collection.dispose()
        release(frame(100000))
        expect(await pending).toBeNull()
        expect(stop).toHaveBeenCalledTimes(2)
        expect(change).toHaveBeenCalledTimes(1)
        expect(collection.allSettled()).toBe(true)
    })
})
