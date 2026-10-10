import { describe, expect, it, vi } from 'vitest'
import { ComparisonRuns, ComparisonTraceSet } from './comparisonTrace'
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
    it('replaces only changed inputs and retains unrelated computation, cancellation and outcomes', async () => {
        const runs = new ComparisonRuns(),
            stopA = vi.fn(),
            stopB = vi.fn(),
            createA = vi.fn(() => new MutableTrace(async (index) => frame(index), stopA)),
            createB = vi.fn(() => new MutableTrace(async (index) => frame(index), stopB))
        const entries = [
            { id: 'cube', key: '4:42', create: createA },
            { id: 'square', key: '20:42', create: createB },
        ]
        const first = runs.configure(entries),
            oldTimeline = new ComparisonTraceSet(first, vi.fn())
        first.square.cancel()
        oldTimeline.detach()
        const second = runs.configure([{ ...entries[0], key: '5:42' }, entries[1]])
        expect(second.square).toBe(first.square)
        expect(second.cube).not.toBe(first.cube)
        expect(second.square.snapshot().status).toBe('cancelled')
        expect(createA).toHaveBeenCalledTimes(2)
        expect(createB).toHaveBeenCalledTimes(1)
        expect(stopA).toHaveBeenCalledTimes(1)
        expect(stopB).toHaveBeenCalledTimes(1)
        expect(await oldTimeline.frame('cube', 0)).toBeNull()
        runs.dispose()
        expect(stopA).toHaveBeenCalledTimes(2)
        expect(stopB).toHaveBeenCalledTimes(2)
    })
    it('releases removed runs and partial construction on an initialization failure', () => {
        const runs = new ComparisonRuns(),
            stop = vi.fn(),
            source = new MutableTrace(async (index) => frame(index), stop)
        runs.configure([{ id: 'old', key: '1', create: () => source }])
        runs.configure([])
        expect(stop).toHaveBeenCalledTimes(1)
        const partialStop = vi.fn()
        expect(() =>
            runs.configure([
                {
                    id: 'partial',
                    key: '1',
                    create: () => new MutableTrace(async (index) => frame(index), partialStop),
                },
                {
                    id: 'bad',
                    key: '1',
                    create: () => {
                        throw new Error('startup failed')
                    },
                },
            ]),
        ).toThrow('startup failed')
        runs.dispose()
        expect(partialStop).toHaveBeenCalledTimes(1)
    })
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
