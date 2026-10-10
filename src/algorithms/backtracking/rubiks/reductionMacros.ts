import {
    affectedLayer,
    applyMoves,
    faces,
    inverse,
    normals,
    parseMoves,
    rotateQuarter,
    sameVec,
    solvedCube,
    type Cube,
    type CubeSize,
    type Move,
    type Vec,
} from './model'

export type OrbitKind = 'diagonal centers' | 'axial centers' | 'wings'
export const centerCycle = '2U R 2U′ 2R 2U R′ 2U′ 2R′'
export const axialCycle = '2U R 2U′ 3R 2U R′ 2U′ 3R′'
export const wingCycle = '2U R 2U′ L 2U R′ 2U′ L′'
// Cube-fixed sequences; independently tested sticker effects determine their use.
export const orientationParity =
    'Rw2 R2 U2 Rw2 R2 U2 Rw R′ U2 Rw R′ U2 Rw′ R′ U2 B2 U Rw′ R U′ B2 U Rw R′ U R2'
export const permutationParityMoves = '2R2 U2 2R2 Uw2 2R2 Uw2'

export function macroDefinition(
    size: CubeSize,
    kind: OrbitKind,
): { notation: string; cycle: [Vec, Vec, Vec] } {
    const e = size - 1,
        k = size - 3
    if (kind === 'wings')
        return {
            notation: wingCycle,
            cycle: [
                [-e, -e, -k],
                [e, e, k],
                [-e, k, -e],
            ],
        }
    if (kind === 'axial centers') {
        if (size !== 5) throw new Error('Only 5×5 has the movable axial center orbit.')
        return {
            notation: axialCycle,
            cycle: [
                [0, k, -e],
                [0, e, k],
                [e, 0, k],
            ],
        }
    }
    return {
        notation: centerCycle,
        cycle: [
            [k, k, -e],
            [k, e, k],
            [e, -k, k],
        ],
    }
}

export function orbitPieces(cube: Cube, kind: OrbitKind) {
    const extent = Math.max(...cube.flatMap((p) => p.position.map(Math.abs)))
    return cube.filter((p) =>
        kind === 'wings'
            ? p.stickers.length === 2 && !p.home.includes(0)
            : p.stickers.length === 1 &&
              p.home.filter((v) => Math.abs(v) !== extent).filter((v) => v !== 0).length ===
                  (kind === 'axial centers' ? 1 : 2),
    )
}
const catalogCache = new Map<string, CycleCatalog>()
export class CycleCatalog {
    readonly positions: Vec[]
    readonly primitive: Move[]
    private parent = new Int32Array(24 ** 3).fill(-1)
    private parentMove = new Int8Array(24 ** 3).fill(-1)
    private moves: Move[]
    private start: number
    constructor(
        readonly size: CubeSize,
        kind: OrbitKind,
    ) {
        const solved = solvedCube(size),
            orbit = orbitPieces(solved, kind)
        if (orbit.length !== 24)
            throw new Error('A reduction orbit must contain exactly 24 pieces.')
        this.positions = orbit.map((p) => p.home)
        const declaration = macroDefinition(size, kind)
        this.primitive = parseMoves(declaration.notation, size)
        const changed = applyMoves(solved, this.primitive)
        for (const piece of changed) {
            const source = declaration.cycle.findIndex((p) => sameVec(p, piece.home))
            const expected = source < 0 ? piece.home : declaration.cycle[(source + 1) % 3]
            if (
                !sameVec(piece.position, expected) ||
                (source < 0 && piece.stickers.some((s) => !sameVec(s.normal, normals[s.color])))
            )
                throw new Error(
                    'Reduction macro violated its declared effect or restoration invariant.',
                )
        }
        const [a, b, c] = declaration.cycle.map((p) =>
            this.positions.findIndex((slot) => sameVec(p, slot)),
        )
        this.start = this.encode(a, b, c)
        this.moves = faces.flatMap((face) =>
            [1, 2, 3].flatMap((turns) => [
                { face, turns: turns as Move['turns'] },
                { face, turns: turns as Move['turns'], depth: 2 },
            ]),
        )
        const transitions = this.moves.map((move) =>
            this.positions.map((p) => {
                let value = p
                if (affectedLayer(value, move, size))
                    for (let i = 0; i < move.turns; i++)
                        value = rotateQuarter(value, normals[move.face])
                const index = this.positions.findIndex((slot) => sameVec(slot, value))
                if (index < 0) throw new Error('Setup move left its reduction orbit.')
                return index
            }),
        )
        const queue = new Int32Array(24 * 23 * 22)
        let head = 0,
            tail = 1
        queue[0] = this.start
        this.parent[this.start] = this.start
        while (head < tail) {
            const state = queue[head++],
                [x, y, z] = this.decode(state)
            transitions.forEach((t, move) => {
                const next = this.encode(t[x], t[y], t[z])
                if (this.parent[next] !== -1) return
                this.parent[next] = state
                this.parentMove[next] = move
                queue[tail++] = next
            })
        }
        if (tail !== queue.length)
            throw new Error('Setup catalog does not cover every ordered three-piece target.')
    }
    private encode(a: number, b: number, c: number) {
        return (a * 24 + b) * 24 + c
    }
    private decode(key: number) {
        return [Math.floor(key / 576), Math.floor(key / 24) % 24, key % 24]
    }
    cycle(a: number, b: number, c: number): Move[] {
        let key = this.encode(a, b, c)
        if (new Set([a, b, c]).size !== 3 || this.parent[key] === -1)
            throw new Error('Invalid three-cycle target.')
        const setup: Move[] = []
        while (key !== this.start) {
            setup.push(this.moves[this.parentMove[key]])
            key = this.parent[key]
        }
        setup.reverse()
        return [...setup.slice().reverse().map(inverse), ...this.primitive, ...setup]
    }
}
export function cycleCatalog(size: CubeSize, kind: OrbitKind): CycleCatalog {
    const key = `${size}/${kind}`
    if (!catalogCache.has(key)) catalogCache.set(key, new CycleCatalog(size, kind))
    return catalogCache.get(key)!
}
