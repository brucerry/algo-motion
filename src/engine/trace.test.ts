import { describe, expect, it, vi } from 'vitest'
import { eagerTrace, MutableTrace } from './trace'
import type { Frame } from './types'

const frame: Frame<{ value: number }> = {
    index: 0,
    state: { value: 1 },
    activeLines: [],
    event: 'start',
    explanation: 'Start',
    metrics: [],
}

describe('trace sources', () => {
    it('adapts eager runs without changing their frames or outcome', async () => {
        const source = eagerTrace({ frames: [frame], outcome: 'limit' })
        expect(source.snapshot()).toMatchObject({
            available: 1,
            total: 1,
            status: 'complete',
            outcome: 'limit',
        })
        expect(await source.frame(0)).toBe(frame)
        expect(await source.frame(1)).toBeNull()
    })

    it('distinguishes generation, completion, cancellation, and errors', () => {
        const stopped = vi.fn()
        const source = new MutableTrace(async () => frame, stopped)
        const listener = vi.fn()
        source.subscribe(listener)
        expect(source.snapshot().status).toBe('generating')
        source.update({ available: 5, total: null, status: 'generating', outcome: null })
        expect(source.snapshot().available).toBe(5)
        source.cancel()
        expect(source.snapshot()).toMatchObject({ status: 'cancelled', outcome: null })
        expect(stopped).toHaveBeenCalledOnce()
        source.update({ available: 6, total: 6, status: 'complete', outcome: 'success' })
        expect(source.snapshot().available).toBe(5)
        expect(listener).toHaveBeenCalledTimes(2)

        const completed = new MutableTrace(async () => frame, vi.fn())
        completed.update({ available: 1, total: 1, status: 'complete', outcome: 'success' })
        expect(completed.snapshot().status).toBe('complete')
        const failed = new MutableTrace(async () => null, vi.fn())
        failed.update({
            available: 0,
            total: 0,
            status: 'error',
            outcome: 'error',
            error: 'failed',
        })
        expect(failed.snapshot().error).toBe('failed')
    })
})
