import type { SquareState } from './replay'
import type { SquareMove } from './model'
export type SquareTransition = { move: SquareMove; direction: 1 | -1 }
export function squareTransition(
    previous: SquareState,
    next: SquareState,
    previousIndex: number,
    nextIndex: number,
    reducedMotion: boolean,
): SquareTransition | null {
    if (
        reducedMotion ||
        previous.experiment !== next.experiment ||
        Math.abs(nextIndex - previousIndex) !== 1
    )
        return null
    if (next.applied === previous.applied + 1 && next.move) return { move: next.move, direction: 1 }
    if (next.applied === previous.applied - 1 && previous.move)
        return { move: previous.move, direction: -1 }
    return null
}
