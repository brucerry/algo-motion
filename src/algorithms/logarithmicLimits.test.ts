import { describe, expect, it } from 'vitest'
import { runBinary } from './array/binary'
import { binaryModule, twoSumModule } from './array/modules'
import { buildBst, runBst } from './tree/bst'
import { bstModule } from './tree/module'
import { validateParameters } from '../engine/parameters'
import { encodeHash, parseHash } from '../engine/url'
describe('larger logarithmic search inputs', () => {
    it('replays all 16,384 binary-search items with actual logarithmic comparisons', () => {
        const params = { count: 16384, target: 0, seed: 42 }
        const result = runBinary(params),
            final = result.frames.at(-1)!.state
        expect(result.outcome).toBe('no-solution')
        expect(final.items).toHaveLength(16384)
        expect(final.comparisons).toBeGreaterThan(10)
        expect(final.comparisons).toBeLessThanOrEqual(15)
        const route = parseHash(encodeHash('binary-search', params))
        expect(validateParameters(binaryModule.parameters, route.raw).params).toEqual(params)
        expect(
            validateParameters(binaryModule.parameters, { count: 16384, target: 32769 }).errors,
        ).toEqual({})
        expect(
            validateParameters(twoSumModule.parameters, { count: 16384 }).errors.count,
        ).toBeTruthy()
    })
    it('builds and searches 2,048-node trees and lays out skewed trees iteratively', () => {
        const result = runBst({ count: 2048, target: 0, seed: 42 })
        expect(result.outcome).toBe('no-solution')
        expect(result.frames.at(-1)!.state.nodes).toHaveLength(2048)
        const nodes = buildBst(Array.from({ length: 2048 }, (_, i) => i + 1))
        expect(nodes.at(-1)!.depth).toBe(2047)
        expect(new Set(nodes.map((node) => node.x)).size).toBe(2048)
        const checked = validateParameters(bstModule.parameters, { count: 2048, target: 8192 })
        expect(checked.errors).toEqual({})
        expect(
            validateParameters(bstModule.parameters, { ...checked.params, count: 4 }).params.target,
        ).toBe(100)
    })
})
