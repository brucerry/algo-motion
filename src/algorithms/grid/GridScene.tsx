import { useLayoutEffect, useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { Color, InstancedMesh, Object3D } from 'three'
import type { SceneProps } from '../../engine/types'
import { scenePalette } from '../../visual/scenePalette'
import type { GridState } from './grid'

const ring = (x: number, z: number, radius: number, y: number) =>
    Array.from({ length: 33 }, (_, i) => {
        const angle = (i / 32) * Math.PI * 2
        return [x + Math.cos(angle) * radius, y, z + Math.sin(angle) * radius] as [
            number,
            number,
            number,
        ]
    })

export default function GridScene({ state, onSelect, selectedId, theme }: SceneProps<GridState>) {
    const mesh = useRef<InstancedMesh>(null)
    const marker = useMemo(() => new Object3D(), [])
    const colors = scenePalette(theme)
    const { environment: env } = state
    const count = env.width * env.depth
    const position = (id: number) =>
        [
            (id % env.width) - (env.width - 1) / 2,
            Math.floor(id / env.width) - (env.depth - 1) / 2,
        ] as const

    useLayoutEffect(() => {
        if (!mesh.current) return
        const frontier = new Set(state.frontier),
            visited = new Set(state.visited),
            path = new Set(state.path)
        for (let id = 0; id < count; id++) {
            const x = (id % env.width) - (env.width - 1) / 2
            const z = Math.floor(id / env.width) - (env.depth - 1) / 2
            const height = env.blocked[id]
                ? 0.86
                : path.has(id)
                  ? 0.42
                  : state.current === id
                    ? 0.57
                    : frontier.has(id)
                      ? 0.36
                      : visited.has(id)
                        ? 0.21
                        : 0.25
            marker.position.set(x, height / 2, z)
            marker.scale.set(0.91, height, 0.91)
            marker.updateMatrix()
            mesh.current.setMatrixAt(id, marker.matrix)
            const color =
                selectedId === String(id)
                    ? colors.selected
                    : id === env.start
                      ? colors.start
                      : id === env.goal
                        ? colors.goal
                        : env.blocked[id]
                          ? colors.obstacle
                          : path.has(id)
                            ? colors.solution
                            : state.current === id
                              ? colors.current
                              : frontier.has(id)
                                ? colors.frontier
                                : visited.has(id)
                                  ? colors.visited
                                  : colors.unvisited
            mesh.current.setColorAt(id, new Color(color))
        }
        mesh.current.instanceMatrix.needsUpdate = true
        if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
    }, [state, selectedId, count, env, marker, colors])

    const pathPoints = state.path.map(
        (id) =>
            [
                (id % env.width) - (env.width - 1) / 2,
                0.73,
                Math.floor(id / env.width) - (env.depth - 1) / 2,
            ] as [number, number, number],
    )
    const click = (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        if (event.instanceId === undefined) return
        onSelect(String(event.instanceId))
    }
    const [startX, startZ] = position(env.start)
    const [goalX, goalZ] = position(env.goal)
    const selected = selectedId === null ? null : Number(selectedId)
    const selectedPosition =
        selected !== null && selected >= 0 && selected < count ? position(selected) : null
    const currentPosition = state.current === null ? null : position(state.current)
    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
                <planeGeometry args={[env.width + 1, env.depth + 1]} />
                <meshStandardMaterial color={colors.ground} roughness={1} />
            </mesh>
            <gridHelper
                args={[
                    Math.max(env.width, env.depth) + 2,
                    Math.max(env.width, env.depth) + 2,
                    colors.grid,
                    colors.grid,
                ]}
                position={[0, -0.07, 0]}
            />
            <instancedMesh ref={mesh} args={[undefined, undefined, count]} onClick={click}>
                <boxGeometry />
                <meshStandardMaterial roughness={1} metalness={0} flatShading />
            </instancedMesh>
            {pathPoints.length > 1 && (
                <>
                    <Line points={pathPoints} color={colors.ink} lineWidth={5} />
                    <Line points={pathPoints} color={colors.solution} lineWidth={3} />
                </>
            )}
            <mesh
                position={[startX, 0.61, startZ]}
                rotation={[0, Math.PI / 4, 0]}
                onClick={(event) => {
                    event.stopPropagation()
                    onSelect(String(env.start))
                }}
            >
                <octahedronGeometry args={[0.21]} />
                <meshBasicMaterial color={colors.ink} />
            </mesh>
            <mesh
                position={[goalX, 0.63, goalZ]}
                rotation={[0, Math.PI / 4, 0]}
                onClick={(event) => {
                    event.stopPropagation()
                    onSelect(String(env.goal))
                }}
            >
                <coneGeometry args={[0.2, 0.37, 5]} />
                <meshBasicMaterial color={colors.ink} />
            </mesh>
            {currentPosition && (
                <Line
                    points={ring(currentPosition[0], currentPosition[1], 0.45, 0.63)}
                    color={colors.ink}
                    lineWidth={3}
                />
            )}
            {selectedPosition && (
                <Line
                    points={ring(selectedPosition[0], selectedPosition[1], 0.55, 1.02)}
                    color={colors.ink}
                    lineWidth={4}
                />
            )}
        </group>
    )
}
