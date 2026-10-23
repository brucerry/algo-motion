import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { RegisteredAlgorithm } from '../engine/registry'
import type { Frame, SceneProps } from '../engine/types'
import { scenePalette, type Theme } from '../visual/scenePalette'
import { OrbitControls } from '../visual/vendor/OrbitControls.js'
import { SelectionFocusBridge } from '../visual/selectionFocus'
import PieceFocusRig from '../visual/PieceFocusRig'

export type CameraCommand = { preset: 'perspective' | 'top' | 'side'; revision: number }

function CameraRig({
    command,
    algorithm,
    state,
    reducedMotion,
    selectionFocus,
}: {
    command: CameraCommand
    algorithm: RegisteredAlgorithm
    state: unknown
    reducedMotion: boolean
    selectionFocus?: SelectionFocusBridge
}) {
    const { camera, gl, invalidate, get, set } = useThree()
    const framing = algorithm.cameraForState?.(state) ?? algorithm.meta.camera
    // A fresh controller clears residual drag/zoom/pan momentum on a camera reset.
    const controlsKey = JSON.stringify([command, algorithm.meta.id, framing])
    const controls = useMemo(() => {
        const controller = new OrbitControls(camera)
        controller.enableFullRotation = true
        controller.screenRelativeRotation = true
        controller.minPolarAngle = -Infinity
        controller.maxPolarAngle = Infinity
        controller.enableDamping = !reducedMotion
        controller.minDistance = 0.15
        controller.maxDistance = 100
        return controller
    }, [camera, controlsKey])
    useEffect(() => {
        controls.connect(gl.domElement)
        const onChange = () => invalidate()
        controls.addEventListener('change', onChange)
        const previous = get().controls
        set({ controls })
        return () => {
            controls.removeEventListener('change', onChange)
            controls.dispose()
            set({ controls: previous })
        }
    }, [controls, gl, invalidate, get, set])
    useEffect(() => {
        controls.enableDamping = !reducedMotion
        if (reducedMotion) controls.clearMotion()
    }, [controls, reducedMotion])
    useEffect(() => {
        const distance = framing?.distance ?? 21
        const targetY = framing?.targetY ?? 0
        const position: [number, number, number] =
            command.preset === 'top'
                ? [0, distance, 0.01]
                : command.preset === 'side'
                  ? [0, targetY + distance * 0.35, distance]
                  : (framing?.perspective ?? [
                        distance * 0.7,
                        targetY + distance * 0.72,
                        distance * 0.7,
                    ])
        camera.position.set(...position)
        camera.up.set(0, 1, 0)
        camera.lookAt(0, targetY, 0)
        controls.target.set(0, targetY, 0)
        controls.update()
    }, [
        command,
        algorithm,
        camera,
        controls,
        framing?.distance,
        framing?.targetY,
        framing?.perspective?.[0],
        framing?.perspective?.[1],
        framing?.perspective?.[2],
    ])
    useFrame(() => {
        if (!selectionFocus?.driving) controls.update()
    }, -1.5)
    return null
}

export default function VisualizationCanvas({
    algorithm,
    frame,
    onSelect,
    selectedId,
    focusScope,
    cameraCommand,
    reducedMotion,
    theme,
    playback,
    refocusRevision = 0,
}: {
    algorithm: RegisteredAlgorithm
    frame: Frame<any>
    onSelect: (id: string | null) => void
    selectedId: string | null
    focusScope: object | null
    cameraCommand: CameraCommand
    reducedMotion: boolean
    theme: Theme
    playback?: SceneProps<unknown>['playback']
    refocusRevision?: number
}) {
    const Renderer = algorithm.renderer
    const palette = scenePalette(theme)
    const bridge = useMemo(() => new SelectionFocusBridge(), [algorithm.meta.id])
    const overlay = useRef<SVGSVGElement>(null)
    const gesture = useRef({
        x: 0,
        y: 0,
        moved: false,
        revision: 0,
        cameraRevision: 0,
        playing: false,
        started: 0,
    })
    const focusEnabled = ['rubiks-cube', 'mirror-cube', 'square-one'].includes(algorithm.meta.id)
    return (
        <div
            className="canvas-host"
            id="visualization"
            role="group"
            aria-label={`${algorithm.meta.name} 3D visualization`}
            onPointerDownCapture={(event) => {
                gesture.current = {
                    x: event.clientX,
                    y: event.clientY,
                    moved: false,
                    revision: playback?.revision ?? 0,
                    cameraRevision: cameraCommand.revision,
                    playing: playback?.playing ?? false,
                    started: performance.now(),
                }
            }}
            onPointerMoveCapture={(event) => {
                if (
                    event.buttons &&
                    Math.hypot(
                        event.clientX - gesture.current.x,
                        event.clientY - gesture.current.y,
                    ) > 3
                )
                    gesture.current.moved = true
            }}
            onClickCapture={(event) => {
                if (
                    gesture.current.moved ||
                    gesture.current.revision !== (playback?.revision ?? 0) ||
                    gesture.current.cameraRevision !== cameraCommand.revision ||
                    (gesture.current.playing && !playback?.playing) ||
                    (focusEnabled &&
                        selectedId !== null &&
                        (gesture.current.playing || playback?.playing) &&
                        performance.now() - gesture.current.started > 180)
                ) {
                    event.stopPropagation()
                    event.preventDefault()
                }
            }}
        >
            <Canvas
                camera={{ position: [14, 16, 14], fov: 48 }}
                dpr={[1, 1.8]}
                onPointerMissed={() => {
                    if (!gesture.current.moved) onSelect(null)
                }}
                fallback={
                    <div className="canvas-fallback">
                        3D view is unavailable. Follow the synchronized step text below.
                    </div>
                }
            >
                <color attach="background" args={[palette.background]} />
                <ambientLight intensity={theme === 'dark' ? 1.35 : 1.75} />
                <directionalLight position={[8, 14, 6]} intensity={theme === 'dark' ? 2 : 2.5} />
                <pointLight
                    position={[-8, 8, -8]}
                    intensity={theme === 'dark' ? 21 : 13}
                    color={palette.frontier}
                />
                <CameraRig
                    command={cameraCommand}
                    algorithm={algorithm}
                    state={frame.state}
                    reducedMotion={reducedMotion}
                    selectionFocus={focusEnabled ? bridge : undefined}
                />
                {focusEnabled && (
                    <PieceFocusRig
                        key={algorithm.meta.id}
                        bridge={bridge}
                        selectedId={selectedId}
                        focusScope={focusScope}
                        playback={playback}
                        presetRevision={cameraCommand.revision}
                        refocusRevision={refocusRevision}
                        reducedMotion={reducedMotion}
                        theme={theme}
                        overlay={overlay}
                    />
                )}
                <Suspense fallback={null}>
                    <Renderer
                        key={algorithm.meta.id}
                        state={frame.state}
                        onSelect={onSelect}
                        selectedId={selectedId}
                        reducedMotion={reducedMotion}
                        theme={theme}
                        playback={playback}
                        selectionFocus={focusEnabled ? bridge : undefined}
                    />
                </Suspense>
            </Canvas>
            {focusEnabled && (
                <svg
                    ref={overlay}
                    className="selection-overlay"
                    aria-hidden="true"
                    focusable="false"
                    visibility="hidden"
                >
                    {Array.from({ length: 12 }, (_, index) => (
                        <path
                            key={index}
                            data-afterimage=""
                            fill="none"
                            strokeWidth="3"
                            opacity="0"
                        />
                    ))}
                    <path
                        data-outline=""
                        data-halo=""
                        fill="none"
                        stroke={palette.focus}
                        strokeWidth="9"
                        opacity="0.3"
                        strokeLinejoin="round"
                    />
                    <path
                        data-outline=""
                        fill="none"
                        stroke={palette.focusBacking}
                        strokeWidth="4"
                        opacity="0.9"
                        strokeLinejoin="round"
                    />
                    <path
                        data-outline=""
                        fill="none"
                        stroke={palette.focus}
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />
                </svg>
            )}
        </div>
    )
}
