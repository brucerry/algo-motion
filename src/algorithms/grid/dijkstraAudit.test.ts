import { describe, expect, it } from 'vitest'
import { createGrid, gridDefaults, runGrid, type GridEnvironment } from './grid'

// Bellman-Ford oracle deliberately does not use the search frontier or gridNeighbors.
function referenceCost(env: GridEnvironment): number {
    const distances = Array(env.width * env.depth).fill(Infinity) as number[]
    distances[env.start] = 0
    const directions = env.diagonal
        ? [
              [1, 0],
              [0, 1],
              [-1, 0],
              [0, -1],
              [1, 1],
              [-1, 1],
              [-1, -1],
              [1, -1],
          ]
        : [
              [1, 0],
              [0, 1],
              [-1, 0],
              [0, -1],
          ]
    for (let pass = 0; pass < distances.length - 1; pass++) {
        let changed = false
        for (let id = 0; id < distances.length; id++) {
            if (env.blocked[id] || !Number.isFinite(distances[id])) continue
            const x = id % env.width
            const y = Math.floor(id / env.width)
            for (const [dx, dy] of directions) {
                const nx = x + dx
                const ny = y + dy
                if (nx < 0 || ny < 0 || nx >= env.width || ny >= env.depth) continue
                const next = ny * env.width + nx
                if (env.blocked[next]) continue
                if (
                    dx &&
                    dy &&
                    (env.blocked[y * env.width + nx] || env.blocked[ny * env.width + x])
                )
                    continue
                const cost = env.weights[next] * (dx && dy ? Math.SQRT2 : 1)
                if (distances[id] + cost < distances[next]) {
                    distances[next] = distances[id] + cost
                    changed = true
                }
            }
        }
        if (!changed) break
    }
    return distances[env.goal]
}

function routeCost(env: GridEnvironment, route: number[]): number {
    let total = 0
    for (let index = 1; index < route.length; index++) {
        const previous = route[index - 1]
        const current = route[index]
        const dx = Math.abs((previous % env.width) - (current % env.width))
        const dy = Math.abs(Math.floor(previous / env.width) - Math.floor(current / env.width))
        expect(dx <= 1 && dy <= 1 && dx + dy > 0).toBe(true)
        expect(env.blocked[current]).toBe(false)
        total += env.weights[current] * (dx && dy ? Math.SQRT2 : 1)
    }
    return total
}

const plain: GridEnvironment = {
    width: 4,
    depth: 4,
    blocked: Array(16).fill(false),
    weights: Array(16).fill(1),
    start: 0,
    goal: 15,
    diagonal: false,
}

describe('Dijkstra independent shortest-path audit', () => {
    const expensiveShortcut: GridEnvironment = {
        ...plain,
        goal: 3,
        weights: plain.weights.map((_, id) => (id === 1 || id === 2 ? 9 : 1)),
    }
    const tiedRoutes: GridEnvironment = { ...plain, goal: 5 }
    const diagonal: GridEnvironment = {
        ...plain,
        diagonal: true,
        weights: plain.weights.map((_, id) => (id === 5 ? 4 : 1)),
    }
    const blockedGoal: GridEnvironment = {
        ...plain,
        blocked: plain.blocked.map((_, id) => id === 11 || id === 14),
    }
    const seeded = createGrid({
        ...gridDefaults,
        width: 9,
        depth: 8,
        density: 0.18,
        seed: 712,
        diagonal: true,
        weightMode: 'terrain',
    })

    for (const [name, environment] of Object.entries({
        expensiveShortcut,
        tiedRoutes,
        diagonal,
        blockedGoal,
        seeded,
    })) {
        it(`matches the independent cost on ${name}`, () => {
            const expected = referenceCost(environment)
            const result = runGrid('dijkstra', gridDefaults, environment)
            const final = result.frames.at(-1)!
            if (!Number.isFinite(expected)) {
                expect(result.outcome).toBe('no-path')
                expect(final.state.path).toEqual([])
            } else {
                expect(result.outcome).toBe('success')
                expect(final.state.scores[environment.goal].g).toBeCloseTo(expected, 8)
                expect(routeCost(environment, final.state.path)).toBeCloseTo(expected, 8)
            }
            const settled = result.frames
                .filter((frame) => frame.event === 'visit')
                .map((frame) => frame.state.scores[frame.state.current!].g)
            for (let index = 1; index < settled.length; index++) {
                expect(settled[index]).toBeGreaterThanOrEqual(settled[index - 1] - 1e-9)
            }
        })
    }

    it('takes a cheaper route with more hops than BFS', () => {
        const dijkstra = runGrid('dijkstra', gridDefaults, expensiveShortcut).frames.at(-1)!
        const bfs = runGrid('bfs', gridDefaults, expensiveShortcut).frames.at(-1)!
        expect(dijkstra.state.path.length).toBeGreaterThan(bfs.state.path.length)
        expect(routeCost(expensiveShortcut, dijkstra.state.path)).toBeLessThan(
            routeCost(expensiveShortcut, bfs.state.path),
        )
    })

    it('finds a seeded weighted teaching example', () => {
        const environment = createGrid({
            ...gridDefaults,
            width: 6,
            depth: 5,
            density: 0,
            seed: 353,
            weightMode: 'terrain',
        })
        const bfs = runGrid('bfs', gridDefaults, environment).frames.at(-1)!.state.path
        const dijkstra = runGrid('dijkstra', gridDefaults, environment).frames.at(-1)!.state.path
        expect(bfs.length - 1).toBe(9)
        expect(dijkstra.length - 1).toBe(11)
        expect(routeCost(environment, bfs)).toBe(27)
        expect(routeCost(environment, dijkstra)).toBe(20)
    })
})
