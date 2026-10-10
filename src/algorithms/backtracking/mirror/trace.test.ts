// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { mirrorTrace } from './trace'
class FakeWorker {
    static latest: FakeWorker
    onmessage: ((event: MessageEvent) => void) | null = null
    onerror: ((event: ErrorEvent) => void) | null = null
    onmessageerror: ((event: MessageEvent) => void) | null = null
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
it('keeps pending pieces inspectable, cancels immediately, and ignores replacement results', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const pending = mirrorTrace({ seed: 42, scrambleLength: 20 }),
        worker = FakeWorker.latest
    expect((await pending.frame(0))!.state.cube).toHaveLength(26)
    worker.emit({ type: 'stage', message: 'Preparing tables…' })
    pending.cancel()
    pending.dispose()
    worker.emit({ type: 'solution', solution: { notation: '', phase1Length: 0 } })
    expect(pending.snapshot()).toMatchObject({ status: 'cancelled', outcome: null, available: 1 })
    expect(worker.terminate).toHaveBeenCalledTimes(1)
    const solved = mirrorTrace({ seed: 42, scrambleLength: 0 })
    expect(solved.snapshot()).toMatchObject({
        status: 'complete',
        outcome: 'success',
        available: 1,
    })
})
it('reports preparation and verification failures with the input retained', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const pending = mirrorTrace({ seed: 42, scrambleLength: 20 }),
        worker = FakeWorker.latest
    worker.emit({ type: 'solution', solution: { notation: 'X', phase1Length: 0 } })
    await Promise.resolve()
    await Promise.resolve()
    expect(pending.snapshot()).toMatchObject({ status: 'error', outcome: 'error', available: 1 })
    expect((await pending.frame(0))!.state.phase).toBe('Input')
    vi.stubGlobal(
        'Worker',
        class {
            constructor() {
                throw new Error('Preparation unavailable')
            }
        },
    )
    expect(mirrorTrace({ seed: 42, scrambleLength: 20 }).snapshot().error).toBe(
        'Preparation unavailable',
    )
})
