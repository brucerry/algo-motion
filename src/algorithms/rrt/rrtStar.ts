import type { SimulationRun } from '../../engine/types'
import { collectSteps, type ProducedStep } from '../../engine/steps'
import { createRandom, deriveSeed } from '../../engine/seededRandom'
import {
    clearSegment,
    createWorkspace,
    distance,
    steer,
    validateRrtParameters,
    type RrtNode,
    type RrtParams,
    type RrtState,
    type Vec3,
} from './rrt'
export type RrtStarParams = RrtParams & { rewireRadius: number }
export type RrtStarState = RrtState & {
    neighbors: number[]
    rewired: number[]
    rewires: number
    radius: number
}
export function* rrtStarSteps(
    params: RrtStarParams,
): Generator<ProducedStep<RrtStarState>, SimulationRun<RrtStarState>['outcome']> {
    validateRrtParameters(params)
    if (
        !Number.isFinite(params.rewireRadius) ||
        params.rewireRadius < params.stepSize ||
        params.rewireRadius > params.workspace / 2
    )
        throw new Error('Rewire radius must lie between the step size and half the workspace.')
    const { start, goal, obstacles } = createWorkspace(params)
    const random = createRandom(deriveSeed(params.seed, 'rrt-samples'))
    const nodes: RrtNode[] = [{ id: 0, position: start, parent: null, cost: 0 }]
    const children: Set<number>[] = [new Set()]
    let goalId: number | null = null,
        sample: Vec3 | null = null,
        newestNode: number | null = null
    let neighbors: number[] = [],
        rewired: number[] = [],
        sampleRejected = false
    let iteration = 0,
        accepted = 0,
        rejected = 0,
        rewires = 0,
        radius = params.rewireRadius,
        index = 0
    const path = () => {
        if (goalId === null) return []
        const result: number[] = []
        let cursor: number | null = goalId
        while (cursor !== null) {
            result.push(cursor)
            cursor = nodes[cursor].parent
        }
        return result.reverse()
    }
    const record = (
        event: string,
        explanation: string,
        activeLines: number[],
    ): ProducedStep<RrtStarState> => {
        const step = index++
        return {
            index: step,
            materialize: () => ({
                index: step,
                event,
                explanation,
                activeLines,
                state: {
                    nodes: nodes.map((node) => ({ ...node })),
                    obstacles,
                    start,
                    goal,
                    sample: sample && [...sample],
                    sampleRejected,
                    newestNode,
                    path: path(),
                    iteration,
                    accepted,
                    rejected,
                    neighbors: [...neighbors],
                    rewired: [...rewired],
                    rewires,
                    radius,
                },
                metrics: [
                    { label: 'Iteration', value: iteration },
                    { label: 'Tree nodes', value: nodes.length },
                    { label: 'Rewires', value: rewires },
                    { label: 'Neighborhood radius', value: +radius.toFixed(2) },
                    {
                        label: 'Best route cost',
                        value: goalId === null ? '—' : +nodes[goalId].cost.toFixed(3),
                    },
                ],
            }),
        }
    }
    yield record(
        'initialize',
        'Grow a collision-free tree, choose cheaper parents, and keep improving any found route.',
        [1],
    )
    const half = params.workspace / 2
    for (iteration = 1; iteration <= params.maxIterations; iteration++) {
        sample =
            random.next() < params.goalBias
                ? [...goal]
                : [
                      random.between(-half, half),
                      random.between(-half, half),
                      random.between(-half, half),
                  ]
        newestNode = null
        neighbors = []
        rewired = []
        const candidates = nodes.filter((node) => node.id !== goalId)
        const nearest = candidates.reduce(
            (best, node) =>
                distance(node.position, sample!) < distance(best.position, sample!) ? node : best,
            nodes[0],
        )
        const point = steer(nearest.position, sample, params.stepSize)
        sampleRejected =
            !clearSegment(nearest.position, point, obstacles) ||
            nodes.some((node) => distance(node.position, point) < 1e-9)
        if (sampleRejected) {
            rejected++
            yield record(
                'rejected',
                'The extension collides with an obstacle or duplicates an existing point.',
                [2],
            )
            continue
        }
        radius = Math.min(
            params.rewireRadius,
            params.workspace * 2 * Math.cbrt(Math.log(nodes.length + 1) / (nodes.length + 1)),
        )
        neighbors = candidates
            .filter((node) => distance(node.position, point) <= radius)
            .map((node) => node.id)
        let parent = nearest,
            cost = nearest.cost + distance(nearest.position, point)
        for (const id of neighbors) {
            const other = nodes[id],
                proposed = other.cost + distance(other.position, point)
            if (proposed < cost && clearSegment(other.position, point, obstacles)) {
                parent = other
                cost = proposed
            }
        }
        yield record(
            'choose-parent',
            `Choose node #${parent.id} as the cheapest collision-free parent among ${neighbors.length} nearby candidates.`,
            [3],
        )
        const node: RrtNode = { id: nodes.length, position: point, parent: parent.id, cost }
        nodes.push(node)
        children.push(new Set())
        children[parent.id].add(node.id)
        newestNode = node.id
        accepted++
        yield record('expand', `Add node #${node.id} with root cost ${cost.toFixed(2)}.`, [4])
        if (goalId === null && distance(point, goal) < 1e-9) {
            goalId = node.id
            yield record(
                'route',
                `Reached the goal with route cost ${cost.toFixed(3)}. Continue searching through the configured budget.`,
                [6],
            )
            continue
        }
        for (const id of neighbors) {
            const neighbor = nodes[id]
            const proposed = node.cost + distance(node.position, neighbor.position)
            if (
                id === 0 ||
                id === goalId ||
                proposed >= neighbor.cost - 1e-9 ||
                !clearSegment(node.position, neighbor.position, obstacles)
            )
                continue
            const delta = proposed - neighbor.cost
            children[neighbor.parent!].delete(id)
            children[node.id].add(id)
            neighbor.parent = node.id
            const pending = [id]
            while (pending.length) {
                const descendant = pending.pop()!
                nodes[descendant].cost += delta
                pending.push(...children[descendant])
            }
            rewires++
            rewired = [id]
            yield record(
                'rewire',
                `Rewire node #${id} through #${node.id}; propagate its lower cost to all descendants.`,
                [5],
            )
        }
        rewired = []
        let bestParent: RrtNode | null = null,
            bestCost = goalId === null ? Infinity : nodes[goalId].cost
        for (const candidate of nodes)
            if (candidate.id !== goalId) {
                const gap = distance(candidate.position, goal)
                if (
                    gap <= params.goalThreshold &&
                    candidate.cost + gap < bestCost - 1e-9 &&
                    clearSegment(candidate.position, goal, obstacles)
                ) {
                    bestParent = candidate
                    bestCost = candidate.cost + gap
                }
            }
        if (bestParent) {
            if (goalId === null) {
                goalId = nodes.length
                nodes.push({ id: goalId, position: goal, parent: bestParent.id, cost: bestCost })
                children.push(new Set())
            } else {
                children[nodes[goalId].parent!].delete(goalId)
                nodes[goalId].parent = bestParent.id
                nodes[goalId].cost = bestCost
            }
            children[bestParent.id].add(goalId)
            yield record(
                'route',
                `Best route cost is ${bestCost.toFixed(3)}. Continue searching through the configured budget.`,
                [6],
            )
        }
    }
    iteration = params.maxIterations
    sample = null
    newestNode = null
    neighbors = []
    rewired = []
    yield record(
        goalId === null ? 'limit' : 'success',
        goalId === null
            ? `No route was found within ${params.maxIterations} iterations. This is an incomplete planning result.`
            : `Completed ${params.maxIterations} iterations; best collision-free route cost is ${nodes[goalId].cost.toFixed(3)}. A finite run does not guarantee global optimality.`,
        [7],
    )
    return goalId === null ? 'limit' : 'success'
}
export const runRrtStar = (params: RrtStarParams) => collectSteps(rrtStarSteps(params))
