import { expect, test } from '@playwright/test'
for (const width of [1440, 390])
    test(`Mirror Cube restores its silhouette and replays exact rigid turns at ${width}px`, async ({
        page,
    }, testInfo) => {
        test.setTimeout(90000)
        const errors: string[] = []
        page.on('pageerror', (error) => errors.push(error.message))
        await page.setViewportSize({ width, height: 900 })
        await page.emulateMedia({ reducedMotion: width === 390 ? 'reduce' : 'no-preference' })
        await page.goto('/#/algorithm/mirror-cube?scrambleLength=20&seed=42')
        await expect(
            page.getByRole('heading', { name: 'Mirror Cube — Shape Restoration', exact: true }),
        ).toBeVisible()
        const details = page.getByRole('region', { name: 'Mirror notation and selection' })
        await expect(details).toHaveAttribute('data-pieces', '26')
        await expect(details).toHaveAttribute('data-geometry-solved', 'false')
        const scramble = await page.getByTestId('mirror-scramble').innerText()
        await expect(page.getByLabel('Inspect mirror piece').locator('option')).toHaveCount(27)
        const ids = await page
            .getByLabel('Inspect mirror piece')
            .locator('option')
            .evaluateAll((options) =>
                options.map((o) => (o as HTMLOptionElement).value).filter(Boolean),
            )
        for (const id of ids) await page.getByLabel('Inspect mirror piece').selectOption(id)
        await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0, {
            timeout: 30000,
        })
        await page.getByRole('button', { name: 'Next step' }).click()
        const solution = await page.getByTestId('mirror-solution').innerText()
        await page.getByLabel('Execution speed').selectOption('0.25')
        await page.getByRole('button', { name: 'Next step' }).click()
        await expect(details).toContainText('1 solution face turns applied')
        await page.getByRole('button', { name: 'Previous step' }).click()
        await expect(details).toContainText('0 solution face turns applied')
        await page.getByLabel('Execution timeline').fill('5')
        await page.getByRole('button', { name: 'Last step' }).click()
        await expect(details).toHaveAttribute('data-geometry-solved', 'true')
        await page.screenshot({
            path: testInfo.outputPath(`mirror-${width}-solved.png`),
            fullPage: true,
        })
        await page.getByRole('button', { name: 'Restart', exact: true }).click()
        await expect(details).toHaveAttribute('data-geometry-solved', 'false')
        await page.screenshot({
            path: testInfo.outputPath(`mirror-${width}-scrambled.png`),
            fullPage: true,
        })
        await page.getByLabel('Execution speed').selectOption('32')
        await page.getByRole('button', { name: 'Play', exact: true }).click()
        await expect(details).toHaveAttribute('data-geometry-solved', 'true', { timeout: 10000 })
        await page.reload()
        await expect(page.getByTestId('mirror-scramble')).toHaveText(scramble)
        await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0, {
            timeout: 30000,
        })
        await page.getByRole('button', { name: 'Next step' }).click()
        await expect(page.getByTestId('mirror-solution')).toHaveText(solution)
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true)
        expect(errors).toEqual([])
    })
test('Mirror preparation cancellation, zero-length preset, validation and comparison stay independent', async ({
    page,
}) => {
    await page.goto('/#/algorithm/mirror-cube?scrambleLength=100&seed=123')
    await page.getByRole('button', { name: 'Cancel generation' }).click()
    await expect(page.locator('.terminal-message')).toContainText('Cancelled')
    await page.getByLabel('Preset', { exact: true }).selectOption('Already solved')
    const details = page.getByRole('region', { name: 'Mirror notation and selection' })
    await expect(details).toHaveAttribute('data-geometry-solved', 'true')
    await expect(page.getByLabel('Random seed', { exact: true })).toHaveValue('123')
    await page.getByRole('button', { name: 'Compare topic' }).click()
    await expect(page.getByRole('region', { name: 'Topic comparison' })).toContainText(
        'Mirror Cube; 0 scramble moves; seed 123',
    )
    await page.goto('/#/algorithm/mirror-cube?scrambleLength=101&seed=42')
    await expect(page.getByLabel('Scramble length', { exact: true })).toHaveValue('20')
    await expect(page.locator('.notice').filter({ hasText: 'Scramble length must' })).toBeVisible()
})
test('Mirror short, long and maximum scrambles finish with the verified physical exterior', async ({
    page,
}) => {
    test.setTimeout(60000)
    for (const scrambleLength of [5, 60, 100]) {
        await page.goto(`/#/algorithm/mirror-cube?scrambleLength=${scrambleLength}&seed=123`)
        await expect(page.getByLabel('Scramble length', { exact: true })).toHaveValue(
            String(scrambleLength),
        )
        const details = page.getByRole('region', { name: 'Mirror notation and selection' })
        await expect(details).toHaveAttribute('data-geometry-solved', 'false')
        await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0, {
            timeout: 30000,
        })
        await page.getByRole('button', { name: 'Last step' }).click()
        await expect(details).toHaveAttribute('data-geometry-solved', 'true')
        await expect(details).toHaveAttribute('data-pieces', '26')
    }
})
