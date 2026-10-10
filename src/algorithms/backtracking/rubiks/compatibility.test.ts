// @vitest-environment node
import { expect, it } from 'vitest'
import { applyMoves, facelets, inPhase2, notation, scramble, solvedCube } from './model'
import { decodeHash, encodeHash } from '../../../engine/url'
import { rubiksModule } from './module'

// Frozen before extending the mechanism. These are public, size-omitted inputs.
const fixtures = [
    {
        seed: 42,
        scrambleLength: 0,
        moves: '',
        stickers: 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB',
        phase2: true,
    },
    {
        seed: 42,
        scrambleLength: 5,
        moves: 'B2 F2 R2 U2 B2',
        stickers: 'DUUDUUUDDRLRLRRLRLFBBFFBFFBUUDDDUDDULRLLLRRLRBBFBBFBFF',
        phase2: true,
    },
    {
        seed: 42,
        scrambleLength: 20,
        moves: 'B2 F2 R2 U2 B2 R B F U2 D′ L2 R B′ U2 D F2 L′ B′ U B′',
        stickers: 'DFBBUDURFLBUURLLRFRUURFBBFBDUDLDBLLDLLFRLDUDRRDFFBFRUB',
        phase2: false,
    },
    {
        seed: 99,
        scrambleLength: 60,
        stickers: 'RLUUURBFDRBRDRRULDLRBUFFFDLULFUDBULFDBDDLRBFRBUFDBBLFL',
        phase2: false,
    },
    {
        seed: 123,
        scrambleLength: 100,
        stickers: 'RRDFUBDBBUDFURFLLUBLLFFBDDFFRULDDBUFUULRLRRFRLUBDBBRLD',
        phase2: false,
    },
]

it('preserves the original seeded move order, facelet adapter, and phase convention', () => {
    for (const fixture of fixtures) {
        const moves = scramble(fixture)
        if (fixture.moves !== undefined) expect(moves.map(notation).join(' ')).toBe(fixture.moves)
        const cube = applyMoves(solvedCube(), moves)
        expect(facelets(cube)).toBe(fixture.stickers)
        expect(inPhase2(cube)).toBe(fixture.phase2)
    }
})

it('preserves size-omitted public links and their default input', () => {
    const decoded = decodeHash(
        '#/algorithm/rubiks-cube?scrambleLength=20&seed=42',
        rubiksModule.parameters,
    )
    expect(decoded.algorithmId).toBe('rubiks-cube')
    expect(decoded.errors).toEqual({})
    expect(decoded.params.scrambleLength).toBe(20)
    expect(decoded.params.seed).toBe(42)
    expect(encodeHash('rubiks-cube', { scrambleLength: 20, seed: 42 })).toBe(
        '#/algorithm/rubiks-cube?scrambleLength=20&seed=42',
    )
})
