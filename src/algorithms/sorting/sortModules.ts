import { lazy } from 'react'
import type { AlgorithmModule } from '../../engine/types'
import { bubbleModule } from './module'
import {
    inspectSort,
    runSort,
    sortSteps,
    type SortKind,
    type SortParams,
    type SortState,
} from './strategies'

const details: Record<
    SortKind,
    { name: string; description: string; intuition: string; complexity: string; lines: string[] }
> = {
    'insertion-sort': {
        name: 'Insertion Sort',
        description: 'Lift a key and shift larger neighbors to grow a sorted prefix.',
        intuition:
            'Like sorting cards in your hand: place each new card into the already sorted prefix. Equal values are never shifted past one another.',
        complexity:
            'O(n²) worst-case time, O(n) best-case time on sorted input, and O(1) working space, excluding replay frames.',
        lines: [
            'start with a one-item sorted prefix',
            'lift the next key',
            'compare with the preceding value',
            'shift larger values right',
            'insert the key into the prefix',
            'return the sorted array',
        ],
    },
    'quick-sort': {
        name: 'Quick Sort',
        description: 'Partition around a pivot, then sort the smaller ranges.',
        intuition:
            'Lomuto partition places values at or below the final-item pivot on its left. The pivot then occupies its final position. This variant is not stable.',
        complexity:
            'O(n log n) average time and O(n²) worst-case time; an explicit range stack uses up to O(n) space, excluding replay frames.',
        lines: [
            'push the full array range',
            'choose the last value as pivot',
            'compare each value with the pivot',
            'swap qualifying values into the left partition',
            'fix the pivot; push left and right ranges',
            'return the sorted array',
        ],
    },
    'merge-sort': {
        name: 'Merge Sort',
        description: 'Split into halves and merge their values through a stable buffer.',
        intuition:
            'Two sorted halves can be combined by repeatedly taking their smaller head. Choosing the left head on ties preserves equal-item order.',
        complexity: 'O(n log n) time and O(n) auxiliary storage, excluding replay frames.',
        lines: [
            'start with the full array range',
            'split and recursively sort both halves',
            'compare the heads of both sorted halves',
            'append the smaller head to the merge buffer',
            'copy the buffer back into the array',
            'return the sorted array',
        ],
    },
}
function makeModule(id: SortKind): AlgorithmModule<SortState> {
    const detail = details[id]
    return {
        meta: {
            ...bubbleModule.meta,
            id,
            name: detail.name,
            shortName: detail.name,
            description: detail.description,
            tags: ['sorting', id === 'quick-sort' ? 'partition' : 'stable'],
        },
        parameters: bubbleModule.parameters,
        defaults: bubbleModule.defaults,
        presets: [
            { name: 'Small array', values: { count: 6, seed: 23 } },
            { name: 'Larger array', values: { count: 100, seed: 71 } },
        ],
        pseudocode: detail.lines.map((text, i) => ({ id: i + 1, text })),
        education: {
            overview: detail.description,
            intuition: detail.intuition,
            complexity: detail.complexity,
            applications:
                id === 'insertion-sort'
                    ? 'Small or nearly sorted collections and hybrid sorting algorithms.'
                    : 'General-purpose ordering and divide-and-conquer reasoning.',
            legend: [
                ...bubbleModule.education.legend,
                { label: 'Solution', color: '#78bd8c', meaning: 'Fixed pivot', mark: '◆' },
            ],
            references: bubbleModule.education.references,
        },
        run: (params) => runSort(id, params as SortParams),
        steps: (params) => sortSteps(id, params as SortParams),
        renderer: lazy(() => import('./SortScene')),
        inspect: inspectSort,
    }
}
export const insertionModule = makeModule('insertion-sort')
export const quickModule = makeModule('quick-sort')
export const mergeModule = makeModule('merge-sort')
