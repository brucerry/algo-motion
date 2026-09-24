export const SPEEDS = [0.25, 0.5, 1, 2, 4] as const

export function clampFrame(index: number, count: number): number {
    if (count < 1 || !Number.isFinite(index)) return 0
    return Math.min(count - 1, Math.max(0, Math.trunc(index)))
}

export function advanceFrame(index: number, count: number, delta: number): number {
    return clampFrame(index + delta, count)
}
