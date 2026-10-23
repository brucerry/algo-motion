// Imported only by the dedicated worker and solver correctness tests.
import { cubeEngine } from './wasm'
import { cubeSize, notation, threeFacelets as facelets, isSolved } from './model'
import { reduceCube } from './reduction'
import { cubeFromFacelets, reducedFacelets } from './reductionState'
import { verifiedReplay, type CubeState, type Solution } from './replay'
import type { Frame } from '../../../engine/types'

export function findCubeSolution(
    initial: Frame<CubeState>,
    stage: (message: string) => void,
): Solution {
    if (isSolved(initial.state.cube)) return { notation: '', phase1Length: 0 }
    if (cubeSize(initial.state.cube) > 3) {
        const reduction = reduceCube(initial.state.cube, stage)
        const abstract = cubeFromFacelets(reducedFacelets(reduction.cube))
        const suffix = findCubeSolution(
            { ...initial, state: { ...initial.state, cube: abstract } },
            stage,
        )
        return {
            notation: [...reduction.moves.map(notation), suffix.notation].filter(Boolean).join(' '),
            phase1Length: reduction.moves.length + suffix.phase1Length,
            reduction: reduction.boundaries,
        }
    }
    stage('Preparing solver tables…')
    const solver = cubeEngine()
    solver.prepare()
    stage('Searching for a two-phase solution…')
    return solver.solve(facelets(initial.state.cube))
}

export function solveCube(
    initial: Frame<CubeState>,
    stage: (message: string) => void,
): Frame<CubeState>[] {
    return verifiedReplay(initial, findCubeSolution(initial, stage))
}
