import type { Frame, SimulationRun } from './types'

// materialize() must be called before advancing the iterator again. Producers keep
// their working state mutable and copy it only for frames that are actually shown.
export type ProducedStep<S> = {
    index: number
    materialize(): Frame<S>
}

export function collectSteps<S>(
    steps: Generator<ProducedStep<S>, SimulationRun<S>['outcome']>,
): SimulationRun<S> {
    const frames: Frame<S>[] = []
    for (;;) {
        const next = steps.next()
        if (next.done) return { frames, outcome: next.value }
        frames.push(next.value.materialize())
    }
}
