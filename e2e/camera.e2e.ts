import { expect, test, type Page } from '@playwright/test'

type CameraPose = { position: number[]; up: number[]; target: number[] }

declare global {
    interface Window {
        __cameraRotationProbe: { total: number; inverted: boolean; stop: () => void }
    }
}

async function waitForCamera(page: Page, fiberUrl: string) {
    // A visible canvas can precede the Fiber root and controller on slower devices.
    await expect
        .poll(() =>
            page.evaluate(async (url) => {
                const { _roots } = await import(/* @vite-ignore */ url)
                return Boolean(
                    _roots.get(document.querySelector('canvas'))?.store.getState().controls,
                )
            }, fiberUrl),
        )
        .toBe(true)
}

async function motionSamples(page: Page, fiberUrl: string, count = 40): Promise<number[][]> {
    return page.evaluate(
        async ({ url, count }) => {
            const { _roots } = await import(/* @vite-ignore */ url)
            const { camera } = _roots.get(document.querySelector('canvas')).store.getState()
            return new Promise<number[][]>((resolve) => {
                const samples: number[][] = []
                const sample = () => {
                    samples.push(camera.position.toArray())
                    if (samples.length === count) resolve(samples)
                    else requestAnimationFrame(sample)
                }
                requestAnimationFrame(sample)
            })
        },
        { url: fiberUrl, count },
    )
}

async function readPose(page: Page, fiberUrl: string): Promise<CameraPose> {
    return page.evaluate(async (url) => {
        const { _roots } = await import(/* @vite-ignore */ url)
        const { camera, controls } = _roots.get(document.querySelector('canvas')).store.getState()
        return {
            position: camera.position.toArray(),
            up: camera.up.toArray(),
            target: controls.target.toArray(),
        }
    }, fiberUrl)
}

async function uprightAngle(page: Page, fiberUrl: string) {
    return page.evaluate(async (url) => {
        const { _roots } = await import(/* @vite-ignore */ url)
        const { camera, controls } = _roots.get(document.querySelector('canvas')).store.getState()
        const upright = camera.clone()
        upright.up.set(0, 1, 0)
        upright.lookAt(controls.target)
        return camera.quaternion.angleTo(upright.quaternion)
    }, fiberUrl)
}

// Accumulate signed camera-up rotation, so reaching 360 degrees cannot be
// mistaken for a clamped camera returning to the same starting position.
async function fullVerticalTurn(
    page: Page,
    fiberUrl: string,
    drag: (x: number, startY: number, endY: number) => Promise<void>,
) {
    const canvas = page.locator('canvas')
    await canvas.scrollIntoViewIfNeeded()
    await waitForCamera(page, fiberUrl)
    const box = (await canvas.boundingBox())!
    const initial = await readPose(page, fiberUrl)
    const eye = initial.position.map((value, i) => value - initial.target[i])
    // Sample every rendered frame, including motion between gestures. Sampling
    // only on mouse-up can skip the inverted view when damping is enabled.
    await page.evaluate(async (url) => {
        const { _roots } = await import(/* @vite-ignore */ url)
        const { camera, controls } = _roots.get(document.querySelector('canvas')).store.getState()
        const eye = camera.position.clone().sub(controls.target)
        const length = Math.hypot(eye.x, eye.z)
        const axisX = eye.z / length
        const axisZ = -eye.x / length
        let previous = Math.atan2(axisX * camera.up.z - axisZ * camera.up.x, camera.up.y)
        let request = 0
        const probe = {
            total: 0,
            inverted: false,
            stop: () => cancelAnimationFrame(request),
        }
        const sample = () => {
            const angle = Math.atan2(axisX * camera.up.z - axisZ * camera.up.x, camera.up.y)
            probe.total += Math.atan2(Math.sin(angle - previous), Math.cos(angle - previous))
            previous = angle
            probe.inverted ||= camera.up.y < -0.8
            request = requestAnimationFrame(sample)
        }
        window.__cameraRotationProbe = probe
        request = requestAnimationFrame(sample)
    }, fiberUrl)
    let total = 0
    for (let i = 0; i < 32 && Math.abs(total) < 2 * Math.PI + 0.15; i++) {
        await drag(box.x + box.width / 2, box.y + box.height * 0.2, box.y + box.height * 0.8)
        const pose = await readPose(page, fiberUrl)
        total = await page.evaluate(() => window.__cameraRotationProbe.total)
        expect(Math.hypot(...pose.position.map((value, j) => value - pose.target[j]))).toBeCloseTo(
            Math.hypot(...eye),
            4,
        )
    }
    const inverted = await page.evaluate(() => {
        window.__cameraRotationProbe.stop()
        return window.__cameraRotationProbe.inverted
    })
    expect(inverted).toBe(true)
    expect(Math.abs(total)).toBeGreaterThan(2 * Math.PI)
    await page.getByRole('button', { name: 'Reset camera' }).click()
    await expect.poll(() => readPose(page, fiberUrl)).toEqual(initial)
    for (const preset of ['Top', 'Side']) {
        await page.getByRole('button', { name: preset, exact: true }).click()
        await expect.poll(() => uprightAngle(page, fiberUrl)).toBeLessThan(1e-7)
    }
    await page.getByRole('button', { name: 'Reset camera' }).click()
}

for (const id of [
    'rubiks-cube?scrambleLength=0',
    'astar',
    'rrt',
    'gradient-descent',
    'quick-sort',
]) {
    test(`${id} camera completes vertical turns and preserves zoom, pan, and presets`, async ({
        page,
    }) => {
        test.setTimeout(90000)
        let fiberUrl = ''
        page.on('request', (request) => {
            if (request.url().includes('/deps/@react-three_fiber.js')) fiberUrl = request.url()
        })
        await page.setViewportSize({ width: 1440, height: 900 })
        const errors: string[] = []
        page.on('pageerror', (error) => errors.push(error.message))
        await page.goto(`/#/algorithm/${id}`)
        await expect(page.locator('canvas')).toBeVisible()
        await page.getByRole('button', { name: 'Reset camera' }).click()
        await fullVerticalTurn(page, fiberUrl, async (x, startY, endY) => {
            await page.mouse.move(x, startY)
            await page.mouse.down()
            await page.mouse.move(x, endY, { steps: 4 })
            await page.waitForTimeout(30)
            await page.mouse.up()
        })
        await page.locator('canvas').scrollIntoViewIfNeeded()
        const box = (await page.locator('canvas').boundingBox())!
        const x = box.x + box.width / 2
        const y = box.y + box.height / 2
        const initial = await readPose(page, fiberUrl)
        await page.mouse.move(x, y)
        await page.mouse.wheel(0, -100)
        await expect
            .poll(async () => (await readPose(page, fiberUrl)).position)
            .not.toEqual(initial.position)
        await page.mouse.down({ button: 'right' })
        await page.mouse.move(x + 50, y + 20, { steps: 5 })
        await page.mouse.up({ button: 'right' })
        await expect
            .poll(async () => (await readPose(page, fiberUrl)).target)
            .not.toEqual(initial.target)
        expect(errors).toEqual([])
    })
}

test('mobile touch can rotate a full vertical circle', async ({ browser }) => {
    test.setTimeout(60000)
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
    })
    const page = await context.newPage()
    let fiberUrl = ''
    page.on('request', (request) => {
        if (request.url().includes('/deps/@react-three_fiber.js')) fiberUrl = request.url()
    })
    await page.goto('http://127.0.0.1:4173/#/algorithm/rubiks-cube?scrambleLength=0')
    await expect(page.locator('canvas')).toBeVisible()
    const client = await context.newCDPSession(page)
    await fullVerticalTurn(page, fiberUrl, async (x, startY, endY) => {
        await client.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y: startY }],
        })
        for (let i = 1; i <= 8; i++) {
            await client.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ x, y: startY + ((endY - startY) * i) / 8 }],
            })
            await page.waitForTimeout(20)
        }
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    })
    await context.close()
})

test('drag motion eases to rest and camera presets stop remaining momentum', async ({ page }) => {
    test.setTimeout(60000)
    let fiberUrl = ''
    page.on('request', (request) => {
        if (request.url().includes('/deps/@react-three_fiber.js')) fiberUrl = request.url()
    })
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/#/algorithm/rrt')
    await page.locator('canvas').scrollIntoViewIfNeeded()
    await waitForCamera(page, fiberUrl)
    const box = (await page.locator('canvas').boundingBox())!
    const drag = async () => {
        await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.4)
        await page.mouse.down()
        await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.6, { steps: 4 })
        await page.mouse.up()
    }
    await drag()
    const samples = await motionSamples(page, fiberUrl)
    const distances = samples
        .slice(1)
        .map((position, i) =>
            Math.hypot(...position.map((value, axis) => value - samples[i][axis])),
        )
    const early = Math.max(...distances.slice(0, 10))
    expect(early).toBeGreaterThan(0.001)
    expect(Math.max(...distances.slice(-10))).toBeLessThan(early * 0.5)

    await drag()
    await page.getByRole('button', { name: 'Reset camera' }).click()
    const reset = await readPose(page, fiberUrl)
    expect(await uprightAngle(page, fiberUrl)).toBeLessThan(1e-7)
    for (const position of await motionSamples(page, fiberUrl, 15)) {
        expect(position).toEqual(reset.position)
    }

    // The original wheel zoom applies its complete 0.95 ratio immediately.
    await page.locator('canvas').scrollIntoViewIfNeeded()
    const beforeZoom = await readPose(page, fiberUrl)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, -100)
    await expect
        .poll(async () => {
            const zoomed = await readPose(page, fiberUrl)
            return (
                Math.hypot(...zoomed.position.map((value, i) => value - zoomed.target[i])) /
                Math.hypot(...beforeZoom.position.map((value, i) => value - beforeZoom.target[i]))
            )
        })
        .toBeCloseTo(0.95, 6)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.locator('canvas').scrollIntoViewIfNeeded()
    await drag()
    const stopped = await motionSamples(page, fiberUrl, 10)
    for (const position of stopped) expect(position).toEqual(stopped[0])
})
