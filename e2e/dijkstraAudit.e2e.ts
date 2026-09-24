import { expect, test } from '@playwright/test'

test('Dijkstra worker replay agrees with eager search on uniform and weighted grids', async ({
    page,
}) => {
    await page.goto('/')
    const results = await page.evaluate(async () => {
        const load = new Function('path', 'return import(path)') as (path: string) => Promise<any>
        const { createGrid, gridDefaults, runGrid } = await load('/src/algorithms/grid/grid.ts')
        const { workerTrace } = await load('/src/engine/workerTrace.ts')
        const cases = [
            { ...gridDefaults, width: 5, depth: 4, density: 0, seed: 17 },
            {
                ...gridDefaults,
                width: 8,
                depth: 7,
                density: 0.17,
                seed: 712,
                weightMode: 'terrain',
                diagonal: true,
            },
        ]
        const comparisons = []
        for (const params of cases) {
            const environment = createGrid(params)
            const eager = runGrid('dijkstra', params, environment)
            const source = workerTrace({ kind: 'grid', algorithm: 'dijkstra', params, environment })
            try {
                await new Promise<void>((resolve, reject) => {
                    const timer = setTimeout(
                        () => reject(new Error('Worker did not finish')),
                        12000,
                    )
                    const check = () => {
                        if (source.snapshot().status === 'generating') return
                        clearTimeout(timer)
                        unsubscribe()
                        resolve()
                    }
                    const unsubscribe = source.subscribe(check)
                    check()
                })
                const snapshot = source.snapshot()
                const indices = [0, Math.floor(eager.frames.length / 2), eager.frames.length - 1]
                const samples = await Promise.all(indices.map((index) => source.frame(index)))
                comparisons.push({
                    eagerOutcome: eager.outcome,
                    workerOutcome: snapshot.outcome,
                    eagerCount: eager.frames.length,
                    workerCount: snapshot.total,
                    samplesMatch: samples.every((frame, index) => {
                        const expected = eager.frames[indices[index]]
                        return (
                            !!frame &&
                            frame.index === expected.index &&
                            frame.event === expected.event &&
                            frame.explanation === expected.explanation &&
                            JSON.stringify(frame.metrics) === JSON.stringify(expected.metrics) &&
                            JSON.stringify(frame.activeLines) ===
                                JSON.stringify(expected.activeLines) &&
                            JSON.stringify(frame.state.environment) ===
                                JSON.stringify(expected.state.environment) &&
                            frame.state.current === expected.state.current &&
                            JSON.stringify(frame.state.frontier) ===
                                JSON.stringify(expected.state.frontier) &&
                            JSON.stringify(frame.state.visited) ===
                                JSON.stringify(expected.state.visited) &&
                            JSON.stringify(frame.state.path) ===
                                JSON.stringify(expected.state.path) &&
                            JSON.stringify(frame.state.scores) ===
                                JSON.stringify(expected.state.scores)
                        )
                    }),
                    eagerSettled: eager.frames
                        .filter((frame: any) => frame.event === 'visit')
                        .map((frame: any) => frame.state.scores[frame.state.current].g),
                    workerSettled: await Promise.all(
                        eager.frames
                            .filter((frame: any) => frame.event === 'visit')
                            .map((frame: any) => source.frame(frame.index)),
                    ).then((frames) =>
                        frames.map((frame: any) => frame.state.scores[frame.state.current].g),
                    ),
                    eagerCost: eager.frames.at(-1)?.state.scores[environment.goal]?.g ?? null,
                    workerCost:
                        (await source.frame(eager.frames.length - 1))?.state.scores[
                            environment.goal
                        ]?.g ?? null,
                })
            } finally {
                source.dispose()
            }
        }
        return comparisons
    })
    expect(results).toHaveLength(2)
    for (const result of results) {
        expect(result.workerOutcome).toBe(result.eagerOutcome)
        expect(result.workerCount).toBe(result.eagerCount)
        expect(result.samplesMatch).toBe(true)
        expect(result.workerSettled).toEqual(result.eagerSettled)
        expect(result.workerCost).toBe(result.eagerCost)
        for (let index = 1; index < result.workerSettled.length; index++)
            expect(result.workerSettled[index]).toBeGreaterThanOrEqual(
                result.workerSettled[index - 1] - 1e-9,
            )
    }
})
