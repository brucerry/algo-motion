import { lazy } from 'react'
import type { AlgorithmModule, ParameterDefinition } from '../../engine/types'
import { inspectBinary, runBinary, type BinaryParams, type BinaryState } from './binary'
import { inspectTwoSum, runTwoSum, type TwoSumParams, type TwoSumState } from './twoSum'

const common: ParameterDefinition[] = [
    {
        type: 'number',
        key: 'count',
        label: 'Array size',
        defaultValue: 10,
        min: 4,
        max: 160,
        integer: true,
        control: 'slider',
        description: 'Number of sorted values.',
    },
    { type: 'seed', key: 'seed', label: 'Random seed', defaultValue: 12345 },
]
const valueMaximum = (count: number) => Math.max(20, count * 2)

const legend = [
    { label: 'Unvisited', color: '#cbded7', meaning: 'Value still in the active range', mark: '□' },
    { label: 'Current', color: '#eb9867', meaning: 'Active midpoint or pointer', mark: '◎' },
    {
        label: 'Visited',
        color: '#8bb9cb',
        meaning: 'Value excluded from the remaining search',
        mark: '×',
    },
    { label: 'Solution', color: '#78bd8c', meaning: 'Matching value or pair', mark: '◆' },
]
const reference = [
    {
        label: 'Introduction to Algorithms, searching and arrays',
        url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
        kind: 'standard' as const,
    },
]

export const binaryModule: AlgorithmModule<BinaryState> = {
    meta: {
        id: 'binary-search',
        name: 'Binary Search',
        shortName: 'Binary Search',
        category: 'Array Techniques',
        dimensionality: 'Array in 3D',
        description: 'Halve a sorted search range to find the first matching value.',
        tags: ['binary-search', 'divide and conquer', 'arrays'],
        camera: { distance: 11, targetY: 0.7, perspective: [0, 7, 10] },
    },
    parameters: [
        ...common,
        {
            type: 'number',
            key: 'target',
            label: 'Target value',
            defaultValue: 10,
            min: 0,
            max: 321,
            bounds: (params) => ({ max: valueMaximum(Number(params.count)) + 1 }),
            integer: true,
            description: 'Find the first matching index, if present.',
        },
    ],
    defaults: { count: 10, target: 10, seed: 12345 },
    presets: [
        { name: 'Short array', values: { count: 6, target: 10, seed: 21 } },
        { name: 'Missing target', values: { count: 12, target: 0, seed: 77 } },
    ],
    pseudocode: [
        { id: 1, text: 'low ← 0; high ← last index' },
        { id: 2, text: 'compare target with middle value' },
        { id: 3, text: 'if middle ≥ target: save match, search left' },
        { id: 4, text: 'otherwise: search right' },
        { id: 5, text: 'return first match or not found' },
    ],
    education: {
        overview:
            'Binary search narrows an ascending array by excluding half of the remaining range after each comparison.',
        intuition:
            'To return the first duplicate, continue searching left even after finding a match.',
        complexity: 'O(log n) comparisons and O(1) working space, excluding recorded frames.',
        applications: 'Fast lookup in sorted collections and boundary finding.',
        legend,
        references: reference,
    },
    run: (params) => runBinary(params as BinaryParams),
    renderer: lazy(() => import('./BinaryScene')),
    inspect: inspectBinary,
}

export const twoSumModule: AlgorithmModule<TwoSumState> = {
    meta: {
        id: 'sorted-two-sum',
        name: 'Sorted Two-Sum',
        shortName: 'Two Pointers',
        category: 'Array Techniques',
        dimensionality: 'Array in 3D',
        description: 'Move two pointers inward until their values meet the target sum.',
        tags: ['two-pointers', 'arrays', 'pair sum'],
        camera: { distance: 11, targetY: 0.7, perspective: [0, 7, 10] },
    },
    parameters: [
        ...common,
        {
            type: 'number',
            key: 'target',
            label: 'Target sum',
            defaultValue: 19,
            min: 0,
            max: 641,
            bounds: (params) => ({ max: valueMaximum(Number(params.count)) * 2 + 1 }),
            integer: true,
            description: 'Desired sum of two distinct array positions.',
        },
    ],
    defaults: { count: 10, target: 19, seed: 12345 },
    presets: [
        { name: 'Small pair search', values: { count: 6, target: 16, seed: 21 } },
        { name: 'No pair', values: { count: 12, target: 0, seed: 77 } },
    ],
    pseudocode: [
        { id: 1, text: 'left ← 0; right ← last index' },
        { id: 2, text: 'compare values[left] + values[right] with target' },
        { id: 3, text: 'if equal: return this pair' },
        { id: 4, text: 'if too small: move left rightward' },
        { id: 5, text: 'if too large: move right leftward' },
        { id: 6, text: 'if pointers meet: no pair exists' },
    ],
    education: {
        overview:
            'The two-pointer technique finds a target pair in a sorted array without checking every pair.',
        intuition:
            'A too-small sum can only be improved by moving the left pointer right; a too-large sum calls for moving the right pointer left.',
        complexity: 'O(n) time and O(1) working space, excluding recorded frames.',
        applications: 'Pair searches and other monotonic scans over sorted data.',
        legend,
        references: reference,
    },
    run: (params) => runTwoSum(params as TwoSumParams),
    renderer: lazy(() => import('./TwoSumScene')),
    inspect: inspectTwoSum,
}
