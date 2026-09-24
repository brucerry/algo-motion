import { expect, test } from '@playwright/test'

test('a long grid trace completes and old steps remain seekable', async ({ page }) => {
    await page.goto('/#/algorithm/bfs?width=60&depth=60&density=0&seed=42')
    await expect(page.getByRole('heading', { name: 'Breadth-First Search' })).toBeVisible()
    await expect(page.getByLabel('Execution timeline')).toBeVisible()
    await expect(page.locator('.timeline-label strong')).not.toContainText('pending', {
        timeout: 30000,
    })
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.locator('.outcome-badge')).toContainText('Completed')
    const final = Number(await page.getByLabel('Execution timeline').getAttribute('max'))
    expect(final).toBeGreaterThan(3000)
    await page.getByLabel('Execution timeline').fill('100')
    await expect(page.locator('.step-heading h2')).toHaveText('Step 100')
    const firstExplanation = await page.locator('.step-explanation').innerText()
    for (const step of [
        200,
        400,
        600,
        800,
        1000,
        1200,
        1400,
        1600,
        1800,
        2000,
        2200,
        2400,
        2600,
        2800,
        3000,
        3200,
        0,
        final,
        100,
    ]) {
        await page.getByLabel('Execution timeline').fill(String(step))
        await expect(page.locator('.step-heading h2')).toHaveText(`Step ${step}`)
    }
    await expect(page.locator('.step-explanation')).toHaveText(firstExplanation)
})

test('a long queen search can be cancelled without claiming a solution', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
    })
    await page.goto('/#/algorithm/n-queens?size=80')
    await expect(page.getByRole('heading', { name: 'N-Queens Backtracking' })).toBeVisible()
    await expect(page.locator('.timeline-label strong')).toContainText('pending')
    await page.getByRole('button', { name: 'Last step' }).click()
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel generation' }).click()
    await expect(page.locator('.terminal-message')).toContainText('Cancelled')
    await expect(page.locator('.terminal-message')).not.toContainText('Completed')
    await page.getByRole('spinbutton', { name: 'Board size' }).fill('4')
    await page.getByRole('spinbutton', { name: 'Board size' }).blur()
    await expect(page.locator('.timeline-label strong')).not.toContainText('pending')
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.locator('.outcome-badge')).toContainText('Completed')
    expect(errors).toEqual([])
})

test('comparison keeps each finished search on its own final frame', async ({ page }) => {
    await page.goto('/#/algorithm/bfs?width=35&depth=35&density=0&seed=42')
    await page.getByRole('button', { name: 'Compare searches' }).click()
    const cards = page.locator('.comparison-card')
    await expect(cards).toHaveCount(4)
    await expect(page.locator('.timeline-label strong')).not.toContainText('pending', {
        timeout: 30000,
    })
    await page.getByRole('button', { name: 'Last step' }).click()
    for (const card of await cards.all()) await expect(card).not.toContainText('pending')
    await cards.nth(1).click()
    await expect(page.getByRole('heading', { name: 'Dijkstra' })).toBeVisible()
})

test('maximum grid generation yields to the browser and supports cancellation', async ({
    page,
}) => {
    await page.goto('/')
    const result = await page.evaluate(async () => {
        const path = '/src/engine/workerTrace.ts'
        const { workerTrace } = await import(/* @vite-ignore */ path)
        const source = workerTrace({
            kind: 'grid',
            algorithm: 'bfs',
            params: {
                width: 240,
                depth: 240,
                density: 0,
                diagonal: false,
                seed: 42,
                weightMode: 'uniform',
                heuristic: 'manhattan',
                heuristicWeight: 1,
            },
        })
        let ticks = 0
        const timer = setInterval(() => ticks++, 10)
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('No worker progress')), 15000)
            const unsubscribe = source.subscribe(() => {
                if (source.snapshot().available <= 2000) return
                clearTimeout(timeout)
                unsubscribe()
                resolve()
            })
        })
        const before = source.snapshot()
        source.cancel()
        const first = await source.frame(0)
        const middle = await source.frame(1000)
        clearInterval(timer)
        source.dispose()
        return { ticks, before, first: first?.index, middle: middle?.index }
    })
    expect(result.ticks).toBeGreaterThan(2)
    expect(result.before.available).toBeGreaterThan(2000)
    expect(result.before.total).toBeNull()
    expect(result.first).toBe(0)
    expect(result.middle).toBe(1000)
})
