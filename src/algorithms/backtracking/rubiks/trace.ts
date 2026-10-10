import { eagerTrace, type TraceSource } from '../../../engine/trace'
import { solutionTrace } from '../../../engine/solutionTrace'
import { isSolved, type CubeParams } from './model'
import { indexedCubeReplay, initialCubeFrame, type CubeState, type Solution } from './replay'

export function cubeTrace(params: CubeParams): TraceSource<CubeState> {
    const initial = initialCubeFrame(params)
    if (isSolved(initial.state.cube)) return eagerTrace({ frames: [initial], outcome: 'success' })
    return solutionTrace<CubeState, CubeParams, Solution>({
        initial,
        params,
        preparation: 'Preparing solver tables…',
        createWorker: () =>
            new Worker(new URL('../../../workers/cubeWorker.ts', import.meta.url), {
                type: 'module',
            }),
        verify: (solution, cancelled) => indexedCubeReplay(initial, solution, cancelled),
    })
}
