import { useEffect, useMemo } from 'react'
import { Line, Sphere } from '@react-three/drei'
import { BufferAttribute, BufferGeometry, DoubleSide } from 'three'
import type { SceneProps } from '../../engine/types'
import { scenePalette } from '../../visual/scenePalette'
import { objectives, type DescentState } from './descent'

const height = (value: number) => Math.max(-1.2, Math.min(5, value * 0.8))

export default function GradientScene({
    state,
    onSelect,
    selectedId,
    theme,
}: SceneProps<DescentState>) {
    const objective = objectives[state.objective]
    const colors = scenePalette(theme)
    const geometry = useMemo(() => {
        const positions: number[] = [],
            indices: number[] = []
        const cells = 48,
            span = 8
        for (let row = 0; row <= cells; row++)
            for (let column = 0; column <= cells; column++) {
                const x = -span / 2 + (span * column) / cells,
                    y = -span / 2 + (span * row) / cells
                positions.push(x, height(objective.value(x, y)), y)
            }
        for (let row = 0; row < cells; row++)
            for (let column = 0; column < cells; column++) {
                const a = row * (cells + 1) + column,
                    b = a + 1,
                    c = a + cells + 1,
                    d = c + 1
                indices.push(a, c, b, b, c, d)
            }
        const mesh = new BufferGeometry()
        mesh.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
        mesh.setIndex(indices)
        mesh.computeVertexNormals()
        return mesh
    }, [objective])
    useEffect(() => () => geometry.dispose(), [geometry])
    const point = state.current
    const current: [number, number, number] = [point.x, height(point.value) + 0.17, point.y]
    const norm = state.magnitude || 1
    const downhill: [number, number, number] = [
        point.x - (state.gradient[0] / norm) * 0.8,
        current[1] + 0.18,
        point.y - (state.gradient[1] / norm) * 0.8,
    ]
    const trail = state.trail.map(
        (item) => [item.x, height(item.value) + 0.14, item.y] as [number, number, number],
    )
    return (
        <group>
            <gridHelper args={[9, 18, colors.grid, colors.grid]} position={[0, -1.25, 0]} />
            <mesh geometry={geometry}>
                <meshStandardMaterial
                    color={colors.surface}
                    side={DoubleSide}
                    roughness={1}
                    metalness={0}
                    transparent
                    opacity={0.88}
                    wireframe={false}
                    flatShading
                />
            </mesh>
            <mesh geometry={geometry}>
                <meshBasicMaterial
                    color={colors.ink}
                    side={DoubleSide}
                    wireframe
                    transparent
                    opacity={0.21}
                />
            </mesh>
            {trail.length > 1 && (
                <>
                    <Line points={trail} color={colors.ink} lineWidth={6} />
                    <Line points={trail} color={colors.trail} lineWidth={3.3} />
                </>
            )}
            {state.magnitude > 0.01 && (
                <>
                    <Line points={[current, downhill]} color={colors.direction} lineWidth={4} />
                    <Line
                        points={[
                            [downhill[0] + 0.16, downhill[1], downhill[2] + 0.13],
                            downhill,
                            [downhill[0] + 0.16, downhill[1], downhill[2] - 0.13],
                        ]}
                        color={colors.direction}
                        lineWidth={4}
                    />
                </>
            )}
            <Sphere
                args={[0.18, 16, 12]}
                position={current}
                onClick={(event) => {
                    event.stopPropagation()
                    onSelect('current')
                }}
            >
                <meshStandardMaterial color={colors.point} roughness={1} />
            </Sphere>
            {selectedId === 'current' && (
                <Sphere args={[0.25, 10, 8]} position={current}>
                    <meshBasicMaterial color={colors.ink} wireframe />
                </Sphere>
            )}
        </group>
    )
}
