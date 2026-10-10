// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { solutionTrace, type IndexedReplay } from './solutionTrace'
import type { Frame } from './types'
const initial: Frame<number> = {
    index: 0,
    state: 42,
    explanation: '',
    event: '',
    activeLines: [],
    metrics: [],
}
function start(
    verify: (
        solution: unknown,
        cancelled: () => boolean,
    ) => IndexedReplay<number> | Promise<IndexedReplay<number>>,
) {
    const worker = {
        terminate: vi.fn(),
        postMessage: vi.fn(),
        onmessage: null,
        onerror: null,
        onmessageerror: null,
    } as unknown as Worker
    const trace = solutionTrace({
        initial,
        params: { seed: 42 },
        preparation: 'Preparing tables…',
        createWorker: () => worker,
        verify,
    })
    const send = (data: object) =>
        worker.onmessage!({
            data: {
                generationId: vi.mocked(worker.postMessage).mock.calls[0][0].generationId,
                ...data,
            },
        } as MessageEvent)
    return { worker, trace, send }
}
it('ignores stale generations and cancellation while asynchronous verification is pending', async () => {
    let release!: (replay: IndexedReplay<number>) => void
    let isCancelled!: () => boolean
    const { trace, worker, send } = start((_, cancelled) => {
        isCancelled = cancelled
        return new Promise((resolve) => {
            release = resolve
        })
    })
    send({ generationId: -1, type: 'stage', message: 'stale' })
    expect(trace.snapshot().message).toBe('Preparing tables…')
    send({ type: 'solution', solution: {} })
    expect(worker.terminate).toHaveBeenCalledTimes(1)
    expect(trace.snapshot().status).toBe('generating')
    trace.cancel()
    expect(isCancelled()).toBe(true)
    release({ length: 99, frame: async () => initial })
    await Promise.resolve()
    expect(trace.snapshot()).toMatchObject({
        status: 'cancelled',
        available: 1,
        total: null,
        outcome: null,
    })
    expect(await trace.frame(0)).toBe(initial)
    trace.dispose()
    expect(worker.terminate).toHaveBeenCalledTimes(1)
})
it('keeps missing, malformed, undecodable, and asynchronously rejected output visible as errors', async () => {
    for (const mode of ['missing', 'stage', 'type', 'decode', 'reject']) {
        const { trace, worker, send } = start(async () => {
            throw new Error('Full-state verification failed')
        })
        if (mode === 'decode') worker.onmessageerror!({} as MessageEvent)
        else if (mode === 'missing') send({ type: 'solution' })
        else if (mode === 'stage') send({ type: 'stage', message: 12 })
        else if (mode === 'type') send({ type: 'unexpected' })
        else send({ type: 'solution', solution: {} })
        await Promise.resolve()
        expect(trace.snapshot()).toMatchObject({ status: 'error', outcome: 'error', available: 1 })
        expect(trace.snapshot().error).toBeTruthy()
        expect(await trace.frame(0)).toBe(initial)
        expect(worker.terminate).toHaveBeenCalledTimes(1)
    }
})
it('retains the input when dispatch itself fails', () => {
    const worker = {
        terminate: vi.fn(),
        postMessage: () => {
            throw new Error('Dispatch failed')
        },
    } as unknown as Worker
    const trace = solutionTrace({
        initial,
        params: {},
        preparation: '',
        createWorker: () => worker,
        verify: () => {
            throw new Error('unexpected')
        },
    })
    expect(trace.snapshot()).toMatchObject({
        status: 'error',
        available: 1,
        error: 'Dispatch failed',
    })
    expect(worker.terminate).toHaveBeenCalledTimes(1)
})
