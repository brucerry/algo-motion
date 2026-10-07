import { describe, expect, it } from 'vitest'
import { runTraversal, traversalSteps } from './traversal'
describe('in-order traversal', () => {
    it('visits each key once in sorted order while exposing an explicit stack', () => {
        const values = [5, 3, 8, 1, 4, 7, 9]
        const run = runTraversal({ count: 7, seed: 42 }, values)
        expect(run.outcome).toBe('success')
        expect(run.frames.at(-1)!.state.output).toEqual([...values].sort((a, b) => a - b))
        expect(new Set(run.frames.at(-1)!.state.visited).size).toBe(values.length)
        expect(run.frames.filter((frame) => frame.event === 'visit').length).toBe(values.length)
        expect(run.frames.some((frame) => frame.state.stack.length > 1)).toBe(true)
        expect(runTraversal({ count: 7, seed: 42 }, values)).toEqual(run)
    })
    it('keeps materialized snapshots unchanged while a large traversal advances', () => {
        const steps = traversalSteps({ count: 2048, seed: 42 })
        const first = steps.next()
        if (first.done) throw new Error('Missing initial step')
        const saved = first.value.materialize()
        let last = saved
        for (;;) {
            const next = steps.next()
            if (next.done) break
            last = next.value.materialize()
        }
        expect(saved.state.visited).toEqual([])
        expect(last.state.nodes).toHaveLength(2048)
        expect(last.state.output).toHaveLength(2048)
        expect(last.state.output).toEqual([...last.state.output].sort((a, b) => a - b))
    })
})
