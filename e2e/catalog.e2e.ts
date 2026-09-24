import { expect, test } from '@playwright/test'

test('every topic is reachable from desktop and mobile navigation', async ({ page }) => {
    test.setTimeout(90000)
    const showcases = [
        ['Graph Search', 'Depth-First Search', 'Depth-First Search'],
        ['Motion Planning', 'RRT', 'Rapidly-exploring Random Tree'],
        ['Optimization', 'Interval Scheduling', 'Greedy Interval Scheduling'],
        ['Sorting', 'Bubble Sort', 'Bubble Sort'],
        ['Trees', 'BST Search', 'Binary Search Tree Search'],
        ['Dynamic Programming', '0/1 Knapsack', '0/1 Knapsack'],
        ['Backtracking', 'N-Queens', 'N-Queens Backtracking'],
        ['Array Techniques', 'Two Pointers', 'Sorted Two-Sum'],
    ] as const
    for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/')
        for (const [category, algorithm, heading] of showcases) {
            if (width === 390)
                await page.getByRole('button', { name: 'algorithms', exact: true }).click()
            const disclosure = page.getByRole('button', { name: category, exact: true })
            if ((await disclosure.getAttribute('aria-expanded')) !== 'true')
                await disclosure.click()
            const item = page.locator('.algorithm-item').filter({ hasText: algorithm })
            await expect(item).toBeVisible()
            await item.click()
            await expect(page.getByRole('heading', { name: heading })).toBeVisible()
            await expect(item).toHaveAttribute('aria-current', 'page')
            await expect(
                page.locator('.category-toggle').filter({ hasText: category }),
            ).toHaveAttribute('aria-expanded', 'true')
        }
    }
})

test('topics and entries are alphabetized on desktop and mobile', async ({ page }) => {
    const sorted = (values: string[]) =>
        [...values].sort((left, right) => left.localeCompare(right, 'en', { sensitivity: 'base' }))
    for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/')
        if (width === 390)
            await page.getByRole('button', { name: 'algorithms', exact: true }).click()
        const topics = await page.locator('.category-toggle span:first-child').allTextContents()
        expect(topics).toEqual(sorted(topics))
        for (const topic of topics) {
            const heading = page.getByRole('button', { name: topic, exact: true })
            if ((await heading.getAttribute('aria-expanded')) !== 'true') await heading.click()
            const labels = (
                await heading
                    .locator('xpath=../following-sibling::div')
                    .locator('.algorithm-item')
                    .allTextContents()
            ).map((value) => value.trim())
            expect(labels).toEqual(sorted(labels))
        }
    }
})

test('8×, 16×, and 32× playback persist and stop at the final frame', async ({ page }) => {
    await page.goto('/#/algorithm/bubble-sort?count=6&seed=23')
    const speed = page.getByRole('combobox', { name: 'Execution speed' })
    for (const value of ['8', '16', '32']) {
        await speed.selectOption(value)
        await expect(speed).toHaveValue(value)
    }
    await page.reload()
    await expect(speed).toHaveValue('32')
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await expect(page.locator('.outcome-badge')).toHaveText('Completed')
    const timeline = page.getByLabel('Execution timeline')
    await expect(timeline).toHaveJSProperty('value', await timeline.getAttribute('max'))
})

test('DFS replays on the seeded grid and leaves the original comparison available', async ({
    page,
}) => {
    await page.goto('/#/algorithm/dfs?width=4&depth=4&density=0&seed=1')
    await expect(page.getByRole('heading', { name: 'Depth-First Search' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Graph Search', exact: true })).toHaveAttribute(
        'aria-expanded',
        'true',
    )
    await page.getByRole('button', { name: 'Next step' }).click()
    await expect(page.getByText('Step 1 /', { exact: false })).toBeVisible()
    await page.getByLabel('Execution timeline').evaluate((element) => {
        const input = element as HTMLInputElement
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '3')
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await expect(page.getByText('Step 3 /', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.getByText('Completed', { exact: true })).toBeVisible()
    const url = page.url()
    await page.reload()
    await expect(page).toHaveURL(url)
    await expect(page.getByRole('heading', { name: 'Depth-First Search' })).toBeVisible()
    await page.getByRole('button', { name: /^Breadth-First Search/ }).click()
    await page.getByRole('button', { name: 'Compare searches' }).click()
    await expect(page.getByRole('region', { name: 'Search comparison' })).toBeVisible()
})

test('Bubble Sort shows comparison, swap, inspection, and both themes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/#/algorithm/bubble-sort?count=6&seed=23')
    await expect(page.getByRole('heading', { name: 'Bubble Sort' })).toBeVisible()
    await expect(page.locator('canvas')).toBeVisible()
    await expect(page.locator('.canvas-host span').first()).toBeVisible()
    const firstValue = await page.locator('.canvas-host span').first().boundingBox()
    await page.mouse.click(
        firstValue!.x + firstValue!.width / 2,
        firstValue!.y + firstValue!.height + 20,
    )
    await expect(page.getByRole('heading', { name: 'Selected object' })).toBeVisible()
    await page.getByRole('button', { name: 'Next step' }).click()
    await expect(page.getByText('Compare', { exact: false }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.getByText('Completed', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await expect(page.locator('.app')).toHaveClass(/theme-dark/)
    await expect(page.locator('canvas')).toBeVisible()
    await expect(page.locator('.canvas-host span').first()).toBeVisible()
    expect(errors).toEqual([])
})

test('BST reports absent keys and updates node inspection when stepping', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/#/algorithm/bst-search?count=9&target=0&seed=12345')
    await expect(page.getByRole('heading', { name: 'Binary Search Tree Search' })).toBeVisible()
    await expect(page.locator('canvas')).toBeVisible()
    await expect(page.locator('.canvas-host span').first()).toBeVisible()
    const rootKey = await page.locator('.canvas-host span').first().boundingBox()
    await page.mouse.click(rootKey!.x + rootKey!.width / 2, rootKey!.y + rootKey!.height + 20)
    await expect(page.getByRole('heading', { name: 'Selected object' })).toBeVisible()
    await page.getByRole('button', { name: 'Next step' }).click()
    await expect(page.getByText('Current', { exact: true }).last()).toBeVisible()
    await page.getByLabel('Execution timeline').evaluate((element) => {
        const input = element as HTMLInputElement
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '0')
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await expect(page.getByText('Unvisited', { exact: true }).last()).toBeVisible()
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.locator('.outcome-badge')).toHaveText('No solution')
})

test('knapsack exposes table cells and its reconstructed optimum', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/#/algorithm/knapsack?count=5&capacity=10&seed=12345')
    await expect(page.getByRole('heading', { name: '0/1 Knapsack' })).toBeVisible()
    await expect(page.locator('.canvas-host span').first()).toBeVisible()
    await page.mouse.click(620, 450)
    await expect(page.getByRole('heading', { name: 'Selected object' })).toBeVisible()
    await page.getByRole('button', { name: 'Next step' }).click()
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.getByText('Completed', { exact: true })).toBeVisible()
    await expect(page.getByText(/Optimal value/)).toBeVisible()
})

test('N-Queens shows a reversal and a genuinely unsolved board', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/#/algorithm/n-queens?size=4')
    await expect(page.getByRole('heading', { name: 'N-Queens Backtracking' })).toBeVisible()
    await expect(page.locator('.canvas-host span').first()).toBeVisible()
    await page.mouse.click(620, 450)
    await expect(page.getByRole('heading', { name: 'Selected object' })).toBeVisible()
    let sawBacktrack = false
    for (let step = 0; step < 60; step++) {
        if (await page.getByText('BACKTRACK', { exact: true }).isVisible()) {
            sawBacktrack = true
            break
        }
        await page.getByRole('button', { name: 'Next step' }).click()
    }
    expect(sawBacktrack).toBe(true)
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.getByText('Completed', { exact: true })).toBeVisible()
    await page.goto('/#/algorithm/n-queens?size=3')
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.locator('.outcome-badge')).toHaveText('No solution')
})

test('interval scheduling exposes greedy choices and replays a link', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/#/algorithm/interval-scheduling?count=8&seed=12345')
    await expect(page.getByRole('heading', { name: 'Greedy Interval Scheduling' })).toBeVisible()
    await expect(page.locator('.canvas-host span').first()).toBeVisible()
    await page.mouse.click(660, 400)
    await expect(page.getByRole('heading', { name: 'Selected object' })).toBeVisible()
    await page.getByRole('button', { name: 'Next step' }).click()
    await expect(page.getByText('CONSIDER', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.locator('.outcome-badge')).toHaveText('Completed')
    const url = page.url()
    await page.reload()
    await expect(page).toHaveURL(url)
    await expect(page.getByRole('heading', { name: 'Greedy Interval Scheduling' })).toBeVisible()
})

test('array techniques expose indices and honest found or missing outcomes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/#/algorithm/binary-search?count=10&target=10&seed=12345')
    await expect(page.getByRole('heading', { name: 'Binary Search' })).toBeVisible()
    const first = page.locator('.canvas-host span').first()
    await expect(first).toBeVisible()
    const box = await first.boundingBox()
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height + 20)
    await expect(page.getByRole('heading', { name: 'Selected object' })).toBeVisible()
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.locator('.outcome-badge')).toHaveText('Completed')
    await page.goto('/#/algorithm/binary-search?count=10&target=0&seed=12345')
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.locator('.outcome-badge')).toHaveText('No solution')
    await page.goto('/#/algorithm/sorted-two-sum?count=10&target=19&seed=12345')
    await expect(page.getByRole('heading', { name: 'Sorted Two-Sum' })).toBeVisible()
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.locator('.outcome-badge')).toHaveText('Completed')
    await page.goto('/#/algorithm/sorted-two-sum?count=10&target=0&seed=12345')
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.locator('.outcome-badge')).toHaveText('No solution')
})

test('category disclosure and camera controls work with keyboard on a narrow screen', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.getByRole('button', { name: 'algorithms', exact: true }).click()
    const planning = page.getByRole('button', { name: 'Motion Planning', exact: true })
    await planning.focus()
    await planning.press('Enter')
    await expect(planning).toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('button', { name: /^RRT/ }).click()
    await expect(page.getByRole('heading', { name: 'Rapidly-exploring Random Tree' })).toBeVisible()
    await page.getByRole('button', { name: 'Top', exact: true }).click()
    await page.getByRole('button', { name: 'Side', exact: true }).click()
    await page.getByRole('button', { name: 'Reset camera' }).click()
    await expect(page.locator('canvas')).toBeVisible()
})

test('maximum showcase inputs keep playback and honest outcomes usable', async ({ page }) => {
    test.setTimeout(90000)
    await page.setViewportSize({ width: 1440, height: 900 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const cases = [
        ['dfs', 'width=240&depth=240&density=0&seed=42', 'Depth-First Search', 'Completed'],
        ['bubble-sort', 'count=140&seed=42', 'Bubble Sort', 'Completed'],
        ['bst-search', 'count=120&target=1000&seed=42', 'Binary Search Tree Search', 'No solution'],
        ['knapsack', 'count=80&capacity=180&seed=42', '0/1 Knapsack', 'Completed'],
        ['interval-scheduling', 'count=120&seed=42', 'Greedy Interval Scheduling', 'Completed'],
        ['binary-search', 'count=160&target=321&seed=42', 'Binary Search', 'No solution'],
        ['sorted-two-sum', 'count=160&target=641&seed=42', 'Sorted Two-Sum', 'No solution'],
    ] as const
    for (const [id, query, heading, outcome] of cases) {
        await page.goto(`/#/algorithm/${id}?${query}`)
        await expect(page.getByRole('heading', { name: heading })).toBeVisible()
        await expect(page.locator('canvas')).toBeVisible()
        if (id !== 'dfs') await expect(page.locator('.canvas-host span').first()).toBeVisible()
        await page.getByRole('button', { name: 'Last step' }).click()
        await expect(page.locator('.outcome-badge')).toHaveText(outcome)
        await page.getByRole('button', { name: 'Previous step' }).click()
        await expect(page.locator('.outcome-badge')).toHaveCount(0)
        await page.getByRole('button', { name: 'Last step' }).click()
    }
    await page.goto('/#/algorithm/n-queens?size=80')
    await expect(page.getByRole('heading', { name: 'N-Queens Backtracking' })).toBeVisible()
    await expect(page.locator('canvas')).toBeVisible()
    await expect(page.locator('.timeline-label strong')).toContainText('pending')
    await page.getByRole('button', { name: 'Cancel generation' }).click()
    await expect(page.locator('.terminal-message')).toContainText('Cancelled')
    expect(errors).toEqual([])
})

test('original algorithms accept expanded input maxima in the browser', async ({ page }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width: 1440, height: 900 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    for (const id of ['bfs', 'dijkstra', 'astar']) {
        await page.goto(`/#/algorithm/${id}?width=240&depth=240&density=0&seed=42`)
        await expect(page.getByLabel('Grid width', { exact: true })).toHaveValue('240')
        await expect(page.getByLabel('Grid depth', { exact: true })).toHaveValue('240')
        await expect(page.locator('canvas')).toBeVisible()
        await page.getByRole('button', { name: 'Last step' }).click()
        if (await page.getByRole('button', { name: 'Cancel generation' }).isVisible()) {
            await page.getByRole('button', { name: 'Cancel generation' }).click()
            await expect(page.locator('.terminal-message')).toContainText('Cancelled')
        } else {
            await expect(page.locator('.outcome-badge')).toHaveText('Completed')
        }
    }
    await page.goto(
        '/#/algorithm/rrt?workspace=200&obstacleCount=180&obstacleMin=0.2&obstacleMax=0.2&maxIterations=6000&stepSize=2&goalBias=1&seed=42',
    )
    await expect(page.getByLabel('Workspace size', { exact: true })).toHaveValue('200')
    await expect(page.getByLabel('Obstacle count', { exact: true })).toHaveValue('180')
    await expect(page.getByLabel('Maximum iterations', { exact: true })).toHaveValue('6000')
    await expect(page.locator('canvas')).toBeVisible()
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.locator('.outcome-badge')).toBeVisible()
    await page.goto('/#/algorithm/gradient-descent?maxIterations=3000')
    await expect(page.getByLabel('Maximum iterations', { exact: true })).toHaveValue('3000')
    await expect(page.locator('canvas')).toBeVisible()
    expect(errors).toEqual([])
})

test('dependent controls adjust to size and special outcomes show a prompt', async ({ page }) => {
    await page.goto('/#/algorithm/binary-search?count=10&target=21&seed=42')
    await expect(page.getByLabel('Target value', { exact: true })).toHaveAttribute('max', '21')
    await page.getByLabel('Array size', { exact: true }).fill('160')
    await page.getByLabel('Array size', { exact: true }).press('Tab')
    await expect(page.getByLabel('Target value', { exact: true })).toHaveAttribute('max', '321')
    await page.getByLabel('Target value', { exact: true }).fill('300')
    await page.getByLabel('Target value', { exact: true }).press('Tab')
    await page.getByLabel('Array size', { exact: true }).fill('4')
    await page.getByLabel('Array size', { exact: true }).press('Tab')
    await expect(page.getByLabel('Target value', { exact: true })).toHaveValue('21')
    await expect(page.locator('.notice')).toContainText('Target value adjusted to 21')

    await page.goto('/#/algorithm/knapsack?count=3&capacity=180&seed=42')
    await expect(page.getByLabel('Capacity', { exact: true })).toHaveValue('24')
    await expect(page.getByLabel('Capacity', { exact: true })).toHaveAttribute('max', '24')

    await page.goto(
        '/#/algorithm/rrt?workspace=10&stepSize=2&goalThreshold=2&obstacleMin=1.6&obstacleMax=1.6&obstacleCount=0',
    )
    await page.getByLabel('Workspace size', { exact: true }).fill('6')
    await page.getByLabel('Workspace size', { exact: true }).press('Tab')
    for (const label of [
        'Step size',
        'Goal threshold',
        'Minimum obstacle radius',
        'Maximum obstacle radius',
    ]) {
        await expect(page.getByLabel(label, { exact: true })).toHaveValue('1.5')
        await expect(page.getByLabel(label, { exact: true })).toHaveAttribute('max', '1.5')
    }

    await page.goto('/#/algorithm/bfs?width=4&depth=4&density=0.38&seed=0')
    await page.getByRole('tab', { name: 'Guide' }).click()
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.locator('.terminal-message')).toContainText('No path')
    await expect(page.locator('.terminal-message')).toContainText('No traversable route')

    await page.goto('/#/algorithm/binary-search?count=10&target=0&seed=42')
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.locator('.terminal-message')).toContainText('No solution')
    await expect(page.locator('.terminal-message')).toContainText('absent')

    await page.goto('/#/algorithm/rrt?maxIterations=1&goalBias=0&stepSize=0.1&seed=42')
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.locator('.terminal-message')).toContainText('Iteration limit')
    await expect(page.locator('.terminal-message')).toContainText('No route was found')
})
