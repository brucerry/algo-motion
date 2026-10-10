import { createRandom, deriveSeed } from '../../../engine/seededRandom'

export type SquareParams = { scrambleLength: number; seed: number }
export type SquareMove = { kind: 'rotate'; top: number; bottom: number } | { kind: 'slice' }
export type Pose = { angle: number; flipped: boolean }
export type SquarePuzzle = { top: number[]; bottom: number[]; poses: Pose[]; middle: 0 | 1 }
export const topHome = [0, 1, 1, 2, 3, 3, 4, 5, 5, 6, 7, 7]
export const bottomHome = [9, 9, 8, 11, 11, 10, 13, 13, 12, 15, 15, 14]
export const sliceAxis = [Math.cos((7 * Math.PI) / 12), 0, Math.sin((7 * Math.PI) / 12)] as const
export const mod = (n: number, m = 12) => ((n % m) + m) % m
export const canonical = (n: number) => {
    const v = mod(n)
    return v > 6 ? v - 12 : v
}
export function solvedSquare(): SquarePuzzle {
    return {
        top: [...topHome],
        bottom: [...bottomHome],
        middle: 0,
        poses: Array.from({ length: 16 }, () => ({ angle: 0, flipped: false })),
    }
}
export function canSlice(p: Pick<SquarePuzzle, 'top' | 'bottom'>): boolean {
    return [p.top, p.bottom].every((r) => r[11] !== r[0] && r[5] !== r[6])
}
export function moveSquare(p: SquarePuzzle, move: SquareMove): SquarePuzzle {
    const poses = p.poses.map((v) => ({ ...v }))
    if (move.kind === 'rotate') {
        if (![move.top, move.bottom].every((v) => Number.isInteger(v) && v >= -6 && v <= 6))
            throw new Error('Square-1 rotations must be integers from −6 to 6.')
        const top = p.top.map((_, i) => p.top[mod(i + move.top)])
        const bottom = p.bottom.map((_, i) => p.bottom[mod(i + move.bottom)])
        for (const id of new Set(p.top)) poses[id].angle = mod(poses[id].angle + move.top)
        for (const id of new Set(p.bottom)) poses[id].angle = mod(poses[id].angle - move.bottom)
        return { top, bottom, poses, middle: p.middle }
    }
    if (move.kind !== 'slice') throw new Error('Unknown Square-1 operation.')
    if (!canSlice(p))
        throw new Error('Blocked slice: a corner crosses the cut on the top or bottom layer.')
    for (const id of new Set([...p.top.slice(6), ...p.bottom.slice(0, 6)])) {
        poses[id].angle = mod(-poses[id].angle)
        poses[id].flipped = !poses[id].flipped
    }
    return {
        top: [...p.top.slice(0, 6), ...p.bottom.slice(0, 6)],
        bottom: [...p.top.slice(6), ...p.bottom.slice(6)],
        poses,
        middle: (1 - p.middle) as 0 | 1,
    }
}
export function inverseSquare(move: SquareMove): SquareMove {
    return move.kind === 'slice'
        ? move
        : { kind: 'rotate', top: canonical(-move.top), bottom: canonical(-move.bottom) }
}
export function squareNotation(move: SquareMove): string {
    return move.kind === 'slice' ? '/' : `(${canonical(move.top)},${canonical(move.bottom)})`
}
export function parseSquare(text: string): SquareMove[] {
    if (typeof text !== 'string') throw new Error('Square-1 notation must be text.')
    const moves: SquareMove[] = []
    let rest = text.trim()
    while (rest) {
        const token = /^(\/|\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\))/.exec(rest)
        if (!token) throw new Error('Invalid Square-1 notation.')
        if (token[1] === '/') moves.push({ kind: 'slice' })
        else {
            const top = Number(token[2]),
                bottom = Number(token[3])
            if (![top, bottom].every((v) => Number.isInteger(v) && Math.abs(v) <= 6))
                throw new Error('Square-1 rotations must be integers from −6 to 6.')
            if (top || bottom)
                moves.push({ kind: 'rotate', top: canonical(top), bottom: canonical(bottom) })
        }
        rest = rest.slice(token[0].length).trimStart()
    }
    return moves
}
export function pieceStart(ring: number[], id: number): number {
    return ring.findIndex((v, i) => v === id && ring[mod(i - 1)] !== id)
}
export function validateSquare(p: SquarePuzzle): void {
    if (
        !p ||
        !Array.isArray(p.top) ||
        !Array.isArray(p.bottom) ||
        p.top.length !== 12 ||
        p.bottom.length !== 12 ||
        !Array.isArray(p.poses) ||
        p.poses.length !== 16 ||
        ![0, 1].includes(p.middle)
    )
        throw new Error('Invalid Square-1 inventory.')
    const all = [...p.top, ...p.bottom]
    if (all.some((id) => !Number.isInteger(id) || id < 0 || id >= 16))
        throw new Error('Unknown Square-1 piece.')
    for (let id = 0; id < 16; id++) {
        const width = (id % 2) + 1,
            homeTop = id < 8,
            home = homeTop ? topHome : bottomHome
        if (
            all.filter((v) => v === id).length !== width ||
            (p.top.includes(id) && p.bottom.includes(id))
        )
            throw new Error('Invalid Square-1 piece inventory.')
        const onTop = p.top.includes(id),
            ring = onTop ? p.top : p.bottom,
            start = pieceStart(ring, id),
            pose = p.poses[id]
        if (
            start < 0 ||
            Array.from({ length: width }, (_, i) => ring[mod(start + i)]).some((v) => v !== id)
        )
            throw new Error('Split Square-1 corner.')
        if (
            !pose ||
            !Number.isInteger(pose.angle) ||
            pose.angle < 0 ||
            pose.angle >= 12 ||
            typeof pose.flipped !== 'boolean' ||
            onTop !== (homeTop !== pose.flipped)
        )
            throw new Error('Invalid Square-1 wedge pose.')
        const center = (top: boolean, s: number) => 1 + (top ? -1 : 1) * (2 * s + width)
        const homeCenter = center(homeTop, pieceStart(home, id)),
            expected = mod((pose.flipped ? 14 - homeCenter : homeCenter) + 2 * pose.angle, 24)
        if (expected !== mod(center(onTop, start), 24))
            throw new Error('Square-1 geometry disagrees with its sector rings.')
    }
}
export function squareSolved(p: SquarePuzzle): boolean {
    return (
        p.middle === 0 &&
        p.top.every((v, i) => v === topHome[i]) &&
        p.bottom.every((v, i) => v === bottomHome[i])
    )
}
export function squareScramble(params: SquareParams): SquareMove[] {
    if (
        !Number.isInteger(params.scrambleLength) ||
        params.scrambleLength < 0 ||
        params.scrambleLength > 100 ||
        !Number.isInteger(params.seed) ||
        params.seed < 0 ||
        params.seed > 0xffffffff
    )
        throw new Error('Invalid Square-1 scramble input.')
    const random = createRandom(deriveSeed(params.seed, 'square-one-scramble'))
    let p = solvedSquare()
    const result: SquareMove[] = []
    for (let i = 0; i < params.scrambleLength; i++) {
        const choices: SquareMove[] = []
        for (let top = -5; top <= 6; top++)
            for (let bottom = -5; bottom <= 6; bottom++) {
                const move: SquareMove = { kind: 'rotate', top, bottom }
                if ((top || bottom) && canSlice(moveSquare(p, move))) choices.push(move)
            }
        const pair = choices[random.integer(0, choices.length - 1)],
            slice: SquareMove = { kind: 'slice' }
        p = moveSquare(moveSquare(p, pair), slice)
        result.push(pair, slice)
    }
    return result
}
export function pieceParity(p: SquarePuzzle): number {
    const ids = [...p.top, ...p.bottom].filter((id, i, all) => i === 0 || id !== all[i - 1])
    let parity = 0
    for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++) if (ids[i] > ids[j]) parity ^= 1
    return parity
}
export function shapeMask(p: SquarePuzzle): number {
    return [...p.top, ...p.bottom].reduce((mask, id) => (mask << 1) | (id & 1), 0)
}
export function shapeReady(p: SquarePuzzle): boolean {
    if (!canSlice(p)) return false
    const mask = shapeMask(p),
        parity = pieceParity(p)
    return [
        [0xdb66db, 0],
        [0xdb6db6, 1],
        [0x6db6db, 1],
        [0x6dbdb6, 0],
    ].some(([m, v]) => mask === m && parity === v)
}
