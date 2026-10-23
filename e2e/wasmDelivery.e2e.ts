import { expect, test } from '@playwright/test'

const solved = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'

test('loads the real Rust binary and independently verifies a cube solution', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const binary = page.waitForResponse(
        (response) =>
            new URL(response.url()).pathname.endsWith('.wasm') &&
            response.request().resourceType() === 'fetch',
    )
    await page.goto('./#/algorithm/rubiks-cube?scrambleLength=20&seed=42')
    const response = await binary
    expect(response.ok()).toBe(true)
    expect(Array.from((await response.body()).subarray(0, 4))).toEqual([0, 97, 115, 109])
    await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Last step' }).click()
    await expect(page.getByRole('region', { name: 'Cube notation and selection' })).toHaveAttribute(
        'data-facelets',
        solved,
    )
    expect(errors).toEqual([])
})

test('reports a WASM loading failure while keeping the scrambled input inspectable', async ({
    page,
    context,
}) => {
    await context.route('**/*.wasm*', (route) =>
        route.request().resourceType() === 'fetch'
            ? route.fulfill({ status: 503, body: 'unavailable' })
            : route.continue(),
    )
    await page.goto('./#/algorithm/rubiks-cube?scrambleLength=20&seed=42')
    await expect(page.locator('.terminal-message')).toContainText('503')
    await expect(page.getByRole('region', { name: 'Cube notation and selection' })).toHaveAttribute(
        'data-cubies',
        '26',
    )
    await expect(
        page.getByRole('region', { name: 'Cube notation and selection' }),
    ).not.toHaveAttribute('data-facelets', solved)
    await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0)
})

test('cancels a pending WASM load and discards it when the input is replaced', async ({
    page,
    context,
}) => {
    let release!: () => void
    const pending = new Promise<void>((resolve) => (release = resolve))
    await context.route('**/*.wasm*', async (route) => {
        if (route.request().resourceType() !== 'fetch') {
            await route.continue()
            return
        }
        await pending
        await route.continue().catch(() => {})
    })
    try {
        await page.goto('./#/algorithm/rubiks-cube?scrambleLength=100&seed=123')
        await page.getByRole('button', { name: 'Cancel generation' }).click()
        await expect(page.locator('.terminal-message')).toContainText('Cancelled')
        await page.goto('./#/algorithm/rubiks-cube?scrambleLength=0&seed=42')
        release()
        await expect(page.getByTestId('cube-solution')).toHaveText('No moves needed')
        await expect(
            page.getByRole('region', { name: 'Cube notation and selection' }),
        ).toHaveAttribute('data-facelets', solved)
    } finally {
        release()
    }
})
