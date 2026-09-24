import { lazy } from 'react'
import type { AlgorithmModule, ParameterDefinition } from '../../engine/types'
import { inspectInterval, runIntervals, type IntervalParams, type IntervalState } from './intervals'

const parameters: ParameterDefinition[] = [
    {
        type: 'number',
        key: 'count',
        label: 'Activity count',
        defaultValue: 8,
        min: 4,
        max: 120,
        integer: true,
        control: 'slider',
        description: 'Number of candidate time intervals.',
    },
    { type: 'seed', key: 'seed', label: 'Random seed', defaultValue: 12345 },
]

export const intervalModule: AlgorithmModule<IntervalState> = {
    meta: {
        id: 'interval-scheduling',
        name: 'Greedy Interval Scheduling',
        shortName: 'Interval Scheduling',
        category: 'Optimization',
        dimensionality: 'Timeline in 3D',
        description: 'Choose the earliest-finishing compatible activities.',
        tags: ['greedy', 'interval scheduling', 'optimization'],
        camera: { distance: 10, perspective: [0, 7, 6] },
    },
    parameters,
    defaults: { count: 8, seed: 12345 },
    presets: [
        { name: 'Few activities', values: { count: 5, seed: 13 } },
        { name: 'Crowded schedule', values: { count: 12, seed: 90 } },
    ],
    pseudocode: [
        { id: 1, text: 'sort activities by finish, start, then ID' },
        { id: 2, text: 'consider the next activity' },
        { id: 3, text: 'if start ≥ last finish: accept it' },
        { id: 4, text: 'otherwise: reject overlap' },
        { id: 5, text: 'return the maximum-size compatible set' },
    ],
    education: {
        overview: 'Interval scheduling chooses as many non-overlapping activities as possible.',
        intuition:
            'An earlier finish leaves at least as much room for later activities as a later finish. Intervals use [start, end), so touching endpoints are compatible.',
        complexity:
            'O(n log n) time for sorting, then O(n) scanning; O(n) for sorted candidates and replay frames.',
        applications: 'Scheduling rooms, jobs, and other non-overlapping reservations.',
        legend: [
            {
                label: 'Unvisited',
                color: '#cbded7',
                meaning: 'Activity awaiting its turn',
                mark: '□',
            },
            { label: 'Current', color: '#eb9867', meaning: 'Activity being considered', mark: '◎' },
            { label: 'Solution', color: '#78bd8c', meaning: 'Accepted interval', mark: '✓' },
            { label: 'Rejected', color: '#d67972', meaning: 'Overlapping interval', mark: '×' },
        ],
        references: [
            {
                label: 'Introduction to Algorithms, greedy activity selection',
                url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
                kind: 'standard',
            },
        ],
    },
    run: (params) => runIntervals(params as IntervalParams),
    renderer: lazy(() => import('./IntervalScene')),
    inspect: inspectInterval,
}
