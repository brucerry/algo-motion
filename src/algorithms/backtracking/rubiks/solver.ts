// Imported only by the dedicated worker and solver correctness tests.
import SolverCube from './vendor/cube.js'
import './vendor/solve.js'
import { facelets, isSolved } from './model'
import { verifiedReplay, type CubeState, type Solution } from './replay'
import type { Frame } from '../../../engine/types'

export function findCubeSolution(
    initial: Frame<CubeState>,
    stage: (message: string) => void,
): Solution {
    if (isSolved(initial.state.cube)) return { notation: '', phase1Length: 0 }
    stage('Preparing solver tables…')
    SolverCube.initSolver()
    stage('Searching for a two-phase solution…')
    const solver = SolverCube.fromString(facelets(initial.state.cube))
    const result = solver.solveUpright(30)
    if (result === null) throw new Error('Search did not return a solution for this legal cube.')
    return { notation: result, phase1Length: solver.solutionPhase1Length }
}

export function solveCube(
    initial: Frame<CubeState>,
    stage: (message: string) => void,
): Frame<CubeState>[] {
    return verifiedReplay(initial, findCubeSolution(initial, stage))
}
