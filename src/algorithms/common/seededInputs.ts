import { createRandom, deriveSeed } from '../../engine/seededRandom'

function boundedInteger(value: number, min: number, max: number, name: string) {
    if (!Number.isInteger(value) || value < min || value > max)
        throw new Error(`${name} must be an integer from ${min} to ${max}.`)
}

export function seededValues(
    count: number,
    seed: number,
    salt: string,
    min = 1,
    max = 20,
): number[] {
    boundedInteger(count, 0, 160, 'Count')
    boundedInteger(min, -100, 100, 'Minimum')
    boundedInteger(max, min, 320, 'Maximum')
    const random = createRandom(deriveSeed(seed, salt))
    return Array.from({ length: count }, () => random.integer(min, max))
}

export function seededUniqueValues(count: number, seed: number, salt: string): number[] {
    boundedInteger(count, 0, 120, 'Count')
    const values = Array.from({ length: count <= 24 ? 99 : 999 }, (_, index) => index + 1)
    const random = createRandom(deriveSeed(seed, salt))
    for (let index = values.length - 1; index > 0; index--) {
        const other = random.integer(0, index)
        ;[values[index], values[other]] = [values[other], values[index]]
    }
    return values.slice(0, count)
}

export type Interval = { id: number; start: number; end: number }

export function seededIntervals(count: number, seed: number): Interval[] {
    boundedInteger(count, 0, 120, 'Count')
    const starts = createRandom(deriveSeed(seed, 'interval-starts'))
    const lengths = createRandom(deriveSeed(seed, 'interval-lengths'))
    return Array.from({ length: count }, (_, id) => {
        const start = starts.integer(0, count <= 20 ? 17 : Math.ceil(count * 1.5))
        return { id, start, end: start + lengths.integer(1, 6) }
    })
}
