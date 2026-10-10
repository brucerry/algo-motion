import { BufferGeometry, Float32BufferAttribute } from 'three'
import { bottomHome, pieceStart, sliceAxis, topHome } from './model'
export type Point = [number, number]
const wrap = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
const ray = (a: number): Point => {
    const x = Math.cos(a),
        z = Math.sin(a),
        scale = 1.5 / Math.max(Math.abs(x), Math.abs(z))
    return [x * scale, z * scale]
}
export function wedgeOutline(id: number): Point[] {
    const top = id < 8,
        start = pieceStart(top ? topHome : bottomHome, id),
        width = (((id % 2) + 1) * Math.PI) / 6
    const a = Math.PI / 12 + ((top ? -(start + (id % 2) + 1) : start) * Math.PI) / 6
    const corners = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]
        .map((c) => ({ c, offset: wrap(c - a) }))
        .filter((c) => c.offset > 1e-8 && c.offset < width - 1e-8)
        .sort((x, y) => x.offset - y.offset)
    return [[0, 0], ray(a), ...corners.map((c) => ray(c.c)), ray(a + width)]
}
export function middleOutline(active: boolean): Point[] {
    const square: Point[] = [
            [-1.5, -1.5],
            [1.5, -1.5],
            [1.5, 1.5],
            [-1.5, 1.5],
        ],
        result: Point[] = []
    const dot = (p: Point) => (p[0] * sliceAxis[0] + p[1] * sliceAxis[2]) * (active ? 1 : -1)
    square.forEach((a, i) => {
        const b = square[(i + 1) % square.length],
            da = dot(a),
            db = dot(b)
        if (da >= 0) result.push(a)
        if (da >= 0 !== db >= 0) {
            const t = da / (da - db)
            result.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])])
        }
    })
    return result
}
// Fixed home meshes. Animation applies only rigid transformations to these vertices.
export function squareGeometry(id: number): BufferGeometry {
    const outline = id < 16 ? wedgeOutline(id) : middleOutline(id === 17),
        y = id < 16 ? (id < 8 ? 0.9 : -0.9) : 0,
        height = id < 16 ? 1.2 : 0.6
    const center: Point = [
        outline.reduce((s, p) => s + p[0], 0) / outline.length,
        outline.reduce((s, p) => s + p[1], 0) / outline.length,
    ]
    const polygon = outline.map(
        (p) =>
            [
                center[0] + (p[0] - center[0]) * 0.989,
                center[1] + (p[1] - center[1]) * 0.989,
            ] as Point,
    )
    const positions: number[] = [],
        uvs: number[] = [],
        groups: { start: number; count: number; material: number }[] = []
    const vertex = (i: number, level: number) => [
        polygon[i][0],
        y + level * height * 0.485,
        polygon[i][1],
    ]
    const triangle = (a: number[], b: number[], c: number[], material: number) => {
        const start = positions.length / 3
        positions.push(...a, ...b, ...c)
        const ab = b.map((v, i) => v - a[i]),
            ac = c.map((v, i) => v - a[i])
        const normal = [
            ab[1] * ac[2] - ab[2] * ac[1],
            ab[2] * ac[0] - ab[0] * ac[2],
            ab[0] * ac[1] - ab[1] * ac[0],
        ].map(Math.abs)
        const axes =
            normal[1] >= normal[0] && normal[1] >= normal[2]
                ? [0, 2]
                : normal[0] >= normal[2]
                  ? [2, 1]
                  : [0, 1]
        for (const point of [a, b, c]) uvs.push(point[axes[0]] / 3 + 0.5, point[axes[1]] / 3 + 0.5)
        groups.push({ start, count: 3, material })
    }
    for (let i = 1; i < polygon.length - 1; i++) {
        triangle(vertex(0, 1), vertex(i + 1, 1), vertex(i, 1), id < 8 ? 0 : 6)
        triangle(vertex(0, -1), vertex(i, -1), vertex(i + 1, -1), id >= 8 && id < 16 ? 1 : 6)
    }
    outline.forEach((a, i) => {
        const next = (i + 1) % polygon.length,
            b = outline[next],
            close = (v: number, goal: number) => Math.abs(v - goal) < 1e-7
        const material =
            close(a[0], 1.5) && close(b[0], 1.5)
                ? 2
                : close(a[0], -1.5) && close(b[0], -1.5)
                  ? 3
                  : close(a[1], 1.5) && close(b[1], 1.5)
                    ? 4
                    : close(a[1], -1.5) && close(b[1], -1.5)
                      ? 5
                      : 6
        triangle(vertex(i, -1), vertex(next, 1), vertex(next, -1), material)
        triangle(vertex(i, -1), vertex(i, 1), vertex(next, 1), material)
    })
    const geometry = new BufferGeometry().setAttribute(
        'position',
        new Float32BufferAttribute(positions, 3),
    )
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    groups.forEach((g) => geometry.addGroup(g.start, g.count, g.material))
    geometry.computeVertexNormals()
    return geometry
}
