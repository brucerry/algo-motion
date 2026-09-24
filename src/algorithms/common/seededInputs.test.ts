import { describe, expect, it } from 'vitest'
import { seededIntervals, seededUniqueValues, seededValues } from './seededInputs'

describe('seeded showcase inputs', () => {
    it('repeats the same stream while salts separate datasets', () => {
        expect(seededValues(12, 42, 'a')).toEqual(seededValues(12, 42, 'a'))
        expect(seededValues(12, 42, 'a')).not.toEqual(seededValues(12, 42, 'b'))
        expect(seededIntervals(8, 42)).toEqual(seededIntervals(8, 42))
    })

    it('keeps tree keys distinct and intervals valid', () => {
        expect(new Set(seededUniqueValues(120, 7, 'tree')).size).toBe(120)
        expect(seededIntervals(120, 7).every((item) => item.start < item.end)).toBe(true)
    })

    it('rejects oversized inputs', () => {
        expect(() => seededValues(161, 1, 'array')).toThrow()
        expect(() => seededUniqueValues(-1, 1, 'tree')).toThrow()
        expect(() => seededIntervals(121, 1)).toThrow()
    })
})
