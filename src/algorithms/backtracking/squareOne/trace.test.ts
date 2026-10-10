// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { squareTrace } from './trace'
import { squareTransition } from './transition'
import { initialSquareFrame, squareReplay, inspectSquare } from './replay'
import { findSquareSolution } from './solver'
class FakeWorker {
    static latest: FakeWorker
    onmessage: ((event: MessageEvent) => void) | null = null
    onerror: ((event: ErrorEvent) => void) | null = null
    postMessage = vi.fn()
    terminate = vi.fn()
    constructor() {
        FakeWorker.latest = this
    }
    emit(data: object) {
        this.onmessage?.({
            data: { generationId: this.postMessage.mock.calls[0][0].generationId, ...data },
        } as MessageEvent)
    }
}
afterEach(() => vi.unstubAllGlobals())
it('keeps all pieces inspectable and cancels preparation/search without stale success', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const trace = squareTrace({ seed: 42, scrambleLength: 20 }),
        worker = FakeWorker.latest
    const initial = await trace.frame(0)
    for (let id = 0; id < 18; id++) expect(inspectSquare(initial!.state, String(id))).not.toBeNull()
    worker.emit({ type: 'stage', message: 'Searching shape and parity…' })
    trace.cancel()
    trace.dispose()
    worker.emit({ type: 'solution', solution: { notation: '', phase1Length: 0 } })
    expect(trace.snapshot()).toMatchObject({ status: 'cancelled', outcome: null, available: 1 })
    expect(worker.terminate).toHaveBeenCalledTimes(1)
    const replacement = squareTrace({ seed: 123, scrambleLength: 5 })
    worker.emit({ type: 'solution', solution: { notation: '/', phase1Length: 0 } })
    expect(replacement.snapshot().status).toBe('generating')
    replacement.dispose()
    expect(squareTrace({ seed: 42, scrambleLength: 0 }).snapshot()).toMatchObject({
        status: 'complete',
        outcome: 'success',
        available: 1,
    })
})
it('reports preparation and invalid-output errors without losing the input', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const trace = squareTrace({ seed: 42, scrambleLength: 5 })
    FakeWorker.latest.emit({ type: 'solution', solution: { notation: 'X', phase1Length: 0 } })
    expect(trace.snapshot()).toMatchObject({ status: 'error', outcome: 'error', available: 1 })
    expect((await trace.frame(0))!.state.phase).toBe('Input')
    vi.stubGlobal(
        'Worker',
        class {
            constructor() {
                throw new Error('Preparation unavailable')
            }
        },
    )
    expect(squareTrace({ seed: 42, scrambleLength: 20 }).snapshot().error).toBe(
        'Preparation unavailable',
    )
})
it('animates adjacent rotations and unsplit slices in either direction, snapping seeks and replacements', async () => {
    const initial = initialSquareFrame({ seed: 42, scrambleLength: 5 }),
        replay = await squareReplay(initial, findSquareSolution(initial.state.puzzle))
    let slices = 0,
        pairs = 0
    for (let i = 1; i < replay.length; i++) {
        const a = (await replay.frame(i - 1))!,
            b = (await replay.frame(i))!,
            forward = squareTransition(a.state, b.state, i - 1, i, false),
            backward = squareTransition(b.state, a.state, i, i - 1, false)
        if (b.state.move) {
            expect(forward).toEqual({ move: b.state.move, direction: 1 })
            expect(backward).toEqual({ move: b.state.move, direction: -1 })
            if (b.state.move.kind === 'slice') slices++
            else pairs++
        } else expect(forward).toBeNull()
        expect(squareTransition(a.state, b.state, i - 1, i, true)).toBeNull()
        expect(squareTransition(a.state, b.state, i - 3, i, false)).toBeNull()
        expect(
            squareTransition(a.state, { ...b.state, experiment: 'replacement' }, i - 1, i, false),
        ).toBeNull()
    }
    expect(slices).toBeGreaterThan(0)
    expect(pairs).toBeGreaterThan(0)
})
