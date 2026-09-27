import { expect, test } from '@playwright/test'

test('Graph Search compares all four algorithms on a weighted detour', async ({ page }) => {
    await page.goto('/#/algorithm/dijkstra')
    await page.getByLabel('Preset').selectOption('Weighted detour')
    await expect(page.getByText('Weighted terrain: Dijkstra settles')).toBeVisible()
    await page.getByRole('button', { name: 'Compare searches' }).click()
    const comparison = page.getByRole('region', { name: 'Search comparison' })
    await expect(
        page.getByRole('tablist', { name: 'Comparison algorithm' }).getByRole('tab'),
    ).toHaveCount(4)
    await expect(page.getByRole('combobox', { name: 'Edge weighting' })).toHaveValue('terrain')
    const bfs = comparison
        .locator('.comparison-card')
        .filter({ has: page.locator('strong', { hasText: 'Breadth-First Search' }) })
    const dijkstra = comparison
        .locator('.comparison-card')
        .filter({ has: page.locator('strong', { hasText: 'Dijkstra' }) })
    await expect(dijkstra).not.toContainText('pending')
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(bfs).toContainText('Hops 9')
    await expect(dijkstra).toContainText('Hops 11')
    await expect(dijkstra).toContainText('Path cost 20')
    await expect(comparison).toContainText('DFS returns its first route')
    await page.getByRole('tab', { name: 'Depth-First Search' }).click()
    await expect(page.getByRole('heading', { name: 'Depth-First Search', level: 1 })).toBeVisible()
    await expect(
        page.getByRole('group', { name: 'Depth-First Search 3D visualization' }),
    ).toBeVisible()
})

test('weighting is available from every Graph Search entry', async ({ page }) => {
    for (const id of ['bfs', 'astar', 'dfs']) {
        await page.goto(`/#/algorithm/${id}`)
        await page.getByRole('button', { name: 'Compare searches' }).click()
        await page.getByRole('combobox', { name: 'Edge weighting' }).selectOption('terrain')
        await expect(page.getByRole('region', { name: 'Search comparison' })).toContainText(
            'weighted grid',
        )
    }
})

test('Array Techniques compares one array with separate target controls', async ({ page }) => {
    await page.goto('/#/algorithm/binary-search')
    await page.getByRole('button', { name: 'Compare topic' }).click()
    const comparison = page.getByRole('region', { name: 'Topic comparison' })
    await expect(comparison.locator('.comparison-card')).toHaveCount(2)
    await expect(comparison).toContainText('target value')
    await expect(comparison).toContainText('target sum')
    const binary = page.getByRole('region', { name: 'Binary Search settings' })
    const twoSum = page.getByRole('region', { name: 'Two Pointers settings' })
    await binary.getByRole('spinbutton', { name: 'Target value' }).fill('11')
    await binary.getByRole('spinbutton', { name: 'Target value' }).blur()
    await expect(binary.getByRole('spinbutton', { name: 'Target value' })).toHaveValue('11')
    await expect(twoSum.getByRole('spinbutton', { name: 'Target sum' })).toHaveValue('19')
    await page.getByRole('spinbutton', { name: 'Array size' }).fill('4')
    await page.getByRole('spinbutton', { name: 'Array size' }).blur()
    await expect(comparison).toContainText('Sorted array of 4')
})

test('Optimization compares separate inputs without ranking unrelated outcomes', async ({
    page,
}) => {
    await page.goto('/#/algorithm/gradient-descent')
    await page.getByRole('button', { name: 'Compare topic' }).click()
    const comparison = page.getByRole('region', { name: 'Topic comparison' })
    await expect(comparison.locator('.comparison-card')).toHaveCount(2)
    await expect(comparison).toContainText('surface')
    await expect(comparison).toContainText('scheduling activities')
    await expect(comparison).toContainText('not directly comparable')
    await comparison.locator('.comparison-card').filter({ hasText: 'Interval Scheduling' }).click()
    await expect(page.getByRole('heading', { name: 'Greedy Interval Scheduling' })).toBeVisible()
})

test('single-algorithm topics have no comparison action', async ({ page }) => {
    await page.goto('/#/algorithm/bubble-sort')
    await expect(page.getByRole('button', { name: 'Compare topic' })).toHaveCount(0)
})

test('comparison tabs and scoped controls work by keyboard on a narrow screen', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#/algorithm/binary-search')
    await page.getByRole('button', { name: 'Compare topic' }).click()
    const twoPointers = page.getByRole('tab', { name: 'Two Pointers' })
    await twoPointers.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Sorted Two-Sum' })).toBeVisible()
    await page.getByRole('button', { name: 'parameters', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Shared comparison input' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Two Pointers settings' })).toBeVisible()
    const target = page.getByRole('spinbutton', { name: 'Target sum' })
    await target.fill('9999')
    await target.blur()
    await expect(page.getByRole('alert').filter({ hasText: 'Target sum' })).toBeVisible()
})

test('comparison cancellation and input replacement do not publish stale results', async ({
    page,
}) => {
    await page.goto('/#/algorithm/bfs?width=180&depth=180&density=0.18&seed=7')
    await page.getByRole('button', { name: 'Compare searches' }).click()
    await page.getByRole('button', { name: 'Cancel generation' }).click()
    const comparison = page.getByRole('region', { name: 'Search comparison' })
    const bfs = comparison
        .locator('.comparison-card')
        .filter({ has: page.locator('strong', { hasText: 'Breadth-First Search' }) })
    await expect(bfs).toContainText('Status Cancelled')
    const seed = page.getByRole('spinbutton', { name: 'Random seed' })
    await seed.fill('8')
    await seed.blur()
    await expect(bfs).not.toContainText('Status Cancelled')
    await page.getByRole('button', { name: 'Exit compare' }).click()
    await expect(comparison).toHaveCount(0)
    await page.getByRole('button', { name: 'Array Techniques', exact: true }).click()
    await page.getByRole('button', { name: /^Binary Search/ }).click()
    await expect(page.getByRole('heading', { name: 'Binary Search' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Search comparison' })).toHaveCount(0)
})

test('comparison cards keep each topic outcome and metric labels', async ({ page }) => {
    await page.goto('/#/algorithm/binary-search')
    await page.getByRole('button', { name: 'Compare topic' }).click()
    const arrays = page.getByRole('region', { name: 'Topic comparison' })
    await expect(arrays).toContainText('Comparisons')
    await expect(arrays).toContainText('Found index')
    await expect(arrays).toContainText('Pair indices')
    const binaryTarget = page.getByRole('spinbutton', { name: 'Target value' })
    await binaryTarget.fill('0')
    await binaryTarget.blur()
    await expect(
        arrays.locator('.comparison-card').filter({ hasText: 'Binary Search' }),
    ).toContainText('Status No solution')
    await page.goto('/#/algorithm/gradient-descent')
    await page.getByRole('button', { name: 'Compare topic' }).click()
    const optimization = page.getByRole('region', { name: 'Topic comparison' })
    await expect(optimization).toContainText('Objective value')
    await expect(optimization).toContainText('Accepted activities')
    await expect(optimization).not.toContainText('fastest')
    const iterations = page.getByRole('spinbutton', { name: 'Maximum iterations' })
    await iterations.fill('1')
    await iterations.blur()
    await expect(
        optimization.locator('.comparison-card').filter({ hasText: 'Gradient Descent' }),
    ).toContainText('Status Iteration limit')
})
