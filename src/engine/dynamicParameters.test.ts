import { describe, expect, it } from 'vitest'
import { parseParameter, validateParameters, resolveParameterDefinitions } from './parameters'
import { binaryModule, twoSumModule } from '../algorithms/array/modules'
import { bstModule } from '../algorithms/tree/module'
import { knapsackModule } from '../algorithms/dp/module'
import { rrtModule } from '../algorithms/rrt/module'

const range = (
    definitions: typeof binaryModule.parameters,
    key: string,
    params: Record<string, number>,
) => {
    const definition = resolveParameterDefinitions(definitions, params).find(
        (item) => item.key === key,
    )
    if (definition?.type !== 'number') throw new Error(`Missing numeric parameter ${key}`)
    return [definition.min, definition.max]
}

describe('size-dependent parameter ranges', () => {
    it('scales search targets with generated data size and keeps missing targets possible', () => {
        expect(range(binaryModule.parameters, 'target', { count: 10 })).toEqual([0, 21])
        expect(range(binaryModule.parameters, 'target', { count: 160 })).toEqual([0, 321])
        expect(range(twoSumModule.parameters, 'target', { count: 160 })).toEqual([0, 641])
        expect(range(bstModule.parameters, 'target', { count: 24 })).toEqual([0, 100])
        expect(range(bstModule.parameters, 'target', { count: 25 })).toEqual([0, 1000])
        const checked = validateParameters(binaryModule.parameters, { count: 4, target: 300 })
        expect(checked.params.target).toBe(21)
        expect(checked.errors.target).toContain('adjusted to 21')
        const target = resolveParameterDefinitions(binaryModule.parameters, checked.params).find(
            (item) => item.key === 'target',
        )!
        expect(parseParameter(target, 300).error).toContain('from 0 to 21')
    })

    it('adjusts table capacity and RRT geometry when the size shrinks', () => {
        const table = validateParameters(knapsackModule.parameters, { count: 3, capacity: 180 })
        expect(range(knapsackModule.parameters, 'capacity', { count: 3 })).toEqual([3, 24])
        expect(table.params.capacity).toBe(24)
        expect(table.errors.capacity).toContain('allowed 3 to 24')

        const workspace = validateParameters(rrtModule.parameters, {
            workspace: 6,
            stepSize: 2,
            goalThreshold: 2,
            obstacleMin: 1.6,
            obstacleMax: 1.6,
        })
        expect(workspace.params).toMatchObject({
            stepSize: 1.5,
            goalThreshold: 1.5,
            obstacleMin: 1.5,
            obstacleMax: 1.5,
        })
        expect(
            range(rrtModule.parameters, 'obstacleMax', workspace.params as Record<string, number>),
        ).toEqual([1.5, 1.5])
    })

    it('adjusts dependent values in a shared URL without creating an invalid run', () => {
        const params = validateParameters(twoSumModule.parameters, {
            count: '160',
            target: '641',
            seed: '42',
        })
        expect(params.errors).toEqual({})
        expect(params.params.target).toBe(641)
        const smaller = validateParameters(twoSumModule.parameters, {
            count: '4',
            target: '641',
            seed: '42',
        })
        expect(smaller.params.target).toBe(41)
        expect(smaller.errors.target).toBeTruthy()
    })
})
