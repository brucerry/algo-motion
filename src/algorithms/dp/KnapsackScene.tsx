import { useLayoutEffect, useMemo, useRef } from 'react'
import { Html, Line } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { Color, InstancedMesh, Object3D } from 'three'
import type { SceneProps } from '../../engine/types'
import { scenePalette } from '../../visual/scenePalette'
import type { KnapsackState } from './knapsack'

export default function KnapsackScene({
    state,
    onSelect,
    selectedId,
    theme,
}: SceneProps<KnapsackState>) {
    const colors = scenePalette(theme)
    const mesh = useRef<InstancedMesh>(null)
    const marker = useMemo(() => new Object3D(), [])
    const rows = state.items.length + 1
    const columns = state.capacity + 1
    const point = (row: number, capacity: number): [number, number, number] => [
        (capacity - (columns - 1) / 2) * 0.58,
        0.15,
        (row - (rows - 1) / 2) * 0.72,
    ]
    const active = state.active
    const dependencies: [number, number][] = []
    if (active && active[0] > 0) {
        dependencies.push([active[0] - 1, active[1]])
        const item = state.items[active[0] - 1]
        if (item.weight <= active[1]) dependencies.push([active[0] - 1, active[1] - item.weight])
    }
    useLayoutEffect(() => {
        if (!mesh.current) return
        const chosen = new Set(state.selected)
        for (let row = 0; row < rows; row++) {
            for (let capacity = 0; capacity < columns; capacity++) {
                const index = row * columns + capacity
                const value = state.table[row][capacity]
                const height = 0.25 + Math.log1p(value ?? 0) * 0.13
                const [x, , z] = point(row, capacity)
                marker.position.set(x, 0.15 + height / 2, z)
                marker.scale.set(0.47, height, 0.55)
                marker.updateMatrix()
                mesh.current.setMatrixAt(index, marker.matrix)
                const color =
                    selectedId === `${row}:${capacity}`
                        ? colors.selected
                        : active?.[0] === row && active[1] === capacity
                          ? colors.current
                          : state.phase !== 'fill' && row > 0 && chosen.has(state.items[row - 1].id)
                            ? colors.solution
                            : value === null
                              ? colors.unvisited
                              : colors.visited
                mesh.current.setColorAt(index, new Color(color))
            }
        }
        mesh.current.instanceMatrix.needsUpdate = true
        if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
    }, [state, selectedId, rows, columns, marker, colors])
    const selectCell = (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        if (event.instanceId !== undefined)
            onSelect(`${Math.floor(event.instanceId / columns)}:${event.instanceId % columns}`)
    }
    return (
        <group scale={Math.min(1, 12 / Math.max(columns * 0.58, rows * 0.72))}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.11, 0]}>
                <planeGeometry
                    args={[Math.max(5, (columns + 1) * 0.58), Math.max(4, (rows + 1) * 0.72)]}
                />
                <meshStandardMaterial color={colors.ground} roughness={1} />
            </mesh>
            <instancedMesh
                ref={mesh}
                args={[undefined, undefined, rows * columns]}
                onClick={selectCell}
            >
                <boxGeometry />
                <meshStandardMaterial roughness={1} flatShading />
            </instancedMesh>
            {active && (
                <Html
                    center
                    position={[point(...active)[0], 0.8, point(...active)[2]]}
                    style={{ pointerEvents: 'none' }}
                >
                    <span
                        style={{
                            color: theme === 'dark' ? '#fff0d6' : '#273640',
                            fontSize: 14,
                            fontWeight: 800,
                        }}
                    >
                        {state.table[active[0]][active[1]] ?? '·'}
                    </span>
                </Html>
            )}
            {active &&
                dependencies.map(([row, capacity], index) => (
                    <Line
                        key={`${row}:${capacity}`}
                        points={[point(...active), point(row, capacity)]}
                        color={index ? colors.direction : colors.tree}
                        lineWidth={2}
                    />
                ))}
            {Array.from({ length: rows }, (_, row) => row)
                .filter((row) => rows <= 20 || row % 10 === 0 || row === active?.[0])
                .map((row) => (
                    <Html
                        key={`row-${row}`}
                        center
                        position={[
                            -((columns - 1) / 2 + 1) * 0.58,
                            0.3,
                            (row - (rows - 1) / 2) * 0.72,
                        ]}
                        style={{ pointerEvents: 'none' }}
                    >
                        <span style={{ color: colors.ink, fontWeight: 800, fontSize: 12 }}>
                            i{row}
                        </span>
                    </Html>
                ))}
            {Array.from({ length: columns }, (_, capacity) => capacity)
                .filter(
                    (capacity) => columns <= 20 || capacity % 20 === 0 || capacity === active?.[1],
                )
                .map((capacity) => (
                    <Html
                        key={`capacity-${capacity}`}
                        center
                        position={[
                            (capacity - (columns - 1) / 2) * 0.58,
                            0.3,
                            ((rows - 1) / 2 + 0.7) * 0.72,
                        ]}
                        style={{ pointerEvents: 'none' }}
                    >
                        <span style={{ color: colors.ink, fontWeight: 800, fontSize: 11 }}>
                            {capacity}
                        </span>
                    </Html>
                ))}
        </group>
    )
}
