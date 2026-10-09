import type { Frame, Metric } from '../../../engine/types'
import {
    applyMoves,
    facelets,
    inPhase2,
    isSolved,
    notation,
    parseMoves,
    phase2Move,
    scramble,
    solvedCube,
    turn,
    type Cube,
    type CubeParams,
    type Move,
} from './model'

export type CubeState = {
    cube: Cube
    experiment: string
    scramble: string
    solution: string
    phase: 'Input' | 'Phase 1' | 'Phase 2' | 'Solved'
    applied: number
    solutionLength: number | null
    move: Move | null
}
export type Solution = { notation: string; phase1Length: number }
export const cubeMetrics = (state: CubeState): Metric[] => [
    { label: 'Phase', value: state.phase },
    { label: 'Solution moves applied', value: state.applied },
    { label: 'Solution length', value: state.solutionLength ?? 'Pending' },
]
function frame(
    state: CubeState,
    index: number,
    explanation: string,
    event: string,
    activeLines: number[],
): Frame<CubeState> {
    return { state, index, explanation, event, activeLines, metrics: cubeMetrics(state) }
}
export function initialCubeFrame(params: CubeParams): Frame<CubeState> {
    const moves = scramble(params)
    const cube = applyMoves(solvedCube(), moves)
    const solved = isSolved(cube)
    return frame(
        {
            cube,
            experiment: `${params.seed}:${params.scrambleLength}`,
            scramble: moves.map(notation).join(' ') || 'None',
            solution: '',
            phase: solved ? 'Solved' : 'Input',
            applied: 0,
            solutionLength: solved ? 0 : null,
            move: null,
        },
        0,
        solved
            ? 'Already solved: zero solution moves are needed.'
            : 'This legal seeded scramble is ready to solve. The replay will show the verified solution path, not every internal search branch.',
        solved ? 'already-solved' : 'scrambled',
        [1],
    )
}
export function verifiedReplay(initial: Frame<CubeState>, solution: Solution): Frame<CubeState>[] {
    const moves = parseMoves(solution.notation)
    const boundary = solution.phase1Length
    if (!Number.isInteger(boundary) || boundary < 0 || boundary > moves.length)
        throw new Error('Invalid solution phase boundary.')
    const atBoundary = applyMoves(initial.state.cube, moves.slice(0, boundary))
    if (!inPhase2(atBoundary) || !moves.slice(boundary).every(phase2Move))
        throw new Error('Solution does not satisfy the two-phase invariants.')
    if (!isSolved(applyMoves(initial.state.cube, moves)))
        throw new Error('Returned moves do not solve this cube.')
    if (isSolved(initial.state.cube)) {
        if (moves.length) throw new Error('An already-solved cube must use zero solution moves.')
        return [initial]
    }
    // Frame 0 is already available during search and must stay immutable after completion.
    const frames: Frame<CubeState>[] = [initial]
    let state: CubeState = {
        ...initial.state,
        solution: moves.map(notation).join(' '),
        solutionLength: moves.length,
        phase: boundary === 0 ? 'Phase 2' : 'Phase 1',
    }
    frames.push(
        frame(
            state,
            frames.length,
            boundary === 0
                ? 'Phase 1 is already satisfied: orientations and slice membership are correct. Phase 2 uses U/D turns and side-face half turns.'
                : 'Phase 1 solution moves bring all orientations and the four equatorial edges into the phase-2 subgroup.',
            'solution-ready',
            [4],
        ),
    )
    for (let i = 0; i < moves.length; i++) {
        state = {
            ...state,
            cube: turn(state.cube, moves[i]),
            applied: i + 1,
            move: moves[i],
            phase: i < boundary ? 'Phase 1' : 'Phase 2',
        }
        frames.push(
            frame(
                state,
                frames.length,
                `Apply ${notation(moves[i])}. ${state.phase === 'Phase 1' ? 'Approach solved orientations and equatorial slice membership.' : 'Use the restricted move set to restore piece permutations.'} ${i + 1} of ${moves.length} solution moves applied.`,
                'face-turn',
                [5],
            ),
        )
        if (i + 1 === boundary) {
            state = { ...state, phase: 'Phase 2', move: null }
            frames.push(
                frame(
                    state,
                    frames.length,
                    'Phase 1 complete: all corners and edges are oriented, and the four equatorial edges occupy their slice. Phase 2 allows U, D and side-face half turns.',
                    'phase-boundary',
                    [3, 4],
                ),
            )
        }
    }
    state = { ...state, phase: 'Solved', move: null }
    frames.push(
        frame(
            state,
            frames.length,
            `Solved and independently verified in ${moves.length} face turns. A half turn counts as one move. This solution is not guaranteed shortest.`,
            'solved',
            [6],
        ),
    )
    return frames
}
export function inspectCube(state: CubeState, id: string): Metric[] | null {
    const cubie = state.cube.find((c) => c.id === id)
    if (!cubie) return null
    return [
        {
            label: 'Cubie',
            value:
                cubie.stickers.length === 3
                    ? 'Corner'
                    : cubie.stickers.length === 2
                      ? 'Edge'
                      : 'Center',
        },
        { label: 'Home position', value: id },
        { label: 'Current position', value: cubie.position.join(', ') },
        {
            label: 'Sticker faces',
            value: cubie.stickers.map((s) => `${s.color}: (${s.normal.join(', ')})`).join('; '),
        },
    ]
}
export const inputFacelets = (params: CubeParams) => facelets(initialCubeFrame(params).state.cube)
