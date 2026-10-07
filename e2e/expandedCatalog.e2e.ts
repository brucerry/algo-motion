import { expect, test } from '@playwright/test'

const additions = [
    ['insertion-sort', 'Insertion Sort'],
    ['quick-sort', 'Quick Sort'],
    ['merge-sort', 'Merge Sort'],
    ['inorder-traversal', 'In-order Traversal'],
    ['coin-change', 'Coin Change — Minimum Coins'],
    ['sudoku', 'Sudoku Solver'],
    ['rrt-star', 'Rapidly-exploring Random Tree Star'],
] as const
test('seven new algorithms render and replay on desktop and mobile', async ({ page }) => {
    test.setTimeout(120000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 })
        for (const [id, heading] of additions) {
            const query = id === 'rrt-star' ? '?maxIterations=80&obstacleCount=0&seed=19' : ''
            await page.goto(`/#/algorithm/${id}${query}`)
            await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
            await expect(page.locator('canvas')).toBeVisible()
            await expect(page.getByRole('button', { name: 'Next step' })).toBeEnabled()
            await page.getByRole('button', { name: 'Next step' }).click()
            await expect(page.getByText('Step 1 /', { exact: false })).toBeVisible()
            await page.getByRole('button', { name: 'Previous step' }).click()
            await expect(page.getByText('Step 0 /', { exact: false })).toBeVisible()
            await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0, {
                timeout: 20000,
            })
            await page.getByRole('button', { name: 'Last step' }).click()
            if (width === 390)
                await page.getByRole('button', { name: 'learn', exact: true }).click()
            await expect(page.locator('.outcome-badge')).toHaveText(
                id === 'rrt-star' ? /Completed|Iteration limit/ : 'Completed',
            )
            if (width === 390) await page.getByRole('button', { name: 'view', exact: true }).click()
        }
    }
    expect(errors).toEqual([])
})

test('new no-result outcomes appear beside the simulation', async ({ page }) => {
    await page.goto('/#/algorithm/sudoku?puzzle=unsatisfiable')
    await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Last step' })).toBeEnabled()
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.locator('.terminal-message')).toContainText('no solution')
    await page.goto('/#/algorithm/coin-change?amount=7&coin1=2&coin2=4&coin3=6')
    await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Last step' })).toBeEnabled()
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.locator('.terminal-message')).toContainText('cannot be made')
})

test('expanded topic comparison covers all members with labeled inputs', async ({ page }) => {
    test.setTimeout(90000)
    const topics = [
        ['merge-sort', 4, 'Same seeded array'],
        ['inorder-traversal', 2, 'Same BST'],
        ['rrt-star', 2, 'Same 10³ workspace'],
        ['coin-change', 2, 'Minimum coins for amount'],
        ['sudoku', 2, '9×9 Sudoku'],
    ] as const
    for (const [id, count, label] of topics) {
        await page.goto(`/#/algorithm/${id}`)
        await page.getByRole('button', { name: 'Compare topic' }).click()
        const region = page.getByRole('region', { name: 'Topic comparison' })
        await expect(region.locator('.comparison-card')).toHaveCount(count)
        await expect(region).toContainText(label)
        const tabs = page.getByRole('tablist', { name: 'Comparison algorithm' }).getByRole('tab')
        for (let index = 0; index < count; index++) {
            await tabs.nth(index).click()
            await expect(page.locator('canvas')).toBeVisible()
            await expect(page.getByRole('button', { name: 'Next step' })).toBeEnabled()
        }
        await page.getByRole('button', { name: 'Exit compare' }).click()
    }
})

test('large logarithmic inputs retain their URLs, render every item, and adjust comparison size', async ({
    page,
}) => {
    test.setTimeout(60000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/#/algorithm/binary-search?count=16384&target=0&seed=42')
    await expect(page.getByRole('spinbutton', { name: 'Array size' })).toHaveValue('16384')
    await expect(page.locator('.canvas-host')).toContainText('16,384 items')
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.locator('.terminal-message')).toContainText('absent')
    await page.screenshot({ path: 'test-results/large-binary.png' })
    await page.getByRole('button', { name: 'Compare topic' }).click()
    await expect(page.getByRole('region', { name: 'Topic comparison' })).toContainText(
        'Sorted array of 160',
    )
    await expect(page.getByText(/adjusted to 160 for comparison/)).toBeVisible()
    await page.goto('/#/algorithm/bst-search?count=2048&target=0&seed=42')
    await expect(page.getByRole('spinbutton', { name: 'Node count' })).toHaveValue('2048')
    await expect(page.locator('.canvas-host')).toContainText('All 2048 nodes')
    await page.screenshot({ path: 'test-results/large-tree.png' })
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.locator('.terminal-message')).toContainText('absent')
    expect(errors).toEqual([])
})

test('generic worker cancellation preserves an incomplete result and reconfiguration replaces it', async ({
    page,
}) => {
    test.setTimeout(60000)
    await page.goto('/#/algorithm/rrt-star?maxIterations=6000&obstacleCount=0&seed=19')
    await page.getByRole('button', { name: 'Cancel generation' }).click()
    await expect(page.locator('.terminal-message')).toContainText('Cancelled')
    const iterations = page.getByRole('spinbutton', { name: 'Maximum iterations' })
    await iterations.fill('80')
    await iterations.blur()
    await expect(page.locator('.terminal-message')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Next step' })).toBeEnabled()
})

test('new scene captures show partition, merge buffer, and Sudoku on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/#/algorithm/merge-sort?count=6&seed=23')
    await expect(page.getByRole('button', { name: 'Next step' })).toBeEnabled()
    for (let index = 0; index < 7; index++)
        await page.getByRole('button', { name: 'Next step' }).click()
    await expect(page.locator('.canvas-host')).toContainText('Merge buffer')
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: 'test-results/merge-buffer.png' })
    await page.goto('/#/algorithm/quick-sort?count=6&seed=23')
    await expect(page.getByRole('button', { name: 'Next step' })).toBeEnabled()
    await page.getByRole('button', { name: 'Next step' }).click()
    await expect(page.locator('.canvas-host')).toContainText('Pivot')
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: 'test-results/quick-partition.png' })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#/algorithm/sudoku')
    await expect(page.getByRole('button', { name: 'Next step' })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0)
    await expect(page.locator('canvas')).toBeVisible()
    await expect(page.locator('.canvas-host span').first()).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: 'test-results/mobile-sudoku.png' })
})
