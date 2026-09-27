import { useLayoutEffect, useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { Color, InstancedMesh, Object3D } from 'three'
import type { SceneProps } from '../../engine/types'
import { scenePalette } from '../../visual/scenePalette'
import type { QueensState } from './queens'

export default function QueensScene({
    state,
    onSelect,
    selectedId,
    theme,
}: SceneProps<QueensState>) {
    const colors = scenePalette(theme)
    const mesh = useRef<InstancedMesh>(null)
    const marker = useMemo(() => new Object3D(), [])
    const size = state.size
    const spacing = 0.86
    const at = (row: number, column: number): [number, number] => [
        (column - (size - 1) / 2) * spacing,
        (row - (size - 1) / 2) * spacing,
    ]
    useLayoutEffect(() => {
        if (!mesh.current) return
        for (let row = 0; row < size; row++) {
            for (let column = 0; column < size; column++) {
                const id = row * size + column
                const [x, z] = at(row, column)
                marker.position.set(x, 0, z)
                marker.scale.set(spacing * 0.96, 0.14, spacing * 0.96)
                marker.updateMatrix()
                mesh.current.setMatrixAt(id, marker.matrix)
                const candidate = state.candidate?.[0] === row && state.candidate[1] === column
                const conflict = state.conflict?.[0] === row && state.conflict[1] === column
                const color =
                    selectedId === `${row}:${column}`
                        ? colors.selected
                        : candidate
                          ? state.conflict
                              ? colors.rejected
                              : colors.current
                          : conflict
                            ? colors.goal
                            : (row + column) % 2
                              ? colors.ground
                              : colors.unvisited
                mesh.current.setColorAt(id, new Color(color))
            }
        }
        mesh.current.instanceMatrix.needsUpdate = true
        if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
    }, [state, selectedId, size, marker, colors])
    const selectSquare = (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        if (event.instanceId !== undefined)
            onSelect(`${Math.floor(event.instanceId / size)}:${event.instanceId % size}`)
    }
    const labelIndices = Array.from({ length: size }, (_, index) => index).filter(
        (index) => size <= 12 || index % 10 === 0 || index === size - 1,
    )
    return (
        <group scale={Math.min(1, 10 / Math.max(1, size * spacing))}>
            <instancedMesh
                ref={mesh}
                args={[undefined, undefined, size * size]}
                onClick={selectSquare}
            >
                <boxGeometry />
                <meshStandardMaterial roughness={1} flatShading />
            </instancedMesh>
            {state.queens.map((column, row) => {
                if (column < 0) return null
                const [x, z] = at(row, column)
                return (
                    <group key={row} position={[x, 0.15, z]}>
                        <mesh position={[0, 0.11, 0]}>
                            <cylinderGeometry args={[0.12, 0.22, 0.25, 12]} />
                            <meshStandardMaterial color={colors.tree} roughness={1} flatShading />
                        </mesh>
                        <mesh position={[0, 0.28, 0]}>
                            <sphereGeometry args={[0.13, 10, 8]} />
                            <meshStandardMaterial color={colors.solution} roughness={1} />
                        </mesh>
                    </group>
                )
            })}
            {labelIndices.map((index) => (
                <group key={index}>
                    <Html
                        center
                        position={[
                            (index - (size - 1) / 2) * spacing,
                            0.2,
                            (size / 2 + 0.45) * spacing,
                        ]}
                        style={{ pointerEvents: 'none' }}
                    >
                        <span style={{ color: colors.ink, fontWeight: 800, fontSize: 13 }}>
                            {index + 1}
                        </span>
                    </Html>
                    <Html
                        center
                        position={[
                            -(size / 2 + 0.45) * spacing,
                            0.2,
                            (index - (size - 1) / 2) * spacing,
                        ]}
                        style={{ pointerEvents: 'none' }}
                    >
                        <span style={{ color: colors.ink, fontWeight: 800, fontSize: 13 }}>
                            {index + 1}
                        </span>
                    </Html>
                </group>
            ))}
        </group>
    )
}
