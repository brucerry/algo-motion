import { lazy } from 'react'
import type { AlgorithmModule, ParameterDefinition } from '../../engine/types'
import { inspectKnapsack, runKnapsack, type KnapsackParams, type KnapsackState } from './knapsack'

const parameters: ParameterDefinition[] = [
    {
        type: 'number',
        key: 'count',
        label: 'Item count',
        defaultValue: 5,
        min: 3,
        max: 80,
        integer: true,
        control: 'slider',
        description: 'Number of items that can each be taken once.',
    },
    {
        type: 'number',
        key: 'capacity',
        label: 'Capacity',
        defaultValue: 10,
        min: 3,
        max: 180,
        bounds: (params) => ({ max: Math.min(180, Number(params.count) * 8) }),
        integer: true,
        control: 'slider',
        description: 'Maximum total item weight.',
    },
    { type: 'seed', key: 'seed', label: 'Random seed', defaultValue: 12345 },
]

export const knapsackModule: AlgorithmModule<KnapsackState> = {
    meta: {
        id: 'knapsack',
        name: '0/1 Knapsack',
        shortName: '0/1 Knapsack',
        category: 'Dynamic Programming',
        dimensionality: 'Table in 3D',
        description: 'Fill a value table, then trace back the chosen items.',
        tags: ['dynamic programming', 'optimization', 'table'],
        camera: { distance: 10, perspective: [0, 7, 6] },
    },
    parameters,
    defaults: { count: 5, capacity: 10, seed: 12345 },
    presets: [
        { name: 'Small puzzle', values: { count: 4, capacity: 8, seed: 29 } },
        { name: 'Tight capacity', values: { count: 7, capacity: 6, seed: 91 } },
    ],
    pseudocode: [
        { id: 1, text: 'row 0 ← zero for every capacity' },
        { id: 2, text: 'for each item and capacity:' },
        { id: 3, text: '  skip ← previous row, same capacity' },
        { id: 4, text: '  take ← item value + previous row, remaining capacity' },
        { id: 5, text: 'trace backward, taking only strict improvements' },
        { id: 6, text: 'return the selected subset and optimum value' },
    ],
    education: {
        overview:
            '0/1 Knapsack finds the maximum value that fits a weight capacity when each item is available once.',
        intuition:
            'Each table cell combines two smaller decisions: skip the current item or take it using remaining capacity from the previous row.',
        complexity:
            'O(nC) time and table space for n items and integer capacity C, excluding replay snapshots.',
        applications: 'Resource selection under a capacity constraint.',
        formula: String.raw`DP[i,c]=\max(DP[i-1,c],v_i+DP[i-1,c-w_i])`,
        legend: [
            { label: 'Unvisited', color: '#cbded7', meaning: 'Cell not filled yet', mark: '□' },
            { label: 'Visited', color: '#8bb9cb', meaning: 'Computed table cell', mark: '✓' },
            {
                label: 'Current',
                color: '#eb9867',
                meaning: 'Cell being filled or traced',
                mark: '◎',
            },
            {
                label: 'Solution',
                color: '#78bd8c',
                meaning: 'Row of a selected item during reconstruction',
                mark: '◆',
            },
        ],
        references: [
            {
                label: 'Introduction to Algorithms, dynamic programming',
                url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
                kind: 'standard',
            },
        ],
    },
    run: (params) => runKnapsack(params as KnapsackParams),
    renderer: lazy(() => import('./KnapsackScene')),
    inspect: inspectKnapsack,
}
