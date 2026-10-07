import { describe, expect, it } from 'vitest'
import { rrtDefaults, clearSegment, distance } from './rrt'
import { runRrtStar, rrtStarSteps } from './rrtStar'
describe('RRT star', () => {
    it('rewires collision-free edges, propagates exact costs, and monotonically improves routes', () => {
        const params = {
            ...rrtDefaults,
            obstacleCount: 3,
            maxIterations: 250,
            goalBias: 0.3,
            stepSize: 1,
            goalThreshold: 1,
            seed: 19,
            rewireRadius: 3,
        }
        const result = runRrtStar(params)
        expect(result.outcome).toBe('success')
        expect(result.frames.some((frame) => frame.event === 'rewire')).toBe(true)
        const routeFrame = result.frames.find((frame) => frame.event === 'route')!
        expect(routeFrame.state.iteration).toBeLessThan(params.maxIterations)
        expect(result.frames.at(-1)!.state.iteration).toBe(params.maxIterations)
        let best = Infinity
        for (const frame of result.frames) {
            const state = frame.state
            for (const node of state.nodes) {
                if (node.parent === null) {
                    expect(node.id).toBe(0)
                    expect(node.cost).toBe(0)
                    continue
                }
                const parent = state.nodes[node.parent]
                expect(node.cost).toBeCloseTo(
                    parent.cost + distance(parent.position, node.position),
                    7,
                )
                expect(clearSegment(parent.position, node.position, state.obstacles)).toBe(true)
                let cursor: number | null = node.id,
                    hops = 0
                while (cursor !== null && hops <= state.nodes.length) {
                    cursor = state.nodes[cursor].parent
                    hops++
                }
                expect(hops).toBeLessThanOrEqual(state.nodes.length)
            }
            if (state.path.length) {
                const cost = state.nodes[state.path.at(-1)!].cost
                expect(cost).toBeLessThanOrEqual(best + 1e-8)
                best = cost
                expect(state.path[0]).toBe(0)
                expect(state.nodes[state.path.at(-1)!].position).toEqual(state.goal)
            }
        }
        expect(result.frames[0].state.nodes).toHaveLength(1)
    }, 15000)
    it('is deterministic and distinguishes a budget without a route', () => {
        const params = {
            ...rrtDefaults,
            maxIterations: 80,
            obstacleCount: 0,
            seed: 91,
            rewireRadius: 2.5,
        }
        expect(runRrtStar(params)).toEqual(runRrtStar(params))
        const limited = runRrtStar({ ...params, maxIterations: 1, goalBias: 0 })
        expect(limited.outcome).toBe('limit')
        expect(limited.frames.at(-1)!.state.path).toEqual([])
    })
    it('supports the full configured budget without a recorded-step ceiling', () => {
        const steps = rrtStarSteps({
            ...rrtDefaults,
            maxIterations: 6000,
            obstacleCount: 0,
            goalBias: 1,
            seed: 19,
            rewireRadius: 2.5,
        })
        let count = 0,
            finalIteration = 0
        for (;;) {
            const next = steps.next()
            if (next.done) {
                expect(next.value).toBe('success')
                break
            }
            count++
            if (count % 1000 === 0 || next.value.materialize().event === 'success')
                finalIteration = next.value.materialize().state.iteration
        }
        expect(count).toBeGreaterThan(6000)
        expect(finalIteration).toBe(6000)
    }, 15000)
    it('uses an exact goal extension once without duplicating its position', () => {
        const result = runRrtStar({
            ...rrtDefaults,
            obstacleCount: 0,
            goalBias: 1,
            stepSize: 2,
            goalThreshold: 0.1,
            maxIterations: 80,
            rewireRadius: 2.5,
        })
        const state = result.frames.at(-1)!.state
        expect(result.outcome).toBe('success')
        expect(new Set(state.nodes.map((node) => node.position.join(','))).size).toBe(
            state.nodes.length,
        )
        expect(state.nodes[state.path.at(-1)!].position).toEqual(state.goal)
    })
})
