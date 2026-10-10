import type { Frame, Metric } from '../../../engine/types'
import { checkpointReplay, type ReplayStep } from '../../../engine/checkpointReplay'
import {
    applyMoves,
    cubeSize,
    facelets,
    inPhase2,
    isSolved,
    notation,
    normalizeSize,
    parseMoves,
    phase2Move,
    scramble,
    solvedCube,
    turn,
    validateCube,
    type Cube,
    type CubeParams,
    type Move,
} from './model'
import type { ReductionBoundaries } from './reduction'
import {
    centersSolved,
    cubeFromFacelets,
    edgesGrouped,
    reducedCoordinates,
    reducedFacelets,
} from './reductionState'

export type CubeState = {
    cube: Cube
    experiment: string
    scramble: string
    solution: string
    phase: 'Input' | 'Centers' | 'Edge groups' | 'Parity' | 'Phase 1' | 'Phase 2' | 'Solved'
    applied: number
    solutionLength: number | null
    move: Move | null
}
export type Solution = { notation: string; phase1Length: number; reduction?: ReductionBoundaries }
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
export function initialCubeFrame(params: CubeParams, namespace?: string): Frame<CubeState> {
    const moves = scramble(params, namespace)
    const cube = applyMoves(solvedCube(normalizeSize(params.size)), moves)
    const solved = isSolved(cube)
    return frame(
        {
            cube,
            experiment: `${namespace ? `${namespace}:` : ''}${normalizeSize(params.size) === 3 ? '' : `${params.size}:`}${params.seed}:${params.scrambleLength}`,
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
function replayPlan(initial: Frame<CubeState>, solution: Solution) {
    if (cubeSize(initial.state.cube) > 3) return reductionReplayPlan(initial, solution)
    const moves = parseMoves(solution.notation)
    const boundary = solution.phase1Length
    if (!Number.isInteger(boundary) || boundary < 0 || boundary > moves.length)
        throw new Error('Invalid solution phase boundary.')
    if (!moves.slice(boundary).every(phase2Move))
        throw new Error('Solution does not satisfy the two-phase invariants.')
    validateCube(initial.state.cube)
    const steps: ReplayStep<CubeState>[] = []
    const verify = (value: Frame<CubeState>) => {
        validateCube(value.state.cube)
        if (
            (value.event === 'phase-boundary' ||
                (value.event === 'solution-ready' && boundary === 0)) &&
            !inPhase2(value.state.cube)
        )
            throw new Error('Solution does not satisfy the two-phase invariants.')
        if (value.state.phase === 'Solved' && !isSolved(value.state.cube))
            throw new Error('Returned moves do not solve this cube.')
    }
    if (isSolved(initial.state.cube)) {
        if (moves.length) throw new Error('An already-solved cube must use zero solution moves.')
        return { steps, verify }
    }
    // Frame 0 is already available during search and must stay immutable after completion.
    const ready: CubeState = {
        ...initial.state,
        solution: moves.map(notation).join(' '),
        solutionLength: moves.length,
        phase: boundary === 0 ? 'Phase 2' : 'Phase 1',
    }
    steps.push(() =>
        frame(
            ready,
            1,
            boundary === 0
                ? 'Phase 1 is already satisfied: orientations and slice membership are correct. Phase 2 uses U/D turns and side-face half turns.'
                : 'Phase 1 solution moves bring all orientations and the four equatorial edges into the phase-2 subgroup.',
            'solution-ready',
            [4],
        ),
    )
    for (let i = 0; i < moves.length; i++) {
        const index = steps.length + 1
        steps.push((previous) => {
            const state: CubeState = {
                ...previous,
                cube: turn(previous.cube, moves[i]),
                applied: i + 1,
                move: moves[i],
                phase: i < boundary ? 'Phase 1' : 'Phase 2',
            }
            return frame(
                state,
                index,
                `Apply ${notation(moves[i])}. ${state.phase === 'Phase 1' ? 'Approach solved orientations and equatorial slice membership.' : 'Use the restricted move set to restore piece permutations.'} ${i + 1} of ${moves.length} solution moves applied.`,
                'face-turn',
                [5],
            )
        })
        if (i + 1 === boundary) {
            const boundaryIndex = steps.length + 1
            steps.push((previous) =>
                frame(
                    { ...previous, phase: 'Phase 2', move: null },
                    boundaryIndex,
                    'Phase 1 complete: all corners and edges are oriented, and the four equatorial edges occupy their slice. Phase 2 allows U, D and side-face half turns.',
                    'phase-boundary',
                    [3, 4],
                ),
            )
        }
    }
    const terminalIndex = steps.length + 1
    steps.push((previous) =>
        frame(
            { ...previous, phase: 'Solved', move: null },
            terminalIndex,
            `Solved and independently verified in ${moves.length} face turns. A half turn counts as one move. This solution is not guaranteed shortest.`,
            'solved',
            [6],
        ),
    )
    return { steps, verify }
}
function reductionReplayPlan(initial: Frame<CubeState>, solution: Solution) {
    const size = cubeSize(initial.state.cube),
        moves = parseMoves(solution.notation, size)
    const steps: ReplayStep<CubeState>[] = []
    validateCube(initial.state.cube)
    if (isSolved(initial.state.cube)) {
        if (moves.length) throw new Error('An already-solved cube must use zero solution moves.')
        return { steps, verify: () => {} }
    }
    const bounds = solution.reduction
    if (
        !bounds ||
        ![bounds.centers, bounds.edges, bounds.parity, solution.phase1Length, moves.length].every(
            (v, i, values) => Number.isInteger(v) && v >= 0 && (i === 0 || v >= values[i - 1]),
        )
    )
        throw new Error('Invalid reduction phase boundaries.')
    if (
        !moves.slice(bounds.parity).every((m) => (m.depth ?? 1) === 1 && (m.width ?? 1) === 1) ||
        !moves.slice(solution.phase1Length).every(phase2Move)
    )
        throw new Error('Reduced search used an invalid move set.')
    const verify = (value: Frame<CubeState>) => {
        validateCube(value.state.cube)
        if (value.event === 'centers-complete' && !centersSolved(value.state.cube))
            throw new Error('Center phase boundary is false.')
        if (
            value.event === 'edges-complete' &&
            (!centersSolved(value.state.cube) || !edgesGrouped(value.state.cube))
        )
            throw new Error('Edge-group phase boundary is false.')
        if (value.event === 'parity-complete') {
            const coordinates = reducedCoordinates(reducedFacelets(value.state.cube))
            if (coordinates.oll || coordinates.pll)
                throw new Error('Parity phase boundary is false.')
        }
        if (
            value.event === 'phase-boundary' &&
            !inPhase2(cubeFromFacelets(reducedFacelets(value.state.cube)))
        )
            throw new Error('Reduced two-phase boundary is false.')
        if (value.state.phase === 'Solved' && !isSolved(value.state.cube))
            throw new Error('Returned moves do not solve the full-size cube.')
    }
    const ready = {
        ...initial.state,
        solution: moves.map(notation).join(' '),
        solutionLength: moves.length,
        phase: 'Centers' as const,
    }
    steps.push(() =>
        frame(
            ready,
            1,
            'A state-only constructive reduction and reduced two-phase solution have been found. Replay verifies each stage on the full-size cube.',
            'solution-ready',
            [2],
        ),
    )
    const phases: {
        name: CubeState['phase']
        end: number
        event: string
        explanation: string
        line: number
    }[] = [
        {
            name: 'Centers',
            end: bounds.centers,
            event: 'centers-complete',
            explanation:
                'All center blocks have the canonical colors. Indistinguishable center identities may be permuted.',
            line: 3,
        },
        {
            name: 'Edge groups',
            end: bounds.edges,
            event: 'edges-complete',
            explanation:
                size === 4
                    ? 'All twelve two-wing edge groups are paired, and centers are restored.'
                    : 'All twelve wing pairs agree with their middle edges, including any last-wing correction. Centers are restored.',
            line: 4,
        },
        {
            name: 'Parity',
            end: bounds.parity,
            event: 'parity-complete',
            explanation:
                size === 4
                    ? 'Reduced orientation and permutation parity are valid for 3×3 search.'
                    : 'The reduced state is valid for 3×3 search. No 4×4 parity rule is applied to the 5×5 projection.',
            line: 5,
        },
        {
            name: 'Phase 1',
            end: solution.phase1Length,
            event: 'phase-boundary',
            explanation:
                'The reduced corners and edges are oriented and its equatorial edges occupy their slice. Phase 2 uses outer U/D turns and side-face half turns.',
            line: 6,
        },
        {
            name: 'Phase 2',
            end: moves.length,
            event: 'search-complete',
            explanation:
                'Reduced piece permutations are restored. The complete full-size state is checked next.',
            line: 7,
        },
    ]
    let start = 0
    for (let p = 0; p < phases.length; p++) {
        const phase = phases[p]
        for (let i = start; i < phase.end; i++) {
            const index = steps.length + 1
            steps.push((previous) =>
                frame(
                    {
                        ...previous,
                        cube: turn(previous.cube, moves[i]),
                        phase: phase.name,
                        applied: i + 1,
                        move: moves[i],
                    },
                    index,
                    `Apply ${notation(moves[i])} during ${phase.name}. ${i + 1} of ${moves.length} solution moves applied.`,
                    'face-turn',
                    [phase.line],
                ),
            )
        }
        const index = steps.length + 1,
            skipped = phase.end === start
        steps.push((previous) =>
            frame(
                { ...previous, phase: phases[p + 1]?.name ?? 'Phase 2', move: null },
                index,
                `${skipped ? 'Already satisfied; no moves needed. ' : ''}${phase.explanation}`,
                phase.event,
                [phase.line],
            ),
        )
        start = phase.end
    }
    const terminalIndex = steps.length + 1
    steps.push((previous) =>
        frame(
            { ...previous, phase: 'Solved', move: null },
            terminalIndex,
            `Solved and independently verified: all ${6 * size * size} stickers, ${moves.length} solution layer turns. A wide or half turn counts as one move; the solution is not guaranteed shortest.`,
            'solved',
            [8],
        ),
    )
    return { steps, verify }
}
export function indexedCubeReplay(
    initial: Frame<CubeState>,
    solution: Solution,
    cancelled: () => boolean = () => false,
) {
    const { steps, verify } = replayPlan(initial, solution)
    return checkpointReplay(initial, steps, verify, { cancelled })
}
export function verifiedReplay(initial: Frame<CubeState>, solution: Solution): Frame<CubeState>[] {
    const { steps, verify } = replayPlan(initial, solution)
    const frames = [initial]
    verify(initial)
    for (const step of steps) {
        const value = step(frames.at(-1)!.state)
        verify(value)
        frames.push(value)
    }
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
