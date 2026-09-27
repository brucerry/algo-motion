import { describe, expect, it } from 'vitest'
import { algorithmById } from './registry'
import {
    comparisonInputLabel,
    comparisonMembers,
    comparisonSharedDefinitions,
    effectiveComparisonParams,
    initialComparisonSettings,
    sharedSortedArray,
} from './comparison'
import { runBinary } from '../algorithms/array/binary'
import { runTwoSum } from '../algorithms/array/twoSum'

describe('topic comparison settings', () => {
    it('includes every member of a multi-algorithm topic and hides singleton topics', () => {
        expect(comparisonMembers('Graph Search').map((item) => item.meta.id)).toEqual([
            'astar',
            'bfs',
            'dfs',
            'dijkstra',
        ])
        expect(comparisonMembers('Array Techniques').map((item) => item.meta.id)).toEqual([
            'binary-search',
            'sorted-two-sum',
        ])
        expect(comparisonMembers('Optimization').map((item) => item.meta.id)).toEqual([
            'gradient-descent',
            'interval-scheduling',
        ])
        expect(comparisonMembers('Sorting')).toEqual([])
        expect(comparisonMembers('Motion Planning')).toEqual([])
    })

    it('gives Graph Search one validated terrain setting even when entered from BFS', () => {
        const settings = initialComparisonSettings(
            'Graph Search',
            'bfs',
            { width: 8, depth: 7, density: 0.1, diagonal: false, seed: 42 },
            { dijkstra: { weightMode: 'terrain' } },
        )
        expect(settings.shared.weightMode).toBe('terrain')
        expect(comparisonSharedDefinitions('Graph Search').map((item) => item.key)).toContain(
            'weightMode',
        )
        for (const member of comparisonMembers('Graph Search')) {
            const effective = effectiveComparisonParams(
                member,
                settings.shared,
                settings.individual[member.meta.id],
            )
            expect(effective).toMatchObject({ width: 8, depth: 7, seed: 42, weightMode: 'terrain' })
        }
    })

    it('keeps array targets separate while clamping them to a new shared count', () => {
        const settings = initialComparisonSettings(
            'Array Techniques',
            'binary-search',
            { count: 40, seed: 21, target: 70 },
            { 'sorted-two-sum': { count: 40, seed: 99, target: 120 } },
        )
        expect(settings.shared).toEqual({ count: 40, seed: 21 })
        expect(settings.individual['binary-search'].target).toBe(70)
        expect(settings.individual['sorted-two-sum'].target).toBe(120)
        const small = { ...settings.shared, count: 4 }
        expect(
            effectiveComparisonParams(
                algorithmById('binary-search')!,
                small,
                settings.individual['binary-search'],
            ).target,
        ).toBe(21)
        expect(
            effectiveComparisonParams(
                algorithmById('sorted-two-sum')!,
                small,
                settings.individual['sorted-two-sum'],
            ).target,
        ).toBe(41)
        const values = sharedSortedArray(settings.shared)
        const binary = runBinary(
            settings.individual['binary-search'] as Parameters<typeof runBinary>[0],
            values,
        )
        const twoSum = runTwoSum(
            settings.individual['sorted-two-sum'] as Parameters<typeof runTwoSum>[0],
            values,
        )
        expect(binary.frames[0].state.items.map((item) => item.value)).toEqual(values)
        expect(twoSum.frames[0].state.items.map((item) => item.value)).toEqual(values)
    })

    it('uses separate Optimization inputs and labels their problem types', () => {
        const settings = initialComparisonSettings(
            'Optimization',
            'gradient-descent',
            algorithmById('gradient-descent')!.defaults,
        )
        expect(settings.shared).toEqual({})
        expect(
            comparisonInputLabel('gradient-descent', settings.individual['gradient-descent']),
        ).toContain('surface')
        expect(
            comparisonInputLabel('interval-scheduling', settings.individual['interval-scheduling']),
        ).toContain('scheduling activities')
    })
})
