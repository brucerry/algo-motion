import type { Frame, Metric } from '../../../engine/types'
import type { IndexedReplay } from '../../../engine/solutionTrace'
import {
    initialCubeFrame,
    indexedCubeReplay,
    inspectCube,
    cubeMetrics,
    type CubeState,
    type Solution,
} from '../rubiks/replay'
import { parseMoves, validateCube, type CubeParams } from '../rubiks/model'
import { homeGeometry, isMirrorSolved, physicalBox } from './model'

export type MirrorState = CubeState & { puzzle: 'mirror' }
export type MirrorParams = Pick<CubeParams, 'seed' | 'scrambleLength'>
export function initialMirrorFrame(params: MirrorParams): Frame<MirrorState> {
    const frame = initialCubeFrame(params, 'mirror-scramble')
    const solved = isMirrorSolved(frame.state.cube)
    const state: MirrorState = {
        ...frame.state,
        puzzle: 'mirror',
        ...(solved ? { phase: 'Solved', solutionLength: 0 } : {}),
    }
    return {
        ...frame,
        state,
        metrics: cubeMetrics(state),
        event: solved ? 'already-solved' : frame.event,
        explanation: solved
            ? 'Already solved: the fixed unequal boxes restore the exterior, so no face turns are needed.'
            : 'A legal seeded face scramble changes the silhouette. Search uses the 3×3 correspondence; the replay independently verifies the final physical boxes.',
    }
}
export async function mirrorReplay(
    initial: Frame<MirrorState>,
    solution: Solution,
    cancelled: () => boolean = () => false,
): Promise<IndexedReplay<MirrorState>> {
    validateCube(initial.state.cube)
    if (isMirrorSolved(initial.state.cube)) {
        if (parseMoves(solution.notation).length || solution.phase1Length !== 0)
            throw new Error('A geometrically solved Mirror Cube needs zero moves.')
        const solved = {
            ...initial,
            state: { ...initial.state, phase: 'Solved' as const, solutionLength: 0 },
        }
        return { length: 1, frame: async (i) => (i === 0 ? solved : null) }
    }
    const replay = await indexedCubeReplay(initial, solution, cancelled)
    if (cancelled()) throw new Error('Mirror verification cancelled.')
    const terminal = await replay.frame(replay.length - 1)
    if (!terminal || !isMirrorSolved(terminal.state.cube))
        throw new Error('Mirror solution does not restore the actual exterior geometry.')
    return {
        length: replay.length,
        frame: async (index) => {
            const value = await replay.frame(index)
            if (!value) return null
            return {
                ...value,
                state: { ...value.state, puzzle: 'mirror' },
                explanation:
                    value.state.phase === 'Solved'
                        ? `Solved and independently verified: all 26 rigid pieces restore the fixed exterior in ${value.state.applied} face turns. Geometrically symmetric orientations are allowed; this solution is not guaranteed shortest.`
                        : value.explanation,
            }
        },
    }
}
export function inspectMirror(state: MirrorState, id: string): Metric[] | null {
    const piece = state.cube.find((p) => p.id === id)
    if (!piece) return null
    const home = homeGeometry(piece.home),
        box = physicalBox(piece)
    return [
        inspectCube(state, id)![0],
        {
            label: 'Intrinsic dimensions',
            value: home.dimensions.map((v) => v.toFixed(2)).join(' × '),
        },
        { label: 'Current physical center', value: box.center.map((v) => v.toFixed(3)).join(', ') },
        {
            label: 'Orientation basis',
            value: piece.basis.map((v, i) => `${'xyz'[i]}→(${v.join(',')})`).join('; '),
        },
    ]
}
