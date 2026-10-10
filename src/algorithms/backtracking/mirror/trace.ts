import { eagerTrace, type TraceSource } from '../../../engine/trace'
import { solutionTrace } from '../../../engine/solutionTrace'
import type { Solution } from '../rubiks/replay'
import { initialMirrorFrame, mirrorReplay, type MirrorParams, type MirrorState } from './replay'
import { isMirrorSolved } from './model'

export function mirrorTrace(params: MirrorParams): TraceSource<MirrorState> {
    const initial = initialMirrorFrame(params)
    if (initial.state.phase === 'Solved' && isMirrorSolved(initial.state.cube))
        return eagerTrace({ frames: [initial], outcome: 'success' })
    return solutionTrace<MirrorState, MirrorParams, Solution>({
        initial,
        params,
        preparation: 'Preparing two-phase tables…',
        createWorker: () =>
            new Worker(new URL('../../../workers/mirrorWorker.ts', import.meta.url), {
                type: 'module',
            }),
        verify: (solution, cancelled) => mirrorReplay(initial, solution, cancelled),
    })
}
