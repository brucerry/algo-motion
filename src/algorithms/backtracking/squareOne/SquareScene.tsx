import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, MeshStandardMaterial, Quaternion, Vector3 } from 'three'
import type { SceneProps } from '../../../engine/types'
import { tactileTexture } from '../../../visual/tactileTexture'
import { sliceAxis } from './model'
import { squareGeometry } from './geometry'
import { squareTransition, type SquareTransition } from './transition'
import type { SquareState } from './replay'

const axis = new Vector3(...sliceAxis),
    up = new Vector3(0, 1, 0)
export default function SquareScene({
    state,
    selectedId,
    onSelect,
    reducedMotion,
    playback,
}: SceneProps<SquareState>) {
    const resources = useMemo(
        () => ({
            geometries: Array.from({ length: 18 }, (_, id) => squareGeometry(id)),
            materials: [
                '#faf7ee',
                '#eac34b',
                '#c95148',
                '#dd8640',
                '#549667',
                '#537eaf',
                '#222832',
            ].map(
                (color) =>
                    new MeshStandardMaterial({
                        color,
                        roughness: 0.52,
                        bumpMap: tactileTexture,
                        bumpScale: 0.008,
                    }),
            ),
            selected: new MeshStandardMaterial({
                color: '#d1ad64',
                roughness: 0.5,
                bumpMap: tactileTexture,
                bumpScale: 0.008,
            }),
        }),
        [],
    )
    useEffect(
        () => () => {
            resources.geometries.forEach((g) => g.dispose())
            resources.materials.forEach((m) => m.dispose())
            resources.selected.dispose()
        },
        [resources],
    )
    const previous = useRef({ state, index: playback?.frameIndex ?? 0 }),
        animation = useRef<(SquareTransition & { elapsed: number; duration: number }) | null>(null)
    const topGroup = useRef<Group>(null),
        bottomGroup = useRef<Group>(null),
        sliceGroup = useRef<Group>(null)
    const [display, setDisplay] = useState(state.puzzle),
        [moving, setMoving] = useState<SquareTransition | null>(null)
    const reset = () => {
        topGroup.current?.quaternion.identity()
        bottomGroup.current?.quaternion.identity()
        sliceGroup.current?.quaternion.identity()
    }
    const finish = () => {
        animation.current = null
        reset()
        setDisplay(state.puzzle)
        setMoving(null)
    }
    useLayoutEffect(() => {
        const index = playback?.frameIndex ?? 0,
            next = animation.current
                ? null
                : squareTransition(
                      previous.current.state,
                      state,
                      previous.current.index,
                      index,
                      reducedMotion,
                  )
        reset()
        if (next) {
            setDisplay(previous.current.state.puzzle)
            setMoving(next)
            animation.current = { ...next, elapsed: 0, duration: 0.21 / (playback?.speed ?? 1) }
        } else finish()
        previous.current = { state, index }
    }, [state, playback?.frameIndex, reducedMotion])
    const wasPlaying = useRef(playback?.playing)
    useEffect(() => {
        if (wasPlaying.current && !playback?.playing) finish()
        wasPlaying.current = playback?.playing
    }, [playback?.playing])
    useFrame((_, delta) => {
        const a = animation.current
        if (!a) return
        a.elapsed += delta
        const p = Math.min(1, a.elapsed / a.duration),
            eased = p * p * (3 - 2 * p) * a.direction
        if (a.move.kind === 'slice')
            sliceGroup.current?.quaternion.setFromAxisAngle(axis, Math.PI * eased)
        else {
            topGroup.current?.quaternion.setFromAxisAngle(up, ((-a.move.top * Math.PI) / 6) * eased)
            bottomGroup.current?.quaternion.setFromAxisAngle(
                up,
                ((a.move.bottom * Math.PI) / 6) * eased,
            )
        }
        if (p === 1) finish()
    })
    const groupOf = (id: number) => {
        if (!moving) return 'fixed'
        if (moving.move.kind === 'slice')
            return id === 17 ||
                (id < 16 && [...display.top.slice(6), ...display.bottom.slice(0, 6)].includes(id))
                ? 'slice'
                : 'fixed'
        if (id >= 16) return 'fixed'
        return display.top.includes(id) ? 'top' : 'bottom'
    }
    const mesh = (id: number) => {
        const pose =
            id < 16 ? display.poses[id] : { angle: 0, flipped: id === 17 && display.middle === 1 }
        const quaternion = new Quaternion().setFromAxisAngle(up, (-pose.angle * Math.PI) / 6)
        if (pose.flipped) quaternion.multiply(new Quaternion().setFromAxisAngle(axis, Math.PI))
        return (
            <mesh
                key={id}
                geometry={resources.geometries[id]}
                quaternion={quaternion}
                material={selectedId === String(id) ? resources.selected : resources.materials}
                onClick={(event) => {
                    event.stopPropagation()
                    onSelect(String(id))
                }}
            />
        )
    }
    const pieces = (group: string) =>
        Array.from({ length: 18 }, (_, id) => id)
            .filter((id) => groupOf(id) === group)
            .map(mesh)
    return (
        <group>
            <group>{pieces('fixed')}</group>
            <group ref={topGroup}>{pieces('top')}</group>
            <group ref={bottomGroup}>{pieces('bottom')}</group>
            <group ref={sliceGroup}>{pieces('slice')}</group>
        </group>
    )
}
