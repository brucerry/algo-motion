import type { CubeParams } from '../algorithms/backtracking/rubiks/model'
import { findCubeSolution } from '../algorithms/backtracking/rubiks/solver'
import { initialCubeFrame, indexedCubeReplay } from '../algorithms/backtracking/rubiks/replay'

self.onmessage = async (event: MessageEvent<{ generationId: number; params: CubeParams }>) => {
    const { generationId, params } = event.data
    const send = (data: object) => self.postMessage({ ...data, generationId })
    try {
        const initial = initialCubeFrame(params)
        const solution = findCubeSolution(initial, (message) => send({ type: 'stage', message }))
        await indexedCubeReplay(initial, solution)
        send({ type: 'solution', solution })
    } catch (error) {
        send({
            type: 'error',
            error: error instanceof Error ? error.message : 'Cube solver failed.',
        })
    }
}
