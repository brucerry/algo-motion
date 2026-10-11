import { expect, test } from '@playwright/test'

test('a stationary held gesture during playback releases to the existing piece lock', async ({
    page,
}) => {
    test.setTimeout(60000)
    await page.goto('/#/algorithm/mirror-cube?scrambleLength=20&seed=42')
    const selector = page.getByLabel('Inspect mirror piece')
    await selector.selectOption('2,2,2')
    const overlay = page.locator('.selection-overlay')
    await expect(overlay).toHaveAttribute('data-focus-mode', 'free')
    await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0, {
        timeout: 30000,
    })
    await page.getByLabel('Execution speed').selectOption('0.25')
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await page.locator('canvas').scrollIntoViewIfNeeded()
    const box = (await page.locator('canvas').boundingBox())!
    // Hold over empty space: this is camera ownership, not an empty-space click.
    await page.mouse.move(box.x + 8, box.y + 8)
    await page.mouse.down()
    await expect(overlay).toHaveAttribute('data-focus-mode', 'held')
    await page.waitForTimeout(350)
    await page.mouse.up()
    await expect(overlay).toHaveAttribute('data-focus-mode', 'returning')
    await expect(selector).toHaveValue('2,2,2')
    await expect(overlay).toHaveAttribute('data-focus-mode', 'following')
    await expect(selector).toHaveValue('2,2,2')
})
