import { eagerTrace, MutableTrace, type TraceSource } from './trace'
import type { Frame } from './types'

export interface IndexedReplay<S> {
    length: number
    frame(index: number): Promise<Frame<S> | null>
}
let generation = 0

// Search workers return compact solutions; puzzle adapters own all validation.
// No returned frames or success claims are trusted across the worker boundary.
export function solutionTrace<S, P, T>(options: {
    initial: Frame<S>
    params: P
    createWorker(): Worker
    verify(solution: T, cancelled: () => boolean): IndexedReplay<S> | Promise<IndexedReplay<S>>
    preparation: string
}): TraceSource<S> {
    const { initial } = options
    const generationId = ++generation
    let replay: IndexedReplay<S> = { length: 1, frame: async (i) => (i === 0 ? initial : null) }
    let worker: Worker
    try {
        worker = options.createWorker()
    } catch (error) {
        return eagerTrace({
            frames: [initial],
            outcome: 'error',
            error: error instanceof Error ? error.message : 'Unable to start puzzle solver worker.',
        })
    }
    let stopped = false,
        terminated = false,
        verifying = false
    const release = () => {
        if (!terminated) {
            terminated = true
            worker.terminate()
        }
    }
    const stop = () => {
        stopped = true
        release()
    }
    const trace = new MutableTrace<S>((index) => replay.frame(index), stop, stop)
    trace.update({
        available: 1,
        total: null,
        status: 'generating',
        outcome: null,
        message: options.preparation,
    })
    const fail = (error: unknown) => {
        if (stopped) return
        trace.update({
            available: 1,
            total: null,
            status: 'error',
            outcome: 'error',
            error: error instanceof Error ? error.message : String(error),
        })
        stop()
    }
    const complete = (verified: IndexedReplay<S>) => {
        if (stopped) return
        replay = verified
        trace.update({
            available: replay.length,
            total: replay.length,
            status: 'complete',
            outcome: 'success',
        })
        stop()
    }
    worker.onmessage = (event: MessageEvent<unknown>) => {
        if (stopped) return
        const data = event.data as {
            generationId?: number
            type?: string
            message?: unknown
            solution?: T
            error?: unknown
        } | null
        if (!data || typeof data !== 'object') {
            fail('Malformed puzzle worker message.')
            return
        }
        if (data.generationId !== generationId) return
        if (verifying) return
        if (data.type === 'stage' && typeof data.message === 'string')
            trace.update({ ...trace.snapshot(), message: data.message })
        else if (data.type === 'error')
            fail(typeof data.error === 'string' ? data.error : 'Puzzle solver failed.')
        else if (data.type === 'solution') {
            verifying = true
            release()
            trace.update({
                ...trace.snapshot(),
                message: 'Verifying solution moves and phase boundaries…',
            })
            try {
                if (!data.solution) throw new Error('Puzzle worker returned no solution.')
                const verified = options.verify(data.solution, () => stopped)
                if (verified instanceof Promise) void verified.then(complete, fail)
                else complete(verified)
            } catch (error) {
                fail(error)
            }
        } else fail('Malformed puzzle worker message.')
    }
    worker.onerror = (event) => fail(event.message || 'Puzzle solver worker failed.')
    worker.onmessageerror = () => fail('Unable to decode puzzle solver output.')
    try {
        worker.postMessage({ generationId, params: options.params })
    } catch (error) {
        fail(error)
    }
    return trace
}
