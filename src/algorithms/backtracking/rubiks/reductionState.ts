import {
    cubeSize,
    facelets,
    faces,
    facePosition,
    normals,
    rotateQuarter,
    sameVec,
    solvedCube,
    transform,
    validateCube,
    type Basis,
    type Cube,
    type Vec,
} from './model'

export const centersSolved = (cube: Cube) =>
    cube
        .filter((p) => p.stickers.length === 1)
        .every((p) => sameVec(p.stickers[0].normal, normals[p.stickers[0].color]))
export function edgesGrouped(cube: Cube): boolean {
    const extent = cubeSize(cube) - 1
    const groups = new Map<string, string>()
    for (const piece of cube.filter((p) => p.stickers.length === 2)) {
        const slot = piece.position.map((v) => (Math.abs(v) === extent ? v : 0)).join(',')
        const colors = piece.stickers
            .map((s) => `${s.normal.join(',')}/${s.color}`)
            .sort()
            .join(';')
        if (groups.has(slot) && groups.get(slot) !== colors) return false
        groups.set(slot, colors)
    }
    return groups.size === 12
}
export function reducedFacelets(cube: Cube): string {
    if (!centersSolved(cube) || !edgesGrouped(cube))
        throw new Error('Cube reduction invariants are not satisfied.')
    const size = cubeSize(cube),
        full = facelets(cube)
    const middle = Math.floor((size - 1) / 2)
    const indices = [0, middle, size - 1]
    return faces
        .map((_, f) =>
            indices
                .flatMap((r) => indices.map((c) => full[f * size * size + r * size + c]))
                .join(''),
        )
        .join('')
}
const orientations: Basis[] = []
const pending: Basis[] = [
    [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
    ],
]
const seen = new Set<string>()
while (pending.length) {
    const basis = pending.shift()!,
        key = basis.flat().join(',')
    if (seen.has(key)) continue
    seen.add(key)
    orientations.push(basis)
    for (const axis of [normals.U, normals.R, normals.F])
        pending.push(basis.map((v) => rotateQuarter(v, axis)) as Basis)
}
export function cubeFromFacelets(input: string): Cube {
    if (input.length !== 54 || faces.some((f) => input.split(f).length - 1 !== 9))
        throw new Error('Invalid reduced facelet inventory.')
    const solved = solvedCube()
    const result = solved.map((slot) => {
        const stickers = faces.flatMap((f, face) =>
            Array.from({ length: 9 }, (_, i) =>
                sameVec(slot.position, facePosition(f, Math.floor(i / 3), i % 3))
                    ? { color: input[face * 9 + i], normal: normals[f] }
                    : null,
            ).filter((s) => s !== null),
        )
        const home = solved.find(
            (p) =>
                p.stickers
                    .map((s) => s.color)
                    .sort()
                    .join('') ===
                stickers
                    .map((s) => s.color)
                    .sort()
                    .join(''),
        )
        if (!home) throw new Error('Invalid reduced piece colors.')
        const basis = orientations.find(
            (b) =>
                sameVec(transform(b, home.home), slot.position) &&
                home.stickers.every((s) =>
                    stickers.some(
                        (t) =>
                            t.color === s.color &&
                            sameVec(transform(b, normals[s.color]), t.normal),
                    ),
                ),
        )
        if (!basis) throw new Error('Invalid reduced piece orientation.')
        return {
            ...home,
            position: slot.position,
            basis,
            stickers: home.stickers.map((s) => ({
                ...s,
                normal: transform(basis, normals[s.color]),
            })),
        }
    })
    validateCube(result)
    return result
}
const cornerOrders = ['URF', 'UFL', 'ULB', 'UBR', 'DFR', 'DLF', 'DBL', 'DRB']
const edgeOrders = ['UR', 'UF', 'UL', 'UB', 'DR', 'DF', 'DL', 'DB', 'FR', 'FL', 'BL', 'BR']
const slotPosition = (order: string): Vec =>
    order
        .split('')
        .reduce((p, f) => p.map((v, i) => v + normals[f as keyof typeof normals][i] * 2) as Vec, [
            0, 0, 0,
        ] as Vec)
export const permutationParity = (values: number[]) =>
    values.reduce(
        (sum, value, i) => sum + values.slice(i + 1).filter((next) => next < value).length,
        0,
    ) % 2
export function reducedCoordinates(input: string) {
    const cube = cubeFromFacelets(input)
    const coords = (orders: string[]) =>
        orders.map((order) => {
            const piece = cube.find((p) => sameVec(p.position, slotPosition(order)))!
            const leading =
                piece.stickers.find((s) => ['U', 'D'].includes(s.color)) ??
                piece.stickers.find((s) => ['F', 'B'].includes(s.color))!
            return {
                permutation: orders.findIndex((home) => sameVec(piece.home, slotPosition(home))),
                orientation: order
                    .split('')
                    .findIndex((f) => sameVec(normals[f as keyof typeof normals], leading.normal)),
            }
        })
    const corners = coords(cornerOrders),
        edges = coords(edgeOrders)
    if (corners.reduce((s, p) => s + p.orientation, 0) % 3 !== 0)
        throw new Error('Invalid reduced corner orientation sum.')
    return {
        corners: corners.map((p) => p.permutation),
        edges: edges.map((p) => p.permutation),
        oll: edges.reduce((s, p) => s + p.orientation, 0) % 2 !== 0,
        pll:
            permutationParity(corners.map((p) => p.permutation)) !==
            permutationParity(edges.map((p) => p.permutation)),
    }
}
