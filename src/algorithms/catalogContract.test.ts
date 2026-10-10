import { describe, expect, it } from 'vitest'
import { algorithms, algorithmsInCategory, categories } from '../engine/registry'
import { SPEEDS } from '../engine/timeline'
import { validateParameters } from '../engine/parameters'
import { encodeHash, parseHash } from '../engine/url'
import type { Params } from '../engine/types'

const showcaseIds = [
    'dfs',
    'bubble-sort',
    'bst-search',
    'knapsack',
    'n-queens',
    'interval-scheduling',
    'binary-search',
    'sorted-two-sum',
    'insertion-sort',
    'quick-sort',
    'merge-sort',
    'inorder-traversal',
    'coin-change',
    'sudoku',
    'rrt-star',
    'rubiks-cube',
    'mirror-cube',
    'square-one',
]
const maximumSizes: Record<string, Record<string, number>> = {
    dfs: { width: 240, depth: 240 },
    'bubble-sort': { count: 140 },
    'bst-search': { count: 2048 },
    knapsack: { count: 80, capacity: 180 },
    'n-queens': { size: 80 },
    'interval-scheduling': { count: 120 },
    'binary-search': { count: 16384 },
    'sorted-two-sum': { count: 160 },
    'insertion-sort': { count: 140 },
    'quick-sort': { count: 140 },
    'merge-sort': { count: 140 },
    'inorder-traversal': { count: 2048 },
    'coin-change': { amount: 300 },
    sudoku: { clueCount: 65 },
    'rrt-star': { maxIterations: 6000 },
    'rubiks-cube': { scrambleLength: 100 },
    'mirror-cube': { scrambleLength: 100 },
    'square-one': { scrambleLength: 100 },
}

describe('showcase catalog contracts', () => {
    it('keeps displayed topics and algorithms in lexicographical order', () => {
        const sorted = (values: string[]) =>
            [...values].sort((left, right) =>
                left.localeCompare(right, 'en', { sensitivity: 'base' }),
            )
        expect(categories).toEqual(sorted(categories))
        for (const category of categories) {
            const labels = algorithmsInCategory(category).map(
                (algorithm) => algorithm.meta.shortName,
            )
            expect(labels).toEqual(sorted(labels))
        }
        expect(SPEEDS).toEqual([0.25, 0.5, 1, 2, 4, 8, 16, 32])
    })

    it('registers every showcase once with valid presets', () => {
        expect(algorithms).toHaveLength(23)
        expect(categories).toHaveLength(8)
        expect(algorithmsInCategory('Backtracking')).toHaveLength(5)
        expect(new Set(algorithms.map((algorithm) => algorithm.meta.id)).size).toBe(
            algorithms.length,
        )
        expect(algorithms.map((algorithm) => algorithm.meta.id).sort()).toEqual(
            [...showcaseIds, 'bfs', 'dijkstra', 'astar', 'rrt', 'gradient-descent'].sort(),
        )
        for (const id of showcaseIds) {
            const module = algorithms.find((algorithm) => algorithm.meta.id === id)
            expect(module).toBeDefined()
            expect(module!.meta.category).toBeTruthy()
            expect(module!.meta.tags.length).toBeGreaterThan(0)
            expect(module!.presets.length).toBeGreaterThan(0)
            for (const [key, maximum] of Object.entries(maximumSizes[id]))
                expect(module!.parameters.find((parameter) => parameter.key === key)).toMatchObject(
                    { max: maximum },
                )
            expect(validateParameters(module!.parameters, module!.defaults).errors).toEqual({})
            for (const preset of module!.presets) {
                expect(preset.name).toBeTruthy()
                const values = { ...module!.defaults, ...preset.values } as Params
                expect(validateParameters(module!.parameters, values).errors).toEqual({})
                const route = parseHash(encodeHash(id, values))
                expect(route.algorithmId).toBe(id)
                expect(validateParameters(module!.parameters, route.raw)).toEqual({
                    params: values,
                    errors: {},
                })
            }
        }
    })

    it('keeps each frame tied to readable learning content', () => {
        for (const id of showcaseIds) {
            const module = algorithms.find((algorithm) => algorithm.meta.id === id)!
            const lines = new Set(module.pseudocode.map((line) => line.id))
            expect(lines.size).toBe(module.pseudocode.length)
            for (const field of ['overview', 'intuition', 'complexity', 'applications'] as const)
                expect(module.education[field].trim().length).toBeGreaterThan(0)
            expect(module.education.legend.length).toBeGreaterThan(0)
            expect(module.education.references.length).toBeGreaterThan(0)
            if (!module.run) {
                expect(module.createTrace).toBeTypeOf('function')
                continue // Worker-only frame correctness is covered by its solver/trace tests.
            }
            const result = module.run(module.defaults)
            expect(result.frames.length).toBeGreaterThan(1)
            for (const frame of result.frames) {
                expect(frame.explanation.trim().length).toBeGreaterThan(0)
                expect(frame.event.trim().length).toBeGreaterThan(0)
                expect(frame.metrics.length).toBeGreaterThan(0)
                for (const line of frame.activeLines) expect(lines.has(line)).toBe(true)
            }
        }
    })
})
