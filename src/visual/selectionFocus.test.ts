import { describe, expect, it } from 'vitest'
import { Box3, Group, Matrix4, Vector3 } from 'three'
import {
    composePieceFocus,
    elasticProgress,
    FocusOwnership,
    orbitDirection,
    OutlineHistory,
    SelectionFocusBridge,
} from './selectionFocus'

describe('selected-piece camera ownership', () => {
    it('leaves unselected playback free, including Play during a held gesture', () => {
        const owner = new FocusOwnership()
        owner.play(true)
        expect(owner.mode).toBe('free')
        expect(owner.enabled).toBe(false)
        owner.play(false)
        owner.start()
        owner.play(true)
        expect(owner.mode).toBe('held')
        owner.end(false)
        expect(owner.mode).toBe('free')
        expect(owner.enabled).toBe(false)
    })
    it('does not reactivate a cleared selection on release or subsequent Play', () => {
        const owner = new FocusOwnership()
        owner.select()
        owner.play(true)
        owner.start()
        owner.clear()
        owner.end(false)
        expect(owner.mode).toBe('free')
        owner.play(false)
        owner.preset()
        owner.play(true)
        expect(owner.mode).toBe('free')
        expect(owner.enabled).toBe(false)
    })
    it('keeps held input direct across Play and only returns on active release', () => {
        const owner = new FocusOwnership()
        owner.select()
        owner.start()
        owner.play(true)
        expect(owner.mode).toBe('held')
        owner.end(false)
        expect(owner.mode).toBe('returning')
        owner.start()
        owner.play(false)
        owner.end(false)
        expect(owner.mode).toBe('free')
        owner.play(true)
        owner.stop()
        expect(owner.mode).toBe('free')
    })
    it('suspends presets until explicit reactivation and respects reduced motion', () => {
        const owner = new FocusOwnership()
        owner.select()
        owner.play(true)
        owner.preset()
        owner.start()
        owner.end(false)
        expect(owner.mode).toBe('free')
        owner.play(false)
        owner.play(true)
        expect(owner.mode).toBe('returning')
        owner.start()
        owner.end(true)
        expect(owner.mode).toBe('free')
        owner.clear()
        expect(owner.enabled).toBe(false)
    })
    it('rejects obsolete identities and leases, including temporary-group transforms', () => {
        const bridge = new SelectionFocusBridge()
        const parent = new Group(),
            child = new Group()
        parent.add(child)
        child.position.set(1, 0, 0)
        parent.rotation.z = Math.PI / 2
        child.updateWorldMatrix(true, false)
        const record = {
            id: 'a',
            owner: child,
            center: new Vector3().setFromMatrixPosition(child.matrixWorld),
            bounds: new Box3(),
            normals: [],
            matrix: new Matrix4(),
            edges: new Float32Array(),
        }
        bridge.select('a')
        bridge.publish(record)
        expect(bridge.current!.center.y).toBeCloseTo(1)
        const replacement = { ...record }
        bridge.publish(replacement)
        bridge.release(record)
        expect(bridge.current).toBe(replacement)
        bridge.select('b')
        bridge.publish(record)
        expect(bridge.current).toBeNull()
    })
})

describe('physical focus composition and safe elastic paths', () => {
    const puzzle = new Box3(new Vector3(-2.5, -2.5, -2.5), new Vector3(2.5, 2.5, 2.5))
    it.each([
        [new Vector3(-2, 0, 0), [new Vector3(-1, 0, 0)]],
        [new Vector3(2, 2, 2), [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)]],
        [new Vector3(0.1, -0.9, 1.1), [new Vector3(0, -1, 0), new Vector3(0, 0, 1)]],
    ])(
        'frames far-side, corner and wedge geometry externally on narrow viewports',
        (center, normals) => {
            const bounds = new Box3().setFromCenterAndSize(
                center as Vector3,
                new Vector3(0.3, 0.9, 1.4),
            )
            const result = composePieceFocus(
                { center: center as Vector3, normals: normals as Vector3[], bounds },
                puzzle,
                0.7,
                48,
                1,
            )
            expect(result.direction.dot((center as Vector3).clone().normalize())).toBeGreaterThan(
                0.5,
            )
            const camera = result.target.clone().addScaledVector(result.direction, result.distance)
            expect(puzzle.containsPoint(camera)).toBe(false)
            const radius = bounds.getSize(new Vector3()).length() / 2
            expect(radius / result.distance).toBeLessThan(Math.tan((24 * Math.PI) / 180) * 0.7)
        },
    )
    it('returns with a small overshoot and a stable outcome at every frame rate', () => {
        const samples = Array.from({ length: 101 }, (_, i) => elasticProgress(i / 100))
        expect(Math.max(...samples)).toBeGreaterThan(1)
        expect(Math.max(...samples)).toBeLessThan(1.1)
        for (const fps of [30, 60, 144]) expect(elasticProgress(fps / fps)).toBeCloseTo(1, 4)
        const from = new Vector3(1, 0, 0),
            to = new Vector3(-1, 0, 0)
        for (const p of samples) expect(orbitDirection(from, to, p).length()).toBeCloseTo(1)
    })
    it('retains the established oblique side through a face crossing the vertical pole', () => {
        let previous: Vector3 | undefined
        for (let angle = 0; angle < Math.PI; angle += 0.01) {
            const normal = new Vector3(Math.sin(angle), Math.cos(angle), 0)
            const center = normal.clone().multiplyScalar(2)
            const bounds = new Box3().setFromCenterAndSize(center, new Vector3(0.9, 0.9, 0.9))
            const composed = composePieceFocus(
                { center, bounds, normals: [normal] },
                puzzle,
                1,
                48,
                8,
                previous,
            )
            if (previous) expect(previous.angleTo(composed.direction)).toBeLessThan(0.03)
            previous = composed.direction
        }
    })
})

it('bounds outline history, ignores rest, and expires camera-only motion completely', () => {
    const history = new OutlineHistory()
    for (let i = 0; i < 100; i++)
        history.update(new Float32Array([i * 3, 0]), `M${i} 0`, i / 30, true)
    expect(history.samples.length).toBeLessThanOrEqual(12)
    history.update(new Float32Array([297, 0]), 'M99 0', 4, true)
    expect(history.samples).toHaveLength(0)
    history.clear()
    expect(history.last).toBeNull()
})
