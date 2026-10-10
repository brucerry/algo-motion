import {
    canSlice,
    canonical,
    moveSquare,
    shapeReady,
    squareNotation,
    squareSolved,
    validateSquare,
    type SquareMove,
    type SquarePuzzle,
} from './model'
import { prepareSquareTables, shapeIndex, squareCoordinates, componentRotation } from './tables'

export type SquareSolution = { notation: string; phase1Length: number }
// The only input is the current puzzle state. No scramble history is accepted.
export function findSquareSolution(
    input: SquarePuzzle,
    stage: (message: string) => void = () => {},
): SquareSolution {
    validateSquare(input)
    if (squareSolved(input)) return { notation: '', phase1Length: 0 }
    const tables = prepareSquareTables(stage),
        prefix: SquareMove[] = []
    let normalized = input
    if (!canSlice(normalized)) {
        outer: for (let top = 0; top < 12; top++)
            for (let bottom = 0; bottom < 12; bottom++) {
                const move: SquareMove = {
                        kind: 'rotate',
                        top: canonical(top),
                        bottom: canonical(bottom),
                    },
                    p = moveSquare(input, move)
                if (canSlice(p)) {
                    normalized = p
                    if (top || bottom) prefix.push(move)
                    break outer
                }
            }
    }
    const path1: number[] = [],
        start = shapeIndex(normalized, tables)
    const phase1 = (index: number, remaining: number, last: number): boolean => {
        if (tables.shapeDistance[index] > remaining) return false
        if (!remaining) return tables.shapeDistance[index] === 0
        if (last !== 0) {
            path1.push(0)
            if (phase1(tables.shapeSlice[index], remaining - 1, 0)) return true
            path1.pop()
        }
        for (const layer of [0, 1] as const)
            if (last <= layer) {
                const table = layer === 0 ? tables.shapeTop : tables.shapeBottom
                let next = index,
                    amount = 0
                while (amount < 12) {
                    const encoded = table[next]
                    amount += encoded & 15
                    next = encoded >> 4
                    if (amount >= 12) break
                    path1.push(layer === 0 ? amount : -amount)
                    if (phase1(next, remaining - 1, layer + 1)) return true
                    path1.pop()
                }
            }
        return false
    }
    stage('Searching shape and parity…')
    for (let depth = tables.shapeDistance[start]; !phase1(start, depth, -1); depth++)
        stage(`Searching shape and parity at depth ${depth + 1}…`)
    const pack = (path: number[]): SquareMove[] => {
        const moves: SquareMove[] = []
        let top = 0,
            bottom = 0
        const flush = () => {
            if (top || bottom)
                moves.push({ kind: 'rotate', top: canonical(top), bottom: canonical(bottom) })
            top = 0
            bottom = 0
        }
        for (const raw of path) {
            if (raw > 0) top += raw
            else if (raw < 0) bottom -= raw
            else {
                flush()
                moves.push({ kind: 'slice' })
            }
        }
        flush()
        return moves
    }
    const first = [...prefix, ...pack(path1)],
        reduced = first.reduce(moveSquare, input)
    if (!shapeReady(reduced))
        throw new Error('Square-1 phase 1 failed its actual shape/parity check.')
    const coords = squareCoordinates(reduced),
        path2: number[] = []
    const lower = (edge: number, corner: number, flags: number) =>
        Math.max(tables.edgeDistance[edge * 8 + flags], tables.cornerDistance[corner * 8 + flags])
    const phase2 = (
        edge: number,
        corner: number,
        flags: number,
        remaining: number,
        last: number,
    ): boolean => {
        if (lower(edge, corner, flags) > remaining) return false
        if (!remaining) return edge === 0 && corner === 0 && flags === 2
        if (last !== 0 && Boolean(flags & 4) === Boolean(flags & 2)) {
            path2.push(0)
            if (phase2(tables.slice[edge], tables.slice[corner], flags ^ 1, remaining - 1, 0))
                return true
            path2.pop()
        }
        for (const layer of [0, 1] as const)
            if (last <= layer) {
                let e = edge,
                    c = corner,
                    f = flags,
                    amount = 0
                while (amount < 12) {
                    const nextE = componentRotation(e, f, layer, true, tables),
                        nextC = componentRotation(c, f, layer, false, tables)
                    e = nextE.perm
                    c = nextC.perm
                    f = nextE.flags
                    amount += nextE.amount
                    if (amount >= 12) break
                    path2.push(layer === 0 ? amount : -amount)
                    if (phase2(e, c, f, remaining - 1, layer + 1)) return true
                    path2.pop()
                }
            }
        return false
    }
    stage('Searching piece permutations and middle layer…')
    for (
        let depth = lower(coords.edge, coords.corner, coords.flags);
        !phase2(coords.edge, coords.corner, coords.flags, depth, -1);
        depth++
    )
        stage(`Searching permutations and middle layer at depth ${depth + 1}…`)
    const moves = [...first, ...pack(path2)],
        solved = moves.reduce(moveSquare, input)
    validateSquare(solved)
    if (!squareSolved(solved))
        throw new Error('Square-1 search did not restore the complete puzzle.')
    return { notation: moves.map(squareNotation).join(' '), phase1Length: first.length }
}
