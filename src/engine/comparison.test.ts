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
import { createWorkspace, rrtDefaults } from '../algorithms/rrt/rrt'

describe('topic comparison settings', () => {
    it('adjusts oversized logarithmic searches into the common comparison range', () => {
        const settings = initialComparisonSettings('Array Techniques', 'binary-search', {
            count: 16384,
            target: 0,
            seed: 42,
        })
        expect(settings.shared.count).toBe(160)
        expect(settings.notice).toContain('adjusted to 160')
        for (const member of comparisonMembers('Array Techniques')) {
            const params = effectiveComparisonParams(
                member,
                settings.shared,
                settings.individual[member.meta.id],
            )
            expect(params.count).toBe(160)
            expect(member.run(params).outcome).not.toBe('error')
        }
    })
    it('shares exact sorting values, tree geometry, and planning obstacles', () => {
        const sorting = initialComparisonSettings('Sorting', 'quick-sort', { count: 12, seed: 23 })
        const inputs = comparisonMembers('Sorting').map((member) => {
            const params = effectiveComparisonParams(
                member,
                sorting.shared,
                sorting.individual[member.meta.id],
            )
            return member
                .run(params)
                .frames[0].state.items.map((item: { value: number }) => item.value)
        })
        for (const values of inputs) expect(values).toEqual(inputs[0])
        const trees = initialComparisonSettings('Trees', 'bst-search', {
            count: 40,
            seed: 23,
            target: 0,
        })
        const nodes = comparisonMembers('Trees').map(
            (member) =>
                member.run(
                    effectiveComparisonParams(
                        member,
                        trees.shared,
                        trees.individual[member.meta.id],
                    ),
                ).frames[0].state.nodes,
        )
        expect(nodes[0]).toEqual(nodes[1])
        const planning = initialComparisonSettings('Motion Planning', 'rrt', {
            ...rrtDefaults,
            seed: 23,
        })
        const workspaces = comparisonMembers('Motion Planning').map((member) =>
            createWorkspace(
                effectiveComparisonParams(
                    member,
                    planning.shared,
                    planning.individual[member.meta.id],
                ) as typeof rrtDefaults,
            ),
        )
        expect(workspaces[0]).toEqual(workspaces[1])
    })
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
        expect(comparisonMembers('Sorting').map((item) => item.meta.id)).toEqual([
            'bubble-sort',
            'insertion-sort',
            'merge-sort',
            'quick-sort',
        ])
        expect(comparisonMembers('Motion Planning').map((item) => item.meta.id)).toEqual([
            'rrt',
            'rrt-star',
        ])
        expect(comparisonMembers('Trees').map((item) => item.meta.id)).toEqual([
            'bst-search',
            'inorder-traversal',
        ])
        expect(comparisonMembers('Unknown')).toEqual([])
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
