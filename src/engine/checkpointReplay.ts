import type { Frame } from './types'
import type { IndexedReplay } from './solutionTrace'

export type ReplayStep<S> = (previous: S) => Frame<S>
export type ReplayOptions = {
    checkpointInterval?: number
    cacheSize?: number
    chunkSize?: number
    cancelled?: () => boolean
    yieldControl?: () => Promise<void>
}

export function checkpointReplay<S>(
    initial: Frame<S>,
    steps: ReplayStep<S>[],
    verify: (frame: Frame<S>) => void,
    options: ReplayOptions = {},
): IndexedReplay<S> | Promise<IndexedReplay<S>> {
    const stride = options.checkpointInterval ?? 32,
        capacity = options.cacheSize ?? 64,
        chunk = options.chunkSize ?? 64
    if (![stride, capacity, chunk].every((n) => Number.isInteger(n) && n > 0))
        throw new Error('Invalid replay storage settings.')
    const cancelled = options.cancelled ?? (() => false)
    const yieldControl =
        options.yieldControl ?? (() => new Promise<void>((resolve) => setTimeout(resolve, 0)))
    const checkpoints = new Map<number, Frame<S>>([[0, initial]])
    const cache = new Map<number, Frame<S>>()
    let current = initial,
        next = 0
    verify(initial)
    const advance = () => {
        if (cancelled()) throw new Error('Solution verification cancelled.')
        const end = Math.min(steps.length, next + chunk)
        while (next < end) {
            current = steps[next](current.state)
            next++
            if (current.index !== next) throw new Error('Replay step index is inconsistent.')
            verify(current)
            if (next % stride === 0 || next === steps.length) checkpoints.set(next, current)
        }
    }
    const result = (): IndexedReplay<S> => ({
        length: steps.length + 1,
        frame: async (index) => {
            if (!Number.isInteger(index) || index < 0 || index > steps.length) return null
            const saved = checkpoints.get(index) ?? cache.get(index)
            if (saved) {
                if (cache.has(index)) {
                    cache.delete(index)
                    cache.set(index, saved)
                }
                return saved
            }
            const start = Math.floor(index / stride) * stride
            let value = checkpoints.get(start)!
            for (let i = start; i < index; i++) value = steps[i](value.state)
            cache.set(index, value)
            if (cache.size > capacity) cache.delete(cache.keys().next().value!)
            return value
        },
    })
    advance()
    if (next === steps.length) return result()
    return (async () => {
        while (next < steps.length) {
            await yieldControl()
            advance()
        }
        return result()
    })()
}
