import { expect, test, type Page } from '@playwright/test'

function cameraProbe(page: Page) {
    let fiber = ''
    page.on('request', (request) => {
        if (request.url().includes('/deps/@react-three_fiber.js')) fiber = request.url()
    })
    return async (sampleFrames = 0) => {
        if (!fiber) return null
        return page.evaluate(
            async ({ url, sampleFrames }) => {
                const { _roots } = await import(/* @vite-ignore */ url)
                const state = _roots.get(document.querySelector('canvas'))?.store.getState()
                if (!state?.controls) return null
                const samples: number[][] = []
                if (sampleFrames)
                    await new Promise<void>((resolve) => {
                        const sample = () => {
                            samples.push(state.camera.position.toArray())
                            if (samples.length === sampleFrames) resolve()
                            else requestAnimationFrame(sample)
                        }
                        requestAnimationFrame(sample)
                    })
                return {
                    position: state.camera.position.toArray() as number[],
                    target: state.controls.target.toArray() as number[],
                    up: state.camera.up.toArray() as number[],
                    samples,
                    frame: Number(
                        document.querySelector<HTMLInputElement>(
                            '[aria-label="Execution timeline"]',
                        )?.value,
                    ),
                }
            },
            { url: fiber, sampleFrames },
        )
    }
}

function expectDampedCoast(samples: number[][]) {
    const distances = samples
        .slice(1)
        .map((position, i) =>
            Math.hypot(...position.map((value, axis) => value - samples[i][axis])),
        )
    const early = Math.max(...distances.slice(0, 10))
    expect(early).toBeGreaterThan(0.001)
    expect(Math.max(...distances.slice(-10))).toBeLessThan(early * 0.5)
}

for (const variant of [
    { route: 'rubiks-cube?size=3', label: 'Inspect cubie' },
    { route: 'rubiks-cube?size=4', label: 'Inspect cubie' },
    { route: 'rubiks-cube?size=5', label: 'Inspect cubie' },
    { route: 'mirror-cube?', label: 'Inspect mirror piece' },
    { route: 'square-one?', label: 'Inspect Square-1 piece' },
])
    test(`${variant.route} retains playback damping before and after deselection`, async ({
        page,
    }) => {
        test.setTimeout(60000)
        const pose = cameraProbe(page)
        await page.goto(`/#/algorithm/${variant.route}&scrambleLength=20&seed=42`)
        await expect.poll(pose).not.toBeNull()
        await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0)
        await page.getByLabel('Execution speed').selectOption('0.25')
        await page.getByRole('button', { name: 'Play', exact: true }).click()
        const drag = async () => {
            await page.locator('canvas').scrollIntoViewIfNeeded()
            const box = (await page.locator('canvas').boundingBox())!
            const x = box.x + box.width * 0.45,
                y = box.y + box.height * 0.4
            await page.mouse.move(x, y)
            await page.mouse.down()
            await page.mouse.move(x + 70, y + 30, { steps: 4 })
            await page.mouse.up()
        }
        await drag()
        expectDampedCoast((await pose(40))!.samples)

        await page.getByLabel(variant.label).selectOption({ index: 1 })
        await expect(page.locator('.selection-overlay')).toHaveAttribute(
            'data-focus-mode',
            'following',
        )
        await page.getByLabel(variant.label).selectOption('')
        await drag()
        expectDampedCoast((await pose(40))!.samples)

        await page.emulateMedia({ reducedMotion: 'reduce' })
        await drag()
        const stopped = (await pose(10))!.samples
        for (const position of stopped)
            position.forEach((value, axis) => expect(value).toBeCloseTo(stopped[0][axis], 10))
        await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
    })

for (const selected of [false, true])
    for (const speed of ['1', '32'])
        test(`continuous playback drag at ${speed}x with ${selected ? 'a selected piece' : 'no selection'}`, async ({
            page,
        }) => {
            test.setTimeout(60000)
            const pose = cameraProbe(page)
            await page.goto('/#/algorithm/rubiks-cube?size=5&scrambleLength=20&seed=42')
            await expect.poll(pose).not.toBeNull()
            await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0)
            if (selected) {
                await page.getByLabel('Inspect cubie').selectOption('-4,-4,-4')
                await expect(page.locator('.selection-overlay')).toHaveAttribute(
                    'data-focus-mode',
                    'free',
                )
            }
            await page.getByLabel('Execution speed').selectOption(speed)
            await page.locator('canvas').scrollIntoViewIfNeeded()
            const box = (await page.locator('canvas').boundingBox())!
            const x = box.x + box.width * 0.5
            const y = box.y + box.height * 0.5
            await page.mouse.move(x, y)
            await page.mouse.down()
            // Start the replay at the gesture. At 32x, scrolling and a long
            // synthetic input sequence can otherwise exhaust the trace on CI.
            await page.keyboard.press('Space')
            await page.mouse.move(x + 55, y + 20, { steps: 2 })
            const first = (await pose())!
            await expect.poll(async () => (await pose())!.frame).toBeGreaterThan(first.frame + 2)
            const held = (await pose())!
            await page.mouse.move(x + 110, y + 40, { steps: 2 })
            const second = (await pose())!
            expect(second.position).not.toEqual(held.position)
            if (selected)
                await expect(page.locator('.selection-overlay')).toHaveAttribute(
                    'data-focus-mode',
                    'held',
                )
            await page.mouse.up()
            if (!selected) {
                const coast = (await pose(8))!.samples
                expect(Math.hypot(...coast.at(-1)!.map((v, i) => v - coast[0][i]))).toBeGreaterThan(
                    0.001,
                )
            }
            await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
        })

for (const selected of [false, true])
    test(`touch playback drag with ${selected ? 'a selected piece' : 'no selection'}`, async ({
        browser,
    }) => {
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
            await expect.poll(pose).not.toBeNull()
            await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0)
            if (selected) {
                await page.getByLabel('Inspect cubie').selectOption('-4,-4,-4')
                await expect(page.locator('.selection-overlay')).toHaveAttribute(
                    'data-focus-mode',
                    'free',
                )
            }
            await page.getByRole('button', { name: 'Play', exact: true }).click()
            await page.locator('canvas').scrollIntoViewIfNeeded()
            const box = (await page.locator('canvas').boundingBox())!
            const x = box.x + box.width * 0.45
            const y = box.y + box.height * 0.5
            const client = await context.newCDPSession(page)
            await client.send('Input.dispatchTouchEvent', {
                type: 'touchStart',
                touchPoints: [{ x, y }],
            })
            await client.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ x: x + 35, y: y + 10 }],
            })
            const first = (await pose())!
            await expect.poll(async () => (await pose())!.frame).toBeGreaterThan(first.frame + 2)
            const held = (await pose())!
            await client.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ x: x + 70, y: y + 20 }],
            })
            expect((await pose())!.position).not.toEqual(held.position)
            if (selected)
                await expect(page.locator('.selection-overlay')).toHaveAttribute(
                    'data-focus-mode',
                    'held',
                )
            await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
            if (!selected) {
                const coast = (await pose(8))!.samples
                expect(Math.hypot(...coast.at(-1)!.map((v, i) => v - coast[0][i]))).toBeGreaterThan(
                    0.001,
                )
            }
        } finally {
            await context.close()
        }
    })
