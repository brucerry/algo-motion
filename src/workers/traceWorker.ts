import { gridSteps } from '../algorithms/grid/steps'
import { queenSteps } from '../algorithms/backtracking/steps'
import type { ProducedStep } from '../engine/steps'
import type { Frame, SimulationRun } from '../engine/types'
import type { WorkerTraceInput } from '../engine/workerTrace'

type AnyStep = ProducedStep<any>
type AnyGenerator = Generator<AnyStep, SimulationRun<any>['outcome']>
type Pending = { id: number; index: number }
let input: WorkerTraceInput | null = null
let generationId = 0
let iterator: AnyGenerator | null = null
let available = 0
let latest: AnyStep | null = null
let status: 'generating' | 'complete' | 'error' = 'generating'
let outcome: SimulationRun<any>['outcome'] | null = null
let lastProgress = 0
let timer: ReturnType<typeof setTimeout> | null = null
const pending: Pending[] = []
const cache = new Map<number, Frame<any>>()
const CACHE_SIZE = 12
const checkpoints = new Map<number, { iterator: AnyGenerator; step: AnyStep }>()
const CHECKPOINT_SIZE = 6

function steps(): AnyGenerator {
    if (!input) throw new Error('Missing trace input.')
    if (input.kind === 'grid') return gridSteps(input.algorithm, input.params, input.environment!)
    return queenSteps(input.params)
}
function cacheFrame(frame: Frame<any>) {
    cache.delete(frame.index)
    cache.set(frame.index, frame)
    while (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!)
}
function transmit(id: number, frame: Frame<any> | null) {
    if (frame && input?.kind === 'grid') {
        const { environment: _environment, ...state } = frame.state
        postMessage({ type: 'frame', generationId, id, frame: { ...frame, state } })
    } else postMessage({ type: 'frame', generationId, id, frame })
}
function progress(error?: string) {
    postMessage({
        type: 'progress',
        generationId,
        snapshot: {
            available,
            total: status === 'complete' ? available : null,
            status,
            outcome,
            error,
        },
    })
}
function fulfill(step: AnyStep) {
    const matching = pending.filter((request) => request.index === step.index)
    if (step.index === 0 || step.index % 2000 === 0 || matching.length) {
        const frame = step.materialize()
        cacheFrame(frame)
        for (const request of matching) transmit(request.id, frame)
    }
    for (const request of matching) pending.splice(pending.indexOf(request), 1)
}
function pump() {
    if (status !== 'generating' || !iterator) return
    try {
        const until = performance.now() + 8
        let processed = 0
        while (processed < 256 && performance.now() < until) {
            const result = iterator.next()
            if (result.done) {
                status = 'complete'
                outcome = result.value
                break
            }
            latest = result.value
            available = result.value.index + 1
            fulfill(result.value)
            processed++
        }
        if (status !== 'generating' || performance.now() - lastProgress >= 80) {
            lastProgress = performance.now()
            progress()
        }
        if (status === 'generating') timer = setTimeout(pump, 0)
    } catch (error) {
        status = 'error'
        outcome = 'error'
        progress(error instanceof Error ? error.message : 'Unable to generate trace.')
        for (const request of pending) transmit(request.id, null)
        pending.length = 0
    }
}
async function seek(id: number, index: number) {
    try {
        let checkpointIndex = -1
        for (const saved of checkpoints.keys())
            if (saved < index && saved > checkpointIndex) checkpointIndex = saved
        const checkpoint = checkpoints.get(checkpointIndex)
        if (checkpoint) checkpoints.delete(checkpointIndex)
        const replay = checkpoint?.iterator ?? steps()
        let position = checkpointIndex + 1
        while (position <= index) {
            const until = performance.now() + 8
            while (position <= index && performance.now() < until) {
                const next = replay.next()
                if (next.done) {
                    transmit(id, null)
                    return
                }
                if (position === index) {
                    const frame = next.value.materialize()
                    cacheFrame(frame)
                    checkpoints.set(index, { iterator: replay, step: next.value })
                    while (checkpoints.size > CHECKPOINT_SIZE)
                        checkpoints.delete(checkpoints.keys().next().value!)
                    transmit(id, frame)
                    return
                }
                position++
            }
            await new Promise<void>((resolve) => setTimeout(resolve, 0))
        }
    } catch {
        transmit(id, null)
    }
}
self.onmessage = (event: MessageEvent<any>) => {
    const message = event.data
    if (message.type === 'start') {
        if (timer !== null) clearTimeout(timer)
        generationId = message.generationId
        input = message.input
        iterator = steps()
        available = 0
        latest = null
        status = 'generating'
        outcome = null
        lastProgress = 0
        cache.clear()
        checkpoints.clear()
        pending.length = 0
        pump()
    } else if (message.generationId !== generationId) return
    else if (message.type === 'cancel') {
        if (timer !== null) clearTimeout(timer)
        status = 'complete'
        outcome = null
        for (const request of pending) transmit(request.id, null)
        pending.length = 0
    } else if (message.type === 'frame') {
        const { id, index } = message
        if (index < 0) {
            transmit(id, null)
            return
        }
        const cached = cache.get(index)
        if (cached) {
            transmit(id, cached)
            return
        }
        const checkpoint = checkpoints.get(index)
        if (checkpoint) {
            const frame = checkpoint.step.materialize()
            cacheFrame(frame)
            transmit(id, frame)
            return
        }
        const latestStep = latest
        if (latestStep && latestStep.index === index) {
            const frame = latestStep.materialize()
            cacheFrame(frame)
            transmit(id, frame)
            return
        }
        if (index < available) void seek(id, index)
        else if (status === 'generating') pending.push({ id, index })
        else transmit(id, null)
    }
}
