import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { SceneProps } from '../../../engine/types'
import { tactileTexture } from '../../../visual/tactileTexture'
import { affectedLayer, transform, type Cubie, type Move } from '../rubiks/model'
import { transitionDuration, turnAxisAngle, turnTransition } from '../rubiks/transition'
import { homeGeometry } from './model'
import type { MirrorState } from './replay'

export default function MirrorScene({
    state,
    selectedId,
    onSelect,
    reducedMotion,
    playback,
}: SceneProps<MirrorState>) {
    const resources = useMemo(
        () => ({
            geometries: new Map(
                state.cube.map((piece) => {
                    const [x, y, z] = homeGeometry(piece.home).dimensions
                    return [
                        piece.id,
                        new RoundedBoxGeometry(x - 0.024, y - 0.024, z - 0.024, 3, 0.028),
                    ]
                }),
            ),
            metal: new MeshStandardMaterial({
                color: '#b9bec7',
                metalness: 0.8,
                roughness: 0.42,
                bumpMap: tactileTexture,
                bumpScale: 0.009,
            }),
            selected: new MeshStandardMaterial({
                color: '#d1ad64',
                metalness: 0.8,
                roughness: 0.42,
                bumpMap: tactileTexture,
                bumpScale: 0.009,
            }),
        }),
        [],
    )
    useEffect(
        () => () => {
            resources.geometries.forEach((g) => g.dispose())
            resources.metal.dispose()
            resources.selected.dispose()
        },
        [resources],
    )
    const previous = useRef({ state, index: playback?.frameIndex ?? 0 })
    const rotating = useRef<Group>(null)
    const animation = useRef<{ move: Move; elapsed: number; duration: number } | null>(null)
    const [display, setDisplay] = useState(state.cube)
    const [moving, setMoving] = useState<Move | null>(null)
    const finish = () => {
        animation.current = null
        rotating.current?.quaternion.identity()
        setDisplay(state.cube)
        setMoving(null)
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
            setMoving(move)
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
        const current = animation.current
        if (!current || !rotating.current) return
        current.elapsed += delta
        const p = Math.min(1, current.elapsed / current.duration),
            { axis, angle } = turnAxisAngle(current.move)
        rotating.current.quaternion.setFromAxisAngle(
            new Vector3(...axis),
            angle * p * p * (3 - 2 * p),
        )
        if (p === 1) finish()
    })
    const mesh = (piece: Cubie) => {
        const center = transform(piece.basis, homeGeometry(piece.home).center)
        const basis = new Matrix4().makeBasis(
            ...(piece.basis.map((column) => new Vector3(...column)) as [Vector3, Vector3, Vector3]),
        )
        return (
            <mesh
                key={piece.id}
                position={center}
                quaternion={new Quaternion().setFromRotationMatrix(basis)}
                geometry={resources.geometries.get(piece.id)}
                material={selectedId === piece.id ? resources.selected : resources.metal}
                onClick={(event) => {
                    event.stopPropagation()
                    onSelect(piece.id)
                }}
            />
        )
    }
    const affected = (piece: Cubie) => moving !== null && affectedLayer(piece.position, moving, 3)
    return (
        <group>
            <group>{display.filter((p) => !affected(p)).map(mesh)}</group>
            <group ref={rotating}>{display.filter(affected).map(mesh)}</group>
        </group>
    )
}
