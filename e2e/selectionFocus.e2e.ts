import { expect, test, type Page } from '@playwright/test'

type Pose = {
    position: number[]
    target: number[]
    up: number[]
    radius: number
    center: number[]
    pieceId: string
    geometries: number
}
function probe(page: Page) {
    let fiber = ''
    page.on('request', (request) => {
        if (request.url().includes('/deps/@react-three_fiber.js')) fiber = request.url()
    })
    return async (): Promise<Pose> =>
        page.evaluate(async (url) => {
            const { _roots } = await import(/* @vite-ignore */ url)
            const { camera, controls, scene, gl } = _roots
                .get(document.querySelector('canvas'))
                .store.getState()
            const anchor = scene.getObjectByName('selected-piece-anchor')
            const owner = anchor?.parent
            const mesh = owner?.isMesh
                ? owner
                : owner?.children.find((child: { isMesh: boolean }) => child.isMesh)
            const center = mesh
                ? mesh.position
                      .clone()
                      .copy(mesh.geometry.boundingBox.min)
                      .add(mesh.geometry.boundingBox.max)
                      .multiplyScalar(0.5)
                      .applyMatrix4(owner.matrixWorld)
                      .toArray()
                : []
            return {
                position: camera.position.toArray(),
                target: controls.target.toArray(),
                up: camera.up.toArray(),
                radius: controls.getDistance(),
                center,
                pieceId: anchor?.userData.pieceId ?? '',
                geometries: gl.info.memory.geometries,
            }
        }, fiber)
}
async function canvasPoint(page: Page) {
    await page.locator('canvas').scrollIntoViewIfNeeded()
    const box = (await page.locator('canvas').boundingBox())!
    return { x: box.x + box.width * 0.5, y: box.y + box.height * 0.5 }
}
const variants = [
    { route: 'rubiks-cube?size=3', label: 'Inspect cubie', count: 26 },
    { route: 'rubiks-cube?size=4', label: 'Inspect cubie', count: 56 },
    { route: 'rubiks-cube?size=5', label: 'Inspect cubie', count: 98 },
    { route: 'mirror-cube?', label: 'Inspect mirror piece', count: 26 },
    { route: 'square-one?', label: 'Inspect Square-1 piece', count: 18 },
]
for (const width of [1440, 390])
    for (const variant of variants) {
        test(`selected physical outline and exact replay: ${variant.route} at ${width}px`, async ({
            page,
        }, info) => {
            test.setTimeout(120000)
            const errors: string[] = []
            page.on('pageerror', (error) => errors.push(error.message))
            const pose = probe(page)
            await page.setViewportSize({ width, height: 900 })
            await page.goto(`/#/algorithm/${variant.route}&scrambleLength=5&seed=42`)
            const selector = page.getByLabel(variant.label)
            await expect(selector.locator('option')).toHaveCount(variant.count + 1)
            const ids = await selector
                .locator('option')
                .evaluateAll((options) =>
                    options.map((option) => (option as HTMLOptionElement).value).filter(Boolean),
                )
            const overlay = page.locator('.selection-overlay')
            // Exercise a far-side piece, a central/edge piece, and the last piece/middle half.
            for (const id of [ids[0], ids[Math.floor(ids.length / 2)], ids.at(-1)!]) {
                await selector.selectOption(id)
                await expect(overlay).toHaveAttribute('data-selected-piece', id)
                await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
                const actual = await pose()
                if (id === ids[0])
                    expect(actual.target.some((value) => Math.abs(value) > 0.001)).toBe(true)
                const projected = (await overlay.getAttribute('data-piece-center'))!
                    .split(',')
                    .map(Number)
                expect(actual.pieceId).toBe(id)
                actual.center.forEach((value, i) => expect(projected[i]).toBeCloseTo(value, 5))
                expect(await overlay.locator('[data-outline]').last().getAttribute('d')).toMatch(
                    /^M/,
                )
            }
            await page.locator('canvas').scrollIntoViewIfNeeded()
            await page.screenshot({ path: info.outputPath(`focus-${width}-light.png`) })
            await page.getByRole('button', { name: 'Toggle theme' }).click()
            await page.locator('canvas').scrollIntoViewIfNeeded()
            await page.screenshot({ path: info.outputPath(`focus-${width}-dark.png`) })
            await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0, {
                timeout: 60000,
            })
            const initialCenter = (await pose()).center
            await page.getByRole('button', { name: 'Last step' }).click()
            await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
            await page.getByRole('button', { name: 'First step' }).click()
            await expect.poll(async () => (await pose()).center).toEqual(initialCenter)
            // Keyboard-accessible refocus changes composition, not replay or selection.
            await page.getByRole('button', { name: 'Top', exact: true }).click()
            await expect(overlay).toHaveAttribute('data-focus-mode', 'preset')
            await page.getByRole('button', { name: 'Refocus selected piece' }).focus()
            await page.keyboard.press('Enter')
            await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
            const beforeClear = await pose()
            await selector.selectOption('')
            await expect(overlay).toHaveAttribute('visibility', 'hidden')
            expect((await pose()).position).toEqual(beforeClear.position)
            expect(errors).toEqual([])
            expect(
                await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            ).toBe(true)
        })
    }

for (const speed of ['0.25', '1', '32'])
    test(`gesture ownership and zoom while playing at ${speed}x`, async ({ page }, info) => {
        test.setTimeout(90000)
        const pose = probe(page)
        await page.setViewportSize({ width: 1440, height: 900 })
        await page.goto('/#/algorithm/rubiks-cube?size=5&scrambleLength=20&seed=42')
        await page.getByLabel('Inspect cubie').selectOption('-4,-4,-4')
        const overlay = page.locator('.selection-overlay')
        await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
        await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0, {
            timeout: 60000,
        })
        await page.getByLabel('Execution speed').selectOption(speed)
        // Start Play while already holding; no camera takeover even before movement.
        let point = await canvasPoint(page)
        await page.mouse.move(point.x, point.y)
        await page.mouse.down()
        await expect(overlay).toHaveAttribute('data-focus-mode', 'held')
        await page.keyboard.press('Space')
        const held = await pose()
        await page.waitForTimeout(250)
        expect((await pose()).position).toEqual(held.position)
        await page.mouse.move(point.x + 70, point.y + 35, { steps: 8 })
        expect((await pose()).position).not.toEqual(held.position)
        await expect(overlay).toHaveAttribute('data-focus-mode', 'held')
        await page.mouse.up()
        await expect(overlay).toHaveAttribute('data-focus-mode', 'returning')
        await page.waitForTimeout(120)
        await page.screenshot({ path: info.outputPath(`return-trail-${speed}.png`) })
        // A new hold interrupts a return immediately; reset while held cancels it.
        await page.mouse.down()
        await expect(overlay).toHaveAttribute('data-focus-mode', 'held')
        const revision = await overlay.getAttribute('data-replay-revision')
        await page.keyboard.press('r')
        await expect(overlay).not.toHaveAttribute('data-replay-revision', revision!)
        const resetHeld = await pose()
        await page.mouse.up()
        await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
        await page.waitForTimeout(800)
        expect((await pose()).position).toEqual(resetHeld.position)
        // Paused camera-only motion emits a trail, then all contours fully expire.
        point = await canvasPoint(page)
        await page.mouse.move(point.x, point.y)
        await page.mouse.down()
        await page.mouse.move(point.x + 80, point.y, { steps: 10 })
        await expect
            .poll(async () => Number(await overlay.getAttribute('data-trail-count')))
            .toBeGreaterThan(0)
        await page.mouse.up()
        await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
        await expect
            .poll(async () => Number(await overlay.getAttribute('data-trail-count')), {
                timeout: 10000,
            })
            .toBe(0)
        const settled = await pose()
        await page.waitForTimeout(800)
        await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
        // The original manual damping can still ease after the trail threshold.
        expect(
            Math.hypot(...(await pose()).position.map((value, i) => value - settled.position[i])),
        ).toBeLessThan(1)
        await page.keyboard.press('Space')
        await expect(overlay).toHaveAttribute('data-focus-mode', 'following')
        point = await canvasPoint(page)
        await page.mouse.move(point.x, point.y)
        const zoomBefore = await pose()
        await page.mouse.wheel(0, -100)
        await expect
            .poll(async () => (await pose()).radius / zoomBefore.radius)
            .toBeCloseTo(0.95, 3)
        // Start the pause-during-return check from a fresh replay. At 32x the
        // preceding zoom assertions can consume the remaining trace on CI.
        await page.keyboard.press('r')
        await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
        await page.keyboard.press('Space')
        await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
        // Pause during an elastic return: retained pose and no stale release.
        await page.mouse.down()
        await page.mouse.move(point.x - 65, point.y + 30, { steps: 6 })
        await page.mouse.up()
        await expect(overlay).toHaveAttribute('data-focus-mode', 'returning')
        await page.getByRole('button', { name: 'Pause', exact: true }).click()
        await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
        const paused = await pose()
        await page.waitForTimeout(800)
        expect((await pose()).position).toEqual(paused.position)
    })

test('reduced motion, scene clicks, presets and replacement clear effects', async ({ page }) => {
    test.setTimeout(90000)
    const pose = probe(page)
    await page.goto('/#/algorithm/mirror-cube?scrambleLength=20&seed=42')
    const overlay = page.locator('.selection-overlay')
    await page.getByLabel('Inspect mirror piece').selectOption('-2,-2,-2')
    await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(overlay.locator('[data-halo]')).toHaveAttribute('opacity', '0')
    const point = await canvasPoint(page)
    await page.mouse.move(point.x, point.y)
    await page.mouse.down()
    await page.mouse.move(point.x + 45, point.y + 25, { steps: 5 })
    await page.mouse.up()
    const reducedPose = await pose()
    await page.waitForTimeout(400)
    ;(await pose()).position.forEach((value, axis) =>
        expect(value).toBeCloseTo(reducedPose.position[axis], 10),
    )
    await expect(overlay).toHaveAttribute('data-trail-count', '0')
    await page.getByRole('button', { name: 'Reset camera' }).click()
    // Real scene click selects a visible mesh; dragging above did not clear selection.
    const center = await canvasPoint(page)
    await page.mouse.click(center.x, center.y)
    await expect(page.getByLabel('Inspect mirror piece')).not.toHaveValue('')
    await page.mouse.click(center.x - 150, center.y - 130)
    await expect(overlay).toHaveAttribute('visibility', 'hidden')
    await page.getByLabel('Inspect mirror piece').selectOption('2,2,2')
    await page.getByRole('button', { name: 'Compare topic' }).click()
    await page.getByRole('tab', { name: /Square-1/ }).click()
    await expect(overlay).toHaveAttribute('visibility', 'hidden')
    await page.getByLabel('Inspect Square-1 piece').selectOption('17')
    await expect(overlay).toHaveAttribute('data-selected-piece', '17')
    await page.getByRole('tab', { name: /Rubik/ }).click()
    await expect(overlay).toHaveAttribute('visibility', 'hidden')
})
