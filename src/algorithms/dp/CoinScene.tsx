import { Html } from '@react-three/drei'
import type { SceneProps } from '../../engine/types'
import { scenePalette } from '../../visual/scenePalette'
import type { CoinState } from './coinChange'
export default function CoinScene({ state, selectedId, onSelect, theme }: SceneProps<CoinState>) {
    const colors = scenePalette(theme)
    const columns = Math.min(20, state.table.length),
        rows = Math.ceil(state.table.length / columns)
    return (
        <group>
            {state.table.map((value, amount) => {
                const x = ((amount % columns) - (columns - 1) / 2) * 0.65
                const z = (Math.floor(amount / columns) - (rows - 1) / 2) * 0.65
                const color =
                    selectedId === String(amount)
                        ? colors.selected
                        : amount === state.current
                          ? colors.current
                          : amount === state.predecessor
                            ? colors.frontier
                            : state.route.includes(amount)
                              ? colors.solution
                              : Number.isFinite(value)
                                ? colors.visited
                                : colors.unvisited
                return (
                    <group key={amount} position={[x, 0, z]}>
                        <mesh
                            position={[0, 0.13, 0]}
                            onClick={(event) => {
                                event.stopPropagation()
                                onSelect(String(amount))
                            }}
                        >
                            <boxGeometry args={[0.56, 0.26, 0.56]} />
                            <meshStandardMaterial color={color} roughness={1} />
                        </mesh>
                        {(state.table.length <= 40 ||
                            amount === state.current ||
                            amount === state.predecessor ||
                            selectedId === String(amount)) && (
                            <Html center position={[0, 0.45, 0]} style={{ pointerEvents: 'none' }}>
                                <span className="scene-annotation">
                                    #{amount}: {Number.isFinite(value) ? value : '∞'}
                                </span>
                            </Html>
                        )}
                    </group>
                )
            })}
            <Html
                center
                position={[0, 1.1, -(rows * 0.65) / 2 - 0.6]}
                style={{ pointerEvents: 'none' }}
            >
                <span className="scene-annotation">
                    Coins: {state.coins.join(', ')} · target {state.amount}
                    {state.coin !== null ? ` · considering ${state.coin}` : ''}
                </span>
            </Html>
            {state.chosen.map((coin, index) => (
                <mesh
                    key={index}
                    rotation={[Math.PI / 2, 0, 0]}
                    position={[
                        ((index % 30) - 14.5) * 0.3,
                        0.2,
                        (rows * 0.65) / 2 + 1 + Math.floor(index / 30) * 0.3,
                    ]}
                >
                    <cylinderGeometry args={[0.12, 0.12, 0.08, 12]} />
                    <meshStandardMaterial color={colors.solution} roughness={1} />
                    {state.chosen.length <= 30 && (
                        <Html center position={[0, 0, 0.1]} style={{ pointerEvents: 'none' }}>
                            <span style={{ fontSize: 11 }}>{coin}</span>
                        </Html>
                    )}
                </mesh>
            ))}
        </group>
    )
}
