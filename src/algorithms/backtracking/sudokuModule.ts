import { lazy } from 'react'
import type { AlgorithmModule } from '../../engine/types'
import { queensModule } from './module'
import {
    inspectSudoku,
    runSudoku,
    sudokuSteps,
    type SudokuParams,
    type SudokuState,
} from './sudoku'
export const sudokuModule: AlgorithmModule<SudokuState> = {
    meta: {
        id: 'sudoku',
        name: 'Sudoku Solver',
        shortName: 'Sudoku Solver',
        category: 'Backtracking',
        dimensionality: 'Board in 3D',
        description: 'Try digits, detect conflicts, and undo dead ends on a seeded Sudoku board.',
        tags: ['backtracking', 'constraints', 'minimum remaining values'],
        camera: { distance: 10, targetY: 0.2, perspective: [0, 8, 6] },
    },
    parameters: [
        {
            type: 'select',
            key: 'puzzle',
            label: 'Puzzle type',
            defaultValue: 'seeded',
            options: [
                { label: 'Seeded solvable puzzle', value: 'seeded' },
                { label: 'Unsatisfiable puzzle', value: 'unsatisfiable' },
            ],
        },
        {
            type: 'number',
            key: 'clueCount',
            label: 'Fixed clues',
            defaultValue: 45,
            min: 24,
            max: 65,
            integer: true,
            control: 'slider',
            description:
                'Clues retained in a seeded puzzle. A generated puzzle can have multiple solutions.',
        },
        { type: 'seed', key: 'seed', label: 'Random seed', defaultValue: 12345 },
    ],
    defaults: { clueCount: 45, seed: 12345, puzzle: 'seeded' },
    presets: [
        { name: 'Gentle puzzle', values: { clueCount: 60, seed: 32, puzzle: 'seeded' } },
        { name: 'More backtracking', values: { clueCount: 24, seed: 2, puzzle: 'seeded' } },
        { name: 'No solution', values: { puzzle: 'unsatisfiable' } },
    ],
    pseudocode: [
        'keep clues fixed; validate their constraints',
        'choose the empty cell with fewest legal digits',
        'try digits 1–9; reject row, column, or box conflicts',
        'place a legal digit and recurse',
        'if the branch fails: remove the digit and try again',
        'return the first solved board or no solution',
    ].map((text, index) => ({ id: index + 1, text })),
    education: {
        overview:
            'Solve a 9×9 Sudoku by deterministic backtracking while preserving the fixed clues.',
        intuition:
            'Choose the most constrained empty cell first. Tentative digits can lead to dead ends; removing them lets the solver explore another branch. Seeded puzzles are solvable but not guaranteed unique.',
        complexity:
            'Exponential worst-case search, up to O(9^E) assignments for E empty cells; O(E) recursion space, excluding replay frames.',
        applications: 'Constraint satisfaction, puzzle solving, and search with early pruning.',
        legend: [
            { label: 'Start', color: '#5cae9e', meaning: 'Fixed clue', mark: '●' },
            { label: 'Current', color: '#eb9867', meaning: 'Candidate cell', mark: '?' },
            {
                label: 'Rejected',
                color: '#d67972',
                meaning: 'Conflicting clue or digit',
                mark: '×',
            },
            { label: 'Visited', color: '#8bb9cb', meaning: 'Tentative placement', mark: '✓' },
            { label: 'Solution', color: '#78bd8c', meaning: 'Completed valid board', mark: '◆' },
        ],
        references: queensModule.education.references,
    },
    run: (params) => runSudoku(params as SudokuParams),
    steps: (params) => sudokuSteps(params as SudokuParams),
    renderer: lazy(() => import('./SudokuScene')),
    inspect: inspectSudoku,
}
