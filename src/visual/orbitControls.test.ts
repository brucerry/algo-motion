import { afterEach, describe, expect, it } from 'vitest'
import { Euler, PerspectiveCamera, Quaternion, Vector3 } from 'three'
import { OrbitControls as OriginalOrbitControls } from 'three-stdlib'
import { OrbitControls } from './vendor/OrbitControls.js'

const cleanup: (() => void)[] = []
afterEach(() => {
    cleanup.splice(0).forEach((dispose) => dispose())
})

function setup(original = false, screenRelative = false) {
    const camera = new PerspectiveCamera(48, 2)
    camera.position.set(8, 12, 10)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()
    const element = document.createElement('div')
    Object.defineProperties(element, {
        clientHeight: { value: 400 },
        clientWidth: { value: 800 },
        releasePointerCapture: { value: () => {} },
    })
    document.body.append(element)
    const controls = original ? new OriginalOrbitControls(camera) : new OrbitControls(camera)
    if (controls instanceof OrbitControls) {
        controls.enableFullRotation = true
        controls.screenRelativeRotation = screenRelative
        controls.minPolarAngle = -Infinity
        controls.maxPolarAngle = Infinity
    }
    controls.enableDamping = true
    controls.minDistance = 0.15
    controls.maxDistance = 100
    controls.connect(element)
    controls.update()
    camera.updateMatrixWorld()
    cleanup.push(() => {
        controls.dispose()
        element.remove()
    })
    return { camera, controls, element }
}

function pointer(element: HTMLElement | Document, type: string, x: number, y: number, button = 0) {
    const event = new MouseEvent(type, { clientX: x, clientY: y, button })
    Object.assign(event, { pointerId: 1, pointerType: 'mouse' })
    element.dispatchEvent(event)
}

describe('unrestricted orbit controls', () => {
    it('matches the original drag, damping, wheel zoom, and pan response before crossing a pole', () => {
        const original = setup(true)
        const extended = setup()
        const compare = () => {
            expect(extended.camera.position.distanceTo(original.camera.position)).toBeLessThan(1e-9)
            expect(extended.camera.quaternion.angleTo(original.camera.quaternion)).toBeLessThan(
                1e-7,
            )
            expect(extended.controls.target.distanceTo(original.controls.target)).toBeLessThan(1e-9)
            original.camera.updateMatrixWorld()
            extended.camera.updateMatrixWorld()
        }
        pointer(original.element, 'pointerdown', 200, 200)
        pointer(extended.element, 'pointerdown', 200, 200)
        for (let i = 1; i <= 8; i++) {
            pointer(document, 'pointermove', 200 + i * 6, 200 - i * 2)
            compare()
            original.controls.update()
            extended.controls.update()
            compare()
        }
        pointer(document, 'pointerup', 248, 184)
        for (let i = 0; i < 120; i++) {
            original.controls.update()
            extended.controls.update()
            compare()
        }
        for (const deltaY of [-100, -100, 100, 100]) {
            const before = extended.controls.getDistance()
            for (const scene of [original, extended])
                scene.element.dispatchEvent(new WheelEvent('wheel', { deltaY, cancelable: true }))
            expect(extended.controls.getDistance() / before).toBeCloseTo(
                deltaY < 0 ? 0.95 : 1 / 0.95,
            )
            compare()
        }
        pointer(original.element, 'pointerdown', 200, 200, 2)
        pointer(extended.element, 'pointerdown', 200, 200, 2)
        for (let i = 1; i <= 8; i++) {
            pointer(document, 'pointermove', 200 + i * 4, 200 + i * 2, 2)
            compare()
            original.controls.update()
            extended.controls.update()
            compare()
        }
        pointer(document, 'pointerup', 232, 216, 2)
    })

    it('crosses both poles continuously and retains multiple vertical turns', () => {
        const { camera, controls, element } = setup(false, true)
        controls.enableDamping = false
        const radius = controls.getDistance()
        const initial = controls.getPolarAngle()
        pointer(element, 'pointerdown', 200, 200)
        let previous = camera.quaternion.clone()
        let inverted = false
        for (let i = 1; i <= 160; i++) {
            pointer(document, 'pointermove', 200, 200 - i * 5)
            expect(camera.quaternion.angleTo(previous)).toBeLessThan(0.08)
            expect(controls.getDistance()).toBeCloseTo(radius)
            inverted ||= camera.up.y < -0.9
            previous.copy(camera.quaternion)
        }
        pointer(document, 'pointerup', 200, -600)
        expect(controls.getPolarAngle() - initial).toBeCloseTo(4 * Math.PI)
        expect(inverted).toBe(true)
    })

    it('reinitializes an external camera preset with no stale vertical angle', () => {
        const { camera, controls } = setup()
        controls.enableDamping = false
        controls.setPolarAngle(Math.PI * 1.5)
        camera.position.set(0, 20, 0.01)
        camera.up.set(0, 1, 0)
        camera.lookAt(new Vector3())
        const expected = camera.quaternion.clone()
        controls.update()
        expect(controls.getPolarAngle()).toBeLessThan(0.001)
        expect(camera.quaternion.angleTo(expected)).toBeLessThan(1e-7)
    })

    it.each([
        ['upright', 0, 0, 0],
        ['upside down', 0, 0, Math.PI],
        ['rolled left', 0, 0, Math.PI / 2],
        ['rolled right', 0, 0, -Math.PI / 2],
        ['top pole', -Math.PI / 2, 0, 0],
        ['bottom pole', Math.PI / 2, 0, 0],
        ['mixed rotations', 1.2, -2.1, 0.8],
    ] as const)('keeps drag direction relative to the view when %s', (_, x, y, z) => {
        const { camera, controls, element } = setup(false, true)
        controls.enableDamping = false
        const orientation = new Quaternion().setFromEuler(new Euler(x, y, z))
        camera.position.set(0, 0, 20).applyQuaternion(orientation)
        camera.up.set(0, 1, 0).applyQuaternion(orientation)
        camera.quaternion.copy(orientation)
        controls.update()
        // Every gesture starts from the newly rotated pose, rather than reusing
        // the world axes or the basis from the first mouse-down.
        for (const [dx, dy] of [
            [-5, 0],
            [5, 0],
            [0, -5],
            [0, 5],
            [-5, -5],
            [5, -5],
        ]) {
            const before = camera.quaternion.clone()
            pointer(element, 'pointerdown', 200, 200)
            pointer(document, 'pointermove', 200 + dx, 200 + dy)
            pointer(document, 'pointerup', 200 + dx, 200 + dy)
            const axis = new Vector3(-dy, -dx, 0).multiplyScalar((2 * Math.PI) / 400)
            const expected = new Quaternion().setFromAxisAngle(
                axis.clone().normalize(),
                axis.length(),
            )
            const relative = before.invert().multiply(camera.quaternion)
            expect(relative.angleTo(expected)).toBeLessThan(1e-7)
            expect(controls.getDistance()).toBeCloseTo(20)
            camera.updateMatrixWorld()
        }
    })

    it('keeps original sensitivity, damping, wheel zoom, and screen pan with view-relative axes', () => {
        const { camera, controls, element } = setup(false, true)
        const before = camera.quaternion.clone()
        pointer(element, 'pointerdown', 200, 200)
        pointer(document, 'pointermove', 195, 200)
        const angularInput = (2 * Math.PI * 5) / 400
        expect(camera.quaternion.angleTo(before)).toBeCloseTo(angularInput * 0.05)
        pointer(document, 'pointerup', 195, 200)
        for (let i = 0; i < 240; i++) controls.update()
        expect(camera.quaternion.angleTo(before)).toBeCloseTo(angularInput, 5)
        const distance = controls.getDistance()
        element.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 }))
        expect(controls.getDistance() / distance).toBeCloseTo(0.95)

        controls.enableDamping = false
        camera.updateMatrixWorld()
        const inverse = camera.quaternion.clone().invert()
        const target = controls.target.clone()
        pointer(element, 'pointerdown', 200, 200, 2)
        pointer(document, 'pointermove', 195, 195, 2)
        pointer(document, 'pointerup', 195, 195, 2)
        const pan = controls.target.clone().sub(target).applyQuaternion(inverse)
        expect(pan.x).toBeGreaterThan(0)
        expect(pan.y).toBeLessThan(0)
        expect(Math.abs(pan.z)).toBeLessThan(1e-10)
    })
})
