import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Box3, Matrix4, Mesh, Quaternion, Raycaster, Vector3, type PerspectiveCamera } from 'three'
import type { SceneProps } from '../engine/types'
import { OrbitControls } from './vendor/OrbitControls.js'
import { scenePalette, type Theme } from './scenePalette'
import {
    composePieceFocus,
    elasticProgress,
    FocusOwnership,
    orbitDirection,
    OutlineHistory,
    SelectionFocusBridge,
} from './selectionFocus'

type ReturnPose = { direction: Vector3; target: Vector3; up: Vector3; elapsed: number }
type UnselectedView = {
    controls: OrbitControls
    position: Vector3
    target: Vector3
    up: Vector3
    zoom: number
}
export default function PieceFocusRig({
    bridge,
    selectedId,
    focusScope,
    playback,
    presetRevision,
    refocusRevision,
    reducedMotion,
    theme,
    overlay,
}: {
    bridge: SelectionFocusBridge
    selectedId: string | null
    focusScope: object | null
    playback?: SceneProps<unknown>['playback']
    presetRevision: number
    refocusRevision: number
    reducedMotion: boolean
    theme: Theme
    overlay: RefObject<SVGSVGElement | null>
}) {
    const { camera, controls: currentControls, gl, size, scene } = useThree()
    const controls = currentControls as OrbitControls | undefined
    const owner = useMemo(() => new FocusOwnership(), [])
    const history = useMemo(() => new OutlineHistory(), [])
    const returning = useRef<ReturnPose | null>(null)
    const unselectedView = useRef<UnselectedView | null>(null)
    const radius = useRef(0)
    const previousFrame = useRef(playback?.frameIndex ?? 0)
    const latest = useRef({ playing: playback?.playing ?? false, reducedMotion })
    latest.current = { playing: playback?.playing ?? false, reducedMotion }
    const resources = useMemo(
        () => ({
            bounds: new Box3(),
            matrix: new Matrix4(),
            previousMatrix: new Matrix4(),
            previousCamera: new Matrix4(),
            point: new Vector3(),
            ray: new Raycaster(),
            inverse: new Matrix4(),
            localCamera: new Vector3(),
            midpoint: new Vector3(),
            normal: new Vector3(),
            focusDirection: null as Vector3 | null,
            hidden: false,
            visibilityDirty: false,
            occlusionTime: -Infinity,
            geometry: new Float32Array(),
            path: '',
            previousPath: '',
            lastWidth: 0,
            lastHeight: 0,
            lastPiece: null as object | null,
        }),
        [],
    )
    const cancel = () => {
        returning.current = null
        bridge.driving = false
    }
    const clearTrail = () => {
        history.clear()
        overlay.current?.setAttribute('data-trail-count', '0')
        resources.previousPath = ''
        overlay.current
            ?.querySelectorAll('[data-afterimage]')
            .forEach((path) => path.setAttribute('opacity', '0'))
    }
    const rememberView = () => {
        if (!controls || unselectedView.current) return
        unselectedView.current = {
            controls,
            position: camera.position.clone(),
            target: controls.target.clone(),
            up: camera.up.clone(),
            zoom: camera.zoom,
        }
    }
    // Invalidate before handling a lifecycle deselection, so an old puzzle or
    // explicit preset cannot be overwritten by a stale focus-session pose.
    useLayoutEffect(() => {
        unselectedView.current = null
    }, [bridge, focusScope, controls, presetRevision])
    useLayoutEffect(() => {
        bridge.select(selectedId)
        cancel()
        clearTrail()
        if (!selectedId) radius.current = 0
        resources.focusDirection = null
        if (selectedId) {
            rememberView()
            owner.select()
        } else {
            owner.clear()
            const saved = unselectedView.current
            unselectedView.current = null
            if (saved && saved.controls === controls) {
                controls.clearMotion()
                controls.target.copy(saved.target)
                camera.position.copy(saved.position)
                camera.up.copy(saved.up)
                camera.zoom = saved.zoom
                camera.updateProjectionMatrix()
                controls.update()
                camera.updateMatrixWorld()
            }
        }
    }, [selectedId, bridge])
    useLayoutEffect(() => {
        const playing = playback?.playing ?? false
        if (!playing && !owner.playing) return
        owner.play(playing)
        cancel()
    }, [playback?.playing])
    // Selection effects run before this effect. Initial mounting is not a preset request.
    const lastPreset = useRef(presetRevision)
    useLayoutEffect(() => {
        if (lastPreset.current === presetRevision) return
        lastPreset.current = presetRevision
        owner.preset()
        cancel()
        clearTrail()
    }, [presetRevision])
    const lastRefocus = useRef(refocusRevision)
    useLayoutEffect(() => {
        if (lastRefocus.current === refocusRevision) return
        lastRefocus.current = refocusRevision
        if (selectedId) owner.select()
        cancel()
        clearTrail()
    }, [refocusRevision])
    const lastReplay = useRef(playback?.revision)
    useLayoutEffect(() => {
        overlay.current?.setAttribute('data-replay-revision', String(playback?.revision ?? 0))
        if (lastReplay.current === playback?.revision) return
        lastReplay.current = playback?.revision
        owner.stop()
        cancel()
        clearTrail()
        controls?.clearMotion()
    }, [playback?.revision])
    useLayoutEffect(() => {
        cancel()
        clearTrail()
    }, [reducedMotion, size.width, size.height])
    useEffect(() => {
        if (!controls) return
        const pointers = new Set<number>()
        const start = (event: PointerEvent) => {
            if (event.pointerType === 'mouse' && ![0, 2].includes(event.button)) return
            pointers.add(event.pointerId)
            if (owner.mode === 'returning' || owner.mode === 'following') controls.clearMotion()
            owner.start()
            cancel()
        }
        const end = (event: PointerEvent) => {
            if (!pointers.delete(event.pointerId) || pointers.size) return
            owner.playing = latest.current.playing
            owner.end(latest.current.reducedMotion)
            if (owner.mode === 'returning') controls.clearMotion()
            cancel()
        }
        const changed = () => {
            radius.current = controls.getDistance()
        }
        const hidden = () => {
            pointers.clear()
            owner.held = false
            owner.stop()
            cancel()
            clearTrail()
        }
        const visible = () => {
            hidden()
            if (!document.hidden && latest.current.playing && owner.enabled)
                owner.mode = 'following'
        }
        gl.domElement.addEventListener('pointerdown', start, true)
        document.addEventListener('pointerup', end, true)
        const aborted = () => {
            pointers.clear()
            owner.held = false
            owner.stop()
            cancel()
            clearTrail()
        }
        document.addEventListener('pointercancel', aborted, true)
        window.addEventListener('blur', hidden)
        document.addEventListener('visibilitychange', visible)
        controls.addEventListener('change', changed)
        return () => {
            if (pointers.size) {
                pointers.clear()
                owner.held = false
                if (owner.mode === 'held') owner.mode = 'free'
            }
            gl.domElement.removeEventListener('pointerdown', start, true)
            document.removeEventListener('pointerup', end, true)
            document.removeEventListener('pointercancel', aborted, true)
            window.removeEventListener('blur', hidden)
            document.removeEventListener('visibilitychange', visible)
            controls.removeEventListener('change', changed)
            cancel()
            clearTrail()
        }
    }, [controls, gl, owner, bridge])

    useFrame((_, delta) => {
        if (!controls) return
        const piece = bridge.current
        const frame = playback?.frameIndex ?? 0
        const frameChanged = frame !== previousFrame.current
        if (Math.abs(frame - previousFrame.current) > 1) {
            if (!playback?.playing) {
                owner.stop()
                cancel()
            }
            clearTrail()
        }
        previousFrame.current = frame
        if (!piece || piece.id !== selectedId || document.hidden) {
            bridge.driving = false
            overlay.current?.setAttribute('data-selected-piece', '')
            overlay.current?.setAttribute('visibility', 'hidden')
            return
        }
        overlay.current?.setAttribute('visibility', 'visible')
        overlay.current?.setAttribute('data-selected-piece', piece.id)
        overlay.current?.setAttribute('data-piece-center', piece.center.toArray().join(','))
        if (reducedMotion && frameChanged && owner.enabled && owner.playing && !owner.held)
            owner.mode = 'following'
        const automatic = !owner.held && (owner.mode === 'returning' || owner.mode === 'following')
        bridge.driving = automatic
        if (automatic) {
            // Controls may become available after the selection layout effect,
            // or focus may have been reactivated from an explicit preset.
            rememberView()
            let root = piece.owner
            while (root.parent && root.parent !== scene) root = root.parent
            root.updateWorldMatrix(true, true)
            resources.bounds.setFromObject(root)
            if (!radius.current) {
                // Keep large puzzles within the existing software-rendering budget;
                // centering and the oblique angle still make the selected piece primary.
                const extent = resources.bounds.getSize(resources.point)
                radius.current =
                    controls.getDistance() *
                    (Math.max(extent.x, extent.y, extent.z) > 4 ? 0.92 : 0.84)
            }
            const composed = composePieceFocus(
                piece,
                resources.bounds,
                (camera as PerspectiveCamera).aspect,
                (camera as PerspectiveCamera).fov,
                radius.current,
                resources.focusDirection ?? undefined,
            )
            resources.focusDirection = composed.direction
            const currentDirection = camera.position.clone().sub(controls.target).normalize()
            let direction = composed.direction,
                target = composed.target
            if (!reducedMotion && owner.mode === 'returning') {
                if (!returning.current)
                    returning.current = {
                        direction: currentDirection.clone(),
                        target: controls.target.clone(),
                        up: camera.up.clone(),
                        elapsed: 0,
                    }
                const pose = returning.current
                pose.elapsed += delta
                const progress = elasticProgress(pose.elapsed)
                direction = orbitDirection(pose.direction, composed.direction, progress)
                target = pose.target
                    .clone()
                    .lerp(composed.target, Math.min(1, Math.max(0, progress)))
                const roll = new Quaternion().setFromUnitVectors(
                    pose.up.clone().normalize(),
                    new Vector3(0, 1, 0),
                )
                camera.up
                    .copy(pose.up)
                    .applyQuaternion(new Quaternion().slerp(roll, progress))
                    .normalize()
                if (pose.elapsed >= 0.7) {
                    returning.current = null
                    owner.mode = owner.playing ? 'following' : 'free'
                }
            } else if (!reducedMotion) {
                const alpha = 1 - Math.exp(-delta * 14)
                direction = orbitDirection(currentDirection, composed.direction, alpha)
                target = controls.target.clone().lerp(composed.target, alpha)
                camera.up.lerp(new Vector3(0, 1, 0), alpha).normalize()
            } else {
                camera.up.set(0, 1, 0)
                owner.mode = owner.playing ? 'following' : 'free'
            }
            const puzzleCenter = resources.bounds.getCenter(new Vector3())
            const clearance =
                resources.bounds.getSize(new Vector3()).length() / 2 +
                target.distanceTo(puzzleCenter) +
                0.35
            controls.clearMotion()
            controls.target.copy(target)
            camera.position
                .copy(target)
                .addScaledVector(direction, Math.max(composed.distance, clearance))
            camera.lookAt(target)
            camera.updateMatrixWorld()
        }
        overlay.current?.setAttribute('data-focus-mode', owner.mode)
    }, -1)

    // Draw after scene animation, selected world transforms, and final camera updates.
    useFrame(({ clock }) => {
        const svg = overlay.current,
            piece = bridge.current
        if (!svg || !piece || piece.id !== selectedId || document.hidden) return
        const time = clock.elapsedTime
        camera.updateMatrixWorld()
        const changed =
            resources.lastPiece !== piece ||
            !resources.previousMatrix.equals(piece.matrix) ||
            !resources.previousCamera.equals(camera.matrixWorld) ||
            resources.lastWidth !== size.width ||
            resources.lastHeight !== size.height
        if (changed) {
            resources.visibilityDirty = true
            resources.lastPiece = piece
            resources.previousMatrix.copy(piece.matrix)
            resources.previousCamera.copy(camera.matrixWorld)
            resources.lastWidth = size.width
            resources.lastHeight = size.height
            const edges = piece.edges
            resources.localCamera
                .copy(camera.position)
                .applyMatrix4(resources.inverse.copy(piece.matrix).invert())
            if (resources.geometry.length !== (edges.length / 3) * 2)
                resources.geometry = new Float32Array((edges.length / 3) * 2)
            let path = '',
                minX = Infinity,
                minY = Infinity,
                maxX = -Infinity,
                maxY = -Infinity
            for (let i = 0; i < edges.length; i += 6) {
                resources.midpoint
                    .fromArray(edges, i)
                    .add(resources.point.fromArray(edges, i + 3))
                    .multiplyScalar(0.5)
                const view = resources.midpoint.sub(resources.localCamera).negate()
                const facing =
                    !piece.edgeNormals ||
                    [0, 3].some(
                        (offset) =>
                            resources.normal.fromArray(piece.edgeNormals!, i + offset).dot(view) >
                            0.0001,
                    )
                let segment = '',
                    clipped = false
                for (let j = 0; j < 2; j++) {
                    const point = resources.point
                        .fromArray(edges, i + j * 3)
                        .applyMatrix4(piece.matrix)
                        .project(camera)
                    const x = ((point.x + 1) * size.width) / 2,
                        y = ((1 - point.y) * size.height) / 2
                    resources.geometry[(i / 3 + j) * 2] = x
                    resources.geometry[(i / 3 + j) * 2 + 1] = y
                    minX = Math.min(minX, x)
                    maxX = Math.max(maxX, x)
                    minY = Math.min(minY, y)
                    maxY = Math.max(maxY, y)
                    clipped ||= point.z < -1 || point.z > 1
                    segment += `${j === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
                }
                if (facing && !clipped) path += segment
            }
            resources.path = path
            // A mobile cubie's halo should not fill its much smaller sticker faces.
            svg.querySelector('[data-halo]')?.setAttribute(
                'stroke-width',
                String(Math.min(9, Math.max(4, Math.min(maxX - minX, maxY - minY) * 0.1))),
            )
            svg.querySelectorAll('[data-outline]').forEach((element) =>
                element.setAttribute('d', path),
            )
        }
        if (resources.visibilityDirty && time - resources.occlusionTime > 0.15) {
            resources.visibilityDirty = false
            resources.occlusionTime = time
            const direction = piece.center.clone().sub(camera.position)
            resources.ray.set(camera.position, direction.clone().normalize())
            resources.ray.far = direction.length() + 0.1
            const hits = resources.ray.intersectObjects(scene.children, true)
            const first = hits.find((hit) => hit.object instanceof Mesh)
            resources.hidden =
                !!first &&
                first.object !== piece.owner &&
                !piece.owner.getObjectById(first.object.id)
            svg.querySelectorAll('[data-outline]').forEach((element) => {
                element.setAttribute('stroke-dasharray', resources.hidden ? '4 4' : 'none')
                element.setAttribute('stroke-opacity', resources.hidden ? '0.35' : '1')
            })
        }
        if (!reducedMotion) history.update(resources.geometry, resources.path, time, true)
        else history.clear()
        const palette = scenePalette(theme)
        const halo = svg.querySelector('[data-halo]')
        halo?.setAttribute(
            'opacity',
            reducedMotion ? '0' : String(0.17 + 0.12 * (1 + Math.sin(time * Math.PI))),
        )
        svg.querySelectorAll<SVGPathElement>('[data-afterimage]').forEach((element, i) => {
            const sample = history.samples[i]
            const opacity = sample ? Math.max(0, 1 - (time - sample.time) / 0.55) * 0.24 : 0
            if (sample && element.getAttribute('d') !== sample.path)
                element.setAttribute('d', sample.path)
            element.setAttribute('opacity', String(opacity))
            element.setAttribute('stroke', palette.focus)
        })
        svg.setAttribute('data-trail-count', String(history.samples.length))
    }, -0.5)
    return null
}
