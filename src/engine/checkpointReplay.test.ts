// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { checkpointReplay } from './checkpointReplay'
import type { Frame } from './types'

const frame = (index: number, value: number): Frame<number> => ({
    index,
    state: value,
    event: 'move',
    explanation: '',
    activeLines: [],
    metrics: [],
})
it('retains every index with sparse checkpoints and a bounded evictable frame cache', async () => {
    let applications = 0
    const steps = Array.from({ length: 1024 }, (_, i) => (state: number) => {
        applications++
        return frame(i + 1, state + i + 1)
    })
    const yieldControl = vi.fn(async () => {})
    const replay = await checkpointReplay(frame(0, 0), steps, () => {}, {
        checkpointInterval: 16,
        cacheSize: 2,
        chunkSize: 64,
        yieldControl,
    })
    expect(yieldControl).toHaveBeenCalledTimes(15)
    expect(replay.length).toBe(1025)
    for (const index of [1024, 0, 981, 32, 1000, 1, 33, 63, 17, 999])
        expect((await replay.frame(index))!.state).toBe((index * (index + 1)) / 2)
    const before = applications
    await replay.frame(999)
    expect(applications).toBe(before)
    await replay.frame(995)
    await replay.frame(994)
    await replay.frame(999)
    expect(applications).toBeGreaterThan(before)
    for (const index of [-1, 1025, 1.5, NaN]) expect(await replay.frame(index)).toBeNull()
})
it('stops chunked verification promptly after cancellation', async () => {
    let cancelled = false,
        checks = 0
    const steps = Array.from({ length: 1000 }, (_, i) => () => frame(i + 1, i + 1))
    await expect(
        checkpointReplay(
            frame(0, 0),
            steps,
            () => {
                checks++
            },
            {
                chunkSize: 8,
                cancelled: () => cancelled,
                yieldControl: async () => {
                    cancelled = true
                },
            },
        ),
    ).rejects.toThrow('cancelled')
    expect(checks).toBe(9)
})
