import { expect, test } from '@playwright/test'

const solvedFacelets = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'

test('cube solves, replays, shares, and renders on desktop and mobile', async ({
    page,
}, testInfo) => {
    test.setTimeout(120000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    let solution = ''
    for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 })
        await page.emulateMedia({ reducedMotion: width === 390 ? 'reduce' : 'no-preference' })
        await page.goto('/#/algorithm/rubiks-cube?scrambleLength=20&seed=42')
        await expect(
            page.getByRole('heading', {
                name: 'Rubik’s Cube — Two-Phase & Reduction',
                exact: true,
            }),
        ).toBeVisible()
        const details = page.getByRole('region', { name: 'Cube notation and selection' })
        await expect(page.locator('canvas')).toBeVisible()
        await expect(details).toHaveAttribute('data-cubies', '26')
        await expect(details).toHaveAttribute('data-stickers', '54')
        const scramble = await page.getByTestId('cube-scramble').innerText()
        const input = await details.getAttribute('data-facelets')
        expect(input).not.toBe(solvedFacelets)
        await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0, {
            timeout: 30000,
        })
        await page.getByRole('button', { name: 'Next step' }).click()
        await expect(page.getByTestId('cube-solution')).not.toContainText('Shown from')
        const nextSolution = await page.getByTestId('cube-solution').innerText()
        if (solution) expect(nextSolution).toBe(solution)
        solution = nextSolution
        await page.getByRole('button', { name: 'Next step' }).click()
        await expect(details).not.toHaveAttribute('data-facelets', input!)
        await page.getByRole('button', { name: 'Previous step' }).click()
        await expect(details).toHaveAttribute('data-facelets', input!)
        await page.getByRole('button', { name: 'Last step' }).click()
        await expect(details).toHaveAttribute('data-facelets', solvedFacelets)
        await page.getByRole('button', { name: 'Restart', exact: true }).click()
        await expect(details).toHaveAttribute('data-facelets', input!)
        await page.getByLabel('Execution timeline').fill('2')
        await expect(details).not.toHaveAttribute('data-facelets', input!)
        const selector = page.getByRole('combobox', { name: 'Inspect cubie' })
        const ids = await selector
            .locator('option')
            .evaluateAll((options) =>
                options.map((option) => (option as HTMLOptionElement).value).filter(Boolean),
            )
        expect(ids).toHaveLength(26)
        for (const id of ids) {
            await selector.selectOption(id)
            await expect(selector).toHaveValue(id)
        }
        await page.getByRole('button', { name: 'Reset camera' }).click()
        await page.getByRole('button', { name: 'Side', exact: true }).click()
        await page.getByRole('button', { name: 'Reset camera' }).click()
        await page.getByRole('button', { name: 'Toggle theme' }).click()
        await page.getByRole('button', { name: 'Restart', exact: true }).click()
        await page.getByRole('combobox', { name: 'Execution speed' }).selectOption('32')
        await page.getByRole('button', { name: 'Play', exact: true }).click()
        await expect(details).toHaveAttribute('data-facelets', solvedFacelets, { timeout: 10000 })
        await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
        await page.locator('canvas').scrollIntoViewIfNeeded()
        await page.screenshot({ path: testInfo.outputPath(`rubiks-${width}.png`), fullPage: true })
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true)
        await page.reload()
        await expect(page.getByTestId('cube-scramble')).toHaveText(scramble)
    }
    expect(errors).toEqual([])
})

test('cube preparation cancels and input replacement discards obsolete work', async ({ page }) => {
    await page.goto('/#/algorithm/rubiks-cube?scrambleLength=100&seed=123')
    const cancel = page.getByRole('button', { name: 'Cancel generation' })
    await expect(cancel).toBeVisible()
    await cancel.click()
    await expect(page.locator('.terminal-message')).toContainText('Cancelled')
    await expect(
        page.getByRole('region', { name: 'Cube notation and selection' }),
    ).not.toHaveAttribute('data-facelets', solvedFacelets)
    await page.goto('/#/algorithm/rubiks-cube?scrambleLength=60&seed=99')
    await expect(cancel).toBeVisible()
    await page.getByRole('button', { name: 'Restart', exact: true }).click()
    await expect(cancel).toBeVisible()
    await page.goto('/#/algorithm/rubiks-cube?scrambleLength=0&seed=42')
    await expect(page.getByRole('region', { name: 'Cube notation and selection' })).toHaveAttribute(
        'data-facelets',
        solvedFacelets,
    )
    await expect(page.getByTestId('cube-solution')).toHaveText('No moves needed')
    await expect(page.locator('.outcome-badge')).toHaveText('Completed')
    await expect(cancel).toHaveCount(0)
})

test('Backtracking comparison includes the cube with separate inputs and status', async ({
    page,
}) => {
    test.setTimeout(60000)
    await page.goto('/#/algorithm/rubiks-cube?scrambleLength=5&seed=42')
    await page.getByRole('button', { name: 'Compare topic' }).click()
    const comparison = page.getByRole('region', { name: 'Topic comparison' })
    await expect(comparison.locator('.comparison-card')).toHaveCount(5)
    await expect(comparison).toContainText('3×3 Rubik’s Cube; 5 scramble moves; seed 42')
    await expect(comparison).toContainText('9×9 Sudoku')
    await expect(comparison).toContainText('N-Queens board')
    await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0, {
        timeout: 30000,
    })
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.getByRole('region', { name: 'Cube notation and selection' })).toHaveAttribute(
        'data-facelets',
        solvedFacelets,
    )
    await expect(comparison).toContainText('Solution moves applied')
    await expect(comparison).toContainText('not directly comparable')
})

test('cube pauses, handles slow turns and scrubs without stale rotations', async ({ page }) => {
    test.setTimeout(60000)
    await page.goto('/#/algorithm/rubiks-cube?scrambleLength=5&seed=42')
    await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0, {
        timeout: 30000,
    })
    await page.getByRole('combobox', { name: 'Execution speed' }).selectOption('0.25')
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await expect(page.getByText('Step 2 /', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    const details = page.getByRole('region', { name: 'Cube notation and selection' })
    const paused = await details.getAttribute('data-facelets')
    await page.getByRole('button', { name: 'Previous step' }).click()
    await page.getByRole('button', { name: 'Next step' }).click()
    await expect(details).toHaveAttribute('data-facelets', paused!)
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(details).toHaveAttribute('data-facelets', solvedFacelets)
    await page.getByRole('button', { name: 'First step' }).click()
    await expect(details).not.toHaveAttribute('data-facelets', solvedFacelets)
})
