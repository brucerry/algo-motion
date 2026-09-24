import type { Frame } from './types'
import { MutableTrace, type TraceSource } from './trace'
import {
    createGrid,
    gridDefaults,
    type GridAlgorithm,
    type GridEnvironment,
    type GridParams,
    type GridState,
} from '../algorithms/grid/grid'
import type { QueensParams, QueensState } from '../algorithms/backtracking/queens'

export type WorkerTraceInput =
    | { kind: 'grid'; algorithm: GridAlgorithm; params: GridParams; environment?: GridEnvironment }
    | { kind: 'queens'; params: QueensParams }

let nextGeneration = 0
export function workerTrace(input: WorkerTraceInput): TraceSource<GridState | QueensState> {
    const generationId = ++nextGeneration
    const environment =
        input.kind === 'grid' ? (input.environment ?? createGrid(input.params)) : null
    const worker = new Worker(new URL('../workers/traceWorker.ts', import.meta.url), {
        type: 'module',
    })
    const requests = new Map<
        number,
        { resolve: (frame: Frame<any> | null) => void; reject: (error: Error) => void }
    >()
    let nextRequest = 0
    let stopped = false
    const stop = () => {
        if (stopped) return
        stopped = true
        worker.terminate()
        for (const request of requests.values()) request.resolve(null)
        requests.clear()
    }
    const source = new MutableTrace<GridState | QueensState>(
        (index) =>
            new Promise((resolve, reject) => {
                if (stopped) {
                    resolve(null)
                    return
                }
                const id = ++nextRequest
                requests.set(id, { resolve, reject })
                worker.postMessage({ type: 'frame', generationId, id, index })
            }),
        () => worker.postMessage({ type: 'cancel', generationId }),
        stop,
    )
    worker.onmessage = (event: MessageEvent<any>) => {
        const message = event.data
        if (stopped || message.generationId !== generationId) return
        if (message.type === 'progress') source.update(message.snapshot)
        if (message.type === 'frame') {
            const request = requests.get(message.id)
            if (!request) return
            requests.delete(message.id)
            const frame = message.frame as Frame<any> | null
            if (frame && environment) frame.state.environment = environment
            request.resolve(frame)
        }
    }
    worker.onerror = (event) => {
        source.update({
            available: source.snapshot().available,
            total: null,
            status: 'error',
            outcome: 'error',
            error: event.message || 'Trace worker failed.',
        })
        stop()
    }
    worker.postMessage({
        type: 'start',
        generationId,
        input:
            input.kind === 'grid'
                ? { ...input, params: { ...gridDefaults, ...input.params }, environment }
                : input,
    })
    return source
}
