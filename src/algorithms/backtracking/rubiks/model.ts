import { createRandom, deriveSeed } from '../../../engine/seededRandom'

export type Vec = [number, number, number]
export const faces = ['U', 'R', 'F', 'D', 'L', 'B'] as const
export type Face = (typeof faces)[number]
export type Move = { face: Face; turns: 1 | 2 | 3 }
export type Sticker = { color: Face; normal: Vec }
export type Cubie = { id: string; position: Vec; stickers: Sticker[] }
export type Cube = Cubie[]
export type CubeParams = { scrambleLength: number; seed: number }
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
export function solvedCube(): Cube {
    const cube: Cube = []
    for (let x = -1; x <= 1; x++)
        for (let y = -1; y <= 1; y++)
            for (let z = -1; z <= 1; z++) {
                if (x === 0 && y === 0 && z === 0) continue
                const position: Vec = [x, y, z]
                cube.push({
                    id: `${x},${y},${z}`,
                    position,
                    stickers: faces
                        .filter((face) => dot(position, normals[face]) === 1)
                        .map((color) => ({ color, normal: [...normals[color]] as Vec })),
                })
            }
    return cube
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
    const axis = normals[move.face]
    const rotate = (v: Vec) => {
        for (let i = 0; i < move.turns; i++) v = rotateQuarter(v, axis)
        return v
    }
    return cube.map((cubie) =>
        dot(cubie.position, axis) === 1
            ? {
                  ...cubie,
                  position: rotate(cubie.position),
                  stickers: cubie.stickers.map((sticker) => ({
                      ...sticker,
                      normal: rotate(sticker.normal),
                  })),
              }
            : cubie,
    )
}
export function parseMoves(notation: string): Move[] {
    if (!notation.trim()) return []
    return notation
        .trim()
        .split(/\s+/)
        .map((token) => {
            const match = /^([URFDLB])([2'′]?)$/.exec(token)
            if (!match) throw new Error(`Invalid cube move: ${token}`)
            return { face: match[1] as Face, turns: match[2] === '2' ? 2 : match[2] ? 3 : 1 }
        })
}
export const notation = (move: Move) =>
    move.face + (move.turns === 2 ? '2' : move.turns === 3 ? '′' : '')
export const inverse = (move: Move): Move => ({
    ...move,
    turns: (move.turns === 2 ? 2 : 4 - move.turns) as Move['turns'],
})
export const applyMoves = (cube: Cube, moves: Move[]) => moves.reduce(turn, cube)
export function scramble(params: CubeParams): Move[] {
    if (
        !Number.isInteger(params.scrambleLength) ||
        params.scrambleLength < 0 ||
        params.scrambleLength > 100 ||
        !Number.isInteger(params.seed)
    )
        throw new Error('Scramble length must be an integer from 0 to 100 with an integer seed.')
    const random = createRandom(deriveSeed(params.seed, 'rubiks-scramble'))
    const moves: Move[] = []
    for (let i = 0; i < params.scrambleLength; i++) {
        const options = faces.filter((face) => face !== moves.at(-1)?.face)
        moves.push({
            face: options[random.integer(0, options.length - 1)],
            turns: random.integer(1, 3) as Move['turns'],
        })
    }
    return moves
}
// URFDLB row-major facelets, each viewed from outside. Row 0 is the top of that face.
const facePosition = (face: Face, row: number, col: number): Vec => {
    const a = col - 1,
        b = 1 - row
    switch (face) {
        case 'U':
            return [a, 1, -b]
        case 'R':
            return [1, b, -a]
        case 'F':
            return [a, b, 1]
        case 'D':
            return [a, -1, b]
        case 'L':
            return [-1, b, a]
        case 'B':
            return [-a, b, -1]
    }
}
export function facelets(cube: Cube): string {
    return faces
        .map((face) =>
            Array.from({ length: 9 }, (_, i) => {
                const cubie = cube.find((c) =>
                    sameVec(c.position, facePosition(face, Math.floor(i / 3), i % 3)),
                )
                const sticker = cubie?.stickers.find((s) => sameVec(s.normal, normals[face]))
                if (!sticker) throw new Error('Cube has a missing facelet.')
                return sticker.color
            }).join(''),
        )
        .join('')
}
export const isSolved = (cube: Cube) =>
    facelets(cube) === faces.map((face) => face.repeat(9)).join('')
// Kociemba orientation convention: corner U/D sticker in its U/D slot; for edges,
// U/D color leads on U/D slots and F/B color leads on equatorial slots.
export function inPhase2(cube: Cube): boolean {
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
        const cubie = cube.find((c) => sameVec(c.position, position))!
        if (
            !cubie.stickers.some(
                (s) => ['U', 'D'].includes(s.color) && sameVec(s.normal, normals[order[0]]),
            )
        )
            return false
    }
    for (const [position, order] of edgeSlots) {
        const cubie = cube.find((c) => sameVec(c.position, position))!
        const slice = cubie.stickers.every((s) => !['U', 'D'].includes(s.color))
        if (slice !== (position[1] === 0)) return false
        const leading = cubie.stickers.find((s) =>
            slice ? ['F', 'B'].includes(s.color) : ['U', 'D'].includes(s.color),
        )!
        if (!sameVec(leading.normal, normals[order[0]])) return false
    }
    return true
}
export const phase2Move = (move: Move) => move.face === 'U' || move.face === 'D' || move.turns === 2
