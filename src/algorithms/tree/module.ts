import { lazy } from 'react'
import type { AlgorithmModule, ParameterDefinition } from '../../engine/types'
import { inspectBst, runBst, type BstParams, type BstState } from './bst'

const parameters: ParameterDefinition[] = [
    {
        type: 'number',
        key: 'count',
        label: 'Node count',
        defaultValue: 9,
        min: 3,
        max: 120,
        integer: true,
        control: 'slider',
        description: 'Number of distinct keys inserted into the tree.',
    },
    {
        type: 'number',
        key: 'target',
        label: 'Target key',
        defaultValue: 50,
        min: 0,
        max: 1000,
        bounds: (params) => ({ max: Number(params.count) <= 24 ? 100 : 1000 }),
        integer: true,
        description: 'Key to search for, including values that may be absent.',
    },
    { type: 'seed', key: 'seed', label: 'Random seed', defaultValue: 12345 },
]

export const bstModule: AlgorithmModule<BstState> = {
    meta: {
        id: 'bst-search',
        name: 'Binary Search Tree Search',
        shortName: 'BST Search',
        category: 'Trees',
        dimensionality: '3D',
        description: 'Follow smaller or larger branches to find a key.',
        tags: ['tree', 'binary search tree', 'search'],
        camera: { distance: 11, targetY: 0.6, perspective: [0, 4.5, 10] },
    },
    parameters,
    defaults: { count: 9, target: 50, seed: 12345 },
    presets: [
        { name: 'Search a tree', values: { count: 8, target: 50, seed: 32 } },
        { name: 'Absent key', values: { count: 10, target: 0, seed: 19 } },
    ],
    pseudocode: [
        { id: 1, text: 'current ← root' },
        { id: 2, text: 'compare target with current key' },
        { id: 3, text: 'if equal: return current' },
        { id: 4, text: 'if smaller: go left; otherwise go right' },
        { id: 5, text: 'if child is empty: target is absent' },
    ],
    education: {
        overview:
            'A binary search tree keeps smaller keys on the left and larger keys on the right.',
        intuition:
            'Each comparison chooses a single branch. The visited path reveals how tree shape affects search.',
        complexity:
            'O(h) time for tree height h: O(log n) when balanced, O(n) in the worst unbalanced case. Recorded frames use additional space.',
        applications: 'Ordered lookup and dynamic set operations.',
        legend: [
            { label: 'Unvisited', color: '#cbded7', meaning: 'Node not yet compared', mark: '○' },
            { label: 'Current', color: '#eb9867', meaning: 'Node being compared', mark: '◎' },
            {
                label: 'Visited',
                color: '#8bb9cb',
                meaning: 'Earlier node on the search path',
                mark: '✓',
            },
            { label: 'Solution', color: '#78bd8c', meaning: 'Matching key', mark: '◆' },
        ],
        references: [
            {
                label: 'Introduction to Algorithms, binary search trees',
                url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
                kind: 'standard',
            },
        ],
    },
    run: (params) => runBst(params as BstParams),
    renderer: lazy(() => import('./BstScene')),
    inspect: inspectBst,
}
