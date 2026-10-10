import { createRandom, deriveSeed } from '../../../engine/seededRandom'

export type Vec = [number, number, number]
export const faces = ['U', 'R', 'F', 'D', 'L', 'B'] as const
export type Face = (typeof faces)[number]
export type CubeSize = 3 | 4 | 5
// Depth is one-based from the named face. Omitted spans mean the old outer move.
export type Move = { face: Face; turns: 1 | 2 | 3; depth?: number; width?: number }
export type Basis = [Vec, Vec, Vec]
export type Sticker = { color: Face; normal: Vec }
export type Cubie = { id: string; home: Vec; position: Vec; basis: Basis; stickers: Sticker[] }
export type Cube = Cubie[]
export type CubeParams = { scrambleLength: number; seed: number; size?: CubeSize | string }
export const normals: Record<Face, Vec> = {
    U: [0, 1, 0],
    R: [1, 0, 0],
    F: [0, 0, 1],
    D: [0, -1, 0],
    L: [-1, 0, 0],
    B: [0, 0, -1],
}
export const faceColors: Record<Face, string> = {
    U: '#f4f1df',
    R: '#df4944',
    F: '#379d69',
    D: '#f2cc42',
    L: '#f08a34',
    B: '#4388ce',
}
export const dot = (a: Vec, b: Vec) => a.reduce((sum, v, i) => sum + v * b[i], 0)
export const sameVec = (a: Vec, b: Vec) => a.every((v, i) => v === b[i])
export function normalizeSize(value: unknown = 3): CubeSize {
    const size = typeof value === 'string' ? Number(value) : value
    if (size !== 3 && size !== 4 && size !== 5) throw new Error('Cube size must be 3, 4, or 5.')
    return size
}
export function cubeSize(cube: Cube): CubeSize {
    const size = ({ 26: 3, 56: 4, 98: 5 } as Record<number, number>)[cube.length]
    return normalizeSize(size ?? NaN)
}
export function solvedCube(size: CubeSize = 3): Cube {
    normalizeSize(size)
    const extent = size - 1
    const cube: Cube = []
    for (let x = -extent; x <= extent; x += 2)
        for (let y = -extent; y <= extent; y += 2)
            for (let z = -extent; z <= extent; z += 2) {
                if (![x, y, z].some((value) => Math.abs(value) === extent)) continue
                const position: Vec = [x, y, z]
                cube.push({
                    id: `${x},${y},${z}`,
                    home: [...position],
                    position,
                    basis: [
                        [1, 0, 0],
                        [0, 1, 0],
                        [0, 0, 1],
                    ],
                    stickers: faces
                        .filter((face) => dot(position, normals[face]) === extent)
                        .map((color) => ({ color, normal: [...normals[color]] as Vec })),
                })
            }
    return cube
}
export function validateMove(move: Move, size: CubeSize): void {
    const depth = move.depth ?? 1,
        width = move.width ?? 1
    if (
        !faces.includes(move.face) ||
        ![1, 2, 3].includes(move.turns) ||
        !Number.isInteger(depth) ||
        !Number.isInteger(width) ||
        depth < 1 ||
        width < 1 ||
        depth + width - 1 > size
    )
        throw new Error('Invalid cube move or layer span.')
}
export function affectedLayer(position: Vec, move: Move, size: CubeSize): boolean {
    const depth = (size - 1 - dot(position, normals[move.face])) / 2 + 1
    return depth >= (move.depth ?? 1) && depth < (move.depth ?? 1) + (move.width ?? 1)
}
// A clockwise turn, looking inward at the face: -90 degrees about its outward normal.
export function rotateQuarter(v: Vec, axis: Vec): Vec {
    const cross: Vec = [
        axis[1] * v[2] - axis[2] * v[1],
        axis[2] * v[0] - axis[0] * v[2],
        axis[0] * v[1] - axis[1] * v[0],
    ]
    const projection = dot(v, axis)
    return axis.map((n, i) => n * projection - cross[i] || 0) as Vec
}
export function turn(cube: Cube, move: Move): Cube {
    const size = cubeSize(cube)
    validateMove(move, size)
    const axis = normals[move.face]
    const rotate = (v: Vec) => {
        for (let i = 0; i < move.turns; i++) v = rotateQuarter(v, axis)
        return v
    }
    return cube.map((cubie) =>
        affectedLayer(cubie.position, move, size)
            ? {
                  ...cubie,
                  position: rotate(cubie.position),
                  basis: cubie.basis.map(rotate) as Basis,
                  stickers: cubie.stickers.map((sticker) => ({
                      ...sticker,
                      normal: rotate(sticker.normal),
                  })),
              }
            : cubie,
    )
}
export function parseMoves(notation: string, size: CubeSize = 3): Move[] {
    if (!notation.trim()) return []
    return notation
        .trim()
        .split(/\s+/)
        .map((token) => {
            const match = /^(?:(\d+)(?:-(\d+))?)?([URFDLB])(w)?([2'′]?)$/.exec(token)
            if (!match) throw new Error(`Invalid cube move: ${token}`)
            const move: Move = {
                face: match[3] as Face,
                turns: match[5] === '2' ? 2 : match[5] ? 3 : 1,
            }
            if (match[2]) {
                if (match[4]) throw new Error(`Invalid cube move: ${token}`)
                move.depth = Number(match[1])
                move.width = Number(match[2]) - move.depth + 1
            } else if (match[4]) move.width = match[1] ? Number(match[1]) : 2
            else if (match[1]) move.depth = Number(match[1])
            validateMove(move, size)
            return move
        })
}
export const notation = (move: Move) => {
    const range = (move.depth ?? 1) > 1 && (move.width ?? 1) > 1
    const prefix = range
        ? `${move.depth}-${move.depth! + move.width! - 1}`
        : (move.width ?? 1) > 2
          ? String(move.width)
          : (move.depth ?? 1) > 1
            ? String(move.depth)
            : ''
    return (
        prefix +
        move.face +
        ((move.width ?? 1) > 1 && !range ? 'w' : '') +
        (move.turns === 2 ? '2' : move.turns === 3 ? '′' : '')
    )
}
export const inverse = (move: Move): Move => ({
    ...move,
    turns: (move.turns === 2 ? 2 : 4 - move.turns) as Move['turns'],
})
export const applyMoves = (cube: Cube, moves: Move[]) => moves.reduce(turn, cube)
export const transform = (basis: Basis, value: Vec): Vec =>
    [0, 1, 2].map((axis) => value.reduce((sum, v, i) => sum + v * basis[i][axis], 0)) as Vec

// Structural verification is separate from color solvedness. A legal twist may
// rotate a monochrome center in place without restoring its home orientation.
export function validateCube(cube: Cube): void {
    const size = cubeSize(cube),
        extent = size - 1
    const homes = new Map(solvedCube(size).map((piece) => [piece.id, piece]))
    const positions = new Set<string>(),
        ids = new Set<string>()
    for (const piece of cube) {
        const home = homes.get(piece.id)
        if (!home || ids.has(piece.id) || !sameVec(piece.home, home.position))
            throw new Error('Cube has an invalid piece inventory.')
        ids.add(piece.id)
        if (
            piece.position.some(
                (v) => !Number.isInteger(v) || Math.abs(v) > extent || (v + extent) % 2 !== 0,
            ) ||
            !piece.position.some((v) => Math.abs(v) === extent) ||
            positions.has(piece.position.join(','))
        )
            throw new Error('Cube has an invalid lattice position.')
        positions.add(piece.position.join(','))
        const basis = piece.basis
        if (
            basis.length !== 3 ||
            basis.some(
                (v) => v.length !== 3 || v.some((n) => ![-1, 0, 1].includes(n)) || dot(v, v) !== 1,
            ) ||
            dot(basis[0], basis[1]) !== 0 ||
            dot(basis[0], basis[2]) !== 0 ||
            dot(basis[1], basis[2]) !== 0 ||
            dot(basis[0], [
                basis[1][1] * basis[2][2] - basis[1][2] * basis[2][1],
                basis[1][2] * basis[2][0] - basis[1][0] * basis[2][2],
                basis[1][0] * basis[2][1] - basis[1][1] * basis[2][0],
            ]) !== 1 ||
            !sameVec(transform(basis, piece.home), piece.position)
        )
            throw new Error('Cube has an invalid piece orientation.')
        if (
            piece.stickers.length !== home.stickers.length ||
            new Set(piece.stickers.map((s) => s.color)).size !== home.stickers.length ||
            piece.stickers.some(
                (s) =>
                    !home.stickers.some((h) => h.color === s.color) ||
                    !sameVec(s.normal, transform(basis, normals[s.color])) ||
                    dot(piece.position, s.normal) !== extent,
            )
        )
            throw new Error('Cube has an invalid sticker inventory or orientation.')
    }
}
export function scramble(params: CubeParams, namespace?: string): Move[] {
    const size = normalizeSize(params.size)
    if (
        !Number.isInteger(params.scrambleLength) ||
        params.scrambleLength < 0 ||
        params.scrambleLength > 100 ||
        !Number.isInteger(params.seed)
    )
        throw new Error('Scramble length must be an integer from 0 to 100 with an integer seed.')
    const random = createRandom(
        deriveSeed(
            params.seed,
            namespace ?? (size === 3 ? 'rubiks-scramble' : `rubiks-${size}-scramble`),
        ),
    )
    const moves: Move[] = []
    for (let i = 0; i < params.scrambleLength; i++) {
        const options = faces.filter((face) => face !== moves.at(-1)?.face)
        const move: Move = {
            face: options[random.integer(0, options.length - 1)],
            turns: random.integer(1, 3) as Move['turns'],
        }
        if (size > 3) {
            const sampled = random.integer(0, 2)
            const layer = i === 0 ? 1 : i === 1 ? 2 : sampled
            if (layer === 1) move.depth = 2
            if (layer === 2) move.width = 2
        }
        moves.push(move)
    }
    return moves
}
// URFDLB row-major facelets, each viewed from outside. Row 0 is the top of that face.
export const facePosition = (face: Face, row: number, col: number, size: CubeSize = 3): Vec => {
    const extent = size - 1
    const a = 2 * col - extent,
        b = extent - 2 * row
    switch (face) {
        case 'U':
            return [a, extent, -b]
        case 'R':
            return [extent, b, -a]
        case 'F':
            return [a, b, extent]
        case 'D':
            return [a, -extent, b]
        case 'L':
            return [-extent, b, a]
        case 'B':
            return [-a, b, -extent]
    }
}
export function facelets(cube: Cube): string {
    const size = cubeSize(cube)
    return faces
        .map((face) =>
            Array.from({ length: size * size }, (_, i) => {
                const cubie = cube.find((c) =>
                    sameVec(c.position, facePosition(face, Math.floor(i / size), i % size, size)),
                )
                const sticker = cubie?.stickers.find((s) => sameVec(s.normal, normals[face]))
                if (!sticker) throw new Error('Cube has a missing facelet.')
                return sticker.color
            }).join(''),
        )
        .join('')
}
export const isSolved = (cube: Cube) =>
    facelets(cube) === faces.map((face) => face.repeat(cubeSize(cube) ** 2)).join('')
export function threeFacelets(cube: Cube): string {
    if (cubeSize(cube) !== 3) throw new Error('The two-phase solver requires exactly 54 facelets.')
    return facelets(cube)
}
// Kociemba orientation convention: corner U/D sticker in its U/D slot; for edges,
// U/D color leads on U/D slots and F/B color leads on equatorial slots.
export function inPhase2(cube: Cube): boolean {
    if (cubeSize(cube) !== 3) throw new Error('Two-phase coordinates require a 3×3 projection.')
    const cornerSlots: [Vec, Face[]][] = [
        [
            [1, 1, 1],
            ['U', 'R', 'F'],
        ],
        [
            [-1, 1, 1],
            ['U', 'F', 'L'],
        ],
        [
            [-1, 1, -1],
            ['U', 'L', 'B'],
        ],
        [
            [1, 1, -1],
            ['U', 'B', 'R'],
        ],
        [
            [1, -1, 1],
            ['D', 'F', 'R'],
        ],
        [
            [-1, -1, 1],
            ['D', 'L', 'F'],
        ],
        [
            [-1, -1, -1],
            ['D', 'B', 'L'],
        ],
        [
            [1, -1, -1],
            ['D', 'R', 'B'],
        ],
    ]
    const edgeSlots: [Vec, Face[]][] = [
        [
            [1, 1, 0],
            ['U', 'R'],
        ],
        [
            [0, 1, 1],
            ['U', 'F'],
        ],
        [
            [-1, 1, 0],
            ['U', 'L'],
        ],
        [
            [0, 1, -1],
            ['U', 'B'],
        ],
        [
            [1, -1, 0],
            ['D', 'R'],
        ],
        [
            [0, -1, 1],
            ['D', 'F'],
        ],
        [
            [-1, -1, 0],
            ['D', 'L'],
        ],
        [
            [0, -1, -1],
            ['D', 'B'],
        ],
        [
            [1, 0, 1],
            ['F', 'R'],
        ],
        [
            [-1, 0, 1],
            ['F', 'L'],
        ],
        [
            [-1, 0, -1],
            ['B', 'L'],
        ],
        [
            [1, 0, -1],
            ['B', 'R'],
        ],
    ]
    for (const [position, order] of cornerSlots) {
        const cubie = cube.find((c) => sameVec(c.position, position.map((v) => v * 2) as Vec))!
        if (
            !cubie.stickers.some(
                (s) => ['U', 'D'].includes(s.color) && sameVec(s.normal, normals[order[0]]),
            )
        )
            return false
    }
    for (const [position, order] of edgeSlots) {
        const cubie = cube.find((c) => sameVec(c.position, position.map((v) => v * 2) as Vec))!
        const slice = cubie.stickers.every((s) => !['U', 'D'].includes(s.color))
        if (slice !== (position[1] === 0)) return false
        const leading = cubie.stickers.find((s) =>
            slice ? ['F', 'B'].includes(s.color) : ['U', 'D'].includes(s.color),
        )!
        if (!sameVec(leading.normal, normals[order[0]])) return false
    }
    return true
}
export const phase2Move = (move: Move) =>
    (move.depth ?? 1) === 1 &&
    (move.width ?? 1) === 1 &&
    (move.face === 'U' || move.face === 'D' || move.turns === 2)
