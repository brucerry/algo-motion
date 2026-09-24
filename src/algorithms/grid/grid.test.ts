import { describe, expect, it } from 'vitest'
import { createGrid, gridDefaults, gridNeighbors, runGrid, type GridEnvironment } from './grid'

const empty: GridEnvironment = {
    width: 4,
    depth: 4,
    blocked: Array(16).fill(false),
    weights: Array(16).fill(1),
    start: 0,
    goal: 15,
    diagonal: false,
}

describe('grid pathfinding', () => {
    it('generates a repeated map and reserves start and goal', () => {
        const a = createGrid(gridDefaults),
            b = createGrid(gridDefaults)
        expect(a).toEqual(b)
        expect(a.blocked[a.start]).toBe(false)
        expect(a.blocked[a.goal]).toBe(false)
        expect(createGrid({ ...gridDefaults, seed: 555 }).blocked).not.toEqual(a.blocked)
    })
    it('forbids diagonal corner cuts', () => {
        const env = {
            ...empty,
            diagonal: true,
            blocked: empty.blocked.map((value, id) => (id === 1 ? true : value)),
        }
        expect(gridNeighbors(env, 0).map((neighbor) => neighbor.id)).not.toContain(5)
    })
    it('finds valid shortest paths on known uniform maps', () => {
        for (const algorithm of ['astar', 'bfs', 'dijkstra'] as const) {
            const result = runGrid(algorithm, gridDefaults, empty)
            expect(result.outcome).toBe('success')
            const path = result.frames.at(-1)!.state.path
            expect(path[0]).toBe(0)
            expect(path.at(-1)).toBe(15)
            expect(path.length - 1).toBe(6)
            path.slice(1).forEach((id, index) =>
                expect(
                    gridNeighbors(empty, path[index]).some((neighbor) => neighbor.id === id),
                ).toBe(true),
            )
        }
    })
    it('reports blocked routes', () => {
        const blocked = { ...empty, blocked: empty.blocked.map((_, id) => id === 1 || id === 4) }
        for (const algorithm of ['astar', 'bfs', 'dijkstra'] as const)
            expect(runGrid(algorithm, gridDefaults, blocked).outcome).toBe('no-path')
    })
    it('uses minimum cost rather than minimum hops on weighted terrain', () => {
        const weighted = {
            ...empty,
            goal: 3,
            weights: empty.weights.map((_, id) => (id === 1 || id === 2 ? 9 : 1)),
        }
        const result = runGrid('dijkstra', gridDefaults, weighted)
        expect(result.outcome).toBe('success')
        expect(result.frames.at(-1)!.state.scores[3].g).toBe(5)
        expect(result.frames.at(-1)!.state.path).toEqual([0, 4, 5, 6, 7, 3])
        const bfs = runGrid('bfs', gridDefaults, weighted)
        expect(bfs.frames.at(-1)!.state.path).toEqual([0, 1, 2, 3])
        expect(bfs.frames.at(-1)!.metrics.some((metric) => metric.label === 'Path cost')).toBe(
            false,
        )
    })
})
