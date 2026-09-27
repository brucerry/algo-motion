import { Edges, Html } from '@react-three/drei'
import type { SceneProps } from '../../engine/types'
import { scenePalette } from '../../visual/scenePalette'

export type ArrayVisualItem = { id: number; value: number }

export default function ArrayItems({
    items,
    active = [],
    completed = [],
    result = [],
    selectedId,
    onSelect,
    theme,
}: {
    items: ArrayVisualItem[]
    active?: number[]
    completed?: number[]
    result?: number[]
    selectedId: SceneProps<unknown>['selectedId']
    onSelect: SceneProps<unknown>['onSelect']
    theme: SceneProps<unknown>['theme']
}) {
    const colors = scenePalette(theme)
    const spacing = 0.9
    const center = ((items.length - 1) * spacing) / 2
    const scale = Math.min(1, 18 / Math.max(1, items.length * spacing))
    return (
        <group scale={scale}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
                <planeGeometry args={[Math.max(7, items.length * spacing + 1), 3]} />
                <meshStandardMaterial color={colors.ground} roughness={1} />
            </mesh>
            {items.map((item, index) => {
                const x = index * spacing - center
                const height = 0.55 + Math.max(0, item.value) * 0.085
                const color = result.includes(index)
                    ? colors.solution
                    : active.includes(index)
                      ? colors.current
                      : completed.includes(index)
                        ? colors.visited
                        : colors.unvisited
                return (
                    <group key={item.id} position={[x, 0, 0]}>
                        <mesh
                            position={[0, height / 2, 0]}
                            onClick={(event) => {
                                event.stopPropagation()
                                onSelect(String(item.id))
                            }}
                        >
                            <boxGeometry args={[0.72, height, 0.68]} />
                            <meshStandardMaterial color={color} roughness={1} flatShading />
                            <Edges scale={1.01} color={colors.ink} />
                        </mesh>
                        {selectedId === String(item.id) && (
                            <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                                <ringGeometry args={[0.48, 0.59, 16]} />
                                <meshBasicMaterial color={colors.goal} side={2} />
                            </mesh>
                        )}
                        {(items.length <= 30 ||
                            active.includes(index) ||
                            result.includes(index) ||
                            selectedId === String(item.id)) && (
                            <Html
                                center
                                position={[0, height + 0.28, 0]}
                                style={{ pointerEvents: 'none' }}
                            >
                                <span
                                    style={{
                                        color: theme === 'dark' ? '#fff0d6' : '#273640',
                                        fontWeight: 800,
                                        fontSize: 14,
                                        textShadow: '0 1px 1px #fff8',
                                    }}
                                >
                                    {item.value}
                                </span>
                            </Html>
                        )}
                        {(items.length <= 30 ||
                            index % 10 === 0 ||
                            active.includes(index) ||
                            selectedId === String(item.id)) && (
                            <Html
                                center
                                position={[0, -0.1, 0.55]}
                                style={{ pointerEvents: 'none' }}
                            >
                                <span style={{ color: colors.ink, fontSize: 10 }}>#{index}</span>
                            </Html>
                        )}
                    </group>
                )
            })}
        </group>
    )
}
