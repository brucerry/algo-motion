import { expect, test, type Page } from '@playwright/test'

function cameraProbe(page: Page) {
    let url = ''
    page.on('request', (request) => {
        if (request.url().includes('/deps/@react-three_fiber.js')) url = request.url()
    })
    return async () =>
        page.evaluate(async (url) => {
            const { _roots } = await import(/* @vite-ignore */ url)
            const { camera, controls } = _roots
                .get(document.querySelector('canvas'))
                .store.getState()
            return { position: camera.position.toArray(), radius: controls.getDistance() }
        }, url)
}

test('preference changes during a held gesture retain direct camera control', async ({ page }) => {
    const pose = cameraProbe(page)
    await page.goto('/#/algorithm/mirror-cube?scrambleLength=20&seed=42')
    await page.getByLabel('Inspect mirror piece').selectOption('2,2,2')
    const overlay = page.locator('.selection-overlay')
    await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
    await page.locator('canvas').scrollIntoViewIfNeeded()
    const box = (await page.locator('canvas').boundingBox())!
    const x = box.x + box.width / 2,
        y = box.y + box.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 40, y, { steps: 5 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(overlay.locator('[data-halo]')).toHaveAttribute('opacity', '0')
    const before = await pose()
    await page.mouse.move(x + 80, y + 20, { steps: 5 })
    expect((await pose()).position).not.toEqual(before.position)
    await expect(overlay).toHaveAttribute('data-focus-mode', 'held')
    await page.mouse.up()
    await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
    const released = await pose()
    await page.waitForTimeout(500)
    expect((await pose()).position).toEqual(released.position)
})

test('touch hold yields tracking, pinch retains immediate zoom, and release returns', async ({
    browser,
}) => {
    test.setTimeout(90000)
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
    })
    const page = await context.newPage()
    const pose = cameraProbe(page)
    try {
        await page.goto(
            'http://127.0.0.1:4173/#/algorithm/rubiks-cube?size=5&scrambleLength=20&seed=42',
        )
        await page.getByLabel('Inspect cubie').selectOption('4,4,4')
        const overlay = page.locator('.selection-overlay')
        await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
        await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0, {
            timeout: 60000,
        })
        await page.getByLabel('Execution speed').selectOption('0.25')
        await page.getByRole('button', { name: 'Play', exact: true }).click()
        await page.locator('canvas').scrollIntoViewIfNeeded()
        const box = (await page.locator('canvas').boundingBox())!
        const x = box.x + box.width / 2,
            y = box.y + box.height / 2
        const client = await context.newCDPSession(page)
        await client.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y }],
        })
        await expect(overlay).toHaveAttribute('data-focus-mode', 'held')
        const held = await pose()
        await page.waitForTimeout(200)
        expect((await pose()).position).toEqual(held.position)
        await client.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: x + 35, y: y + 10 }],
        })
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        await expect(overlay).toHaveAttribute('data-focus-mode', 'returning')
        await expect(overlay).toHaveAttribute('data-focus-mode', 'following')
        const radius = (await pose()).radius
        await client.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [
                { x: x - 35, y },
                { x: x + 35, y },
            ],
        })
        await expect(overlay).toHaveAttribute('data-focus-mode', 'held')
        await client.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [
                { x: x - 45, y },
                { x: x + 45, y },
            ],
        })
        expect((await pose()).radius).toBeLessThan(radius)
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        await expect(overlay).toHaveAttribute('data-focus-mode', 'returning')
        const zoomed = (await pose()).radius
        await expect(overlay).toHaveAttribute('data-focus-mode', 'following')
        expect((await pose()).radius).toBeCloseTo(zoomed, 3)
    } finally {
        await context.close()
    }
})

test('repeated selection, viewport and hidden transitions release stale outline resources', async ({
    page,
}) => {
    const pose = cameraProbe(page)
    await page.goto('/#/algorithm/square-one?scrambleLength=0&seed=42')
    const overlay = page.locator('.selection-overlay')
    await page.getByLabel('Inspect Square-1 piece').selectOption('17')
    await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
    await page.getByRole('button', { name: 'Side', exact: true }).click()
    const preset = await pose()
    await page.waitForTimeout(800)
    expect((await pose()).position).toEqual(preset.position)
    for (let i = 0; i < 18; i++)
        await page.getByLabel('Inspect Square-1 piece').selectOption(String(i))
    await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(overlay).toHaveAttribute('data-trail-count', '0')
    // Headless Chromium keeps pages visible. Exercise the same visibility
    // event and document guard used by a real background-tab transition.
    await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true })
        document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect.poll(() => page.evaluate(() => document.hidden)).toBe(true)
    await expect(overlay).toHaveAttribute('visibility', 'hidden')
    await page.evaluate(() => {
        Reflect.deleteProperty(document, 'hidden')
        document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect.poll(() => page.evaluate(() => document.hidden)).toBe(false)
    await expect(overlay).toHaveAttribute('data-trail-count', '0')
    await page.getByLabel('Inspect Square-1 piece').selectOption('')
    await expect(overlay).toHaveAttribute('visibility', 'hidden')
    await page.goto('/#/algorithm/quick-sort')
    await expect(overlay).toHaveCount(0)
})
