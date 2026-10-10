import { expect, test } from '@playwright/test'
test('changing one Backtracking input retains other runs, worker identities and cancellation', async ({
    page,
}) => {
    test.setTimeout(120000)
    const workers: string[] = []
    page.on('worker', (worker) => workers.push(worker.url()))
    await page.goto('/#/algorithm/rubiks-cube?scrambleLength=0&seed=42')
    await page.getByRole('button', { name: 'Compare topic' }).click()
    const cards = page.locator('.comparison-card')
    await expect(cards).toHaveCount(5)
    for (let i = 0; i < 5; i++)
        await expect(cards.nth(i)).toContainText('Status Completed', { timeout: 45000 })
    const before = workers.length,
        cubeSettings = page.getByRole('region', { name: 'Rubik’s Cube settings' })
    await cubeSettings.getByRole('combobox', { name: 'Cube size' }).selectOption('4')
    await expect(cards.nth(2)).toContainText('4×4')
    expect(workers).toHaveLength(before)
    const length = cubeSettings.getByRole('spinbutton', { name: 'Scramble length', exact: true })
    await length.fill('5')
    await length.blur()
    await expect(cards.nth(2)).toContainText('5 scramble moves')
    await expect(cards.nth(2)).toContainText('Status Completed', { timeout: 45000 })
    expect(workers).toHaveLength(before + 1)
    for (const i of [0, 1, 3, 4]) await expect(cards.nth(i)).toContainText('Status Completed')
    await page
        .getByRole('tablist', { name: 'Comparison algorithm' })
        .getByRole('tab', { name: 'Square-1', exact: true })
        .click()
    const seed = page
        .getByRole('region', { name: 'Square-1 settings' })
        .getByRole('spinbutton', { name: 'Random seed', exact: true })
    await seed.fill('123')
    await seed.blur()
    await page.getByRole('button', { name: 'Cancel generation' }).click()
    await expect(cards.nth(3)).toContainText('Status Cancelled')
    expect(workers).toHaveLength(before + 2)
    const cubeSeed = cubeSettings.getByRole('spinbutton', { name: 'Random seed', exact: true })
    await cubeSeed.fill('43')
    await cubeSeed.blur()
    await expect(cards.nth(2)).toContainText('seed 43')
    await expect(cards.nth(2)).toContainText('Status Completed', { timeout: 45000 })
    expect(workers).toHaveLength(before + 3)
    await expect(cards.nth(3)).toContainText('Status Cancelled')
    await page
        .getByRole('tablist', { name: 'Comparison algorithm' })
        .getByRole('tab', { name: 'Rubik’s Cube', exact: true })
        .click()
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.getByRole('region', { name: 'Cube notation and selection' })).toHaveAttribute(
        'data-facelets',
        'U'.repeat(16) +
            'R'.repeat(16) +
            'F'.repeat(16) +
            'D'.repeat(16) +
            'L'.repeat(16) +
            'B'.repeat(16),
    )
})
for (const width of [1440, 390])
    test(`Square-1 solves rigid wedges and replays legal slices at ${width}px`, async ({
        page,
    }, testInfo) => {
        test.setTimeout(120000)
        const errors: string[] = []
        page.on('pageerror', (error) => errors.push(error.message))
        await page.setViewportSize({ width, height: 900 })
        await page.emulateMedia({ reducedMotion: width === 390 ? 'reduce' : 'no-preference' })
        await page.goto('/#/algorithm/square-one?scrambleLength=20&seed=42')
        await expect(
            page.getByRole('heading', {
                name: 'Square-1 — Shape & Permutation Search',
                exact: true,
            }),
        ).toBeVisible()
        const details = page.getByRole('region', { name: 'Square-1 notation and selection' })
        await expect(details).toHaveAttribute('data-pieces', '18')
        await expect(details).toHaveAttribute('data-solved', 'false')
        await expect(page.getByLabel('Inspect Square-1 piece').locator('option')).toHaveCount(19)
        for (let id = 0; id < 18; id++)
            await page.getByLabel('Inspect Square-1 piece').selectOption(String(id))
        await page.getByLabel('Inspect Square-1 piece').selectOption('')
        const scramble = await page.getByTestId('square-scramble').innerText(),
            original = await details.getAttribute('data-state')
        await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0, {
            timeout: 45000,
        })
        await page.screenshot({
            path: testInfo.outputPath(`square-${width}-scrambled.png`),
            fullPage: true,
        })
        await page.getByRole('button', { name: 'Next step' }).click()
        const solution = await page.getByTestId('square-solution').innerText()
        await page.getByLabel('Execution speed').selectOption('0.25')
        await page.getByRole('button', { name: 'Next step' }).click()
        await expect(details).toContainText('1 solution operations applied')
        await page.getByRole('button', { name: 'Previous step' }).click()
        await expect(details).toHaveAttribute('data-state', original!)
        // The next slice is interrupted by a seek, which must replace it exactly.
        await page.getByLabel('Execution timeline').fill('3')
        await page.getByRole('button', { name: 'Restart', exact: true }).click()
        await expect(details).toHaveAttribute('data-state', original!)
        await page.getByRole('button', { name: 'Last step' }).click()
        await expect(details).toHaveAttribute('data-solved', 'true')
        await page.screenshot({
            path: testInfo.outputPath(`square-${width}-solved.png`),
            fullPage: true,
        })
        await page.getByRole('button', { name: 'Restart', exact: true }).click()
        await page.getByLabel('Execution speed').selectOption('32')
        await page.getByRole('button', { name: 'Play', exact: true }).click()
        await expect(details).toHaveAttribute('data-solved', 'true', { timeout: 15000 })
        await page.reload()
        await expect(page.getByTestId('square-scramble')).toHaveText(scramble)
        await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0, {
            timeout: 45000,
        })
        await page.getByRole('button', { name: 'Next step' }).click()
        await expect(page.getByTestId('square-solution')).toHaveText(solution)
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true)
        expect(errors).toEqual([])
    })
test('Square-1 short, long and maximum inputs restore the middle layer and exact piece state', async ({
    page,
}) => {
    test.setTimeout(150000)
    for (const scrambleLength of [5, 60, 100]) {
        await page.goto(`/#/algorithm/square-one?scrambleLength=${scrambleLength}&seed=123`)
        await expect(page.getByLabel('Scramble length', { exact: true })).toHaveValue(
            String(scrambleLength),
        )
        const details = page.getByRole('region', { name: 'Square-1 notation and selection' })
        await expect(details).toHaveAttribute('data-solved', 'false')
        await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0, {
            timeout: 45000,
        })
        await page.getByRole('button', { name: 'Last step' }).click()
        await expect(details).toHaveAttribute('data-solved', 'true')
        await expect(details).toHaveAttribute('data-pieces', '18')
        expect(JSON.parse((await details.getAttribute('data-state'))!).middle).toBe(0)
    }
})
test('Square-1 cancellation, zero-input preset, validation and five-member comparison are independent', async ({
    page,
}) => {
    test.setTimeout(60000)
    await page.goto('/#/algorithm/square-one?scrambleLength=100&seed=123')
    await page.getByRole('button', { name: 'Cancel generation' }).click()
    await expect(page.locator('.terminal-message')).toContainText('Cancelled')
    await page.getByLabel('Preset', { exact: true }).selectOption('Already solved')
    await expect(
        page.getByRole('region', { name: 'Square-1 notation and selection' }),
    ).toHaveAttribute('data-solved', 'true')
    await expect(page.getByLabel('Random seed', { exact: true })).toHaveValue('123')
    await page.getByRole('button', { name: 'Compare topic' }).click()
    const comparison = page.getByRole('region', { name: 'Topic comparison' }),
        cards = comparison.locator('.comparison-card')
    await expect(cards).toHaveCount(5)
    await expect(comparison).toContainText('Square-1; 0 scramble blocks; seed 123')
    await expect(cards.nth(0)).toContainText('Mirror Cube')
    await expect(cards.nth(1)).toContainText('N-Queens')
    await expect(cards.nth(2)).toContainText('Rubik')
    await expect(cards.nth(3)).toContainText('Square-1')
    await expect(cards.nth(4)).toContainText('Sudoku')
    await page.goto('/#/algorithm/square-one?scrambleLength=101&seed=42')
    await expect(page.getByLabel('Scramble length', { exact: true })).toHaveValue('20')
    await expect(page.locator('.notice').filter({ hasText: 'Scramble length must' })).toBeVisible()
})
