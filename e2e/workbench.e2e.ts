import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function installAudioProbe(page: Page) {
    await page.addInitScript(() => {
        Object.assign(window, { cueStarts: 0 })
        Object.defineProperty(window, 'AudioContext', {
            configurable: true,
            value: class {
                state = 'running'
                currentTime = 0
                destination = {}
                resume() {
                    return Promise.resolve()
                }
                close() {
                    return Promise.resolve()
                }
                createOscillator() {
                    return {
                        type: 'sine',
                        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
                        connect() {},
                        disconnect() {},
                        stop() {},
                        start() {
                            Object.assign(window, {
                                cueStarts: Number((window as any).cueStarts) + 1,
                            })
                        },
                    }
                }
                createGain() {
                    return {
                        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
                        connect() {},
                        disconnect() {},
                    }
                }
            },
        })
    })
}

const cueCount = (page: Page) => page.evaluate(() => Number((window as any).cueStarts))

test('workbench plays, changes algorithms, and replays a shared URL', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'A* Search' })).toBeVisible()
    await expect(page.getByLabel('Execution timeline')).toBeVisible()
    await expect(page.locator('canvas')).toBeVisible()
    await page.getByRole('button', { name: 'Next step' }).click()
    await expect(page.getByText('Step 1 /', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(
        page.getByText('Completed', { exact: true }).or(page.getByText('No path', { exact: true })),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Restart' }).click()
    await expect(page.getByText('Step 0 /', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Randomize' }).click()
    const url = page.url()
    expect(url).toContain('seed=')
    await page.reload()
    await expect(page).toHaveURL(url)
    await page.getByRole('button', { name: /^RRT/ }).click()
    await expect(page.getByRole('heading', { name: 'Rapidly-exploring Random Tree' })).toBeVisible()
    await page.getByRole('button', { name: /^Gradient Descent/ }).click()
    await expect(page.getByRole('heading', { name: 'Gradient Descent' })).toBeVisible()
    expect(errors).toEqual([])
})

test('comparison and mobile controls remain usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.getByRole('button', { name: 'algorithms', exact: true }).click()
    await page.getByRole('button', { name: /^Breadth-First Search/ }).click()
    await expect(page.getByRole('heading', { name: 'Breadth-First Search' })).toBeVisible()
    await page.getByRole('button', { name: 'Compare searches' }).click()
    await expect(page.getByRole('region', { name: 'Search comparison' })).toBeVisible()
    await page.getByRole('button', { name: 'learn', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Pseudocode' })).toBeVisible()
    await page.getByRole('button', { name: 'parameters', exact: true }).click()
    await expect(page.getByRole('complementary', { name: 'Experiment parameters' })).toBeVisible()
})

test('weighted comparison labels hops and costs separately', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /^Dijkstra/ }).click()
    await page.getByRole('combobox', { name: 'Edge weighting' }).selectOption('terrain')
    await page.getByRole('button', { name: 'Compare searches' }).click()
    await expect(page.getByRole('region', { name: 'Search comparison' })).toContainText(
        'Hop distance',
    )
    await expect(page.getByRole('region', { name: 'Search comparison' })).toContainText('Path cost')
    await expect(page.getByRole('region', { name: 'Search comparison' })).toContainText(
        'BFS optimizes hop count',
    )
})

test('invalid parameters are rejected and speed and theme persist', async ({ page }) => {
    await page.goto('/#/algorithm/rrt?stepSize=-1&seed=12')
    await expect(page.getByRole('heading', { name: 'Rapidly-exploring Random Tree' })).toBeVisible()
    await expect(page.getByRole('status')).toContainText('Step size')
    const stepSize = page.getByRole('spinbutton', { name: 'Step size' })
    await expect(stepSize).toHaveValue('0.75')
    await stepSize.fill('-1')
    await stepSize.blur()
    await expect(
        page.getByRole('alert').filter({ hasText: 'Step size must be from 0.1 to 2.' }),
    ).toBeVisible()
    await stepSize.fill('1.2')
    await stepSize.blur()
    await expect(page).toHaveURL(/stepSize=1.2/)
    await page.getByRole('button', { name: 'Next step' }).click()
    await page.getByRole('combobox', { name: 'Execution speed' }).selectOption('2')
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await expect(page.getByText('Step 1 /', { exact: false })).toBeVisible()
    await expect(page.locator('.app')).toHaveClass(/theme-dark/)
    await page.reload()
    await expect(page.getByRole('combobox', { name: 'Execution speed' })).toHaveValue('2')
    await expect(page.locator('.app')).toHaveClass(/theme-dark/)
})

test('Algorithm Motion keeps preferences saved under the former name', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
        localStorage.clear()
        localStorage.setItem(
            'algorithm-motion-lab:preferences',
            JSON.stringify({ algorithmId: 'rrt', speed: 2, theme: 'dark' }),
        )
        history.replaceState(null, '', location.pathname)
    })
    await page.reload()
    await expect(page).toHaveTitle('Algorithm Motion')
    await expect(page.getByRole('heading', { name: 'Rapidly-exploring Random Tree' })).toBeVisible()
    await expect(page.locator('.app')).toHaveClass(/theme-dark/)
    await expect(page.getByRole('combobox', { name: 'Execution speed' })).toHaveValue('2')
    const stored = await page.evaluate(() => ({
        current: localStorage.getItem('algorithm-motion:preferences'),
        former: localStorage.getItem('algorithm-motion-lab:preferences'),
    }))
    expect(stored.current).not.toBeNull()
    expect(stored.former).toBeNull()
})

test('illustrated paper, stickers, and drawn controls remain usable', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.locator('.app')).toHaveClass(/theme-light/)
    await expect(page.locator('.topbar [data-sticker="sun"]')).toBeVisible()
    await expect(page.locator('.algorithm-sidebar [data-sticker="cloud"]')).toBeVisible()
    await expect(page.locator('.parameter-sidebar [data-sticker="butterfly"]')).toBeVisible()
    await expect(page.locator('[data-sticker="planet"]')).toHaveCount(1)
    await expect(page.locator('[data-floating-stickers]')).toHaveCount(0)
    const stillSticker = page.locator('.topbar [data-sticker="sun"]')
    const stillPosition = await stillSticker.boundingBox()
    await page.mouse.move(
        stillPosition!.x + stillPosition!.width / 2,
        stillPosition!.y + stillPosition!.height / 2,
    )
    await page.waitForTimeout(150)
    expect(await stillSticker.boundingBox()).toEqual(stillPosition)
    await expect(page.locator('.transport-buttons .sketch-icon').first()).toBeVisible()
    expect(
        await page
            .locator('.sticker')
            .first()
            .evaluate((element) => getComputedStyle(element).pointerEvents),
    ).toBe('none')
    const play = page.getByRole('button', { name: 'Play', exact: true })
    await play.focus()
    expect(await play.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe(
        'none',
    )
    await page.keyboard.press('ArrowRight')
    await expect(page.getByText('Step 1 /', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await expect(page.locator('.app')).toHaveClass(/theme-dark/)
    await page.reload()
    await expect(page.locator('.app')).toHaveClass(/theme-dark/)
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('.page-sticker-one')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Next step' })).toBeVisible()
    await page.getByRole('button', { name: 'Next step' }).click()
    await expect(page.getByText('Step 1 /', { exact: false })).toBeVisible()
    expect(errors).toEqual([])
})

test('step sounds require opt-in and follow only displayed step transitions', async ({ page }) => {
    await installAudioProbe(page)
    await page.goto('/')
    const enable = page.getByRole('button', { name: 'Enable step sounds' })
    await expect(enable).toHaveAttribute('aria-pressed', 'false')
    await page.getByRole('button', { name: 'Next step' }).click()
    expect(await cueCount(page)).toBe(0)
    await enable.click()
    await expect(page.getByRole('button', { name: 'Mute step sounds' })).toHaveAttribute(
        'aria-pressed',
        'true',
    )
    await page.getByRole('button', { name: 'Next step' }).click()
    expect(await cueCount(page)).toBe(1)
    await page.keyboard.press('ArrowLeft')
    expect(await cueCount(page)).toBe(2)
    await page.keyboard.press('ArrowRight')
    expect(await cueCount(page)).toBe(3)
    await page.getByRole('button', { name: 'Last step' }).click()
    await page.getByRole('button', { name: 'Restart' }).click()
    await page.getByLabel('Execution timeline').evaluate((element) => {
        const input = element as HTMLInputElement
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '4')
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await expect(page.getByText('Step 4 /', { exact: false })).toBeVisible()
    expect(await cueCount(page)).toBe(3)
    await page.getByRole('button', { name: /^RRT/ }).click()
    await page.getByRole('spinbutton', { name: 'Maximum iterations' }).fill('1')
    await page.getByRole('spinbutton', { name: 'Maximum iterations' }).blur()
    await page.getByRole('button', { name: /^A\*/ }).click()
    await page.getByRole('button', { name: 'Compare searches' }).click()
    await page.getByRole('tab', { name: 'Breadth-First Search' }).click()
    expect(await cueCount(page)).toBe(3)
    await page.getByRole('button', { name: 'Mute step sounds' }).click()
    await page.getByRole('button', { name: 'Next step' }).click()
    expect(await cueCount(page)).toBe(3)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Enable step sounds' })).toHaveAttribute(
        'aria-pressed',
        'false',
    )
})

test('playback cues work at slow and fast speeds without hidden-tab catch-up', async ({ page }) => {
    await installAudioProbe(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Enable step sounds' }).click()
    await page.getByRole('combobox', { name: 'Execution speed' }).selectOption('0.25')
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await expect.poll(() => cueCount(page), { timeout: 4000 }).toBeGreaterThan(0)
    await page.getByRole('button', { name: 'Pause' }).click()
    const slowCount = await cueCount(page)
    await page.getByRole('combobox', { name: 'Execution speed' }).selectOption('4')
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await expect.poll(() => cueCount(page), { timeout: 3000 }).toBeGreaterThan(slowCount)
    await page.getByRole('button', { name: 'Pause' }).click()
    await page.evaluate(() =>
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }),
    )
    const beforeHidden = await cueCount(page)
    await page.getByRole('button', { name: 'Next step' }).click()
    expect(await cueCount(page)).toBe(beforeHidden)
    await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
        document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.getByRole('button', { name: 'Next step' }).click()
    expect(await cueCount(page)).toBe(beforeHidden + 1)
})

test('comparison characters and cues follow the selected displayed run', async ({ page }) => {
    await installAudioProbe(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Compare searches' }).click()
    const astarCard = page.locator('.comparison-card').filter({ hasText: 'A*' })
    const astarEnd = Number((await astarCard.textContent())?.match(/Steps \d+ \/ (\d+)/)?.[1])
    expect(astarEnd).toBeGreaterThan(1)
    const sharedEnd = Number(await page.getByLabel('Execution timeline').getAttribute('max'))
    expect(sharedEnd).toBeGreaterThan(astarEnd)
    await page.getByRole('button', { name: 'Enable step sounds' }).click()
    await page.getByLabel('Execution timeline').evaluate((element, value) => {
        const input = element as HTMLInputElement
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
            input,
            String(value),
        )
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
    }, astarEnd)
    await expect(page.locator('.server-slot')).toHaveAttribute('data-server-phase', 'burnout')
    await expect(page.locator('.server-slot')).toHaveAttribute('data-server-progress', '100')
    await expect(page.locator('.shoes-slot')).toHaveAttribute('data-shoe-step', String(astarEnd))
    await expect(page.locator('.server-slot')).toHaveAttribute('data-server-progress', '100')
    const count = await cueCount(page)
    await page.getByRole('button', { name: 'Next step' }).click()
    await expect(page.locator('.shoes-slot')).toHaveAttribute('data-shoe-step', String(astarEnd))
    expect(await cueCount(page)).toBe(count)
    await page.getByRole('tab', { name: 'Breadth-First Search' }).click()
    await expect(page.locator('.server-slot')).toHaveAttribute('data-server-phase', 'working')
    expect(await cueCount(page)).toBe(count)
})

test('server progress is visible and playback motion stops on pause', async ({ page }) => {
    await page.goto('/')
    const server = page.locator('.server-slot')
    await expect(server).toHaveAttribute('data-server-progress', '0')
    await expect(server.locator('.server-caption')).toContainText('READY 0%')
    await page.getByRole('button', { name: 'Next step' }).click()
    const firstProgress = Number(await server.getAttribute('data-server-progress'))
    expect(firstProgress).toBeGreaterThan(0)
    await expect(server.locator('.server-caption')).toContainText(`RUN ${firstProgress}%`)
    expect((await server.locator('.server-meter > span').boundingBox())!.width).toBeGreaterThan(0)
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await expect(server).toHaveAttribute('data-moving', 'true')
    expect(
        await server
            .locator('.server-drawing')
            .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe('server-bob')
    await expect
        .poll(async () => Number(await server.getAttribute('data-server-progress')))
        .toBeGreaterThan(firstProgress)
    await page.getByRole('button', { name: 'Pause' }).click()
    await expect(server).toHaveAttribute('data-moving', 'false')
    const pausedProgress = Number(await server.getAttribute('data-server-progress'))
    await page.keyboard.press('ArrowLeft')
    expect(Number(await server.getAttribute('data-server-progress'))).toBeLessThan(pausedProgress)
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(server).toHaveAttribute('data-server-progress', '100')
    await expect(server.locator('.server-caption')).toContainText('FINISHED 100%')
    await page.getByRole('button', { name: 'Restart' }).click()
    await expect(server).toHaveAttribute('data-server-progress', '0')
})

test('unavailable audio reports status and keeps playback usable', async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(window, 'AudioContext', { configurable: true, value: undefined })
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'Enable step sounds' }).click()
    await expect(page.getByRole('status')).toContainText('Sound unavailable in this browser.')
    await page.getByRole('button', { name: 'Next step' }).click()
    await expect(page.getByText('Step 1 /', { exact: false })).toBeVisible()
})

test('learning companions reflect success, iteration limit, and reduced motion', async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.locator('.server-slot')).toHaveAttribute('data-server-phase', 'ready')
    await expect(page.locator('.server-slot')).toHaveAttribute('aria-hidden', 'true')
    await expect(page.locator('.shoes-slot')).toHaveAttribute('aria-hidden', 'true')
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('.server-slot')).toHaveAttribute('data-server-phase', 'working')
    await expect(page.locator('.shoes-slot')).toHaveAttribute('data-shoe-step', '1')
    await expect(page.locator('.shoes-slot')).toHaveAttribute('data-moving', 'false')
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await expect(page.locator('.server-slot')).toHaveAttribute('data-moving', 'false')
    expect(
        await page.locator('.server-drawing').evaluate((el) => getComputedStyle(el).animationName),
    ).not.toContain('server-bob')
    await page.getByRole('button', { name: 'Pause' }).click()
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.locator('.server-slot')).toHaveAttribute('data-server-phase', 'burnout')
    await expect(page.locator('.outcome-badge')).toContainText('Completed')
    await page.getByRole('button', { name: /^RRT/ }).click()
    await page.getByRole('spinbutton', { name: 'Maximum iterations' }).fill('1')
    await page.getByRole('spinbutton', { name: 'Maximum iterations' }).blur()
    await expect(page.locator('.server-slot')).toHaveAttribute('data-server-phase', 'ready')
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.locator('.server-slot')).toHaveAttribute('data-server-phase', 'burnout')
    await expect(page.locator('.outcome-badge')).toContainText('Iteration limit')
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await expect(page.locator('.server-slot')).toHaveAttribute('data-server-phase', 'burnout')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'learn', exact: true }).click()
    await expect(page.locator('.server-slot')).toBeVisible()
    await expect(page.locator('.shoes-slot')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test('all algorithm families render complete runs and guides', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/')
    for (const [nav, heading] of [
        [/^Breadth-First Search/, 'Breadth-First Search'],
        [/^Dijkstra/, 'Dijkstra'],
        [/^A\*/, 'A* Search'],
        [/^RRT/, 'Rapidly-exploring Random Tree'],
        [/^Gradient Descent/, 'Gradient Descent'],
    ] as const) {
        await page.getByRole('button', { name: nav }).click()
        await expect(page.getByRole('heading', { name: heading })).toBeVisible()
        await expect(page.locator('canvas')).toBeVisible()
        await expect(page.locator('.server-slot')).toHaveAttribute('data-server-phase', 'ready')
        await page.getByRole('button', { name: 'Last step' }).click()
        await expect(page.locator('.outcome-badge')).toBeVisible()
        await expect(page.locator('.server-slot')).toHaveAttribute('data-server-phase', 'burnout')
        await page.getByRole('button', { name: 'Previous step' }).click()
        await expect(page.locator('.server-slot')).toHaveAttribute('data-server-phase', 'working')
        await page.getByRole('tab', { name: 'Guide' }).click()
        await expect(page.getByRole('heading', { name: 'Visualization legend' })).toBeVisible()
        if (heading === 'A* Search' || heading === 'Gradient Descent')
            await expect(page.locator('.formula .katex')).toBeVisible()
        await page.getByRole('tab', { name: 'Current step' }).click()
    }
    expect(errors).toEqual([])
})

test('A* labels its weighted-heuristic optimality caveat', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('spinbutton', { name: 'Heuristic weight' }).fill('2')
    await page.getByRole('spinbutton', { name: 'Heuristic weight' }).blur()
    await expect(page.locator('.algorithm-caveat')).toContainText('not guaranteed')
})

test('keyboard and accessibility audit', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Next step' })).toBeVisible()
    await page.waitForTimeout(150)
    await page.keyboard.press('ArrowRight')
    await expect(page.getByText('Step 1 /', { exact: false })).toBeVisible()
    await page.keyboard.press('r')
    await expect(page.getByText('Step 0 /', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Top', exact: true }).click()
    await page.getByRole('button', { name: 'Side', exact: true }).click()
    await page.getByRole('button', { name: 'Reset camera' }).click()
    const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    expect(results.violations).toEqual([])
    await page.getByRole('tab', { name: 'Guide' }).click()
    const paperGuide = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    expect(paperGuide.violations).toEqual([])
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    const chalkboardGuide = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    expect(chalkboardGuide.violations).toEqual([])
    await page.getByRole('tab', { name: 'Current step' }).click()
    const chalkboardStep = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    expect(chalkboardStep.violations).toEqual([])
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'learn', exact: true }).click()
    const mobile = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    expect(mobile.violations).toEqual([])
    await page.getByRole('button', { name: 'parameters', exact: true }).click()
    const mobileParameters = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    expect(mobileParameters.violations).toEqual([])
})
