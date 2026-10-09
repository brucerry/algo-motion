import type { CubeState } from './replay'
import { inverse, normals, type Move } from './model'

export function turnTransition(
    previous: CubeState,
    next: CubeState,
    previousIndex: number,
    nextIndex: number,
    reducedMotion: boolean,
): Move | null {
    if (
        reducedMotion ||
        previous.experiment !== next.experiment ||
        Math.abs(nextIndex - previousIndex) !== 1
    )
        return null
    if (next.applied === previous.applied + 1) return next.move
    if (next.applied === previous.applied - 1 && previous.move) return inverse(previous.move)
    return null
}
export const turnAxisAngle = (move: Move) => ({
    axis: normals[move.face],
    angle: (-(move.turns === 3 ? -1 : move.turns) * Math.PI) / 2,
})
export const transitionDuration = (speed: number) => 0.21 / speed
