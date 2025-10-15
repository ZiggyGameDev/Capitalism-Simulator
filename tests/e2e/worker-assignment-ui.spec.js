import { test, expect } from '@playwright/test'

test.describe('Worker Assignment UI Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')

    // Wait for game to initialize
    await page.waitForSelector('.skill-list')
    await page.waitForSelector('.activity-list')

    // Reset game to clean state
    await page.evaluate(() => {
      localStorage.removeItem('incrementalGameSave')
      location.reload()
    })

    await page.waitForSelector('.activity-list')
  })

  test('clicking + button should immediately update worker count in UI', async ({ page }) => {
    // Find the first activity's worker assignment section
    const firstActivity = page.locator('.activity-item').first()

    // Find the basicWorker row within the first activity
    const workerRow = firstActivity.locator('[data-worker-row="basicWorker"]')

    // Get the initial worker count
    const workerCount = workerRow.locator('.worker-count')
    const initialCount = await workerCount.textContent()
    expect(initialCount).toBe('0')

    // Get initial available workers
    const workerSummary = page.locator('.worker-summary-compact')
    const initialSummaryText = await workerSummary.textContent()
    expect(initialSummaryText).toContain('2/2') // Should start with 2/2 available

    // Click the + button
    const plusButton = workerRow.locator('.worker-btn-plus')
    await plusButton.click()

    // Wait a moment for any animations/updates
    await page.waitForTimeout(200)

    // Verify worker count updated immediately
    const updatedCount = await workerCount.textContent()
    expect(updatedCount).toBe('1')

    // Verify worker summary updated
    const updatedSummaryText = await workerSummary.textContent()
    expect(updatedSummaryText).toContain('1/2') // Should now show 1/2 available

    // Click + again
    await plusButton.click()
    await page.waitForTimeout(200)

    // Verify it incremented to 2
    const finalCount = await workerCount.textContent()
    expect(finalCount).toBe('2')

    // Verify all workers are now assigned
    const finalSummaryText = await workerSummary.textContent()
    expect(finalSummaryText).toContain('0/2') // Should show 0/2 available
  })

  test('clicking - button should immediately update worker count in UI', async ({ page }) => {
    // First assign 2 workers
    const firstActivity = page.locator('.activity-item').first()
    const workerRow = firstActivity.locator('[data-worker-row="basicWorker"]')
    const plusButton = workerRow.locator('.worker-btn-plus')

    await plusButton.click()
    await page.waitForTimeout(100)
    await plusButton.click()
    await page.waitForTimeout(100)

    // Verify we have 2 workers assigned
    const workerCount = workerRow.locator('.worker-count')
    expect(await workerCount.textContent()).toBe('2')

    // Now click - button
    const minusButton = workerRow.locator('.worker-btn-minus')
    await minusButton.click()
    await page.waitForTimeout(200)

    // Verify count decreased
    expect(await workerCount.textContent()).toBe('1')

    // Verify worker summary updated
    const workerSummary = page.locator('.worker-summary-compact')
    const summaryText = await workerSummary.textContent()
    expect(summaryText).toContain('1/2') // Should show 1/2 available

    // Click - again
    await minusButton.click()
    await page.waitForTimeout(200)

    // Verify back to 0
    expect(await workerCount.textContent()).toBe('0')
    expect(await workerSummary.textContent()).toContain('2/2') // All available
  })

  test('worker count should update without switching skills', async ({ page }) => {
    // This test verifies the bug: worker count SHOULD update immediately,
    // not only when switching skills

    const firstActivity = page.locator('.activity-item').first()
    const workerRow = firstActivity.locator('[data-worker-row="basicWorker"]')
    const workerCount = workerRow.locator('.worker-count')
    const plusButton = workerRow.locator('.worker-btn-plus')

    // Assign a worker
    await plusButton.click()
    await page.waitForTimeout(200)

    // Verify it updated WITHOUT switching skills
    expect(await workerCount.textContent()).toBe('1')

    // Now assign another worker
    await plusButton.click()
    await page.waitForTimeout(200)

    // Should still update without skill switch
    expect(await workerCount.textContent()).toBe('2')
  })

  test('worker buttons should enable/disable based on availability', async ({ page }) => {
    const firstActivity = page.locator('.activity-item').first()
    const workerRow = firstActivity.locator('[data-worker-row="basicWorker"]')
    const plusButton = workerRow.locator('.worker-btn-plus')
    const minusButton = workerRow.locator('.worker-btn-minus')

    // Initially: + enabled (workers available), - disabled (none assigned)
    await expect(plusButton).toBeEnabled()
    await expect(minusButton).toBeDisabled()

    // Assign one worker
    await plusButton.click()
    await page.waitForTimeout(200)

    // Now both should be enabled
    await expect(plusButton).toBeEnabled()
    await expect(minusButton).toBeEnabled()

    // Assign second worker (all workers now assigned)
    await plusButton.click()
    await page.waitForTimeout(200)

    // + should be disabled (no workers available), - enabled
    await expect(plusButton).toBeDisabled()
    await expect(minusButton).toBeEnabled()

    // Unassign one
    await minusButton.click()
    await page.waitForTimeout(200)

    // Both enabled again
    await expect(plusButton).toBeEnabled()
    await expect(minusButton).toBeEnabled()
  })

  test('activity duration should update when workers are assigned', async ({ page }) => {
    const firstActivity = page.locator('.activity-item').first()
    const durationElement = firstActivity.locator('.activity-duration')

    // Initial duration should show "needs workers"
    const initialDuration = await durationElement.textContent()
    expect(initialDuration).toContain('(needs workers)')

    // Assign a worker
    const workerRow = firstActivity.locator('[data-worker-row="basicWorker"]')
    await workerRow.locator('.worker-btn-plus').click()
    await page.waitForTimeout(200)

    // Duration should now show actual time (not "needs workers")
    const updatedDuration = await durationElement.textContent()
    expect(updatedDuration).not.toContain('(needs workers)')
    expect(updatedDuration).toMatch(/\d+\.?\d*s/) // Should show time like "5s" or "5.5s"
  })

  test('activity should show production rate after workers assigned', async ({ page }) => {
    const firstActivity = page.locator('.activity-item').first()
    const resourcesPerMin = firstActivity.locator('.activity-resources-per-min')

    // Initially should be empty (no production)
    expect(await resourcesPerMin.textContent()).toBe('')

    // Assign a worker
    const workerRow = firstActivity.locator('[data-worker-row="basicWorker"]')
    await workerRow.locator('.worker-btn-plus').click()
    await page.waitForTimeout(200)

    // Should now show production rate
    const rateText = await resourcesPerMin.textContent()
    expect(rateText).toMatch(/\/min/) // Should contain "/min"
    expect(rateText.length).toBeGreaterThan(0)
  })

  test('Remove All button should appear and work', async ({ page }) => {
    const firstActivity = page.locator('.activity-item').first()
    const removeAllButton = firstActivity.locator('.worker-btn-remove-all')

    // Initially should be hidden
    await expect(removeAllButton).toHaveClass(/hidden/)

    // Assign 2 workers
    const workerRow = firstActivity.locator('[data-worker-row="basicWorker"]')
    const plusButton = workerRow.locator('.worker-btn-plus')
    await plusButton.click()
    await page.waitForTimeout(100)
    await plusButton.click()
    await page.waitForTimeout(100)

    // Remove All button should now be visible
    await expect(removeAllButton).not.toHaveClass(/hidden/)

    // Click Remove All
    await removeAllButton.click()
    await page.waitForTimeout(200)

    // Worker count should be back to 0
    const workerCount = workerRow.locator('.worker-count')
    expect(await workerCount.textContent()).toBe('0')

    // Remove All should be hidden again
    await expect(removeAllButton).toHaveClass(/hidden/)
  })

  test('worker assignment persists across skill switches', async ({ page }) => {
    // Assign workers to first activity
    const farmingSkill = page.locator('.skill-item').first()
    const firstActivity = page.locator('.activity-item').first()
    const workerRow = firstActivity.locator('[data-worker-row="basicWorker"]')

    await workerRow.locator('.worker-btn-plus').click()
    await page.waitForTimeout(100)

    // Verify worker assigned
    expect(await workerRow.locator('.worker-count').textContent()).toBe('1')

    // Switch to a different skill
    const gatheringSkill = page.locator('.skill-item').nth(1)
    await gatheringSkill.click()
    await page.waitForTimeout(200)

    // Switch back to farming
    await farmingSkill.click()
    await page.waitForTimeout(200)

    // Worker should still be assigned
    const workerRowAfterSwitch = page.locator('.activity-item').first().locator('[data-worker-row="basicWorker"]')
    expect(await workerRowAfterSwitch.locator('.worker-count').textContent()).toBe('1')
  })
})
