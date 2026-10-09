// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cubeTrace } from './trace'
import { initialCubeFrame } from './replay'
import { inverse, notation, parseMoves } from './model'
import { moduleTrace } from '../../../engine/moduleTrace'
import { rubiksModule } from './module'

class FakeWorker {
    static instances: FakeWorker[] = []
    onmessage: ((event: MessageEvent) => void) | null = null
    onerror: ((event: ErrorEvent) => void) | null = null
    terminate = vi.fn()
    postMessage = vi.fn()
    constructor() {
        FakeWorker.instances.push(this)
    }
    emit(data: object) {
        this.onmessage?.({
            data: { generationId: this.postMessage.mock.calls[0][0].generationId, ...data },
        } as MessageEvent)
    }
}
afterEach(() => {
    vi.unstubAllGlobals()
    FakeWorker.instances = []
})
function start() {
    vi.stubGlobal('Worker', FakeWorker)
    return cubeTrace({ seed: 42, scrambleLength: 1 })
}
describe('cube worker trace lifecycle', () => {
    it('retains the input if the worker cannot be started', async () => {
        vi.stubGlobal(
            'Worker',
            class {
                constructor() {
                    throw new Error('Worker unavailable')
                }
            },
        )
        const trace = cubeTrace({ seed: 42, scrambleLength: 20 })
        expect(trace.snapshot()).toMatchObject({
            status: 'error',
            error: 'Worker unavailable',
            available: 1,
        })
        expect((await trace.frame(0))!.state.phase).toBe('Input')
    })
    it('retains input frames when cancelling preparation/search and ignores obsolete results', async () => {
        for (const message of ['Preparing solver tables…', 'Searching for a two-phase solution…']) {
            const trace = start()
            const worker = FakeWorker.instances.at(-1)!
            const initial = await trace.frame(0)
            worker.emit({ type: 'stage', message })
            expect(trace.snapshot().message).toBe(message)
            trace.cancel()
            expect(worker.terminate).toHaveBeenCalledTimes(1)
            expect(trace.snapshot()).toMatchObject({
                status: 'cancelled',
                total: null,
                outcome: null,
            })
            worker.emit({ type: 'solution', solution: { notation: '', phase1Length: 0 } })
            expect(trace.snapshot().status).toBe('cancelled')
            expect(await trace.frame(0)).toBe(initial)
            trace.dispose()
            expect(worker.terminate).toHaveBeenCalledTimes(1)
        }
    })
    it('verifies results, keeps random frame access local, and releases the completed worker', async () => {
        const trace = start()
        const initial = initialCubeFrame({ seed: 42, scrambleLength: 1 })
        const move = parseMoves(initial.state.scramble)[0]
        const worker = FakeWorker.instances.at(-1)!
        worker.emit({
            type: 'solution',
            solution: {
                notation: notation(inverse(move)),
                phase1Length: move.face === 'U' || move.face === 'D' || move.turns === 2 ? 0 : 1,
            },
        })
        expect(trace.snapshot()).toMatchObject({ status: 'complete', outcome: 'success' })
        expect(worker.terminate).toHaveBeenCalledTimes(1)
        expect((await trace.frame(trace.snapshot().available - 1))!.state.phase).toBe('Solved')
        expect((await trace.frame(0))!.state).toEqual(initial.state)
        expect(await trace.frame(1)).not.toBeNull()
    })
    it('keeps errors visible without a fabricated solved frame', async () => {
        for (const mode of ['invalid', 'worker-error', 'message-error']) {
            const trace = start()
            const worker = FakeWorker.instances.at(-1)!
            if (mode === 'invalid')
                worker.emit({ type: 'solution', solution: { notation: 'R', phase1Length: -1 } })
            else if (mode === 'worker-error')
                worker.onerror?.({ message: 'Worker crashed' } as ErrorEvent)
            else worker.emit({ type: 'error', error: 'Search failed' })
            expect(trace.snapshot()).toMatchObject({
                status: 'error',
                outcome: 'error',
                available: 1,
            })
            expect(trace.snapshot().error).toBeTruthy()
            expect((await trace.frame(0))!.state.phase).toBe('Input')
            expect(worker.terminate).toHaveBeenCalledTimes(1)
        }
    })
    it('supports worker-only module dispatch and solved input without allocating a worker', async () => {
        vi.stubGlobal('Worker', FakeWorker)
        const solved = moduleTrace(rubiksModule, { seed: 42, scrambleLength: 0 })
        expect(solved.snapshot()).toMatchObject({
            status: 'complete',
            outcome: 'success',
            available: 1,
        })
        expect((await solved.frame(0))!.state.applied).toBe(0)
        expect(FakeWorker.instances).toHaveLength(0)
        const pending = moduleTrace(rubiksModule, rubiksModule.defaults)
        pending.dispose()
        FakeWorker.instances[0].emit({ type: 'stage', message: 'obsolete' })
        expect(pending.snapshot().message).not.toBe('obsolete')
    })
})
