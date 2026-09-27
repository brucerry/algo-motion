import type { Metric, Params, SimulationRun } from '../../engine/types'
import { collectSteps } from '../../engine/steps'
import { gridSteps } from './steps'
import { createRandom, deriveSeed } from '../../engine/seededRandom'

export type GridParams = Params & {
    width: number
    depth: number
    density: number
    diagonal: boolean
    seed: number
    weightMode: 'uniform' | 'terrain'
    heuristic: 'manhattan' | 'euclidean' | 'chebyshev'
    heuristicWeight: number
}
export type GridEnvironment = {
    width: number
    depth: number
    blocked: boolean[]
    weights: number[]
    start: number
    goal: number
    diagonal: boolean
}
export type GridScore = { g: number; h: number; f: number; parent: number | null }
export type GridState = {
    environment: GridEnvironment
    current: number | null
    frontier: number[]
    visited: number[]
    path: number[]
    scores: Record<number, GridScore>
}
export type GridAlgorithm = 'astar' | 'bfs' | 'dijkstra' | 'dfs'

export const gridDefaults: GridParams = {
    width: 16,
    depth: 12,
    density: 0.18,
    diagonal: false,
    seed: 12345,
    weightMode: 'uniform',
    heuristic: 'manhattan',
    heuristicWeight: 1,
}

export function createGrid(params: GridParams): GridEnvironment {
    if (
        !Number.isInteger(params.width) ||
        !Number.isInteger(params.depth) ||
        params.width < 4 ||
        params.depth < 4 ||
        params.width > 240 ||
        params.depth > 240 ||
        !Number.isFinite(params.density) ||
        params.density < 0 ||
        params.density > 0.38
    ) {
        throw new Error('Grid settings exceed safe limits.')
    }
    const random = createRandom(deriveSeed(params.seed, 'grid-environment'))
    const size = params.width * params.depth
    const blocked = Array.from(
        { length: size },
        (_, id) => id !== 0 && id !== size - 1 && random.next() < params.density,
    )
    const weights = Array.from({ length: size }, () =>
        params.weightMode === 'terrain' ? random.integer(1, 6) : 1,
    )
    return {
        width: params.width,
        depth: params.depth,
        blocked,
        weights,
        start: 0,
        goal: size - 1,
        diagonal: params.diagonal,
    }
}

export function gridNeighbors(env: GridEnvironment, id: number): { id: number; cost: number }[] {
    const x = id % env.width,
        y = Math.floor(id / env.width)
    const directions = [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
        ...(env.diagonal
            ? [
                  [1, 1],
                  [-1, 1],
                  [-1, -1],
                  [1, -1],
              ]
            : []),
    ]
    const result: { id: number; cost: number }[] = []
    for (const [dx, dy] of directions) {
        const nx = x + dx,
            ny = y + dy
        if (nx < 0 || nx >= env.width || ny < 0 || ny >= env.depth) continue
        const next = ny * env.width + nx
        if (env.blocked[next]) continue
        if (dx && dy && (env.blocked[y * env.width + nx] || env.blocked[ny * env.width + x]))
            continue
        result.push({ id: next, cost: env.weights[next] * (dx && dy ? Math.SQRT2 : 1) })
    }
    return result
}

export function heuristicDistance(
    env: GridEnvironment,
    from: number,
    to: number,
    mode: GridParams['heuristic'],
): number {
    const dx = Math.abs((from % env.width) - (to % env.width))
    const dy = Math.abs(Math.floor(from / env.width) - Math.floor(to / env.width))
    if (mode === 'manhattan') return dx + dy
    if (mode === 'chebyshev') return Math.max(dx, dy)
    return Math.hypot(dx, dy)
}

export function runGrid(
    algorithm: GridAlgorithm,
    params: GridParams,
    sharedEnvironment?: GridEnvironment,
): SimulationRun<GridState> {
    const environment = sharedEnvironment || createGrid(params)
    return collectSteps(gridSteps(algorithm, params, environment))
}
export function inspectGrid(state: GridState, selected: string): Metric[] | null {
    const id = Number(selected)
    if (!Number.isInteger(id) || id < 0 || id >= state.environment.blocked.length) return null
    const score = state.scores[id]
    const status = state.environment.blocked[id]
        ? 'Obstacle'
        : state.path.includes(id)
          ? 'Solution'
          : id === state.environment.start
            ? 'Start'
            : id === state.environment.goal
              ? 'Goal'
              : state.current === id
                ? 'Current'
                : state.frontier.includes(id)
                  ? 'Frontier'
                  : state.visited.includes(id)
                    ? 'Visited'
                    : 'Unvisited'
    const result: Metric[] = [
        {
            label: 'Cell',
            value: `(${id % state.environment.width}, ${Math.floor(id / state.environment.width)})`,
        },
        { label: 'State', value: status },
        { label: 'Terrain weight', value: state.environment.weights[id] },
    ]
    if (score)
        result.push(
            { label: 'g', value: +score.g.toFixed(2) },
            { label: 'h', value: +score.h.toFixed(2) },
            { label: 'f', value: +score.f.toFixed(2) },
            {
                label: 'Parent',
                value:
                    score.parent === null
                        ? 'None'
                        : `(${score.parent % state.environment.width}, ${Math.floor(score.parent / state.environment.width)})`,
            },
        )
    return result
}
