import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Line, Sphere } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Color, InstancedMesh, Object3D } from 'three'
import type { SceneProps } from '../../engine/types'
import { scenePalette } from '../../visual/scenePalette'
import { tactileTexture } from '../../visual/tactileTexture'
import type { RrtState } from './rrt'

export default function RrtScene({ state, onSelect, selectedId, theme }: SceneProps<RrtState>) {
    const nodeMesh = useRef<InstancedMesh>(null)
    const marker = useMemo(() => new Object3D(), [])
    const colors = scenePalette(theme)
    useLayoutEffect(() => {
        if (!nodeMesh.current) return
        const path = new Set(state.path)
        for (const node of state.nodes) {
            marker.position.set(...node.position)
            const size =
                node.id === 0 || (node.id === state.nodes.length - 1 && path.has(node.id))
                    ? 0.23
                    : node.id === state.newestNode
                      ? 0.19
                      : 0.15
            marker.scale.setScalar(size)
            marker.updateMatrix()
            nodeMesh.current.setMatrixAt(node.id, marker.matrix)
            const color =
                selectedId === String(node.id)
                    ? colors.selected
                    : node.id === 0
                      ? colors.start
                      : path.has(node.id)
                        ? colors.solution
                        : node.id === state.newestNode
                          ? colors.newest
                          : colors.tree
            nodeMesh.current.setColorAt(node.id, new Color(color))
        }
        nodeMesh.current.count = state.nodes.length
        nodeMesh.current.instanceMatrix.needsUpdate = true
        if (nodeMesh.current.instanceColor) nodeMesh.current.instanceColor.needsUpdate = true
    }, [state, selectedId, marker, colors])

    const geometry = useMemo(() => {
        const values: number[] = []
        for (const node of state.nodes) {
            if (node.parent === null) continue
            values.push(...state.nodes[node.parent].position, ...node.position)
        }
        const result = new BufferGeometry()
        result.setAttribute('position', new BufferAttribute(new Float32Array(values), 3))
        return result
    }, [state.nodes])
    useEffect(() => () => geometry.dispose(), [geometry])

    const onNodeClick = (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        if (event.instanceId !== undefined) onSelect(String(event.instanceId))
    }
    const newest = state.newestNode === null ? null : state.nodes[state.newestNode]
    const selectedNode = selectedId === null ? null : state.nodes[Number(selectedId)]
    return (
        <group scale={Math.min(1, 12 / ((Math.abs(state.goal[0]) * 2) / 0.78))}>
            <gridHelper
                args={[12, 12, colors.grid, colors.grid]}
                position={[0, -state.goal[1] * 2, 0]}
            />
            <lineSegments geometry={geometry}>
                <lineBasicMaterial color={colors.tree} transparent opacity={0.92} />
            </lineSegments>
            {state.obstacles.map((obstacle, index) => (
                <Sphere key={index} args={[obstacle.radius, 16, 12]} position={obstacle.center}>
                    <meshStandardMaterial
                        color={colors.obstacle}
                        map={tactileTexture}
                        bumpMap={tactileTexture}
                        bumpScale={0.055}
                        transparent
                        opacity={0.58}
                        roughness={1}
                        flatShading
                    />
                </Sphere>
            ))}
            {state.obstacles.map((obstacle, index) => (
                <Sphere
                    key={`outline-${index}`}
                    args={[obstacle.radius * 1.01, 12, 9]}
                    position={obstacle.center}
                >
                    <meshBasicMaterial color={colors.ink} wireframe transparent opacity={0.33} />
                </Sphere>
            ))}
            <instancedMesh ref={nodeMesh} args={[undefined, undefined, 6005]} onClick={onNodeClick}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial
                    map={tactileTexture}
                    bumpMap={tactileTexture}
                    bumpScale={0.025}
                    roughness={1}
                    metalness={0}
                    flatShading
                />
            </instancedMesh>
            {newest && newest.parent !== null && (
                <Line
                    points={[state.nodes[newest.parent].position, newest.position]}
                    color={colors.newest}
                    lineWidth={4}
                />
            )}
            {selectedNode && (
                <Sphere args={[0.27, 12, 9]} position={selectedNode.position}>
                    <meshBasicMaterial color={colors.ink} wireframe />
                </Sphere>
            )}
            <Sphere args={[0.2, 16, 12]} position={state.goal}>
                <meshStandardMaterial color={colors.goal} roughness={1} />
            </Sphere>
            <Sphere args={[0.27, 8, 6]} position={state.goal}>
                <meshBasicMaterial color={colors.ink} wireframe />
            </Sphere>
            {state.sample && (
                <Sphere args={[0.105, 10, 8]} position={state.sample}>
                    <meshStandardMaterial
                        color={state.sampleRejected ? colors.rejected : colors.frontier}
                        roughness={1}
                    />
                </Sphere>
            )}
            {state.sample && state.sampleRejected && (
                <>
                    <Line
                        points={[
                            [state.sample[0] - 0.16, state.sample[1] - 0.16, state.sample[2]],
                            [state.sample[0] + 0.16, state.sample[1] + 0.16, state.sample[2]],
                        ]}
                        color={colors.ink}
                        lineWidth={3}
                    />
                    <Line
                        points={[
                            [state.sample[0] - 0.16, state.sample[1] + 0.16, state.sample[2]],
                            [state.sample[0] + 0.16, state.sample[1] - 0.16, state.sample[2]],
                        ]}
                        color={colors.ink}
                        lineWidth={3}
                    />
                </>
            )}
            {state.path.length > 1 && (
                <>
                    <Line
                        points={state.path.map((id) => state.nodes[id].position)}
                        color={colors.ink}
                        lineWidth={6}
                    />
                    <Line
                        points={state.path.map((id) => state.nodes[id].position)}
                        color={colors.solution}
                        lineWidth={3.5}
                    />
                </>
            )}
        </group>
    )
}
