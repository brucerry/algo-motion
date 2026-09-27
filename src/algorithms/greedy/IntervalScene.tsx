import { Edges, Html, Line } from '@react-three/drei'
import type { SceneProps } from '../../engine/types'
import { scenePalette } from '../../visual/scenePalette'
import type { IntervalState } from './intervals'

export default function IntervalScene({
    state,
    onSelect,
    selectedId,
    theme,
}: SceneProps<IntervalState>) {
    const colors = scenePalette(theme)
    const visible = state.order.map((id) => state.intervals.find((item) => item.id === id)!)
    const first = 0
    const end = Math.max(1, ...visible.map((item) => item.end))
    const scale = 0.43
    const xFor = (value: number) => (value - (first + end) / 2) * scale
    return (
        <group scale={Math.min(1, 14 / Math.max((end - first) * scale, visible.length * 0.55))}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
                <planeGeometry
                    args={[
                        Math.max(6, (end - first) * scale + 1),
                        Math.max(4, visible.length * 0.55 + 1),
                    ]}
                />
                <meshStandardMaterial color={colors.ground} roughness={1} />
            </mesh>
            {visible.map((item, index) => {
                const z = (index - (visible.length - 1) / 2) * 0.55
                const color = state.accepted.includes(item.id)
                    ? colors.solution
                    : state.rejected.includes(item.id)
                      ? colors.rejected
                      : state.current === item.id
                        ? colors.current
                        : colors.unvisited
                return (
                    <group key={item.id}>
                        <mesh
                            position={[xFor((item.start + item.end) / 2), 0.16, z]}
                            onClick={(event) => {
                                event.stopPropagation()
                                onSelect(String(item.id))
                            }}
                        >
                            <boxGeometry args={[(item.end - item.start) * scale, 0.3, 0.38]} />
                            <meshStandardMaterial color={color} roughness={1} flatShading />
                            <Edges
                                scale={1.01}
                                color={selectedId === String(item.id) ? colors.goal : colors.ink}
                            />
                        </mesh>
                        {(visible.length <= 20 ||
                            state.current === item.id ||
                            selectedId === String(item.id) ||
                            index % 10 === 0) && (
                            <Html
                                center
                                position={[xFor(item.start), 0.48, z]}
                                style={{ pointerEvents: 'none' }}
                            >
                                <span style={{ color: colors.ink, fontWeight: 800, fontSize: 12 }}>
                                    {item.id + 1}
                                </span>
                            </Html>
                        )}
                    </group>
                )
            })}
            <Line
                points={[
                    [xFor(first), 0.05, (visible.length / 2 + 0.4) * 0.55],
                    [xFor(end), 0.05, (visible.length / 2 + 0.4) * 0.55],
                ]}
                color={colors.ink}
                lineWidth={2}
            />
            {Array.from({ length: 6 }, (_, index) =>
                Math.round(first + ((end - first) * index) / 5),
            ).map((tick, index) => (
                <Html
                    key={index}
                    center
                    position={[xFor(tick), 0.15, (visible.length / 2 + 0.75) * 0.55]}
                    style={{ pointerEvents: 'none' }}
                >
                    <span style={{ color: colors.ink, fontSize: 11 }}>{tick}</span>
                </Html>
            ))}
        </group>
    )
}
