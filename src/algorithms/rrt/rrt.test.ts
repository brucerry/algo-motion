import { describe, expect, it } from 'vitest'
import {
    clearSegment,
    createWorkspace,
    rrtDefaults,
    runRrt,
    segmentHitsSphere,
    type Vec3,
} from './rrt'

describe('RRT', () => {
    it('repeats obstacles and frame sequences with a seed', () => {
        expect(createWorkspace(rrtDefaults)).toEqual(createWorkspace(rrtDefaults))
        const a = runRrt({ ...rrtDefaults, maxIterations: 50 })
        const b = runRrt({ ...rrtDefaults, maxIterations: 50 })
        expect(a).toEqual(b)
    })
    it('detects segment collisions including endpoints', () => {
        const obstacle = { center: [0, 0, 0] as Vec3, radius: 1 }
        expect(segmentHitsSphere([-2, 0, 0], [2, 0, 0], obstacle)).toBe(true)
        expect(segmentHitsSphere([-2, 2, 0], [2, 2, 0], obstacle)).toBe(false)
    })
    it('only accepts collision-free tree edges', () => {
        const result = runRrt({ ...rrtDefaults, maxIterations: 90 })
        const state = result.frames.at(-1)!.state
        for (const node of state.nodes) {
            if (node.parent !== null)
                expect(
                    clearSegment(node.position, state.nodes[node.parent].position, state.obstacles),
                ).toBe(true)
        }
    })
    it('reports iteration exhaustion without fabricating a route', () => {
        const result = runRrt({ ...rrtDefaults, maxIterations: 1, goalBias: 0, stepSize: 0.1 })
        expect(result.outcome).toBe('limit')
        expect(result.frames.at(-1)!.state.path).toHaveLength(0)
    })
    it('connects goal in clear space with enough budget', () => {
        const result = runRrt({ ...rrtDefaults, obstacleCount: 0, goalBias: 1, maxIterations: 100 })
        expect(result.outcome).toBe('success')
        expect(result.frames.at(-1)!.state.path.length).toBeGreaterThan(1)
    })
})
