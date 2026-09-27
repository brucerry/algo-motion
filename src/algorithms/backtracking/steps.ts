import type { ProducedStep } from '../../engine/steps'
import type { SimulationRun } from '../../engine/types'
import type { QueensParams, QueensState } from './queens'

export function* queenSteps(
    params: QueensParams,
): Generator<ProducedStep<QueensState>, SimulationRun<QueensState>['outcome']> {
    if (!Number.isInteger(params.size) || params.size < 1 || params.size > 80)
        throw new Error('Board size must be from 1 to 80.')
    const queens = Array<number>(params.size).fill(-1)
    let candidate: [number, number] | null = null
    let conflict: [number, number] | null = null
    let attempts = 0,
        backtracks = 0,
        index = 0
    const record = (
        event: string,
        explanation: string,
        activeLines: number[],
    ): ProducedStep<QueensState> => {
        const step = index++
        return {
            index: step,
            materialize: () => {
                const state: QueensState = {
                    size: params.size,
                    queens: [...queens],
                    candidate: candidate && [candidate[0], candidate[1]],
                    conflict: conflict && [conflict[0], conflict[1]],
                    attempts,
                    backtracks,
                }
                return {
                    index: step,
                    state,
                    activeLines,
                    event,
                    explanation,
                    metrics: [
                        { label: 'Attempts', value: attempts },
                        { label: 'Backtracks', value: backtracks },
                        {
                            label: 'Placed queens',
                            value: queens.filter((column) => column >= 0).length,
                        },
                    ],
                }
            },
        }
    }
    yield record(
        'initialize',
        `Place one queen in each of ${params.size} rows without shared columns or diagonals.`,
        [1],
    )
    function* place(row: number): Generator<ProducedStep<QueensState>, boolean> {
        if (row === params.size) return true
        for (let column = 0; column < params.size; column++) {
            attempts++
            candidate = [row, column]
            conflict = null
            for (let earlier = 0; earlier < row; earlier++) {
                if (
                    queens[earlier] === column ||
                    Math.abs(queens[earlier] - column) === row - earlier
                ) {
                    conflict = [earlier, queens[earlier]]
                    break
                }
            }
            yield record('candidate', `Try row ${row + 1}, column ${column + 1}.`, [2, 3])
            if (conflict) {
                yield record(
                    'reject',
                    `Reject this square: it shares a ${conflict[1] === column ? 'column' : 'diagonal'} with the queen in row ${conflict[0] + 1}.`,
                    [4],
                )
                continue
            }
            queens[row] = column
            conflict = null
            yield record('place', `Place a queen at row ${row + 1}, column ${column + 1}.`, [5])
            if (yield* place(row + 1)) return true
            queens[row] = -1
            backtracks++
            candidate = [row, column]
            yield record(
                'backtrack',
                `No completion follows this choice; remove the queen from row ${row + 1}, column ${column + 1}.`,
                [6],
            )
        }
        return false
    }
    const solved = yield* place(0)
    candidate = null
    conflict = null
    yield record(
        solved ? 'success' : 'no-solution',
        solved
            ? `Found ${params.size} non-attacking queens in the first complete branch.`
            : `No arrangement exists for a ${params.size}×${params.size} board.`,
        [solved ? 7 : 8],
    )
    return solved ? 'success' : 'no-solution'
}
