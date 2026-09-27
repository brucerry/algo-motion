import type { Frame, Metric, Params, SimulationRun } from '../../engine/types'
import { createRandom, deriveSeed } from '../../engine/seededRandom'

export type Vec3 = [number, number, number]
export type SphereObstacle = { center: Vec3; radius: number }
export type RrtNode = { id: number; position: Vec3; parent: number | null; cost: number }
export type RrtParams = Params & {
    workspace: number
    maxIterations: number
    stepSize: number
    goalBias: number
    goalThreshold: number
    obstacleCount: number
    obstacleMin: number
    obstacleMax: number
    seed: number
}
export type RrtState = {
    nodes: RrtNode[]
    obstacles: SphereObstacle[]
    start: Vec3
    goal: Vec3
    sample: Vec3 | null
    sampleRejected: boolean
    newestNode: number | null
    path: number[]
    iteration: number
    accepted: number
    rejected: number
}
export const rrtDefaults: RrtParams = {
    workspace: 10,
    maxIterations: 300,
    stepSize: 0.75,
    goalBias: 0.14,
    goalThreshold: 0.85,
    obstacleCount: 7,
    obstacleMin: 0.45,
    obstacleMax: 1.1,
    seed: 12345,
}

export const distance = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
export function steer(from: Vec3, to: Vec3, maxStep: number): Vec3 {
    const length = distance(from, to)
    if (length <= maxStep) return [...to]
    const ratio = maxStep / length
    return [
        from[0] + (to[0] - from[0]) * ratio,
        from[1] + (to[1] - from[1]) * ratio,
        from[2] + (to[2] - from[2]) * ratio,
    ]
}
export function segmentHitsSphere(a: Vec3, b: Vec3, obstacle: SphereObstacle): boolean {
    const direction: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const lengthSq = direction.reduce((sum, value) => sum + value * value, 0)
    const projection =
        lengthSq === 0
            ? 0
            : Math.max(
                  0,
                  Math.min(
                      1,
                      direction.reduce(
                          (sum, value, index) => sum + value * (obstacle.center[index] - a[index]),
                          0,
                      ) / lengthSq,
                  ),
              )
    const closest: Vec3 = [
        a[0] + projection * direction[0],
        a[1] + projection * direction[1],
        a[2] + projection * direction[2],
    ]
    return distance(closest, obstacle.center) <= obstacle.radius + 0.025
}
export const clearSegment = (a: Vec3, b: Vec3, obstacles: SphereObstacle[]) =>
    obstacles.every((obstacle) => !segmentHitsSphere(a, b, obstacle))

export function createWorkspace(params: RrtParams): {
    start: Vec3
    goal: Vec3
    obstacles: SphereObstacle[]
} {
    if (
        !Number.isFinite(params.workspace) ||
        params.workspace < 6 ||
        params.workspace > 200 ||
        !Number.isInteger(params.obstacleCount) ||
        params.obstacleCount < 0 ||
        params.obstacleCount > 180 ||
        !Number.isFinite(params.obstacleMin) ||
        !Number.isFinite(params.obstacleMax) ||
        params.obstacleMin < 0.2 ||
        params.obstacleMax > Math.min(1.6, params.workspace / 4) ||
        params.obstacleMin > params.obstacleMax
    )
        throw new Error('Workspace settings exceed safe limits.')
    const random = createRandom(deriveSeed(params.seed, 'rrt-obstacles'))
    const half = params.workspace / 2
    const start: Vec3 = [-half * 0.78, -half * 0.35, -half * 0.78]
    const goal: Vec3 = [half * 0.78, half * 0.35, half * 0.78]
    const obstacles: SphereObstacle[] = []
    for (let attempts = 0; obstacles.length < params.obstacleCount && attempts < 3000; attempts++) {
        const radius = random.between(params.obstacleMin, params.obstacleMax)
        const extent = half - radius
        const center: Vec3 = [
            random.between(-extent, extent),
            random.between(-extent, extent),
            random.between(-extent, extent),
        ]
        if (distance(start, center) <= radius + 0.25 || distance(goal, center) <= radius + 0.25)
            continue
        obstacles.push({ center, radius })
    }
    if (obstacles.length !== params.obstacleCount)
        throw new Error('Could not place every obstacle safely. Reduce obstacle count or size.')
    return { start, goal, obstacles }
}

function pathToRoot(nodes: RrtNode[], goalId: number): number[] {
    const path = [goalId]
    let parent = nodes[goalId].parent
    while (parent !== null) {
        path.push(parent)
        parent = nodes[parent].parent
    }
    return path.reverse()
}

export function runRrt(params: RrtParams): SimulationRun<RrtState> {
    if (
        !Number.isInteger(params.maxIterations) ||
        params.maxIterations < 1 ||
        params.maxIterations > 6000 ||
        !Number.isFinite(params.stepSize) ||
        params.stepSize <= 0 ||
        params.stepSize > Math.min(2, params.workspace / 4) ||
        !Number.isFinite(params.goalBias) ||
        params.goalBias < 0 ||
        params.goalBias > 1 ||
        !Number.isFinite(params.goalThreshold) ||
        params.goalThreshold <= 0 ||
        params.goalThreshold > Math.min(2, params.workspace / 4)
    )
        throw new Error('RRT settings exceed safe limits.')
    const { start, goal, obstacles } = createWorkspace(params)
    const random = createRandom(deriveSeed(params.seed, 'rrt-samples'))
    const nodes: RrtNode[] = [{ id: 0, position: start, parent: null, cost: 0 }]
    const frames: Frame<RrtState>[] = []
    let sample: Vec3 | null = null,
        sampleRejected = false,
        newestNode: number | null = null,
        path: number[] = []
    let accepted = 0,
        rejected = 0,
        iteration = 0
    const record = (event: string, explanation: string, activeLines: number[]) => {
        const state: RrtState = {
            nodes: [...nodes],
            obstacles,
            start,
            goal,
            sample: sample ? ([...sample] as Vec3) : null,
            sampleRejected,
            newestNode,
            path: [...path],
            iteration,
            accepted,
            rejected,
        }
        const nearestGoal = Math.min(...nodes.map((node) => distance(node.position, goal)))
        const metrics: Metric[] = [
            { label: 'Iteration', value: iteration },
            { label: 'Accepted samples', value: accepted },
            { label: 'Rejected samples', value: rejected },
            { label: 'Tree nodes', value: nodes.length },
            { label: 'Distance to goal', value: +nearestGoal.toFixed(2) },
        ]
        if (path.length)
            metrics.push({
                label: 'Final path length',
                value: +nodes[path.at(-1)!].cost.toFixed(2),
            })
        frames.push({ index: frames.length, state, event, explanation, activeLines, metrics })
    }
    record(
        'initialize',
        'The tree starts at the cyan point. New samples will extend the nearest reachable branch.',
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
        const nearest = nodes.reduce(
            (best, node) =>
                distance(node.position, sample!) < distance(best.position, sample!) ? node : best,
            nodes[0],
        )
        const point = steer(nearest.position, sample, params.stepSize)
        sampleRejected = !clearSegment(nearest.position, point, obstacles)
        newestNode = null
        if (sampleRejected) {
            rejected++
            record(
                'rejected',
                `Sample ${iteration} was rejected because the proposed branch intersects an obstacle.`,
                [2, 3],
            )
            continue
        }
        const node: RrtNode = {
            id: nodes.length,
            position: point,
            parent: nearest.id,
            cost: nearest.cost + distance(nearest.position, point),
        }
        nodes.push(node)
        accepted++
        newestNode = node.id
        record(
            'expand',
            `Added node #${node.id} from node #${nearest.id}; the tree now has ${nodes.length} nodes.`,
            [4],
        )
        if (distance(point, goal) <= params.goalThreshold && clearSegment(point, goal, obstacles)) {
            const goalNode: RrtNode = {
                id: nodes.length,
                position: goal,
                parent: node.id,
                cost: node.cost + distance(point, goal),
            }
            nodes.push(goalNode)
            newestNode = goalNode.id
            path = pathToRoot(nodes, goalNode.id)
            sample = goal
            record(
                'success',
                `The tree reached the goal after ${iteration} iterations. The collision-free path length is ${goalNode.cost.toFixed(2)}.`,
                [5],
            )
            return { frames, outcome: 'success' }
        }
    }
    iteration = params.maxIterations
    sample = null
    newestNode = null
    record(
        'limit',
        `No route was found within ${params.maxIterations} iterations. Try a new seed or a larger search budget.`,
        [6],
    )
    return { frames, outcome: 'limit' }
}

export function inspectRrt(state: RrtState, selected: string): Metric[] | null {
    const id = Number(selected)
    const node = state.nodes[id]
    if (!Number.isInteger(id) || !node) return null
    return [
        { label: 'Node', value: `#${node.id}` },
        { label: 'Position', value: node.position.map((value) => value.toFixed(2)).join(', ') },
        { label: 'Parent', value: node.parent === null ? 'None (root)' : `#${node.parent}` },
        { label: 'Cost from root', value: +node.cost.toFixed(2) },
    ]
}
