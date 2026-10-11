import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
    Box3,
    EdgesGeometry,
    Group,
    Matrix4,
    Vector3,
    type BufferGeometry,
    type Object3D,
} from 'three'
import { SelectionFocusBridge, type PieceFocus } from './selectionFocus'

export default function SelectedPiece({
    id,
    geometry,
    normals,
    bridge,
}: {
    id: string
    geometry: BufferGeometry
    normals: [number, number, number][]
    bridge?: SelectionFocusBridge
}) {
    const root = useRef<Group>(null)
    const normalKey = JSON.stringify(normals)
    const record = useMemo(() => {
        geometry.computeBoundingBox()
        const edges = new EdgesGeometry(geometry, 10)
        // Match each boundary to its adjacent faces once, rather than raycasting
        // every edge every frame. Rear edges do not draw through the stickers.
        const position = geometry.attributes.position
        const indices = geometry.index
        const faceEdges = new Map<string, Vector3[]>()
        const key = (point: Vector3) =>
            point
                .toArray()
                .map((value) => Math.round(value * 10000))
                .join(',')
        const edgeKey = (a: Vector3, b: Vector3) => [key(a), key(b)].sort().join('|')
        const vertices = [new Vector3(), new Vector3(), new Vector3()]
        for (let i = 0; i < (indices?.count ?? position.count); i += 3) {
            vertices.forEach((vertex, j) =>
                vertex.fromBufferAttribute(position, indices ? indices.getX(i + j) : i + j),
            )
            const normal = vertices[1]
                .clone()
                .sub(vertices[0])
                .cross(vertices[2].clone().sub(vertices[0]))
                .normalize()
            for (let j = 0; j < 3; j++) {
                const name = edgeKey(vertices[j], vertices[(j + 1) % 3])
                const normals = faceEdges.get(name) ?? []
                normals.push(normal)
                faceEdges.set(name, normals)
            }
        }
        const edgePositions = edges.attributes.position.array as Float32Array
        const edgeNormals = new Float32Array(edgePositions.length)
        for (let i = 0; i < edgePositions.length; i += 6) {
            const adjacent =
                faceEdges.get(
                    edgeKey(
                        new Vector3().fromArray(edgePositions, i),
                        new Vector3().fromArray(edgePositions, i + 3),
                    ),
                ) ?? []
            for (let j = 0; j < 2; j++)
                (adjacent[j] ?? adjacent[0] ?? new Vector3()).toArray(edgeNormals, i + j * 3)
        }
        return {
            localBounds: geometry.boundingBox!.clone(),
            localNormals: normals.map((normal) => new Vector3(...normal)),
            edges,
            focus: {
                id,
                owner: new Group() as Object3D,
                center: new Vector3(),
                bounds: new Box3(),
                normals: normals.map(() => new Vector3()),
                matrix: new Matrix4(),
                edges: edgePositions,
                edgeNormals,
            } satisfies PieceFocus,
        }
    }, [id, geometry, normalKey])
    useEffect(
        () => () => {
            bridge?.release(record.focus)
            record.edges.dispose()
        },
        [bridge, record],
    )
    useFrame(() => {
        const owner = root.current?.parent
        if (!owner || !bridge) return
        owner.updateWorldMatrix(true, false)
        record.focus.owner = owner
        record.focus.matrix.copy(owner.matrixWorld)
        record.focus.bounds.copy(record.localBounds).applyMatrix4(owner.matrixWorld)
        record.localBounds.getCenter(record.focus.center).applyMatrix4(owner.matrixWorld)
        record.localNormals.forEach((normal, i) =>
            record.focus.normals[i].copy(normal).transformDirection(owner.matrixWorld),
        )
        bridge.publish(record.focus)
    }, -2)
    return <group ref={root} name="selected-piece-anchor" userData={{ pieceId: id }} />
}
