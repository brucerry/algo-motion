import { lazy } from 'react'
import type { AlgorithmModule, ParameterDefinition } from '../../engine/types'
import { inspectQueens, runQueens, type QueensParams, type QueensState } from './queens'

const parameters: ParameterDefinition[] = [
    {
        type: 'number',
        key: 'size',
        label: 'Board size',
        defaultValue: 4,
        min: 1,
        max: 80,
        integer: true,
        control: 'slider',
        description: 'Place one queen in each row of this square board.',
    },
]

export const queensModule: AlgorithmModule<QueensState> = {
    meta: {
        id: 'n-queens',
        name: 'N-Queens Backtracking',
        shortName: 'N-Queens',
        category: 'Backtracking',
        dimensionality: 'Board in 3D',
        description: 'Try queen placements, reject attacks, and rewind dead ends.',
        tags: ['backtracking', 'constraint search', 'queens'],
        camera: { distance: 8, perspective: [0, 6, 5] },
    },
    parameters,
    defaults: { size: 4 },
    presets: [
        { name: 'Four queens', values: { size: 4 } },
        { name: 'No solution', values: { size: 3 } },
        { name: 'Classic eight', values: { size: 8 } },
    ],
    pseudocode: [
        { id: 1, text: 'place one queen in each row' },
        { id: 2, text: 'for each column in the current row:' },
        { id: 3, text: '  test the candidate square' },
        { id: 4, text: '  if attacked: reject it' },
        { id: 5, text: '  place queen and recurse to next row' },
        { id: 6, text: '  if branch fails: remove queen and backtrack' },
        { id: 7, text: 'return the first complete board' },
        { id: 8, text: 'if all branches fail: no solution' },
    ],
    education: {
        overview:
            'N-Queens asks for one queen in every row and column without any diagonal attacks.',
        intuition:
            'A safe local placement is tentative. If later rows cannot be filled, undo it and try the next column.',
        complexity:
            'The row-by-row search is exponential; unique-column pruning leaves at most n! column assignments before diagonal checks. Replay snapshots add memory.',
        applications: 'Constraint solving and systematic search with undo.',
        legend: [
            {
                label: 'Current',
                color: '#eb9867',
                meaning: 'Candidate square being tested',
                mark: '◎',
            },
            { label: 'Rejected', color: '#d67972', meaning: 'Attacked candidate', mark: '×' },
            {
                label: 'Solution',
                color: '#78bd8c',
                meaning: 'Placed queen in the current branch',
                mark: '♛',
            },
        ],
        references: [
            {
                label: 'Introduction to Algorithms, backtracking and search',
                url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
                kind: 'standard',
            },
        ],
    },
    run: (params) => runQueens(params as QueensParams),
    renderer: lazy(() => import('./QueensScene')),
    inspect: inspectQueens,
}
