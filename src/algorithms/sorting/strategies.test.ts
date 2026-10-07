import { describe, expect, it } from 'vitest'
import { runSort, sortSteps, type SortKind } from './strategies'
const kinds: SortKind[] = ['insertion-sort', 'quick-sort', 'merge-sort']
describe('expanded sorting strategies', () => {
    for (const kind of kinds)
        it(`${kind} sorts and replays semantic operations`, () => {
            for (const values of [[], [7], [1, 2, 3], [5, 4, 3, 2, 1], [3, 1, 3, 2, 1]]) {
                const run = runSort(kind, { count: values.length, seed: 42 }, values)
                expect(run.outcome).toBe('success')
                const items = run.frames.at(-1)!.state.items
                expect(items.map((item) => item.value)).toEqual([...values].sort((a, b) => a - b))
                expect(items.map((item) => item.id).sort((a, b) => a - b)).toEqual(
                    values.map((_, i) => i),
                )
                if (kind !== 'quick-sort')
                    for (const value of new Set(values))
                        expect(
                            items.filter((item) => item.value === value).map((item) => item.id),
                        ).toEqual(values.flatMap((entry, id) => (entry === value ? [id] : [])))
                expect(runSort(kind, { count: values.length, seed: 42 }, values)).toEqual(run)
                for (const frame of run.frames)
                    expect(new Set(frame.state.items.map((item) => item.id)).size).toBe(
                        values.length,
                    )
            }
            const run = runSort(kind, { count: 6, seed: 42 }, [6, 5, 4, 3, 2, 1])
            const events = new Set(run.frames.map((frame) => frame.event))
            expect(
                events.has(
                    kind === 'insertion-sort'
                        ? 'shift'
                        : kind === 'quick-sort'
                          ? 'partition'
                          : 'buffer',
                ),
            ).toBe(true)
            const steps = sortSteps(kind, { count: 6, seed: 42 }, [6, 5, 4, 3, 2, 1])
            const initial = steps.next()
            if (!initial.done) {
                const saved = initial.value.materialize()
                steps.next()
                expect(saved.state.items.map((item) => item.value)).toEqual([6, 5, 4, 3, 2, 1])
            }
        })
})
