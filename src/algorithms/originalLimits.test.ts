import { describe, expect, it } from 'vitest'
import { astarModule, bfsModule, dijkstraModule } from './grid/modules'
import { createGrid, gridDefaults } from './grid/grid'
import { gridSteps } from './grid/steps'
import { rrtModule } from './rrt/module'
import { createWorkspace, runRrt, rrtDefaults } from './rrt/rrt'
import { gradientModule } from './gradient/module'
import { runDescent, gradientDefaults } from './gradient/descent'

const maximum = (parameters: { key: string; type: string; max?: number }[], key: string) =>
    parameters.find((parameter) => parameter.key === key && parameter.type === 'number')?.max

describe('original algorithm expanded limits', () => {
    it('retains maximum grid dimensions and completes a search beyond the old budget', () => {
        for (const module of [bfsModule, dijkstraModule, astarModule]) {
            expect(maximum(module.parameters, 'width')).toBe(240)
            expect(maximum(module.parameters, 'depth')).toBe(240)
        }
        const params = {
            ...gridDefaults,
            width: 240,
            depth: 240,
            density: 0,
            seed: 42,
        }
        const steps = gridSteps('bfs', params, createGrid(params))
        let count = 0
        for (;;) {
            const next = steps.next()
            if (next.done) {
                expect(next.value).toBe('success')
                break
            }
            count++
        }
        expect(count).toBeGreaterThan(12000)
    }, 15000)

    it('accepts maximum RRT workspace and obstacle count without losing items', () => {
        expect(maximum(rrtModule.parameters, 'workspace')).toBe(200)
        expect(maximum(rrtModule.parameters, 'obstacleCount')).toBe(180)
        expect(maximum(rrtModule.parameters, 'maxIterations')).toBe(6000)
        const params = {
            ...rrtDefaults,
            workspace: 200,
            obstacleCount: 180,
            obstacleMin: 0.2,
            obstacleMax: 0.2,
            maxIterations: 6000,
            stepSize: 2,
            goalBias: 1,
        }
        expect(createWorkspace(params).obstacles).toHaveLength(180)
        const run = runRrt(params)
        expect(run.outcome).not.toBe('error')
        expect(run.frames.at(-1)?.state.obstacles).toHaveLength(180)
        expect(run.frames.at(-1)?.state.nodes.length).toBeGreaterThan(1)
    }, 15000)

    it('keeps a full 6000-iteration RRT replay bounded', () => {
        const started = performance.now()
        const run = runRrt({
            ...rrtDefaults,
            workspace: 200,
            obstacleCount: 0,
            maxIterations: 6000,
            stepSize: 0.1,
            goalBias: 0,
        })
        expect(run.outcome).toBe('limit')
        expect(run.frames).toHaveLength(6002)
        expect(run.frames.at(-1)?.state.nodes.length).toBeGreaterThan(1)
        expect(performance.now() - started).toBeLessThan(15000)
    }, 20000)

    it('accepts the larger gradient iteration control', () => {
        expect(maximum(gradientModule.parameters, 'maxIterations')).toBe(3000)
        const run = runDescent({ ...gradientDefaults, maxIterations: 3000 })
        expect(run.outcome).not.toBe('error')
    })
})
