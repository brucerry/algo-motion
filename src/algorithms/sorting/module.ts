import { lazy } from 'react'
import type { AlgorithmModule, ParameterDefinition } from '../../engine/types'
import { inspectBubble, runBubble, type BubbleParams, type BubbleState } from './bubble'

const parameters: ParameterDefinition[] = [
    {
        type: 'number',
        key: 'count',
        label: 'Item count',
        defaultValue: 9,
        min: 4,
        max: 140,
        integer: true,
        control: 'slider',
        description: 'Number of values to sort.',
    },
    {
        type: 'seed',
        key: 'seed',
        label: 'Random seed',
        defaultValue: 12345,
        description: 'Replays the same starting array.',
    },
]

export const bubbleModule: AlgorithmModule<BubbleState> = {
    meta: {
        id: 'bubble-sort',
        name: 'Bubble Sort',
        shortName: 'Bubble Sort',
        category: 'Sorting',
        dimensionality: 'Array in 3D',
        description: 'Compare and swap neighboring blocks until the array is sorted.',
        tags: ['sorting', 'stable', 'adjacent swaps'],
        camera: { distance: 10, targetY: 0.7, perspective: [0, 7, 9] },
    },
    parameters,
    defaults: { count: 9, seed: 12345 },
    presets: [
        { name: 'Small array', values: { count: 6, seed: 23 } },
        { name: 'Many duplicates', values: { count: 12, seed: 71 } },
    ],
    pseudocode: [
        { id: 1, text: 'repeat passes through the unsorted prefix' },
        { id: 2, text: 'for each adjacent pair:' },
        { id: 3, text: '  compare left and right' },
        { id: 4, text: '  if left > right: swap' },
        { id: 5, text: 'the largest remaining value is fixed' },
        { id: 6, text: 'if no swaps: stop early' },
        { id: 7, text: 'return the sorted array' },
    ],
    education: {
        overview:
            'Bubble Sort repeatedly compares neighbors, moving larger values toward the right end.',
        intuition:
            'Each pass fixes one more rightmost position. Strict greater-than swaps preserve the order of equal values.',
        complexity:
            'O(n²) comparisons in the worst case; O(n) on already sorted input with early stop; O(1) working space, excluding recorded frames.',
        applications: 'A simple introduction to stable sorting and local swaps.',
        legend: [
            {
                label: 'Unvisited',
                color: '#cbded7',
                meaning: 'Item waiting for comparison',
                mark: '□',
            },
            { label: 'Current', color: '#eb9867', meaning: 'Pair being compared', mark: '◎' },
            {
                label: 'Visited',
                color: '#8bb9cb',
                meaning: 'Position fixed by a completed pass',
                mark: '✓',
            },
        ],
        references: [
            {
                label: 'Introduction to Algorithms, sorting foundations',
                url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
                kind: 'standard',
            },
        ],
    },
    run: (params) => runBubble(params as BubbleParams),
    renderer: lazy(() => import('./BubbleScene')),
    inspect: inspectBubble,
}
