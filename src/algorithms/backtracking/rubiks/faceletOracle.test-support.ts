// Independent sticker-permutation oracle: no production coordinates, affected
// layer predicate, vector rotation, cubie turns, or facelet adapters are used.
import type { CubeSize, Move } from './model'

type Point = [number, number, number]
const sides = ['U', 'R', 'F', 'D', 'L', 'B']
const axes: Point[] = [
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, 1],
    [0, -1, 0],
    [-1, 0, 0],
    [0, 0, -1],
]
function stickers(size: CubeSize) {
    const result: { point: Point; normal: Point }[] = []
    const e = size - 1
    for (let f = 0; f < 6; f++)
        for (let r = 0; r < size; r++)
            for (let c = 0; c < size; c++) {
                const x = c * 2 - e,
                    y = e - r * 2
                const points: Point[] = [
                    [x, e, -y],
                    [e, y, -x],
                    [x, y, e],
                    [x, -e, y],
                    [-e, y, x],
                    [-x, y, -e],
                ]
                result.push({ point: points[f], normal: axes[f] })
            }
    return result
}
function spin(v: Point, axis: number, direction: number): Point {
    const [x, y, z] = v
    if (axis === 0) return direction > 0 ? [x, z, -y] : [x, -z, y]
    if (axis === 1) return direction > 0 ? [-z, y, x] : [z, y, -x]
    return direction > 0 ? [y, -x, z] : [-y, x, z]
}
export function oraclePermutation(size: CubeSize, moves: Move[]): number[] {
    const cells = stickers(size)
    const key = (point: Point, normal: Point) => `${point.join(',')}/${normal.join(',')}`
    const indices = new Map(cells.map((cell, i) => [key(cell.point, cell.normal), i]))
    let values = cells.map((_, i) => i)
    for (const move of moves) {
        const normal = axes[sides.indexOf(move.face)]
        const axis = normal.findIndex((v) => v !== 0),
            direction = normal[axis]
        const next = [...values]
        cells.forEach((cell, source) => {
            const layer = (size - 1 - cell.point[axis] * direction) / 2 + 1
            if (layer < (move.depth ?? 1) || layer >= (move.depth ?? 1) + (move.width ?? 1)) return
            let p = cell.point,
                n = cell.normal
            for (let i = 0; i < move.turns; i++) {
                p = spin(p, axis, direction)
                n = spin(n, axis, direction)
            }
            const destination = indices.get(key(p, n))
            if (destination === undefined) throw new Error('Oracle permutation left the exterior.')
            next[destination] = values[source]
        })
        values = next
    }
    return values
}
export const oracleFacelets = (size: CubeSize, moves: Move[]) =>
    oraclePermutation(size, moves)
        .map((i) => sides[Math.floor(i / (size * size))])
        .join('')
