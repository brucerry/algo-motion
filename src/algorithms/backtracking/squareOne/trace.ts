import { eagerTrace } from '../../../engine/trace'
import { solutionTrace } from '../../../engine/solutionTrace'
import type { SquareParams } from './model'
import type { SquareSolution } from './solver'
import { initialSquareFrame, squareReplay, type SquareState } from './replay'
export function squareTrace(params: SquareParams) {
    const initial = initialSquareFrame(params)
    if (initial.state.phase === 'Solved')
        return eagerTrace({ frames: [initial], outcome: 'success' })
    return solutionTrace<SquareState, SquareParams, SquareSolution>({
        initial,
        params,
        preparation: 'Preparing shape/parity tables…',
        createWorker: () =>
            new Worker(new URL('../../../workers/squareOneWorker.ts', import.meta.url), {
                type: 'module',
            }),
        verify: (solution, cancelled) => squareReplay(initial, solution, cancelled),
    })
}
