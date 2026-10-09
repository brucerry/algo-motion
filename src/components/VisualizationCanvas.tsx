import { Suspense, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { RegisteredAlgorithm } from '../engine/registry'
import type { Frame, SceneProps } from '../engine/types'
import { scenePalette, type Theme } from '../visual/scenePalette'
import { OrbitControls } from '../visual/vendor/OrbitControls.js'

export type CameraCommand = { preset: 'perspective' | 'top' | 'side'; revision: number }

function CameraRig({
    command,
    algorithm,
    state,
    reducedMotion,
}: {
    command: CameraCommand
    algorithm: RegisteredAlgorithm
    state: unknown
    reducedMotion: boolean
}) {
    const { camera, gl, invalidate, get, set } = useThree()
    const framing = algorithm.cameraForState?.(state) ?? algorithm.meta.camera
    // A fresh controller clears residual drag/zoom/pan momentum on a camera reset.
    const controlsKey = JSON.stringify([command, algorithm.meta.id, framing, reducedMotion])
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
        reducedMotion,
        framing?.distance,
        framing?.targetY,
        framing?.perspective?.[0],
        framing?.perspective?.[1],
        framing?.perspective?.[2],
    ])
    useFrame(() => controls.update(), -1)
    return null
}

export default function VisualizationCanvas({
    algorithm,
    frame,
    onSelect,
    selectedId,
    cameraCommand,
    reducedMotion,
    theme,
    playback,
}: {
    algorithm: RegisteredAlgorithm
    frame: Frame<any>
    onSelect: (id: string | null) => void
    selectedId: string | null
    cameraCommand: CameraCommand
    reducedMotion: boolean
    theme: Theme
    playback?: SceneProps<unknown>['playback']
}) {
    const Renderer = algorithm.renderer
    const palette = scenePalette(theme)
    return (
        <div
            className="canvas-host"
            id="visualization"
            role="group"
            aria-label={`${algorithm.meta.name} 3D visualization`}
        >
            <Canvas
                camera={{ position: [14, 16, 14], fov: 48 }}
                dpr={[1, 1.8]}
                onPointerMissed={() => onSelect(null)}
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
                />
                <Suspense fallback={null}>
                    <Renderer
                        key={algorithm.meta.id}
                        state={frame.state}
                        onSelect={onSelect}
                        selectedId={selectedId}
                        reducedMotion={reducedMotion}
                        theme={theme}
                        playback={playback}
                    />
                </Suspense>
            </Canvas>
        </div>
    )
}
