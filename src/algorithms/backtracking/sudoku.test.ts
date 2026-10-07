import { describe, expect, it } from 'vitest'
import { createSudoku, runSudoku, sudokuSteps } from './sudoku'
const params = { clueCount: 45, seed: 12345, puzzle: 'seeded' }
const validateSolution = (board: number[], clues: number[]) => {
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    for (let row = 0; row < 9; row++)
        expect(board.slice(row * 9, row * 9 + 9).sort()).toEqual(digits)
    for (let col = 0; col < 9; col++)
        expect(Array.from({ length: 9 }, (_, row) => board[row * 9 + col]).sort()).toEqual(digits)
    for (let box = 0; box < 9; box++) {
        const values = Array.from(
            { length: 9 },
            (_, i) =>
                board[(Math.floor(box / 3) * 3 + Math.floor(i / 3)) * 9 + (box % 3) * 3 + (i % 3)],
        )
        expect(values.sort()).toEqual(digits)
    }
    clues.forEach((clue, index) => {
        if (clue) expect(board[index]).toBe(clue)
    })
}
describe('Sudoku backtracking', () => {
    it('solves seeded boards without modifying clues and produces deterministic states', () => {
        for (const seed of [1, 32, 12345]) {
            const input = { ...params, seed },
                clues = createSudoku(input),
                result = runSudoku(input)
            expect(clues.filter(Boolean)).toHaveLength(params.clueCount)
            expect(result.outcome).toBe('success')
            validateSolution(result.frames.at(-1)!.state.board, clues)
            expect(result.frames.some((frame) => frame.event === 'reject')).toBe(true)
            for (const frame of result.frames)
                clues.forEach((clue, index) => {
                    if (clue) expect(frame.state.board[index]).toBe(clue)
                })
        }
        expect(runSudoku(params)).toEqual(runSudoku(params))
    })
    it('exhausts a locally consistent impossible puzzle without fabricating a board', () => {
        const input = { ...params, puzzle: 'unsatisfiable' },
            clues = createSudoku(input),
            result = runSudoku(input)
        expect(result.outcome).toBe('no-solution')
        expect(result.frames.at(-1)!.state.board).toEqual(clues)
        expect(result.frames.at(-1)!.state.attempts).toBe(9)
    })
    it('can yield a lower-clue search lazily, including reversal frames', () => {
        const input = { ...params, clueCount: 24, seed: 2 },
            steps = sudokuSteps(input)
        const first = steps.next()
        if (first.done) throw new Error('Missing initial step')
        const saved = first.value.materialize()
        let last = saved,
            sawBacktrack = false
        for (;;) {
            const next = steps.next()
            if (next.done) {
                expect(next.value).toBe('success')
                break
            }
            last = next.value.materialize()
            if (last.event === 'backtrack') sawBacktrack = true
        }
        validateSolution(last.state.board, saved.state.board)
        expect(saved.state.board.filter(Boolean)).toHaveLength(24)
        expect(sawBacktrack).toBe(true)
    })
})
