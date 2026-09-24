import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { RegisteredAlgorithm } from '../engine/registry'
import type { Frame } from '../engine/types'
import { scenePalette, type Theme } from '../visual/scenePalette'

export type CameraCommand = { preset: 'perspective' | 'top' | 'side'; revision: number }

function CameraRig({ command, algorithmId }: { command: CameraCommand; algorithmId: string }) {
    const controls = useRef<OrbitControlsImpl>(null)
    const { camera } = useThree()
    useEffect(() => {
        const distance = algorithmId === 'rrt' ? 13 : algorithmId === 'gradient-descent' ? 11 : 21
        const targetY = algorithmId === 'gradient-descent' ? 1 : 0
        const position: [number, number, number] =
            command.preset === 'top'
                ? [0, distance, 0.01]
                : command.preset === 'side'
                  ? [0, targetY + distance * 0.35, distance]
                  : [distance * 0.7, targetY + distance * 0.72, distance * 0.7]
        camera.position.set(...position)
        camera.lookAt(0, targetY, 0)
        controls.current?.target.set(0, targetY, 0)
        controls.current?.update()
    }, [command, algorithmId, camera])
    return (
        <OrbitControls ref={controls} makeDefault enableDamping minDistance={3} maxDistance={45} />
    )
}

export default function VisualizationCanvas({
    algorithm,
    frame,
    onSelect,
    selectedId,
    cameraCommand,
    reducedMotion,
    theme,
}: {
    algorithm: RegisteredAlgorithm
    frame: Frame<any>
    onSelect: (id: string | null) => void
    selectedId: string | null
    cameraCommand: CameraCommand
    reducedMotion: boolean
    theme: Theme
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
                <CameraRig command={cameraCommand} algorithmId={algorithm.meta.id} />
                <Suspense fallback={null}>
                    <Renderer
                        key={algorithm.meta.id}
                        state={frame.state}
                        onSelect={onSelect}
                        selectedId={selectedId}
                        reducedMotion={reducedMotion}
                        theme={theme}
                    />
                </Suspense>
            </Canvas>
        </div>
    )
}
