import type { Metric, Params, SimulationRun } from '../../engine/types'
import { collectSteps, type ProducedStep } from '../../engine/steps'
import { createRandom, deriveSeed } from '../../engine/seededRandom'
export type SudokuParams = Params & { clueCount: number; seed: number; puzzle: string }
export type SudokuState = {
    board: number[]
    givens: boolean[]
    current: number | null
    candidate: number | null
    conflicts: number[]
    attempts: number
    backtracks: number
    solved: boolean
}
export function sudokuConflicts(board: number[], cell: number, value: number): number[] {
    const row = Math.floor(cell / 9),
        column = cell % 9
    return board.flatMap((digit, other) =>
        other !== cell &&
        digit === value &&
        (Math.floor(other / 9) === row ||
            other % 9 === column ||
            (Math.floor(other / 27) === Math.floor(row / 3) &&
                Math.floor((other % 9) / 3) === Math.floor(column / 3)))
            ? [other]
            : [],
    )
}
export function createSudoku(params: SudokuParams): number[] {
    if (!Number.isInteger(params.clueCount) || params.clueCount < 24 || params.clueCount > 65)
        throw new Error('Sudoku clue count must be from 24 to 65.')
    if (!['seeded', 'unsatisfiable'].includes(params.puzzle))
        throw new Error('Choose a valid Sudoku puzzle.')
    if (params.puzzle === 'unsatisfiable') {
        const board = Array<number>(81).fill(0)
        for (let digit = 1; digit <= 8; digit++) board[digit - 1] = digit
        board[17] = 9
        return board
    }
    const random = createRandom(deriveSeed(params.seed, 'sudoku'))
    const shuffle = <T>(values: T[]): T[] => {
        const result = [...values]
        for (let index = result.length - 1; index > 0; index--) {
            const other = random.integer(0, index)
            ;[result[index], result[other]] = [result[other], result[index]]
        }
        return result
    }
    const order = () =>
        shuffle([0, 1, 2]).flatMap((band) => shuffle([0, 1, 2]).map((offset) => band * 3 + offset))
    const rows = order(),
        columns = order(),
        digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])
    const board = rows.flatMap((row) =>
        columns.map((column) => digits[(row * 3 + Math.floor(row / 3) + column) % 9]),
    )
    for (const cell of shuffle(Array.from({ length: 81 }, (_, i) => i)).slice(params.clueCount))
        board[cell] = 0
    return board
}
export function* sudokuSteps(
    params: SudokuParams,
    input?: number[],
): Generator<ProducedStep<SudokuState>, SimulationRun<SudokuState>['outcome']> {
    const board = [...(input ?? createSudoku(params))]
    if (
        board.length !== 81 ||
        board.some((value) => !Number.isInteger(value) || value < 0 || value > 9)
    )
        throw new Error('Sudoku requires 81 digits from 0 (empty) to 9.')
    const givens = board.map((value) => value !== 0)
    let current: number | null = null,
        candidate: number | null = null,
        conflicts: number[] = []
    let attempts = 0,
        backtracks = 0,
        index = 0,
        solved = false
    const record = (
        event: string,
        explanation: string,
        activeLines: number[],
    ): ProducedStep<SudokuState> => {
        const step = index++
        return {
            index: step,
            materialize: () => ({
                index: step,
                event,
                explanation,
                activeLines,
                state: {
                    board: [...board],
                    givens,
                    current,
                    candidate,
                    conflicts: [...conflicts],
                    attempts,
                    backtracks,
                    solved,
                },
                metrics: [
                    { label: 'Candidates tried', value: attempts },
                    { label: 'Backtracks', value: backtracks },
                    { label: 'Filled cells', value: board.filter(Boolean).length },
                ],
            }),
        }
    }
    yield record(
        'initialize',
        'Keep the clues fixed; fill cells without repeating a digit in a row, column, or box.',
        [1],
    )
    for (let cell = 0; cell < 81; cell++)
        if (board[cell] && sudokuConflicts(board, cell, board[cell]).length) {
            current = cell
            conflicts = sudokuConflicts(board, cell, board[cell])
            yield record(
                'no-solution',
                'Fixed clues conflict. This puzzle has no valid solution.',
                [6],
            )
            return 'no-solution'
        }
    function* solve(): Generator<ProducedStep<SudokuState>, boolean> {
        let chosen = -1,
            fewest = 10
        for (let cell = 0; cell < 81; cell++)
            if (!board[cell]) {
                let possible = 0
                for (let value = 1; value <= 9; value++)
                    if (!sudokuConflicts(board, cell, value).length) possible++
                if (possible < fewest) {
                    chosen = cell
                    fewest = possible
                }
                if (fewest === 0) break
            }
        if (chosen < 0) return true
        for (let value = 1; value <= 9; value++) {
            current = chosen
            candidate = value
            conflicts = sudokuConflicts(board, chosen, value)
            attempts++
            yield record(
                'candidate',
                `Try ${value} at row ${Math.floor(chosen / 9) + 1}, column ${(chosen % 9) + 1}.`,
                [2, 3],
            )
            if (conflicts.length) {
                yield record(
                    'reject',
                    'Reject this digit because a row, column, or box already contains it.',
                    [3],
                )
                continue
            }
            board[chosen] = value
            yield record(
                'place',
                `Place ${value}; continue with the empty cell that has the fewest legal choices.`,
                [4],
            )
            if (yield* solve()) return true
            board[chosen] = 0
            current = chosen
            candidate = value
            conflicts = []
            backtracks++
            yield record(
                'backtrack',
                'This branch cannot complete the board. Remove the tentative digit and try the next one.',
                [5],
            )
        }
        return false
    }
    solved = yield* solve()
    current = null
    candidate = null
    conflicts = []
    yield record(
        solved ? 'success' : 'no-solution',
        solved
            ? 'A valid completed board was found. Every original clue is unchanged; uniqueness is not assumed.'
            : 'All valid branches were exhausted. This puzzle has no solution.',
        [6],
    )
    return solved ? 'success' : 'no-solution'
}
export const runSudoku = (params: SudokuParams, input?: number[]) =>
    collectSteps(sudokuSteps(params, input))
export function inspectSudoku(state: SudokuState, selected: string): Metric[] | null {
    const cell = Number(selected)
    if (!Number.isInteger(cell) || cell < 0 || cell >= 81) return null
    return [
        { label: 'Row', value: Math.floor(cell / 9) + 1 },
        { label: 'Column', value: (cell % 9) + 1 },
        { label: 'Digit', value: state.board[cell] || 'Empty' },
        {
            label: 'State',
            value: state.givens[cell]
                ? 'Fixed clue'
                : state.conflicts.includes(cell)
                  ? 'Conflict'
                  : state.board[cell]
                    ? 'Tentative placement'
                    : 'Empty',
        },
    ]
}
