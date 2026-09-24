import { describe, expect, it } from 'vitest'
import { gradientDefaults, objectives, runDescent } from './descent'

describe('gradient descent', () => {
    it('matches analytic gradients on the bowl', () => {
        expect(objectives.bowl.gradient(2, -3)).toEqual([0.48, -0.72])
        expect(objectives.bowl.value(0, 0)).toBe(0)
    })
    it('matches finite differences on every objective', () => {
        const step = 1e-5
        for (const objective of Object.values(objectives)) {
            const [gx, gy] = objective.gradient(1.2, -0.7)
            expect(gx).toBeCloseTo(
                (objective.value(1.2 + step, -0.7) - objective.value(1.2 - step, -0.7)) /
                    (2 * step),
                5,
            )
            expect(gy).toBeCloseTo(
                (objective.value(1.2, -0.7 + step) - objective.value(1.2, -0.7 - step)) /
                    (2 * step),
                5,
            )
        }
    })
    it('repeats the same trajectory and decreases a convex objective', () => {
        const first = runDescent(gradientDefaults)
        expect(first).toEqual(runDescent(gradientDefaults))
        expect(first.frames.at(-1)!.state.current.value).toBeLessThan(
            first.frames[0].state.current.value,
        )
    })
    it('reports convergence and iteration limits honestly', () => {
        expect(runDescent({ ...gradientDefaults, startX: 0, startY: 0 }).outcome).toBe('success')
        const limited = runDescent({ ...gradientDefaults, maxIterations: 1, tolerance: 0.001 })
        expect(limited.outcome).toBe('limit')
        expect(limited.frames.at(-1)!.state.stoppingReason).toBe('limit')
    })
    it('rejects non-finite configuration', () => {
        expect(() => runDescent({ ...gradientDefaults, learningRate: Infinity })).toThrow()
    })
})
