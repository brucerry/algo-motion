import type { Metric, Params, SimulationRun } from '../../engine/types'
import { collectSteps } from '../../engine/steps'
import { queenSteps } from './steps'

export type QueensParams = Params & { size: number }
export type QueensState = {
    size: number
    queens: number[]
    candidate: [number, number] | null
    conflict: [number, number] | null
    attempts: number
    backtracks: number
}

export function runQueens(params: QueensParams): SimulationRun<QueensState> {
    return collectSteps(queenSteps(params))
}
export function inspectQueens(state: QueensState, selected: string): Metric[] | null {
    const match = /^(\d+):(\d+)$/.exec(selected)
    if (!match) return null
    const row = Number(match[1]),
        column = Number(match[2])
    if (row >= state.size || column >= state.size) return null
    const status =
        state.queens[row] === column
            ? 'Queen placed'
            : state.candidate?.[0] === row && state.candidate[1] === column
              ? state.conflict
                  ? 'Rejected candidate'
                  : 'Candidate'
              : 'Empty'
    return [
        { label: 'Row', value: row + 1 },
        { label: 'Column', value: column + 1 },
        { label: 'State', value: status },
        {
            label: 'Conflicting queen',
            value:
                state.conflict && state.candidate?.[0] === row && state.candidate[1] === column
                    ? `(${state.conflict[0] + 1}, ${state.conflict[1] + 1})`
                    : 'None',
        },
    ]
}
