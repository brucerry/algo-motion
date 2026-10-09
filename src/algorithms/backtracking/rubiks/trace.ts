import { eagerTrace, MutableTrace, type TraceSource } from '../../../engine/trace'
import type { Frame } from '../../../engine/types'
import { isSolved, type CubeParams } from './model'
import { initialCubeFrame, verifiedReplay, type CubeState, type Solution } from './replay'

let generation = 0
export function cubeTrace(params: CubeParams): TraceSource<CubeState> {
    const initial = initialCubeFrame(params)
    if (isSolved(initial.state.cube)) return eagerTrace({ frames: [initial], outcome: 'success' })
    const generationId = ++generation
    let frames: Frame<CubeState>[] = [initial]
    let worker: Worker
    try {
        worker = new Worker(new URL('../../../workers/cubeWorker.ts', import.meta.url), {
            type: 'module',
        })
    } catch (error) {
        return eagerTrace({
            frames: [initial],
            outcome: 'error',
            error:
                error instanceof Error ? error.message : 'Unable to start the cube solver worker.',
        })
    }
    let stopped = false
    const stop = () => {
        if (stopped) return
        stopped = true
        worker.terminate()
    }
    const trace = new MutableTrace<CubeState>(async (index) => frames[index] ?? null, stop, stop)
    trace.update({
        available: 1,
        total: null,
        status: 'generating',
        outcome: null,
        message: 'Preparing solver tables…',
    })
    const fail = (error: string) => {
        if (stopped) return
        trace.update({
            available: frames.length,
            total: null,
            status: 'error',
            outcome: 'error',
            error,
        })
        stop()
    }
    worker.onmessage = (
        event: MessageEvent<{
            generationId: number
            type: string
            message?: string
            solution?: Solution
            error?: string
        }>,
    ) => {
        const data = event.data
        if (stopped || data.generationId !== generationId) return
        if (data.type === 'stage') trace.update({ ...trace.snapshot(), message: data.message })
        else if (data.type === 'error') fail(data.error || 'Cube solver failed.')
        else if (data.type === 'solution') {
            try {
                if (!data.solution) throw new Error('Cube worker returned no solution.')
                frames = verifiedReplay(initial, data.solution)
                trace.update({
                    available: frames.length,
                    total: frames.length,
                    status: 'complete',
                    outcome: 'success',
                })
                stop()
            } catch (error) {
                fail(error instanceof Error ? error.message : 'Cube solution verification failed.')
            }
        }
    }
    worker.onerror = (event) => fail(event.message || 'Cube solver worker failed.')
    worker.postMessage({ generationId, params })
    return trace
}
