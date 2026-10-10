// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
    bottomHome,
    canSlice,
    inverseSquare,
    moveSquare,
    parseSquare,
    shapeReady,
    solvedSquare,
    squareNotation,
    squareScramble,
    squareSolved,
    topHome,
    validateSquare,
    type SquareMove,
} from './model'
import { middleOutline, squareGeometry, wedgeOutline } from './geometry'
describe('exact Square-1 rings and fixed rigid wedges', () => {
    it('has the complete inventory, square outline and two complementary middle halves', () => {
        const p = solvedSquare()
        validateSquare(p)
        expect(squareSolved(p)).toBe(true)
        expect(shapeReady(p)).toBe(true)
        expect(new Set([...p.top, ...p.bottom]).size).toBe(16)
        const area = (polygon: number[][]) =>
            Math.abs(
                polygon.reduce((s, a, i) => {
                    const b = polygon[(i + 1) % polygon.length]
                    return s + a[0] * b[1] - a[1] * b[0]
                }, 0),
            ) / 2
        expect(
            Array.from({ length: 8 }, (_, id) => area(wedgeOutline(id))).reduce((s, a) => s + a, 0),
        ).toBeCloseTo(9)
        expect(
            Array.from({ length: 8 }, (_, id) => area(wedgeOutline(id + 8))).reduce(
                (s, a) => s + a,
                0,
            ),
        ).toBeCloseTo(9)
        expect(area(middleOutline(true)) + area(middleOutline(false))).toBeCloseTo(9)
        for (let id = 0; id < 18; id++) {
            const geometry = squareGeometry(id)
            expect(geometry.getAttribute('position').count).toBeGreaterThan(12)
            expect(geometry.getAttribute('uv').count).toBe(geometry.getAttribute('position').count)
            expect(new Set(geometry.getAttribute('uv').array).size).toBeGreaterThan(2)
            const normals = geometry.getAttribute('normal')
            for (const group of geometry.groups) {
                const axis = group.materialIndex === 2 || group.materialIndex === 3 ? 0 : 2
                if (group.materialIndex! >= 2 && group.materialIndex! <= 5)
                    expect(
                        normals.getComponent(group.start, axis) *
                            (group.materialIndex === 2 || group.materialIndex === 4 ? 1 : -1),
                    ).toBeGreaterThan(0.99)
            }
            geometry.dispose()
        }
    })
    it('matches the primary reference packed-state direction and slice fixtures', () => {
        const p = moveSquare(solvedSquare(), { kind: 'rotate', top: 1, bottom: -1 })
        expect(p.top).toEqual([...topHome.slice(1), topHome[0]])
        expect(p.bottom).toEqual([bottomHome[11], ...bottomHome.slice(0, 11)])
        expect(canSlice(p)).toBe(true)
        validateSquare(p)
        const sliced = moveSquare(p, { kind: 'slice' })
        expect(sliced.top).toEqual([1, 1, 2, 3, 3, 4, 14, 9, 9, 8, 11, 11])
        expect(sliced.middle).toBe(1)
        validateSquare(sliced)
        expect(moveSquare(sliced, { kind: 'slice' })).toEqual(p)
        for (const [top, bottom] of [
            [2, 0],
            [0, 1],
        ])
            expect(() =>
                moveSquare(moveSquare(solvedSquare(), { kind: 'rotate', top, bottom }), {
                    kind: 'slice',
                }),
            ).toThrow('Blocked slice')
    })
    it('round trips notation, rejects malformed values and restores poses with inverses', () => {
        const moves = parseSquare(' (1,-1) / (-6,6) / (0,0) ')
        expect(moves.map(squareNotation).join(' ')).toBe('(1,-1) / (6,6) /')
        for (const bad of ['(7,0)', '(1.5,0)', '(a,b)', 'R', '/ junk', '(1,2'])
            expect(() => parseSquare(bad)).toThrow()
        for (let top = -6; top <= 6; top++)
            for (let bottom = -6; bottom <= 6; bottom++) {
                const move: SquareMove = { kind: 'rotate', top, bottom },
                    p = moveSquare(solvedSquare(), move)
                validateSquare(p)
                expect(moveSquare(p, inverseSquare(move))).toEqual(solvedSquare())
            }
        const split = solvedSquare()
        ;[split.top[1], split.top[4]] = [split.top[4], split.top[1]]
        expect(() => validateSquare(split)).toThrow()
        const corrupt = solvedSquare()
        corrupt.poses[0].angle = 1
        expect(() => validateSquare(corrupt)).toThrow('geometry')
    })
    it('generates reproducible legal blocks at all required lengths without splitting corners', () => {
        for (const seed of [0, 42, 123, 0xffffffff])
            for (const scrambleLength of [0, 5, 20, 60, 100]) {
                const moves = squareScramble({ seed, scrambleLength })
                expect(moves).toEqual(squareScramble({ seed, scrambleLength }))
                expect(moves).toHaveLength(2 * scrambleLength)
                let p = solvedSquare()
                for (const move of moves) {
                    if (move.kind === 'slice') expect(canSlice(p)).toBe(true)
                    p = moveSquare(p, move)
                    validateSquare(p)
                }
                for (const move of [...moves].reverse()) p = moveSquare(p, inverseSquare(move))
                expect(p).toEqual(solvedSquare())
            }
    })
})
