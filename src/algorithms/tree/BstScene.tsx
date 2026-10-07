import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Html, Line } from '@react-three/drei'
import { BufferAttribute, BufferGeometry, Color, InstancedMesh, Object3D } from 'three'
import type { SceneProps } from '../../engine/types'
import { scenePalette } from '../../visual/scenePalette'
import { tactileTexture } from '../../visual/tactileTexture'
import type { BstState, TreeNode } from './bst'
import type { TraversalState } from './traversal'

export default function BstScene({ state, onSelect, selectedId, theme }: SceneProps<BstState>) {
    const colors = scenePalette(theme)
    const mesh = useRef<InstancedMesh>(null)
    const marker = useMemo(() => new Object3D(), [])
    const folded = state.nodes.length > 120
    const large = state.nodes.length > 30
    const depthStep = folded ? 0.22 : large ? 0.58 : 0.85
    const top = Math.max(
        1.8,
        (Math.max(...state.nodes.map((node) => node.depth), 0) * depthStep) / 2,
    )
    const scale = folded ? 1 : Math.min(1, 18 / Math.max(1, state.nodes.length * 0.58))
    const columns = 64,
        rows = Math.ceil(state.nodes.length / columns)
    const position = (node: TreeNode): [number, number, number] => {
        const rank = node.x + (state.nodes.length - 1) / 2
        return folded
            ? [
                  ((rank % columns) - (columns - 1) / 2) * 0.26,
                  top - node.depth * depthStep,
                  (Math.floor(rank / columns) - (rows - 1) / 2) * 0.26,
              ]
            : [node.x * (large ? 0.58 : 0.82), top - node.depth * depthStep, 0]
    }
    const edges = useMemo(() => {
        const points: number[] = []
        for (const node of state.nodes)
            for (const child of [node.left, node.right])
                if (child !== null) points.push(...position(node), ...position(state.nodes[child]))
        const geometry = new BufferGeometry()
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(points), 3))
        return geometry
    }, [state.nodes])
    useEffect(() => () => edges.dispose(), [edges])
    const traversal = state as Partial<TraversalState>
    useLayoutEffect(() => {
        if (!mesh.current) return
        const visited = new Set(state.visited),
            stack = new Set(traversal.stack ?? [])
        for (const node of state.nodes) {
            marker.position.set(...position(node))
            marker.scale.setScalar(
                folded
                    ? state.current === node.id || selectedId === String(node.id)
                        ? 0.16
                        : 0.09
                    : 0.34,
            )
            marker.updateMatrix()
            mesh.current.setMatrixAt(node.id, marker.matrix)
            mesh.current.setColorAt(
                node.id,
                new Color(
                    selectedId === String(node.id)
                        ? colors.selected
                        : state.found === node.id
                          ? colors.solution
                          : state.current === node.id
                            ? colors.current
                            : stack.has(node.id)
                              ? colors.frontier
                              : visited.has(node.id)
                                ? colors.visited
                                : colors.unvisited,
                ),
            )
        }
        mesh.current.instanceMatrix.needsUpdate = true
        if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
        mesh.current.computeBoundingSphere()
    }, [state, selectedId, theme])
    const labels = large
        ? state.nodes.filter(
              (node) =>
                  node.id === 0 ||
                  node.id === state.current ||
                  node.id === state.found ||
                  String(node.id) === selectedId,
          )
        : state.nodes
    return (
        <group>
            <group scale={scale}>
                {!traversal.output && state.visited.length > 1 && (
                    <Line
                        points={state.visited.map((id) => position(state.nodes[id]))}
                        color={colors.current}
                        lineWidth={4}
                    />
                )}
                <lineSegments geometry={edges}>
                    <lineBasicMaterial color={colors.tree} />
                </lineSegments>
                <instancedMesh
                    ref={mesh}
                    args={[undefined, undefined, state.nodes.length]}
                    onClick={(event) => {
                        event.stopPropagation()
                        if (event.instanceId !== undefined) onSelect(String(event.instanceId))
                    }}
                >
                    <sphereGeometry args={[1, 12, 8]} />
                    <meshStandardMaterial roughness={1} bumpMap={tactileTexture} bumpScale={0.02} />
                </instancedMesh>
                {labels.map((node) => (
                    <Html
                        key={node.id}
                        center
                        position={[
                            position(node)[0],
                            position(node)[1] + (folded ? 0.2 : 0.57),
                            position(node)[2],
                        ]}
                        style={{ pointerEvents: 'none' }}
                    >
                        <span className="scene-annotation">{node.key}</span>
                    </Html>
                ))}
                {state.current === null && state.missingParent !== null && state.direction && (
                    <Html
                        center
                        position={position(state.nodes[state.missingParent])}
                        style={{ pointerEvents: 'none' }}
                    >
                        <span style={{ color: colors.rejected }}>∅ {state.direction}</span>
                    </Html>
                )}
            </group>
            {traversal.output && (
                <Html center position={[0, -2.5, 0]} style={{ pointerEvents: 'none' }}>
                    <span className="scene-annotation scene-caption">
                        Stack (top last):{' '}
                        {(traversal.stack ?? []).map((id) => state.nodes[id].key).join(' → ') ||
                            'empty'}
                        <br />
                        Output ({traversal.output.length}):{' '}
                        {traversal.output.length > 16 ? '… ' : ''}
                        {traversal.output.slice(-16).join(' → ')}
                    </span>
                </Html>
            )}
            {folded && (
                <Html center position={[0, -3.4, 0]} style={{ pointerEvents: 'none' }}>
                    <span className="scene-annotation scene-caption">
                        All {state.nodes.length} nodes · in-order ranks wrap across 3D rows · height
                        shows depth
                    </span>
                </Html>
            )}
        </group>
    )
}
