import { expect, test, type Page } from '@playwright/test'

function cameraProbe(page: Page) {
    let fiber = ''
    page.on('request', (request) => {
        if (request.url().includes('/deps/@react-three_fiber.js')) fiber = request.url()
    })
    return async () => {
        if (!fiber) return null
        return page.evaluate(async (url) => {
            const { _roots } = await import(/* @vite-ignore */ url)
            const state = _roots.get(document.querySelector('canvas'))?.store.getState()
            if (!state?.controls) return null
            return {
                position: state.camera.position.toArray() as number[],
                target: state.controls.target.toArray() as number[],
                up: state.camera.up.toArray() as number[],
                zoom: state.camera.zoom as number,
            }
        }, fiber)
    }
}

type Pose = NonNullable<Awaited<ReturnType<ReturnType<typeof cameraProbe>>>>
function expectPose(actual: Pose, expected: Pose) {
    for (const field of ['position', 'target', 'up'] as const)
        actual[field].forEach((value, axis) => expect(value).toBeCloseTo(expected[field][axis], 7))
    expect(actual.zoom).toBe(expected.zoom)
}

const variants = [
    { name: '3x3', route: 'rubiks-cube?size=3', label: 'Inspect cubie' },
    { name: '4x4', route: 'rubiks-cube?size=4', label: 'Inspect cubie' },
    { name: '5x5', route: 'rubiks-cube?size=5', label: 'Inspect cubie' },
    { name: 'Mirror', route: 'mirror-cube?', label: 'Inspect mirror piece' },
    { name: 'Square-1', route: 'square-one?', label: 'Inspect Square-1 piece' },
]

for (const variant of variants)
    for (const reduced of [false, true])
        test(`${variant.name} restores the unselected camera with ${reduced ? 'reduced' : 'normal'} motion`, async ({
            page,
        }) => {
            test.setTimeout(60000)
            const pose = cameraProbe(page)
            await page.emulateMedia({ reducedMotion: 'reduce' })
            await page.goto(`/#/algorithm/${variant.route}&scrambleLength=0&seed=42`)
            await expect.poll(pose).not.toBeNull()
            await page.locator('canvas').scrollIntoViewIfNeeded()
            const box = (await page.locator('canvas').boundingBox())!
            const x = box.x + box.width * 0.5,
                y = box.y + box.height * 0.5
            // Establish a custom free view with roll, pan, and immediate zoom.
            await page.mouse.move(x, y)
            await page.mouse.down()
            await page.mouse.move(x + 55, y + 60, { steps: 3 })
            await page.mouse.up()
            await page.mouse.down({ button: 'right' })
            await page.mouse.move(x + 85, y + 80, { steps: 2 })
            await page.mouse.up({ button: 'right' })
            await page.mouse.wheel(0, -100)
            if (!reduced) await page.emulateMedia({ reducedMotion: 'no-preference' })
            const original = (await pose())!
            const selector = page.getByLabel(variant.label)
            const overlay = page.locator('.selection-overlay')
            await selector.selectOption({ index: 1 })
            await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
            expect((await pose())!.target).not.toEqual(original.target)
            // Switching directly between pieces must retain the first free view.
            await selector.selectOption({ index: 2 })
            await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
            await selector.selectOption('')
            await expect(overlay).toHaveAttribute('visibility', 'hidden')
            expectPose((await pose())!, original)
            await page.waitForTimeout(150)
            expectPose((await pose())!, original)

            // A new session remembers the restored view, not a stale piece pose.
            await selector.selectOption({ index: 1 })
            await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
            await selector.selectOption('')
            expectPose((await pose())!, original)
            await page.locator('canvas').scrollIntoViewIfNeeded()
            await page.mouse.move(x, y)
            await page.mouse.down()
            await page.mouse.move(x + 40, y + 15, { steps: 3 })
            await page.mouse.up()
            expect((await pose())!.position).not.toEqual(original.position)
        })

for (const reduced of [false, true])
    test(`clearing during playback restores the free view with ${reduced ? 'reduced' : 'normal'} motion`, async ({
        page,
    }) => {
        test.setTimeout(60000)
        const pose = cameraProbe(page)
        if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto('/#/algorithm/rubiks-cube?size=5&scrambleLength=20&seed=42')
        await expect.poll(pose).not.toBeNull()
        await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0)
        const original = (await pose())!
        const selector = page.getByLabel('Inspect cubie')
        const overlay = page.locator('.selection-overlay')
        await selector.selectOption({ index: 1 })
        await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
        await page.getByLabel('Execution speed').selectOption('0.25')
        await page.getByRole('button', { name: 'Play', exact: true }).click()
        await expect(overlay).toHaveAttribute('data-focus-mode', 'following')
        await page.locator('canvas').scrollIntoViewIfNeeded()
        const box = (await page.locator('canvas').boundingBox())!
        const x = box.x + box.width / 2,
            y = box.y + box.height / 2
        await page.mouse.move(x, y)
        await page.mouse.down()
        await page.mouse.move(x + 50, y + 20, { steps: 2 })
        await page.mouse.up()
        await selector.selectOption('')
        await expect(overlay).toHaveAttribute('visibility', 'hidden')
        expectPose((await pose())!, original)
        await page.waitForTimeout(150)
        expectPose((await pose())!, original)
        await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()

        // Empty-space clearing follows the same camera lifecycle as the selector.
        await selector.selectOption({ index: 2 })
        await expect(overlay).toHaveAttribute('data-focus-mode', 'following')
        await page.locator('canvas').scrollIntoViewIfNeeded()
        await page.mouse.click(box.x + 5, box.y + 5)
        await expect(selector).toHaveValue('')
        expectPose((await pose())!, original)
        await page.getByRole('button', { name: 'Pause', exact: true }).click()
        await page.getByRole('button', { name: 'Play', exact: true }).click()
        await page.waitForTimeout(150)
        expectPose((await pose())!, original)
    })

test('explicit presets supersede an old return view and can start a fresh focus session', async ({
    page,
}) => {
    test.setTimeout(90000)
    const pose = cameraProbe(page)
    await page.goto('/#/algorithm/rubiks-cube?size=5&scrambleLength=20&seed=42')
    await expect.poll(pose).not.toBeNull()
    await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0)
    const selector = page.getByLabel('Inspect cubie')
    const overlay = page.locator('.selection-overlay')
    for (const reactivation of ['none', 'selection', 'refocus', 'play']) {
        await selector.selectOption({ index: 1 })
        await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
        await page.getByRole('button', { name: 'Top', exact: true }).click()
        await expect(overlay).toHaveAttribute('data-focus-mode', 'preset')
        const preset = (await pose())!
        if (reactivation === 'selection') {
            await selector.selectOption({ index: 2 })
            await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
        } else if (reactivation === 'refocus') {
            await page.getByRole('button', { name: 'Refocus selected piece' }).click()
            await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
        } else if (reactivation === 'play') {
            await page.getByLabel('Execution speed').selectOption('0.25')
            await page.getByRole('button', { name: 'Play', exact: true }).click()
            await expect(overlay).toHaveAttribute('data-focus-mode', 'following')
        }
        await selector.selectOption('')
        await expect(overlay).toHaveAttribute('visibility', 'hidden')
        expectPose((await pose())!, preset)
        if (reactivation === 'play')
            await page.getByRole('button', { name: 'Pause', exact: true }).click()
    }
})

test('input replacement discards old return views before a lifecycle deselection', async ({
    page,
}) => {
    test.setTimeout(90000)
    const pose = cameraProbe(page)
    await page.goto('/#/algorithm/rubiks-cube?size=3&scrambleLength=0&seed=42')
    await expect.poll(pose).not.toBeNull()
    await page.getByRole('button', { name: 'Side', exact: true }).click()
    const oldFreeView = (await pose())!
    const selector = page.getByLabel('Inspect cubie')
    const overlay = page.locator('.selection-overlay')
    await selector.selectOption({ index: 1 })
    await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
    const seed = page.getByRole('spinbutton', { name: 'Random seed', exact: true })
    await seed.fill('43')
    await seed.blur()
    await expect(selector).toHaveValue('')
    await expect(overlay).toHaveAttribute('visibility', 'hidden')
    const newFreeView = (await pose())!
    expect(newFreeView.position).not.toEqual(oldFreeView.position)
    await selector.selectOption({ index: 2 })
    await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
    await selector.selectOption('')
    expectPose((await pose())!, newFreeView)

    await page.getByLabel('Cube size').selectOption('5')
    await expect(selector.locator('option')).toHaveCount(99)
    const resizedView = (await pose())!
    await selector.selectOption({ index: 1 })
    await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
    await selector.selectOption('')
    expectPose((await pose())!, resizedView)

    await selector.selectOption({ index: 1 })
    await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
    await page.getByRole('button', { name: 'Mirror Cube', exact: true }).click()
    const mirrorSelector = page.getByLabel('Inspect mirror piece')
    await expect(mirrorSelector).toHaveValue('')
    const mirrorView = (await pose())!
    await mirrorSelector.selectOption({ index: 1 })
    await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
    await mirrorSelector.selectOption('')
    expectPose((await pose())!, mirrorView)
})

test('touch dragging stays free after restoring the unselected view', async ({ browser }) => {
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
    })
    const page = await context.newPage()
    const pose = cameraProbe(page)
    try {
        await page.goto('http://127.0.0.1:4173/#/algorithm/rubiks-cube?scrambleLength=20&seed=42')
        await expect.poll(pose).not.toBeNull()
        const original = (await pose())!
        const selector = page.getByLabel('Inspect cubie')
        await selector.selectOption({ index: 1 })
        await expect(page.locator('.selection-overlay')).toHaveAttribute('data-focus-mode', 'free')
        await selector.selectOption('')
        expectPose((await pose())!, original)
        await page.locator('canvas').scrollIntoViewIfNeeded()
        const box = (await page.locator('canvas').boundingBox())!
        const x = box.x + box.width * 0.5,
            y = box.y + box.height * 0.5
        const client = await context.newCDPSession(page)
        await client.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y }],
        })
        await client.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: x + 45, y: y + 15 }],
        })
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        const released = (await pose())!
        expect(released.position).not.toEqual(original.position)
        await page.waitForTimeout(80)
        expect((await pose())!.position).not.toEqual(released.position)
    } finally {
        await context.close()
    }
})
