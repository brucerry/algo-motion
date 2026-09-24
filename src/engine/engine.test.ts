import { describe, expect, it } from 'vitest'
import { createRandom, deriveSeed } from './seededRandom'
import { parseParameter, validateParameters } from './parameters'
import { encodeHash, decodeHash } from './url'
import { advanceFrame, clampFrame } from './timeline'
import type { ParameterDefinition } from './types'

const definitions: ParameterDefinition[] = [
    {
        type: 'number',
        key: 'size',
        label: 'Size',
        defaultValue: 10,
        min: 2,
        max: 30,
        integer: true,
    },
    { type: 'boolean', key: 'diagonal', label: 'Diagonal', defaultValue: false },
    {
        type: 'select',
        key: 'mode',
        label: 'Mode',
        defaultValue: 'a',
        options: [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' },
        ],
    },
    { type: 'seed', key: 'seed', label: 'Seed', defaultValue: 1 },
]

describe('shared engine', () => {
    it('repeats seeded random streams and separates derived streams', () => {
        const a = createRandom(123),
            b = createRandom(123),
            c = createRandom(124)
        expect(Array.from({ length: 8 }, () => a.next())).toEqual(
            Array.from({ length: 8 }, () => b.next()),
        )
        expect(createRandom(123).next()).not.toBe(createRandom(124).next())
        expect(deriveSeed(123, 'environment')).not.toBe(deriveSeed(123, 'sampling'))
        expect(c.next()).not.toBe(createRandom(123).next())
    })
    it('validates every parameter type', () => {
        expect(
            validateParameters(definitions, {
                size: 'Infinity',
                diagonal: 'maybe',
                mode: 'x',
                seed: '-1',
            }).errors,
        ).toHaveProperty('size')
        expect(parseParameter(definitions[0], '100000').error).toBeTruthy()
        expect(
            validateParameters(definitions, { size: '20', diagonal: 'true', mode: 'b', seed: '4' })
                .params,
        ).toEqual({ size: 20, diagonal: true, mode: 'b', seed: 4 })
    })
    it('round trips safe URL configuration', () => {
        const params = { size: 20, diagonal: true, mode: 'b', seed: 42 }
        expect(decodeHash(encodeHash('astar', params), definitions)).toMatchObject({
            algorithmId: 'astar',
            params,
            errors: {},
        })
        expect(decodeHash('#/algorithm/astar?size=NaN', definitions).params.size).toBe(10)
        expect(decodeHash('#/algorithm/astar?size=NaN', definitions).errors.size).toBeTruthy()
    })
    it('clamps timeline boundaries', () => {
        expect(clampFrame(-10, 4)).toBe(0)
        expect(advanceFrame(3, 4, 1)).toBe(3)
        expect(advanceFrame(0, 4, -1)).toBe(0)
    })
})
