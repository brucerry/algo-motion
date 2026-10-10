import type { Frame, Metric } from '../../../engine/types'
import { checkpointReplay, type ReplayStep } from '../../../engine/checkpointReplay'
import {
    moveSquare,
    parseSquare,
    shapeReady,
    solvedSquare,
    squareNotation,
    squareScramble,
    squareSolved,
    validateSquare,
    type SquareMove,
    type SquareParams,
    type SquarePuzzle,
} from './model'
import type { SquareSolution } from './solver'
export type SquareState = {
    puzzle: SquarePuzzle
    experiment: string
    scramble: string
    solution: string
    phase: 'Input' | 'Shape / parity' | 'Permutations / middle' | 'Solved'
    applied: number
    solutionLength: number | null
    move: SquareMove | null
}
export const squareMetrics = (state: SquareState): Metric[] => [
    { label: 'Phase', value: state.phase },
    { label: 'Solution operations applied', value: state.applied },
    { label: 'Solution operations', value: state.solutionLength ?? 'Pending' },
    { label: 'Middle layer', value: state.puzzle.middle ? 'Flipped' : 'Aligned' },
]
function frame(
    state: SquareState,
    index: number,
    explanation: string,
    event: string,
    activeLines: number[],
): Frame<SquareState> {
    return { state, index, explanation, event, activeLines, metrics: squareMetrics(state) }
}
export function initialSquareFrame(params: SquareParams): Frame<SquareState> {
    const moves = squareScramble(params),
        puzzle = moves.reduce(moveSquare, solvedSquare()),
        solved = squareSolved(puzzle)
    validateSquare(puzzle)
    return frame(
        {
            puzzle,
            experiment: `square:${params.seed}:${params.scrambleLength}`,
            scramble: moves.map(squareNotation).join(' ') || 'None',
            solution: '',
            phase: solved ? 'Solved' : 'Input',
            applied: 0,
            solutionLength: solved ? 0 : null,
            move: null,
        },
        0,
        solved
            ? 'Already solved: all sixteen wedges and both middle halves are aligned; zero operations are needed.'
            : 'A legal seeded scramble is ready. Each block rotates two layers and makes one unblocked slice. Replay shows the verified solution, not internal search branches.',
        solved ? 'already-solved' : 'scrambled',
        [1],
    )
}
export function squareReplay(
    initial: Frame<SquareState>,
    solution: SquareSolution,
    cancelled: () => boolean = () => false,
) {
    validateSquare(initial.state.puzzle)
    const moves = parseSquare(solution.notation),
        boundary = solution.phase1Length
    if (!Number.isInteger(boundary) || boundary < 0 || boundary > moves.length)
        throw new Error('Invalid Square-1 phase boundary.')
    if (squareSolved(initial.state.puzzle)) {
        if (moves.length || boundary)
            throw new Error('An already solved Square-1 needs zero operations.')
        return checkpointReplay(initial, [], () => {}, { cancelled })
    }
    const steps: ReplayStep<SquareState>[] = []
    const add = (step: (previous: SquareState) => Frame<SquareState>) => {
        const index = steps.length + 1
        steps.push((previous) => ({ ...step(previous), index }))
    }
    const marker = (phase: SquareState['phase'], text: string, line: number) =>
        add((previous) =>
            frame(
                {
                    ...previous,
                    phase,
                    move: null,
                    solution: solution.notation,
                    solutionLength: moves.length,
                },
                0,
                text,
                'phase',
                [line],
            ),
        )
    marker(
        'Shape / parity',
        'Search first restores cube shape and the parity class required by the permutation phase.',
        3,
    )
    for (let i = 0; i <= moves.length; i++) {
        if (i === boundary)
            marker(
                'Permutations / middle',
                'The actual rings satisfy the cube-shape/parity goal. Now restore corner and edge permutations and the middle layer.',
                4,
            )
        if (i === moves.length) break
        const move = moves[i]
        add((previous) =>
            frame(
                {
                    ...previous,
                    puzzle: moveSquare(previous.puzzle, move),
                    applied: previous.applied + 1,
                    move,
                },
                0,
                `${squareNotation(move)}: ${move.kind === 'slice' ? 'rotate one unsplit half through 180° and flip the middle half' : 'rotate the top and bottom layers in opposite viewing conventions'}. Operation ${i + 1} of ${moves.length}.`,
                'turn',
                [previous.phase === 'Shape / parity' ? 3 : 4, 5],
            ),
        )
    }
    marker(
        'Solved',
        `Solved and independently verified: all sixteen wedge identities, rigid poses and both middle halves are restored in ${moves.length} operations. A nonzero rotation pair counts once; a slice counts once. The solution is not guaranteed shortest.`,
        6,
    )
    return checkpointReplay(
        initial,
        steps,
        (value) => {
            validateSquare(value.state.puzzle)
            if (value.state.phase === 'Permutations / middle' && !shapeReady(value.state.puzzle))
                throw new Error(
                    'Square-1 solution claims a false cube-shape/parity boundary or leaves that phase.',
                )
            if (value.state.phase === 'Solved' && !squareSolved(value.state.puzzle))
                throw new Error(
                    'Square-1 solution does not restore all wedges and the middle layer.',
                )
        },
        { cancelled },
    )
}
export function inspectSquare(state: SquareState, id: string): Metric[] | null {
    if (!/^\d+$/.test(id) || Number(id) > 17) return null
    const n = Number(id)
    if (n >= 16)
        return [
            { label: 'Piece', value: `Middle half ${n - 15}` },
            {
                label: 'Orientation',
                value: n === 17 && state.puzzle.middle ? 'Flipped 180°' : 'Aligned',
            },
        ]
    return [
        { label: 'Piece', value: `${n & 1 ? 'Corner' : 'Edge'} ${n}` },
        { label: 'Wedge width', value: `${n & 1 ? 60 : 30}° (fixed)` },
        { label: 'Current layer', value: state.puzzle.top.includes(n) ? 'Top' : 'Bottom' },
        {
            label: 'Rigid pose',
            value: `${state.puzzle.poses[n].angle * 30}° offset; ${state.puzzle.poses[n].flipped ? 'flipped' : 'upright'}`,
        },
    ]
}
