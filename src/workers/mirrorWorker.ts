import { findCubeSolution } from '../algorithms/backtracking/rubiks/solver'
import {
    initialMirrorFrame,
    mirrorReplay,
    type MirrorParams,
} from '../algorithms/backtracking/mirror/replay'
self.onmessage = async (event: MessageEvent<{ generationId: number; params: MirrorParams }>) => {
    const { generationId, params } = event.data
    const send = (data: object) => self.postMessage({ ...data, generationId })
    try {
        const initial = initialMirrorFrame(params)
        const solution = findCubeSolution(initial, (message) => send({ type: 'stage', message }))
        await mirrorReplay(initial, solution)
        send({ type: 'solution', solution })
    } catch (error) {
        send({
            type: 'error',
            error: error instanceof Error ? error.message : 'Mirror Cube solver failed.',
        })
    }
}
