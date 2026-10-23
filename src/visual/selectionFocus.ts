import { Box3, Matrix4, Object3D, Quaternion, Vector3 } from 'three'

export type PieceFocus = {
    id: string
    owner: Object3D
    center: Vector3
    bounds: Box3
    normals: Vector3[]
    matrix: Matrix4
    edges: Float32Array
    edgeNormals?: Float32Array
}

// One canvas owns one lease. An old renderer's cleanup cannot clear a newer piece.
export class SelectionFocusBridge {
    selectedId: string | null = null
    current: PieceFocus | null = null
    revision = 0
    driving = false
    select(id: string | null) {
        if (id === this.selectedId) return
        this.selectedId = id
        this.current = null
        this.revision++
    }
    publish(piece: PieceFocus) {
        if (piece.id === this.selectedId) this.current = piece
    }
    release(piece: PieceFocus) {
        if (this.current === piece) this.current = null
    }
    clear() {
        this.current = null
        this.driving = false
        this.revision++
    }
}

export type FocusMode = 'free' | 'following' | 'returning' | 'held' | 'preset'
export class FocusOwnership {
    mode: FocusMode = 'free'
    playing = false
    held = false
    enabled = false
    private selected = false
    select() {
        this.selected = true
        this.enabled = true
        this.mode = this.held ? 'held' : 'returning'
    }
    clear() {
        this.selected = false
        this.enabled = false
        this.mode = this.held ? 'held' : 'free'
    }
    preset() {
        this.enabled = false
        this.mode = this.held ? 'held' : 'preset'
    }
    play(playing: boolean) {
        const began = playing && !this.playing
        this.playing = playing
        if (!playing) this.mode = this.held ? 'held' : 'free'
        else if (began) {
            this.enabled = this.selected
            this.mode = this.held ? 'held' : this.enabled ? 'returning' : 'free'
        }
    }
    start() {
        this.held = true
        this.mode = 'held'
    }
    end(reducedMotion: boolean) {
        this.held = false
        this.mode = this.playing && this.enabled && !reducedMotion ? 'returning' : 'free'
    }
    stop() {
        this.mode = this.held ? 'held' : 'free'
    }
}

export type FocusComposition = { target: Vector3; direction: Vector3; distance: number }
const up = new Vector3(0, 1, 0)

export function composePieceFocus(
    piece: Pick<PieceFocus, 'center' | 'bounds' | 'normals'>,
    puzzle: Box3,
    aspect: number,
    fov: number,
    distance: number,
    previousDirection?: Vector3,
): FocusComposition {
    const puzzleCenter = puzzle.getCenter(new Vector3())
    const target = puzzleCenter.clone().lerp(piece.center, 0.72)
    const direction = new Vector3()
    for (const normal of piece.normals) direction.add(normal)
    if (direction.lengthSq() < 0.01) direction.copy(piece.center).sub(puzzleCenter)
    if (direction.lengthSq() < 0.01) direction.set(1, 0.7, 1)
    direction.normalize()
    // A face-center view needs an oblique component; keep this choice stable in piece space.
    if (piece.normals.length === 1) {
        const tangent = previousDirection
            ?.clone()
            .addScaledVector(direction, -previousDirection.dot(direction))
        // Retain the established side of a face through turns and pole crossings.
        if (tangent && tangent.lengthSq() > 0.001)
            direction.addScaledVector(tangent.normalize(), 0.38).normalize()
        else {
            const vertical = Math.abs(direction.y) > 0.9 ? new Vector3(1, 0, 0) : up.clone()
            const side = direction.clone().cross(vertical).normalize()
            direction.addScaledVector(vertical, 0.3).addScaledVector(side, 0.24).normalize()
        }
    }
    const radius = piece.bounds.getSize(new Vector3()).length() / 2
    const puzzleRadius = puzzle.getSize(new Vector3()).length() / 2
    const context = Math.min(puzzleRadius * 0.3, 1.2)
    const fit = (radius + context) / Math.tan((fov * Math.PI) / 360) / Math.min(1, aspect)
    // Conservative external sphere guarantees an unobstructed camera path around the puzzle.
    const clearance = puzzleRadius + target.distanceTo(puzzleCenter) + 0.35
    return { target, direction, distance: Math.max(distance, fit, clearance) }
}

// Analytic mildly underdamped response: frame rate does not multiply spring acceleration.
export function elasticProgress(seconds: number): number {
    const frequency = 17,
        damping = 0.76
    const decay = frequency * damping
    const oscillation = frequency * Math.sqrt(1 - damping * damping)
    return (
        1 -
        Math.exp(-decay * Math.max(0, seconds)) *
            (Math.cos(oscillation * seconds) +
                (decay / oscillation) * Math.sin(oscillation * seconds))
    )
}

export function orbitDirection(from: Vector3, to: Vector3, progress: number): Vector3 {
    const rotation = new Quaternion().setFromUnitVectors(
        from.clone().normalize(),
        to.clone().normalize(),
    )
    return from
        .clone()
        .normalize()
        .applyQuaternion(new Quaternion().slerp(rotation, progress))
        .normalize()
}

export type ContourSample = { path: string; time: number }
export class OutlineHistory {
    samples: ContourSample[] = []
    last: Float32Array | null = null
    lastTime = -Infinity
    clear() {
        this.samples = []
        this.last = null
        this.lastTime = -Infinity
    }
    update(points: Float32Array, path: string, time: number, enabled: boolean) {
        this.samples = this.samples.filter((sample) => time - sample.time < 0.55)
        const moved = this.last && points.some((value, i) => Math.abs(value - this.last![i]) > 0.25)
        if (enabled && moved && time - this.lastTime >= 1 / 30) {
            this.samples.push({ path, time })
            if (this.samples.length > 12) this.samples.shift()
            this.lastTime = time
        }
        if (!this.last || this.last.length !== points.length) this.last = points.slice()
        else this.last.set(points)
    }
}
