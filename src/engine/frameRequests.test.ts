import { expect, it, vi } from 'vitest'
import { FrameRequests } from './frameRequests'
import { eagerTrace } from './trace'
import type { Frame } from './types'
const frame = (index: number): Frame<number> => ({
    state: index,
    index,
    activeLines: [],
    event: '',
    explanation: '',
    metrics: [],
})
it('discards obsolete asynchronous seeks including repeated target indices and replacement', async () => {
    const source = eagerTrace({ frames: [frame(0)], outcome: 'success' })
    const requests = new FrameRequests(),
        publish = vi.fn()
    const releases: (() => void)[] = []
    for (const index of [1, 2, 1])
        requests.request(
            source,
            index,
            () => new Promise((resolve) => releases.push(() => resolve(frame(index)))),
            publish,
        )
    releases[0]()
    releases[1]()
    await Promise.resolve()
    expect(publish).not.toHaveBeenCalled()
    releases[2]()
    await Promise.resolve()
    expect(publish).toHaveBeenCalledExactlyOnceWith(frame(1))
    requests.request(
        source,
        3,
        () => new Promise((resolve) => releases.push(() => resolve(frame(3)))),
        publish,
    )
    requests.clear()
    releases[3]()
    await Promise.resolve()
    expect(publish).toHaveBeenCalledTimes(1)
})
