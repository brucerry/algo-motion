import { expect, test } from '@playwright/test'

for (const size of [4, 5])
    for (const width of [1440, 390]) {
        test(`${size}×${size} reduction solves maximum input and keeps every piece accessible at ${width}px`, async ({
            page,
        }, testInfo) => {
            test.setTimeout(120000)
            const errors: string[] = []
            page.on('pageerror', (error) => errors.push(error.message))
            await page.setViewportSize({ width, height: 900 })
            await page.emulateMedia({ reducedMotion: width === 390 ? 'reduce' : 'no-preference' })
            await page.goto(`/#/algorithm/rubiks-cube?size=${size}&scrambleLength=100&seed=123`)
            await expect(page.getByLabel('Cube size')).toHaveValue(String(size))
            const details = page.getByRole('region', { name: 'Cube notation and selection' })
            await expect(details).toHaveAttribute(
                'data-cubies',
                String(size ** 3 - (size - 2) ** 3),
            )
            await expect(details).toHaveAttribute('data-stickers', String(6 * size * size))
            await expect(page.getByTestId('cube-scramble')).toContainText('2')
            const input = await details.getAttribute('data-facelets')
            await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0, {
                timeout: 30000,
            })
            await page.getByRole('button', { name: 'Next step' }).click()
            const solution = await page.getByTestId('cube-solution').innerText()
            const firstLayer = solution
                .split(' ')
                .findIndex((move) => move.startsWith('2') || move.includes('w'))
            expect(firstLayer).toBeGreaterThanOrEqual(0)
            await page.getByLabel('Execution timeline').fill(String(firstLayer + 2))
            await expect(details).toContainText(`${firstLayer + 1} solution moves applied`)
            const layerState = await details.getAttribute('data-facelets')
            await page.getByRole('button', { name: 'Previous step' }).click()
            await expect(details).not.toHaveAttribute('data-facelets', layerState!)
            await page.getByRole('button', { name: 'Next step' }).click()
            await expect(details).toHaveAttribute('data-facelets', layerState!)
            await expect(page.getByLabel('Inspect cubie').locator('option')).toHaveCount(
                size ** 3 - (size - 2) ** 3 + 1,
            )
            const lastId = await page
                .getByLabel('Inspect cubie')
                .locator('option')
                .last()
                .getAttribute('value')
            await page.getByLabel('Inspect cubie').selectOption(lastId!)
            await expect(page.getByLabel('Inspect cubie')).toHaveValue(lastId!)
            await page.getByRole('button', { name: 'Last step' }).click()
            const solved = ['U', 'R', 'F', 'D', 'L', 'B'].map((f) => f.repeat(size * size)).join('')
            await expect(details).toHaveAttribute('data-facelets', solved)
            await expect(details).toContainText('Solved')
            await page.getByRole('button', { name: 'Restart', exact: true }).click()
            await expect(details).toHaveAttribute('data-facelets', input!)
            await page.getByLabel('Execution speed').selectOption('32')
            await page.getByRole('button', { name: 'Play', exact: true }).click()
            await expect(details).toHaveAttribute('data-facelets', solved, { timeout: 60000 })
            await page.screenshot({
                path: testInfo.outputPath(`cube${size}-${width}.png`),
                fullPage: true,
            })
            expect(
                await page.evaluate(
                    () => document.documentElement.scrollWidth <= window.innerWidth,
                ),
            ).toBe(true)
            await page.reload()
            await expect(page.getByTestId('cube-scramble')).toContainText('2')
            await expect(page.getByLabel('Cube size')).toHaveValue(String(size))
            expect(errors).toEqual([])
        })
    }
test('size replacement cancels pending work and the 3×3 default link remains stable', async ({
    page,
}) => {
    await page.goto('/#/algorithm/rubiks-cube?size=4&scrambleLength=100&seed=123')
    await page.getByLabel('Cube size').selectOption('3')
    const details = page.getByRole('region', { name: 'Cube notation and selection' })
    await expect(details).toHaveAttribute('data-cubies', '26')
    await page.getByLabel('Preset', { exact: true }).selectOption('Already solved')
    await expect(details).toHaveAttribute(
        'data-facelets',
        'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB',
    )
    await page.goto('/#/algorithm/rubiks-cube?scrambleLength=5&seed=42')
    await expect(page.getByLabel('Cube size')).toHaveValue('3')
    await expect(page.getByTestId('cube-scramble')).toHaveText('B2 F2 R2 U2 B2')
    await page.goto('/#/algorithm/rubiks-cube?size=6&scrambleLength=5&seed=42')
    await expect(page.getByLabel('Cube size')).toHaveValue('3')
    await expect(page.locator('.notice').filter({ hasText: 'valid cube size' })).toBeVisible()
})

test('4×4 standard input has a strategy-aware guide, comparison size, and exact slow replay', async ({
    page,
}) => {
    test.setTimeout(60000)
    await page.goto('/#/algorithm/rubiks-cube?size=4&scrambleLength=20&seed=42')
    const details = page.getByRole('region', { name: 'Cube notation and selection' })
    await page.getByRole('tab', { name: 'Guide' }).click()
    await expect(page.getByText(/Solve the full 4×4 cube/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0, {
        timeout: 30000,
    })
    await page.getByRole('button', { name: 'Next step' }).click()
    await page.getByLabel('Execution speed').selectOption('0.25')
    await page.getByRole('button', { name: 'Next step' }).click()
    await expect(details).toContainText('1 solution moves applied')
    const after = await details.getAttribute('data-facelets')
    await page.getByLabel('Execution timeline').fill('50')
    await expect(details).not.toHaveAttribute('data-facelets', after!)
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(details).toHaveAttribute(
        'data-facelets',
        ['U', 'R', 'F', 'D', 'L', 'B'].map((f) => f.repeat(16)).join(''),
    )
    await page.getByRole('button', { name: 'Compare topic' }).click()
    await expect(page.getByRole('region', { name: 'Topic comparison' })).toContainText(
        '4×4 Rubik’s Cube; 20 scramble moves; seed 42',
    )
})
test('5×5 preparation cancels and rapid size replacement discards obsolete work', async ({
    page,
}) => {
    await page.goto('/#/algorithm/rubiks-cube?size=5&scrambleLength=100&seed=123')
    await page.getByRole('button', { name: 'Cancel generation' }).click()
    await expect(page.locator('.terminal-message')).toContainText('Cancelled')
    const details = page.getByRole('region', { name: 'Cube notation and selection' })
    await expect(details).toHaveAttribute('data-cubies', '98')
    await page.getByLabel('Cube size').selectOption('4')
    await page.getByLabel('Cube size').selectOption('5')
    await page.getByLabel('Preset', { exact: true }).selectOption('Already solved')
    await expect(details).toHaveAttribute(
        'data-facelets',
        ['U', 'R', 'F', 'D', 'L', 'B'].map((f) => f.repeat(25)).join(''),
    )
    await expect(details).toContainText('0 solution moves applied')
})
