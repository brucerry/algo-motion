import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Group, MeshStandardMaterial, Quaternion, Vector3 } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { SceneProps } from '../../../engine/types'
import { tactileTexture } from '../../../visual/tactileTexture'
import { dot, faceColors, faces, normals, type Cubie, type Move } from './model'
import type { CubeState } from './replay'
import { transitionDuration, turnAxisAngle, turnTransition } from './transition'

export default function CubeScene({
    state,
    selectedId,
    onSelect,
    reducedMotion,
    playback,
}: SceneProps<CubeState>) {
    const resources = useMemo(
        () => ({
            body: new RoundedBoxGeometry(0.96, 0.96, 0.96, 3, 0.075),
            sticker: new RoundedBoxGeometry(0.78, 0.78, 0.032, 3, 0.015),
            plastic: new MeshStandardMaterial({
                color: '#20232a',
                roughness: 0.65,
                bumpMap: tactileTexture,
                bumpScale: 0.025,
            }),
            selected: new MeshStandardMaterial({
                color: '#c99b3e',
                roughness: 0.65,
                bumpMap: tactileTexture,
                bumpScale: 0.025,
            }),
            colors: Object.fromEntries(
                faces.map((face) => [
                    face,
                    new MeshStandardMaterial({
                        color: faceColors[face],
                        roughness: 0.49,
                        bumpMap: tactileTexture,
                        bumpScale: 0.012,
                    }),
                ]),
            ),
        }),
        [],
    )
    useEffect(
        () => () => {
            resources.body.dispose()
            resources.sticker.dispose()
            resources.plastic.dispose()
            resources.selected.dispose()
            Object.values(resources.colors).forEach((material) => material.dispose())
        },
        [resources],
    )
    const previous = useRef({ state, index: playback?.frameIndex ?? 0 })
    const rotating = useRef<Group>(null)
    const animation = useRef<{ move: Move; elapsed: number; duration: number } | null>(null)
    const [display, setDisplay] = useState(state.cube)
    const [movingFace, setMovingFace] = useState<Move['face'] | null>(null)
    const finish = () => {
        animation.current = null
        rotating.current?.quaternion.identity()
        setDisplay(state.cube)
        setMovingFace(null)
    }
    useLayoutEffect(() => {
        const index = playback?.frameIndex ?? 0
        const move = animation.current
            ? null
            : turnTransition(
                  previous.current.state,
                  state,
                  previous.current.index,
                  index,
                  reducedMotion,
              )
        rotating.current?.quaternion.identity()
        if (move) {
            setDisplay(previous.current.state.cube)
            setMovingFace(move.face)
            animation.current = {
                move,
                elapsed: 0,
                duration: transitionDuration(playback?.speed ?? 1),
            }
        } else finish()
        previous.current = { state, index }
    }, [state, playback?.frameIndex, reducedMotion])
    const wasPlaying = useRef(playback?.playing)
    useEffect(() => {
        if (wasPlaying.current && !playback?.playing) finish()
        wasPlaying.current = playback?.playing
    }, [playback?.playing])
    useFrame((_, delta) => {
        const turn = animation.current
        if (!turn || !rotating.current) return
        turn.elapsed += delta
        const progress = Math.min(1, turn.elapsed / turn.duration)
        const { axis, angle } = turnAxisAngle(turn.move)
        rotating.current.quaternion.setFromAxisAngle(
            new Vector3(...axis),
            angle * (progress * progress * (3 - 2 * progress)),
        )
        if (progress === 1) finish()
    })
    const cubieMesh = (cubie: Cubie) => (
        <group key={cubie.id} position={cubie.position}>
            <mesh
                geometry={resources.body}
                material={selectedId === cubie.id ? resources.selected : resources.plastic}
                onClick={(event) => {
                    event.stopPropagation()
                    onSelect(cubie.id)
                }}
            />
            {cubie.stickers.map((sticker) => {
                const rotation = new Quaternion().setFromUnitVectors(
                    new Vector3(0, 0, 1),
                    new Vector3(...sticker.normal),
                )
                return (
                    <mesh
                        key={sticker.color}
                        geometry={resources.sticker}
                        material={resources.colors[sticker.color]}
                        position={
                            sticker.normal.map((value) => value * 0.486) as [number, number, number]
                        }
                        quaternion={rotation}
                        onClick={(event) => {
                            event.stopPropagation()
                            onSelect(cubie.id)
                        }}
                    />
                )
            })}
        </group>
    )
    const affected = (cubie: Cubie) =>
        movingFace !== null && dot(cubie.position, normals[movingFace]) === 1
    return (
        <group>
            <group>{display.filter((cubie) => !affected(cubie)).map(cubieMesh)}</group>
            <group ref={rotating}>{display.filter(affected).map(cubieMesh)}</group>
            {faces.map((face) => (
                <Html
                    key={face}
                    center
                    occlude
                    position={normals[face].map((v) => v * 1.9) as [number, number, number]}
                    style={{ pointerEvents: 'none' }}
                >
                    <span className="scene-annotation">{face}</span>
                </Html>
            ))}
        </group>
    )
}
