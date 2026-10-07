import { useLayoutEffect, useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import { Color, InstancedMesh, Object3D } from 'three'
import type { ArrayVisualItem } from './ArrayItems'
import type { SceneProps } from '../../engine/types'
import { scenePalette } from '../../visual/scenePalette'
import { tactileTexture } from '../../visual/tactileTexture'

export default function LargeArrayItems({
    items,
    active,
    completed,
    result,
    selectedId,
    onSelect,
    theme,
}: {
    items: ArrayVisualItem[]
    active: number[]
    completed: number[]
    result: number[]
    selectedId: SceneProps<unknown>['selectedId']
    onSelect: SceneProps<unknown>['onSelect']
    theme: SceneProps<unknown>['theme']
}) {
    const mesh = useRef<InstancedMesh>(null)
    const marker = useMemo(() => new Object3D(), [])
    const colors = scenePalette(theme)
    const columns = Math.min(128, Math.ceil(Math.sqrt(items.length)))
    const rows = Math.ceil(items.length / columns)
    const spacing = 16 / Math.max(columns, rows)
    const maximum = Math.max(1, ...items.map((item) => item.value))
    const at = (index: number): [number, number, number] => [
        ((index % columns) - (columns - 1) / 2) * spacing,
        0,
        (Math.floor(index / columns) - (rows - 1) / 2) * spacing,
    ]
    useLayoutEffect(() => {
        if (!mesh.current) return
        const current = new Set(active),
            done = new Set(completed),
            answer = new Set(result)
        items.forEach((item, index) => {
            const height = 0.12 + (item.value / maximum) * 0.7
            const position = at(index)
            marker.position.set(position[0], height / 2, position[2])
            marker.scale.set(spacing * 0.75, height, spacing * 0.75)
            marker.updateMatrix()
            mesh.current!.setMatrixAt(index, marker.matrix)
            mesh.current!.setColorAt(
                index,
                new Color(
                    selectedId === String(item.id)
                        ? colors.selected
                        : answer.has(index)
                          ? colors.solution
                          : current.has(index)
                            ? colors.current
                            : done.has(index)
                              ? colors.visited
                              : colors.unvisited,
                ),
            )
        })
        mesh.current.count = items.length
        mesh.current.instanceMatrix.needsUpdate = true
        if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
        mesh.current.computeBoundingSphere()
    }, [items, active, completed, result, selectedId, theme])
    const labels = [
        ...new Set([
            ...active,
            ...result,
            items.findIndex((item) => String(item.id) === selectedId),
        ]),
    ].filter((index) => index >= 0 && index < items.length)
    return (
        <group>
            <instancedMesh
                ref={mesh}
                args={[undefined, undefined, items.length]}
                onClick={(event) => {
                    event.stopPropagation()
                    if (event.instanceId !== undefined) onSelect(String(items[event.instanceId].id))
                }}
            >
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial roughness={1} bumpMap={tactileTexture} bumpScale={0.01} />
            </instancedMesh>
            {labels.map((index) => (
                <Html
                    key={index}
                    center
                    position={[at(index)[0], 1.15, at(index)[2]]}
                    style={{ pointerEvents: 'none' }}
                >
                    <span className="scene-annotation">
                        #{index}: {items[index].value}
                    </span>
                </Html>
            ))}
            <Html center position={[0, -0.2, -8.5]} style={{ pointerEvents: 'none' }}>
                <span className="scene-annotation scene-caption">
                    {items.length.toLocaleString()} items · ascending indices run left to right, row
                    by row · zoom to select
                </span>
            </Html>
        </group>
    )
}
