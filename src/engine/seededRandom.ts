export type RandomSource = {
    next: () => number
    between: (min: number, max: number) => number
    integer: (min: number, max: number) => number
}

export function deriveSeed(seed: number, salt: string): number {
    let hash = (2166136261 ^ (seed >>> 0)) >>> 0
    for (let i = 0; i < salt.length; i++) {
        hash = Math.imul(hash ^ salt.charCodeAt(i), 16777619) >>> 0
    }
    return hash
}

export function createRandom(seed: number): RandomSource {
    let state = seed >>> 0
    const next = () => {
        state = (state + 0x6d2b79f5) >>> 0
        let t = state
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    return {
        next,
        between: (min, max) => min + next() * (max - min),
        integer: (min, max) => Math.floor(min + next() * (max - min + 1)),
    }
}
