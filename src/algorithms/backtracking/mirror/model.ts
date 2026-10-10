import { cubeSize, type Cube, type Cubie, type Vec } from '../rubiks/model'

export const widths = [0.55, 0.95, 1.5] as const
const cuts = [-1.025, -0.475, 0.475, 1.975] as const
export function homeGeometry(home: Vec): { dimensions: Vec; center: Vec } {
    if (home.some((v) => ![-2, 0, 2].includes(v)))
        throw new Error('Mirror Cube requires the fixed 3×3 mechanism.')
    const indices = home.map((v) => (v + 2) / 2)
    return {
        dimensions: indices.map((i) => widths[i]) as Vec,
        center: indices.map((i) => (cuts[i] + cuts[i + 1]) / 2) as Vec,
    }
}
export function physicalBox(piece: Cubie) {
    const home = homeGeometry(piece.home)
    // Independent geometric evaluation of the rigid basis, including the offset
    // physical center. Neither logical slot coordinates nor colors determine it.
    const center = [0, 1, 2].map((j) =>
        piece.basis.reduce((sum, column, i) => sum + column[j] * home.center[i], 0),
    ) as Vec
    const dimensions = [0, 1, 2].map((j) =>
        piece.basis.reduce((sum, column, i) => sum + Math.abs(column[j]) * home.dimensions[i], 0),
    ) as Vec
    return {
        center,
        dimensions,
        minimum: center.map((v, i) => v - dimensions[i] / 2) as Vec,
        maximum: center.map((v, i) => v + dimensions[i] / 2) as Vec,
    }
}
export function isMirrorSolved(cube: Cube): boolean {
    if (cubeSize(cube) !== 3) return false
    const expected: { minimum: Vec; maximum: Vec }[] = []
    for (let x = 0; x < 3; x++)
        for (let y = 0; y < 3; y++)
            for (let z = 0; z < 3; z++) {
                if (x === 1 && y === 1 && z === 1) continue
                expected.push({
                    minimum: [cuts[x], cuts[y], cuts[z]],
                    maximum: [cuts[x + 1], cuts[y + 1], cuts[z + 1]],
                })
            }
    const used = new Set<number>()
    for (const piece of cube) {
        const box = physicalBox(piece)
        const match = expected.findIndex(
            (home, i) =>
                !used.has(i) &&
                home.minimum.every((v, j) => Math.abs(v - box.minimum[j]) < 1e-10) &&
                home.maximum.every((v, j) => Math.abs(v - box.maximum[j]) < 1e-10),
        )
        if (match < 0) return false
        used.add(match)
    }
    return used.size === 26
}
