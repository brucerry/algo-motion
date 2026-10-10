import {
    applyMoves,
    cubeSize,
    faces,
    normals,
    parseMoves,
    sameVec,
    transform,
    validateCube,
    type Cube,
    type Move,
    type Face,
} from './model'
import {
    cycleCatalog,
    orbitPieces,
    orientationParity,
    permutationParityMoves,
    type OrbitKind,
} from './reductionMacros'
import {
    centersSolved,
    edgesGrouped,
    permutationParity,
    reducedCoordinates,
    reducedFacelets,
} from './reductionState'

export type ReductionBoundaries = { centers: number; edges: number; parity: number }
function restoreFixedCenters(input: Cube): { cube: Cube; moves: Move[] } {
    const fixed = (cube: Cube) =>
        cube.filter((p) => p.stickers.length === 1 && p.home.filter((v) => v !== 0).length === 1)
    const solved = (cube: Cube) =>
        fixed(cube).every((p) => sameVec(p.stickers[0].normal, normals[p.stickers[0].color]))
    if (solved(input)) return { cube: input, moves: [] }
    const queue = [{ cube: input, moves: [] as Move[] }],
        seen = new Set<string>()
    for (let next = 0; next < queue.length; next++) {
        const current = queue[next]
        const key = fixed(current.cube)
            .map((p) => `${p.id}/${p.position.join(',')}`)
            .join(';')
        if (seen.has(key)) continue
        seen.add(key)
        if (solved(current.cube)) return current
        if (seen.size > 24) throw new Error('Fixed center frame is not a legal cube orientation.')
        for (const face of ['U', 'R', 'F'] as const) {
            const move: Move = { face, width: 5, turns: 1 }
            queue.push({ cube: applyMoves(current.cube, [move]), moves: [...current.moves, move] })
        }
    }
    throw new Error('Fixed center frame could not be restored.')
}
function solveOrbit(
    input: Cube,
    kind: OrbitKind,
    goals: Map<string, number>,
    output: Move[],
    check: (cube: Cube) => void,
    colors?: Face[],
): Cube {
    const catalog = cycleCatalog(cubeSize(input), kind)
    let cube = input
    let permutation = catalog.positions.map((position) =>
        goals.get(cube.find((p) => sameVec(p.position, position))!.id)!,
    )
    if (permutationParity(permutation))
        throw new Error('A three-cycle stage requires an even target permutation.')
    const misplaced = (goal: number, index: number) =>
        colors ? colors[goal] !== colors[index] : goal !== index
    const completed = new Set<Face>()
    const updateCompleted = () => {
        if (!colors) return
        for (const color of faces) {
            const correct = permutation.every(
                (goal, i) => colors[i] !== color || colors[goal] === color,
            )
            if (completed.has(color) && !correct)
                throw new Error('Center commutator disturbed a completed color block.')
            if (correct) completed.add(color)
        }
    }
    updateCompleted()
    while (permutation.some(misplaced)) {
        const a = permutation.findIndex(misplaced),
            b = permutation.indexOf(a)
        const c =
            permutation[a] !== b
                ? permutation[a]
                : permutation.findIndex((goal, i) => misplaced(goal, i) && i !== a && i !== b)
        const third =
            c < 0 && colors
                ? colors.findIndex((color, i) => color === colors[b] && i !== a && i !== b)
                : c
        if (third < 0) throw new Error('Reduction left an unmatched last-two-piece permutation.')
        const moves = catalog.cycle(b, a, third)
        cube = applyMoves(cube, moves)
        output.push(...moves)
        const next = [...permutation]
        next[a] = permutation[b]
        next[b] = permutation[third]
        next[third] = permutation[a]
        const actual = catalog.positions.map((position) =>
            goals.get(cube.find((p) => sameVec(p.position, position))!.id)!,
        )
        if (actual.some((goal, i) => goal !== next[i]))
            throw new Error('A setup commutator did not perform its declared three-cycle.')
        permutation = next
        updateCompleted()
        check(cube)
    }
    return cube
}
function centerGoals(cube: Cube, kind: OrbitKind) {
    const catalog = cycleCatalog(cubeSize(cube), kind),
        pieces = orbitPieces(cube, kind)
    const goals = new Map<string, number>(),
        remaining = new Set(catalog.positions.map((_, i) => i))
    const extent = cubeSize(cube) - 1
    const colorAt = (position: number[]) =>
        pieces.find((p) => p.home.every((v, i) => v === position[i]))!.stickers[0].color
    for (const piece of pieces) {
        const i = catalog.positions.findIndex((p) => sameVec(p, piece.position))
        if (colorAt(catalog.positions[i]) === piece.stickers[0].color) {
            goals.set(piece.id, i)
            remaining.delete(i)
        }
    }
    for (const piece of pieces) {
        if (goals.has(piece.id)) continue
        const i = [...remaining].find(
            (index) => colorAt(catalog.positions[index]) === piece.stickers[0].color,
        )
        if (i === undefined || !catalog.positions[i].some((v) => Math.abs(v) === extent))
            throw new Error('Center color inventory is inconsistent.')
        goals.set(piece.id, i)
        remaining.delete(i)
    }
    const permutation = catalog.positions.map((position) =>
        goals.get(pieces.find((p) => sameVec(p.position, position))!.id)!,
    )
    if (permutationParity(permutation)) {
        // Same-color centers are physically indistinguishable. Swapping their
        // target identities chooses a reachable even assignment without changing colors.
        const a = pieces.find((p) => !sameVec(p.stickers[0].normal, normals[p.stickers[0].color]))!,
            b = pieces.find((p) => p.id !== a.id && p.stickers[0].color === a.stickers[0].color)!
        const first = goals.get(a.id)!,
            second = goals.get(b.id)!
        goals.set(a.id, second)
        goals.set(b.id, first)
    }
    return goals
}
function wingGoals(cube: Cube) {
    const size = cubeSize(cube),
        catalog = cycleCatalog(size, 'wings'),
        pieces = orbitPieces(cube, 'wings')
    const goals = new Map<string, number>()
    for (const piece of pieces) {
        let position = piece.home
        if (size === 5) {
            const middleHome = piece.home.map((v) => (Math.abs(v) === size - 1 ? v : 0))
            const middle = cube.find(
                (p) => p.stickers.length === 2 && sameVec(p.home, middleHome as typeof p.home),
            )!
            position = transform(middle.basis, piece.home)
        }
        const index = catalog.positions.findIndex((p) => sameVec(p, position))
        if (index < 0) throw new Error('Wing target is outside its orbit.')
        goals.set(piece.id, index)
    }
    const permutation = catalog.positions.map((position) =>
        goals.get(pieces.find((p) => sameVec(p.position, position))!.id)!,
    )
    const odd = permutationParity(permutation) !== 0
    if (odd) {
        const uf = catalog.positions
            .map((p, i) => (p[1] === size - 1 && p[2] === size - 1 ? i : -1))
            .filter((i) => i >= 0)
        const a = [...goals].find(([, target]) => target === uf[0])!,
            b = [...goals].find(([, target]) => target === uf[1])!
        goals.set(a[0], b[1])
        goals.set(b[0], a[1])
    }
    return { goals, odd }
}
export function reduceCube(input: Cube, stage: (message: string) => void = () => {}) {
    validateCube(input)
    const size = cubeSize(input)
    if (size === 3) throw new Error('Constructive reduction requires a 4×4 or 5×5 cube.')
    const moves: Move[] = []
    let cube = input
    stage('Solving canonical center blocks with setup commutators…')
    if (size === 5) {
        const restored = restoreFixedCenters(cube)
        cube = restored.cube
        moves.push(...restored.moves)
    }
    for (const kind of (size === 5
        ? ['axial centers', 'diagonal centers']
        : ['diagonal centers']) as OrbitKind[])
        cube = solveOrbit(
            cube,
            kind,
            centerGoals(cube, kind),
            moves,
            validateCube,
            cycleCatalog(size, kind).positions.map(
                (position) =>
                    orbitPieces(cube, kind).find((p) => sameVec(p.home, position))!.stickers[0]
                        .color,
            ),
        )
    if (!centersSolved(cube)) throw new Error('Center reduction failed its color invariant.')
    const centers = moves.length
    stage(
        size === 4 ? 'Pairing all twelve wing groups…' : 'Grouping wings with their middle edges…',
    )
    const wings = wingGoals(cube)
    cube = solveOrbit(cube, 'wings', wings.goals, moves, (value) => {
        validateCube(value)
        if (!centersSolved(value)) throw new Error('Wing commutator disturbed completed centers.')
    })
    if (size === 5 && wings.odd) {
        stage('Correcting the last wing-pair parity…')
        const correction = parseMoves(orientationParity, size)
        cube = applyMoves(cube, correction)
        moves.push(...correction)
    }
    if (!centersSolved(cube) || !edgesGrouped(cube))
        throw new Error('Edge grouping failed its restoration invariant.')
    const edges = moves.length
    if (size === 4) {
        stage('Checking reduced orientation and permutation parity…')
        if (reducedCoordinates(reducedFacelets(cube)).oll) {
            const correction = parseMoves(orientationParity, size)
            cube = applyMoves(cube, correction)
            moves.push(...correction)
        }
        if (reducedCoordinates(reducedFacelets(cube)).pll) {
            const correction = parseMoves(permutationParityMoves, size)
            cube = applyMoves(cube, correction)
            moves.push(...correction)
        }
    }
    const coordinates = reducedCoordinates(reducedFacelets(cube))
    if (coordinates.oll || coordinates.pll)
        throw new Error('Reduced cube is outside the valid 3×3 state space.')
    validateCube(cube)
    return { cube, moves, boundaries: { centers, edges, parity: moves.length } }
}
