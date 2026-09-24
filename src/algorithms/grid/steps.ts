import type { Metric, SimulationRun } from '../../engine/types'
import type { ProducedStep } from '../../engine/steps'
import {
    gridNeighbors,
    heuristicDistance,
    type GridAlgorithm,
    type GridEnvironment,
    type GridParams,
    type GridScore,
    type GridState,
} from './grid'

function pathFrom(parent: Map<number, number>, goal: number): number[] {
    const path = [goal]
    for (let node = goal; parent.has(node);) {
        node = parent.get(node)!
        path.push(node)
    }
    return path.reverse()
}

function metrics(state: GridState, algorithm: GridAlgorithm): Metric[] {
    const current = state.current === null ? null : state.scores[state.current]
    const result: Metric[] = [
        { label: 'Visited nodes', value: state.visited.length },
        {
            label: algorithm === 'bfs' ? 'Queue' : algorithm === 'dfs' ? 'Stack' : 'Frontier',
            value: state.frontier.length,
        },
        { label: 'Path hops', value: state.path.length ? state.path.length - 1 : '—' },
    ]
    if (current)
        result.push({
            label: algorithm === 'bfs' || algorithm === 'dfs' ? 'Distance' : 'Current cost',
            value: +current.g.toFixed(2),
        })
    if (algorithm === 'astar' && current)
        result.push(
            { label: 'h', value: +current.h.toFixed(2) },
            { label: 'f', value: +current.f.toFixed(2) },
        )
    if (state.path.length && algorithm !== 'bfs' && algorithm !== 'dfs')
        result.push({ label: 'Path cost', value: +state.scores[state.path.at(-1)!].g.toFixed(2) })
    return result
}

type HeapItem = { id: number; f: number; h: number }
const compare = (a: HeapItem, b: HeapItem) => a.f - b.f || a.h - b.h || a.id - b.id

class MinHeap {
    private items: HeapItem[] = []
    push(item: HeapItem) {
        const items = this.items
        let at = items.length
        items.push(item)
        while (at > 0) {
            const parent = (at - 1) >> 1
            if (compare(items[parent], item) <= 0) break
            items[at] = items[parent]
            at = parent
        }
        items[at] = item
    }
    pop(): HeapItem | undefined {
        const items = this.items
        if (!items.length) return undefined
        const first = items[0],
            last = items.pop()!
        if (items.length) {
            let at = 0
            while (at * 2 + 1 < items.length) {
                let child = at * 2 + 1
                if (child + 1 < items.length && compare(items[child + 1], items[child]) < 0) child++
                if (compare(last, items[child]) <= 0) break
                items[at] = items[child]
                at = child
            }
            items[at] = last
        }
        return first
    }
}

export function* gridSteps(
    algorithm: GridAlgorithm,
    params: GridParams,
    environment: GridEnvironment,
): Generator<ProducedStep<GridState>, SimulationRun<GridState>['outcome']> {
    const frontier = new Set<number>([environment.start])
    const visited = new Set<number>()
    const parent = new Map<number, number>()
    const scores: Record<number, GridScore> = {}
    let current: number | null = null
    let path: number[] = []
    let index = 0
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
    const record = (
        event: string,
        explanation: string,
        activeLines: number[],
    ): ProducedStep<GridState> => {
        const step = index++
        return {
            index: step,
            materialize: () => {
                const state: GridState = {
                    environment,
                    current,
                    frontier: [...frontier],
                    visited: [...visited],
                    path: [...path],
                    scores: { ...scores },
                }
                return {
                    index: step,
                    state,
                    activeLines,
                    event,
                    explanation,
                    metrics: metrics(state, algorithm),
                }
            },
        }
    }

    if (algorithm === 'dfs') {
        const stack: { id: number; neighbors: ReturnType<typeof gridNeighbors>; next: number }[] =
            []
        frontier.clear()
        yield record('initialize', 'Start depth-first search at the first cell.', [1])
        const enter = (id: number) => {
            visited.add(id)
            frontier.add(id)
            current = id
        }
        enter(environment.start)
        yield record('visit', `Visit (0, 0); the stack has 1 cells.`, [2, 3])
        if (environment.start === environment.goal) {
            path = [environment.start]
            yield record(
                'success',
                'Found a valid route in 0 moves. DFS does not guarantee a shortest route.',
                [5],
            )
            return 'success'
        }
        stack.push({
            id: environment.start,
            neighbors: gridNeighbors(environment, environment.start),
            next: 0,
        })
        while (stack.length) {
            const top = stack.at(-1)!
            let neighbor: ReturnType<typeof gridNeighbors>[number] | undefined
            while (top.next < top.neighbors.length) {
                const candidate = top.neighbors[top.next++]
                if (!visited.has(candidate.id)) {
                    neighbor = candidate
                    break
                }
            }
            if (neighbor) {
                const next = neighbor.id
                parent.set(next, top.id)
                const cost = scores[top.id].g + 1
                scores[next] = { g: cost, h: 0, f: cost, parent: top.id }
                current = next
                yield record(
                    'discover',
                    `Try (${next % environment.width}, ${Math.floor(next / environment.width)}) from the current cell.`,
                    [4],
                )
                enter(next)
                yield record(
                    'visit',
                    `Visit (${next % environment.width}, ${Math.floor(next / environment.width)}); the stack has ${frontier.size} cells.`,
                    [2, 3],
                )
                if (next === environment.goal) {
                    path = pathFrom(parent, next)
                    yield record(
                        'success',
                        `Found a valid route in ${path.length - 1} moves. DFS does not guarantee a shortest route.`,
                        [5],
                    )
                    return 'success'
                }
                stack.push({ id: next, neighbors: gridNeighbors(environment, next), next: 0 })
            } else {
                stack.pop()
                frontier.delete(top.id)
                current = stack.at(-1)?.id ?? null
                yield record(
                    'backtrack',
                    `No unvisited branch remains at (${top.id % environment.width}, ${Math.floor(top.id / environment.width)}); backtrack.`,
                    [6],
                )
            }
        }
        yield record(
            'no-path',
            'Every reachable branch has been explored. No route reaches the goal.',
            [7],
        )
        return 'no-path'
    }

    const g = new Map<number, number>([[environment.start, 0]])
    const heap = new MinHeap()
    if (algorithm !== 'bfs')
        heap.push({
            id: environment.start,
            f: scores[environment.start].f,
            h: scores[environment.start].h,
        })
    yield record(
        'initialize',
        `Start at cell (0, 0). The goal is (${environment.width - 1}, ${environment.depth - 1}).`,
        [1],
    )
    while (frontier.size) {
        if (algorithm === 'bfs') current = frontier.values().next().value!
        else {
            let item: HeapItem | undefined
            do {
                item = heap.pop()
            } while (
                item &&
                (!frontier.has(item.id) ||
                    scores[item.id].f !== item.f ||
                    scores[item.id].h !== item.h)
            )
            if (!item) throw new Error('Priority frontier lost a candidate.')
            current = item.id
        }
        frontier.delete(current)
        visited.add(current)
        const here = scores[current]
        yield record(
            'visit',
            `${algorithm.toUpperCase()} selected (${current % environment.width}, ${Math.floor(current / environment.width)}) with ${algorithm === 'astar' ? `g=${here.g.toFixed(2)}, h=${here.h.toFixed(2)}, f=${here.f.toFixed(2)}` : `distance=${here.g.toFixed(2)}`}.`,
            [2, 3],
        )
        if (current === environment.goal) {
            path = pathFrom(parent, current)
            yield record(
                'success',
                algorithm === 'bfs'
                    ? `Goal reached in ${path.length - 1} hops. BFS does not optimize weighted terrain cost.`
                    : `Goal reached. The route contains ${path.length - 1} moves and has cost ${here.g.toFixed(2)}.`,
                [5],
            )
            return 'success'
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
            if (algorithm !== 'bfs') heap.push({ id: neighbor.id, f: scores[neighbor.id].f, h })
            yield record(
                'discover',
                `Updated (${neighbor.id % environment.width}, ${Math.floor(neighbor.id / environment.width)}) from current node; tentative ${algorithm === 'bfs' ? 'distance' : 'cost'} is ${candidate.toFixed(2)}.`,
                [4],
            )
        }
    }
    current = null
    yield record(
        'no-path',
        'The frontier is empty. No traversable route connects start and goal in this environment.',
        [6],
    )
    return 'no-path'
}
