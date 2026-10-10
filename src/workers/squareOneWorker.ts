import { initialSquareFrame, squareReplay } from '../algorithms/backtracking/squareOne/replay'
import { findSquareSolution } from '../algorithms/backtracking/squareOne/solver'
import type { SquareParams } from '../algorithms/backtracking/squareOne/model'
self.onmessage = async (event: MessageEvent<{ generationId: number; params: SquareParams }>) => {
    const { generationId, params } = event.data
    const send = (data: object) => self.postMessage({ ...data, generationId })
    try {
        const initial = initialSquareFrame(params),
            solution = findSquareSolution(initial.state.puzzle, (message) =>
                send({ type: 'stage', message }),
            )
        await squareReplay(initial, solution)
        send({ type: 'solution', solution })
    } catch (error) {
        send({
            type: 'error',
            error: error instanceof Error ? error.message : 'Square-1 solver failed.',
        })
    }
}
