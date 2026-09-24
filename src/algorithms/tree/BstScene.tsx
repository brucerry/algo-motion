import { Html, Line, Sphere } from '@react-three/drei'
import type { SceneProps } from '../../engine/types'
import { scenePalette } from '../../visual/scenePalette'
import type { BstState, TreeNode } from './bst'

export default function BstScene({ state, onSelect, selectedId, theme }: SceneProps<BstState>) {
    const colors = scenePalette(theme)
    const large = state.nodes.length > 30
    const ranks = new Map(
        [...state.nodes].sort((a, b) => a.x - b.x).map((node, index) => [node.id, index]),
    )
    const depthStep = large ? 0.58 : 0.85
    const top = Math.max(
        1.8,
        (Math.max(...state.nodes.map((node) => node.depth), 0) * depthStep) / 2,
    )
    const position = (node: TreeNode): [number, number, number] => [
        large ? ((ranks.get(node.id) ?? 0) - (state.nodes.length - 1) / 2) * 0.58 : node.x * 0.82,
        top - node.depth * depthStep,
        0,
    ]
    return (
        <group scale={Math.min(1, 18 / Math.max(1, state.nodes.length * 0.58))}>
            {state.nodes.flatMap((node) =>
                [node.left, node.right]
                    .filter((id): id is number => id !== null)
                    .map((id) => (
                        <Line
                            key={`${node.id}-${id}`}
                            points={[position(node), position(state.nodes[id])]}
                            color={colors.tree}
                            lineWidth={2}
                        />
                    )),
            )}
            {state.nodes.map((node) => {
                const at = position(node)
                const color =
                    state.found === node.id
                        ? colors.solution
                        : state.current === node.id
                          ? colors.current
                          : state.visited.includes(node.id)
                            ? colors.visited
                            : colors.unvisited
                return (
                    <group key={node.id} position={at}>
                        <Sphere
                            args={[0.34, 14, 10]}
                            onClick={(event) => {
                                event.stopPropagation()
                                onSelect(String(node.id))
                            }}
                        >
                            <meshStandardMaterial color={color} roughness={1} flatShading />
                        </Sphere>
                        {selectedId === String(node.id) && (
                            <Sphere args={[0.43, 14, 10]}>
                                <meshBasicMaterial color={colors.goal} wireframe />
                            </Sphere>
                        )}
                        {(!large ||
                            node.id === 0 ||
                            state.visited.includes(node.id) ||
                            selectedId === String(node.id)) && (
                            <Html center position={[0, 0.57, 0]} style={{ pointerEvents: 'none' }}>
                                <span
                                    style={{
                                        color: theme === 'dark' ? '#fff0d6' : '#273640',
                                        fontWeight: 800,
                                        fontSize: 14,
                                    }}
                                >
                                    {node.key}
                                </span>
                            </Html>
                        )}
                    </group>
                )
            })}
            {state.current === null && state.missingParent !== null && state.direction && (
                <Html
                    center
                    position={[
                        position(state.nodes[state.missingParent])[0] +
                            (state.direction === 'left' ? -0.5 : 0.5),
                        position(state.nodes[state.missingParent])[1] - 0.55,
                        0,
                    ]}
                    style={{ pointerEvents: 'none' }}
                >
                    <span style={{ color: colors.rejected, fontSize: 22, fontWeight: 800 }}>∅</span>
                </Html>
            )}
        </group>
    )
}
