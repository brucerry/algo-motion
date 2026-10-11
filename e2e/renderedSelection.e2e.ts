import { expect, test } from '@playwright/test'

test('outlines publish the displayed animated pose through cube, Mirror and Square-1 turns', async ({
    page,
}) => {
    test.setTimeout(180000)
    let fiberUrl = ''
    page.on('request', (request) => {
        if (request.url().includes('/deps/@react-three_fiber.js')) fiberUrl = request.url()
    })
    for (const [route, label] of [
        ['rubiks-cube?size=3', 'Inspect cubie'],
        ['rubiks-cube?size=4', 'Inspect cubie'],
        ['rubiks-cube?size=5', 'Inspect cubie'],
        ['mirror-cube?', 'Inspect mirror piece'],
        ['square-one?', 'Inspect Square-1 piece'],
    ]) {
        await page.goto(`/#/algorithm/${route}&scrambleLength=5&seed=42`)
        const selector = page.getByLabel(label)
        const id = (await selector.locator('option').last().getAttribute('value'))!
        await selector.selectOption(id)
        await expect(page.locator('.selection-overlay')).toHaveAttribute('data-focus-mode', 'free')
        await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0, {
            timeout: 60000,
        })
        await page.getByLabel('Execution speed').selectOption('0.25')
        let changed = false
        for (let step = 0; step < 12 && !changed; step++) {
            const next = page.getByRole('button', { name: 'Next step' })
            if (await next.isDisabled()) break
            await next.click()
            const samples = await page.evaluate(
                async ({ url, id }) => {
                    const { _roots } = await import(/* @vite-ignore */ url)
                    const { scene, controls } = _roots
                        .get(document.querySelector('canvas'))
                        .store.getState()
                    const samples: {
                        error: number
                        matrix: number[]
                        identity: string
                        controller: boolean
                    }[] = []
                    await new Promise<void>((resolve) => {
                        const sample = () => {
                            const anchor = scene.getObjectByName('selected-piece-anchor')
                            const owner = anchor?.parent
                            const mesh = owner?.isMesh
                                ? owner
                                : owner?.children.find((child: { isMesh: boolean }) => child.isMesh)
                            if (mesh) {
                                const center = mesh.position
                                    .clone()
                                    .copy(mesh.geometry.boundingBox.min)
                                    .add(mesh.geometry.boundingBox.max)
                                    .multiplyScalar(0.5)
                                    .applyMatrix4(owner.matrixWorld)
                                    .toArray()
                                const published = document
                                    .querySelector('.selection-overlay')!
                                    .getAttribute('data-piece-center')!
                                    .split(',')
                                    .map(Number)
                                samples.push({
                                    error: Math.hypot(
                                        ...center.map(
                                            (value: number, i: number) => value - published[i],
                                        ),
                                    ),
                                    matrix: owner.matrixWorld.toArray(),
                                    identity: anchor.userData.pieceId,
                                    controller:
                                        _roots
                                            .get(document.querySelector('canvas'))
                                            .store.getState().controls === controls,
                                })
                            }
                            if (samples.length >= 10) resolve()
                            else requestAnimationFrame(sample)
                        }
                        requestAnimationFrame(sample)
                    })
                    return samples.map((sample) => ({
                        ...sample,
                        correctIdentity: sample.identity === id,
                    }))
                },
                { url: fiberUrl, id },
            )
            for (const sample of samples) {
                expect(sample.error).toBeLessThan(1e-5)
                expect(sample.correctIdentity).toBe(true)
                expect(sample.controller).toBe(true)
            }
            changed ||= samples.some((sample) =>
                sample.matrix.some((value, i) => Math.abs(value - samples[0].matrix[i]) > 0.01),
            )
            if (!changed) await page.waitForTimeout(900)
        }
        expect(changed, `${route} includes a genuinely animated selected physical piece`).toBe(true)
    }
})
