import type { Frame, Metric, Params, SimulationRun } from '../../engine/types'
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
export type GridAlgorithm = 'astar' | 'bfs' | 'dijkstra'

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
        params.width > 24 ||
        params.depth > 24 ||
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

function pathFrom(parent: Map<number, number>, goal: number): number[] {
    const path = [goal]
    let node = goal
    while (parent.has(node)) {
        node = parent.get(node)!
        path.push(node)
    }
    return path.reverse()
}

function stateMetrics(state: GridState, algorithm: GridAlgorithm): Metric[] {
    const current = state.current === null ? null : state.scores[state.current]
    const result: Metric[] = [
        { label: 'Visited nodes', value: state.visited.length },
        { label: algorithm === 'bfs' ? 'Queue' : 'Frontier', value: state.frontier.length },
        { label: 'Path hops', value: state.path.length ? state.path.length - 1 : '—' },
    ]
    if (current)
        result.push({
            label: algorithm === 'bfs' ? 'Distance' : 'Current cost',
            value: +current.g.toFixed(2),
        })
    if (algorithm === 'astar' && current)
        result.push(
            { label: 'h', value: +current.h.toFixed(2) },
            { label: 'f', value: +current.f.toFixed(2) },
        )
    if (state.path.length && algorithm !== 'bfs')
        result.push({ label: 'Path cost', value: +state.scores[state.path.at(-1)!].g.toFixed(2) })
    return result
}

export function runGrid(
    algorithm: GridAlgorithm,
    params: GridParams,
    sharedEnvironment?: GridEnvironment,
): SimulationRun<GridState> {
    const environment = sharedEnvironment || createGrid(params)
    const frontier = new Set<number>([environment.start])
    const visited = new Set<number>()
    const parent = new Map<number, number>()
    const g = new Map<number, number>([[environment.start, 0]])
    const scores: Record<number, GridScore> = {}
    const frames: Frame<GridState>[] = []
    let current: number | null = null
    let path: number[] = []
    const hFor = (node: number) =>
        algorithm === 'astar'
            ? heuristicDistance(environment, node, environment.goal, params.heuristic)
            : 0
    scores[environment.start] = {
        g: 0,
        h: hFor(environment.start),
        f: hFor(environment.start) * (algorithm === 'astar' ? params.heuristicWeight : 1),
        parent: null,
    }
    const record = (event: string, explanation: string, activeLines: number[]) => {
        const state: GridState = {
            environment,
            current,
            frontier: [...frontier],
            visited: [...visited],
            path: [...path],
            scores: Object.fromEntries(
                Object.entries(scores).map(([id, score]) => [id, { ...score }]),
            ),
        }
        frames.push({
            index: frames.length,
            state,
            activeLines,
            event,
            explanation,
            metrics: stateMetrics(state, algorithm),
        })
    }
    record(
        'initialize',
        `Start at cell (0, 0). The goal is (${environment.width - 1}, ${environment.depth - 1}).`,
        [1],
    )
    while (frontier.size) {
        if (algorithm === 'bfs') current = frontier.values().next().value!
        else
            current = [...frontier].sort(
                (a, b) => scores[a].f - scores[b].f || scores[a].h - scores[b].h || a - b,
            )[0]
        frontier.delete(current)
        visited.add(current)
        const here = scores[current]
        record(
            'visit',
            `${algorithm.toUpperCase()} selected (${current % environment.width}, ${Math.floor(current / environment.width)}) with ${algorithm === 'astar' ? `g=${here.g.toFixed(2)}, h=${here.h.toFixed(2)}, f=${here.f.toFixed(2)}` : `distance=${here.g.toFixed(2)}`}.`,
            [2, 3],
        )
        if (current === environment.goal) {
            path = pathFrom(parent, current)
            record(
                'success',
                algorithm === 'bfs'
                    ? `Goal reached in ${path.length - 1} hops. BFS does not optimize weighted terrain cost.`
                    : `Goal reached. The route contains ${path.length - 1} moves and has cost ${here.g.toFixed(2)}.`,
                [5],
            )
            return { frames, outcome: 'success' }
        }
        for (const neighbor of gridNeighbors(environment, current)) {
            const candidate = here.g + (algorithm === 'bfs' ? 1 : neighbor.cost)
            if (algorithm === 'bfs' && (frontier.has(neighbor.id) || visited.has(neighbor.id)))
                continue
            if (algorithm !== 'bfs' && candidate >= (g.get(neighbor.id) ?? Infinity) - 1e-9)
                continue
            parent.set(neighbor.id, current)
            g.set(neighbor.id, candidate)
            const h = hFor(neighbor.id)
            scores[neighbor.id] = {
                g: candidate,
                h,
                f: candidate + (algorithm === 'astar' ? params.heuristicWeight * h : 0),
                parent: current,
            }
            visited.delete(neighbor.id)
            frontier.add(neighbor.id)
            record(
                'discover',
                `Updated (${neighbor.id % environment.width}, ${Math.floor(neighbor.id / environment.width)}) from current node; tentative ${algorithm === 'bfs' ? 'distance' : 'cost'} is ${candidate.toFixed(2)}.`,
                [4],
            )
        }
    }
    current = null
    record(
        'no-path',
        'The frontier is empty. No traversable route connects start and goal in this environment.',
        [6],
    )
    return { frames, outcome: 'no-path' }
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
