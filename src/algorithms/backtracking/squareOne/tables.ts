// Coordinate transitions derived from cs0x7f/sq12phase (MIT), revision
// da3a445fc103656c4e8668bce9c5c9ac41e26c41. See /licenses/sq12phase-MIT.txt.
import { canSlice, pieceParity, shapeMask, type SquarePuzzle } from './model'

export const popcount = (n: number) => {
    let count = 0
    while (n) {
        n &= n - 1
        count++
    }
    return count
}
export const factorial = [1, 1, 2, 6, 24, 120, 720, 5040, 40320]
export function rankPermutation(a: number[]): number {
    let rank = 0
    for (let i = 0; i < 7; i++) {
        let smaller = 0
        for (let j = i + 1; j < 8; j++) if (a[j] < a[i]) smaller++
        rank += smaller * factorial[7 - i]
    }
    return rank
}
export function unrankPermutation(rank: number): number[] {
    const remaining = [0, 1, 2, 3, 4, 5, 6, 7],
        result: number[] = []
    for (let i = 7; i >= 0; i--) {
        const next = Math.floor(rank / factorial[i])
        rank %= factorial[i]
        result.push(remaining.splice(next, 1)[0])
    }
    return result
}
export type SquareCoordinates = { edge: number; corner: number; flags: number }
export function squareCoordinates(p: SquarePuzzle): SquareCoordinates {
    const rings = [...p.top, ...p.bottom],
        corners = Array.from({ length: 8 }, (_, i) => rings[1 + 3 * i] >> 1)
    const topFirst = p.top[0] === p.top[1],
        bottomFirst = p.bottom[0] === p.bottom[1]
    const edges = [p.top, p.bottom].flatMap((ring, layer) =>
        Array.from(
            { length: 4 },
            (_, i) => ring[3 * i + ((layer ? bottomFirst : topFirst) ? 2 : 0)] >> 1,
        ),
    )
    return {
        edge: rankPermutation(edges),
        corner: rankPermutation(corners),
        flags: (topFirst ? 4 : 0) | (bottomFirst ? 2 : 0) | p.middle,
    }
}
export type SquareTables = {
    masks: number[]
    indices: Map<number, number>
    shapeTop: Uint32Array
    shapeBottom: Uint32Array
    shapeSlice: Uint16Array
    shapeDistance: Uint8Array
    top: Uint16Array
    bottom: Uint16Array
    slice: Uint16Array
    edgeDistance: Uint8Array
    cornerDistance: Uint8Array
    bytes: number
}
let cached: SquareTables | undefined
export function shapeIndex(p: SquarePuzzle, tables: Pick<SquareTables, 'indices'>): number {
    if (!canSlice(p)) throw new Error('Shape coordinate requires aligned slice cuts.')
    const index = tables.indices.get(shapeMask(p))
    if (index === undefined) throw new Error('Unknown Square-1 shape.')
    return index * 2 + pieceParity(p)
}
export function componentRotation(
    perm: number,
    flags: number,
    layer: 0 | 1,
    edge: boolean,
    tables: Pick<SquareTables, 'top' | 'bottom'>,
): { perm: number; flags: number; amount: number } {
    const bit = layer === 0 ? 4 : 2,
        nextFlags = flags ^ bit,
        first = Boolean(nextFlags & bit)
    return {
        perm: first === edge ? (layer === 0 ? tables.top[perm] : tables.bottom[perm]) : perm,
        flags: nextFlags,
        amount: first ? 1 : 2,
    }
}
export function prepareSquareTables(stage: (message: string) => void = () => {}): SquareTables {
    if (cached) return cached
    stage('Preparing shape/parity tables…')
    const halves: number[] = []
    const tilings = (length: number, bits: number) => {
        if (length === 6) {
            halves.push(bits)
            return
        }
        tilings(length + 1, bits << 1)
        if (length <= 4) tilings(length + 2, (bits << 2) | 3)
    }
    tilings(0, 0)
    halves.sort((a, b) => a - b)
    const masks: number[] = []
    for (const a of halves)
        for (const b of halves)
            for (const c of halves)
                for (const d of halves) {
                    const mask = (a << 18) | (b << 12) | (c << 6) | d
                    if (popcount(mask) === 16) masks.push(mask)
                }
    if (masks.length !== 3678) throw new Error('Incomplete Square-1 shape enumeration.')
    const indices = new Map(masks.map((mask, i) => [mask, i])),
        count = masks.length * 2
    const shapeTop = new Uint32Array(count),
        shapeBottom = new Uint32Array(count),
        shapeSlice = new Uint16Array(count)
    const indexOf = (top: number, bottom: number, parity: number) => {
        const i = indices.get((top << 12) | bottom)
        if (i === undefined) throw new Error('Invalid generated shape transition.')
        return i * 2 + parity
    }
    for (let i = 0; i < count; i++) {
        const top = masks[i >> 1] >> 12,
            bottom = masks[i >> 1] & 0xfff,
            parity = i & 1
        const rotate = (ring: number) => {
            let amount = 0,
                toggle = 0
            do {
                if (ring & 0x800) {
                    amount += 2
                    ring = (ring << 2) ^ 0x3003
                } else {
                    amount++
                    ring <<= 1
                }
                toggle ^= 1
            } while (popcount(ring & 0x3f) & 1)
            return { ring, amount, parity: parity ^ ((popcount(ring) & 2) === 0 ? toggle : 0) }
        }
        const t = rotate(top),
            b = rotate(bottom)
        shapeTop[i] = (indexOf(t.ring, bottom, t.parity) << 4) | t.amount
        shapeBottom[i] = (indexOf(top, b.ring, b.parity) << 4) | b.amount
        shapeSlice[i] = indexOf(
            (top & 0xfc0) | (bottom >> 6),
            (bottom & 0x3f) | ((top & 0x3f) << 6),
            parity ^ (((popcount(top & 0x3f) & popcount(bottom & 0xfc0)) >> 1) & 1),
        )
    }
    const shapeDistance = new Uint8Array(count).fill(255),
        queue = new Uint32Array(40320 * 8)
    let head = 0,
        tail = 0
    for (const [mask, parity] of [
        [0xdb66db, 0],
        [0xdb6db6, 1],
        [0x6db6db, 1],
        [0x6dbdb6, 0],
    ]) {
        const i = indices.get(mask)! * 2 + parity
        shapeDistance[i] = 0
        queue[tail++] = i
    }
    const enqueueShape = (from: number, next: number) => {
        if (shapeDistance[next] === 255) {
            shapeDistance[next] = shapeDistance[from] + 1
            queue[tail++] = next
        }
    }
    while (head < tail) {
        const i = queue[head++]
        enqueueShape(i, shapeSlice[i])
        for (const table of [shapeTop, shapeBottom]) {
            let next = i,
                amount = 0
            while (amount < 12) {
                const encoded = table[next]
                amount += encoded & 15
                next = encoded >> 4
                if (amount < 12) enqueueShape(i, next)
            }
        }
    }
    if (tail !== count) throw new Error('Unreachable Square-1 shape table entries.')
    stage('Preparing permutation/middle-layer pruning tables…')
    const top = new Uint16Array(40320),
        bottom = new Uint16Array(40320),
        slice = new Uint16Array(40320)
    for (let i = 0; i < 40320; i++) {
        const p = unrankPermutation(i)
        top[i] = rankPermutation([p[1], p[2], p[3], p[0], ...p.slice(4)])
        bottom[i] = rankPermutation([...p.slice(0, 4), p[5], p[6], p[7], p[4]])
        slice[i] = rankPermutation([p[0], p[1], p[4], p[5], p[2], p[3], p[6], p[7]])
    }
    const buildDistance = (edge: boolean) => {
        const distance = new Uint8Array(40320 * 8).fill(255)
        head = 0
        tail = 1
        queue[0] = 2
        distance[2] = 0
        const enqueue = (from: number, perm: number, flags: number) => {
            const next = perm * 8 + flags
            if (distance[next] === 255) {
                distance[next] = distance[from] + 1
                queue[tail++] = next
            }
        }
        while (head < tail) {
            const i = queue[head++],
                perm = i >> 3,
                flags = i & 7
            if (Boolean(flags & 4) === Boolean(flags & 2)) enqueue(i, slice[perm], flags ^ 1)
            for (const layer of [0, 1] as const) {
                let current = { perm, flags, amount: 0 },
                    amount = 0
                while (amount < 12) {
                    current = componentRotation(current.perm, current.flags, layer, edge, {
                        top,
                        bottom,
                    })
                    amount += current.amount
                    if (amount < 12) enqueue(i, current.perm, current.flags)
                }
            }
        }
        if (tail !== distance.length)
            throw new Error('Unreachable Square-1 permutation coordinates.')
        return distance
    }
    const edgeDistance = buildDistance(true),
        cornerDistance = buildDistance(false)
    const arrays = [
        shapeTop,
        shapeBottom,
        shapeSlice,
        shapeDistance,
        top,
        bottom,
        slice,
        edgeDistance,
        cornerDistance,
    ]
    cached = {
        masks,
        indices,
        shapeTop,
        shapeBottom,
        shapeSlice,
        shapeDistance,
        top,
        bottom,
        slice,
        edgeDistance,
        cornerDistance,
        bytes: arrays.reduce((sum, a) => sum + a.byteLength, 0),
    }
    return cached
}
