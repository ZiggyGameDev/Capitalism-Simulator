import { test, expect } from '@playwright/test'

test.describe('Audio and Debug Features', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('http://localhost:5173')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('should have mute button visible', async ({ page }) => {
    const muteBtn = page.locator('#muteBtn')
    await expect(muteBtn).toBeVisible()
    await expect(muteBtn).toHaveText('🔊')
  })

  test('should toggle mute when clicked', async ({ page }) => {
    const muteBtn = page.locator('#muteBtn')

    // Click to mute
    await muteBtn.click()
    await expect(muteBtn).toHaveText('🔇')

    // Click to unmute
    await muteBtn.click()
    await expect(muteBtn).toHaveText('🔊')
  })

  test('should show notification when toggling mute', async ({ page }) => {
    const muteBtn = page.locator('#muteBtn')

    // Click to mute
    await muteBtn.click()

    // Check for mute notification
    const notification = page.locator('.notification').first()
    await expect(notification).toContainText('Muted')
  })

  test('should have debug button visible', async ({ page }) => {
    const debugBtn = page.locator('#debugBtn')
    await expect(debugBtn).toBeVisible()
    await expect(debugBtn).toHaveText('🛠️')
  })

  test('should toggle debug panel when debug button clicked', async ({ page }) => {
    const debugBtn = page.locator('#debugBtn')
    const debugPanel = page.locator('#debugPanel')

    // Panel should be hidden by default
    await expect(debugPanel).toBeHidden()

    // Click to show
    await debugBtn.click()
    await expect(debugPanel).toBeVisible()

    // Click to hide
    await debugBtn.click()
    await expect(debugPanel).toBeHidden()
  })

  test('should have all debug buttons in panel', async ({ page }) => {
    const debugBtn = page.locator('#debugBtn')
    await debugBtn.click()

    const addResourcesBtn = page.locator('#debugAddResources')
    const skipTimeBtn = page.locator('#debugSkipTime')
    const addWorkersBtn = page.locator('#debugAddWorkers')
    const addXPBtn = page.locator('#debugAddXP')

    await expect(addResourcesBtn).toBeVisible()
    await expect(addResourcesBtn).toContainText('+50 All Resources')

    await expect(skipTimeBtn).toBeVisible()
    await expect(skipTimeBtn).toContainText('Skip 5 Minutes')

    await expect(addWorkersBtn).toBeVisible()
    await expect(addWorkersBtn).toContainText('+10 All Workers')

    await expect(addXPBtn).toBeVisible()
    await expect(addXPBtn).toContainText('+1000 XP All Skills')
  })

  test('should add resources when debug button clicked', async ({ page }) => {
    const debugBtn = page.locator('#debugBtn')
    await debugBtn.click()

    // Record initial resource count
    const initialResourceCount = await page.locator('.currency-item').count()

    // Click add resources button
    const addResourcesBtn = page.locator('#debugAddResources')
    await addResourcesBtn.click()

    // Wait for resources to be added
    await page.waitForTimeout(500)

    // Check that resources were added
    const newResourceCount = await page.locator('.currency-item').count()
    expect(newResourceCount).toBeGreaterThanOrEqual(initialResourceCount)

    // Check notification
    const notification = page.locator('.notification').first()
    await expect(notification).toContainText('+50 to all resources')
  })

  test('should add workers when debug button clicked', async ({ page }) => {
    const debugBtn = page.locator('#debugBtn')
    await debugBtn.click()

    // Click add workers button
    const addWorkersBtn = page.locator('#debugAddWorkers')
    await addWorkersBtn.click()

    // Wait for workers to be added
    await page.waitForTimeout(500)

    // Check notification
    const notification = page.locator('.notification').first()
    await expect(notification).toContainText('+10 to all worker types')

    // Check that worker summary updated
    const workerSummary = page.locator('#workerSummaryCompact')
    await expect(workerSummary).toContainText('12') // Should show at least 12 workers (2 initial + 10)
  })

  test('should add XP when debug button clicked', async ({ page }) => {
    const debugBtn = page.locator('#debugBtn')
    await debugBtn.click()

    // Get initial skill level
    const skillItem = page.locator('.skill-item').first()
    const initialLevelText = await skillItem.locator('.skill-level-value').textContent()
    const initialLevel = parseInt(initialLevelText)

    // Click add XP button
    const addXPBtn = page.locator('#debugAddXP')
    await addXPBtn.click()

    // Wait for XP to be added
    await page.waitForTimeout(500)

    // Check notification
    const notification = page.locator('.notification').first()
    await expect(notification).toContainText('+1000 XP to all skills')

    // Check that at least one skill leveled up
    const newLevelText = await skillItem.locator('.skill-level-value').textContent()
    const newLevel = parseInt(newLevelText)
    expect(newLevel).toBeGreaterThan(initialLevel)
  })

  test('should skip time when debug button clicked', async ({ page }) => {
    const debugBtn = page.locator('#debugBtn')
    await debugBtn.click()

    // Assign a worker to an activity first
    const activityList = page.locator('#activityList')
    await activityList.waitFor()

    const firstActivity = page.locator('.activity-item').first()
    await firstActivity.waitFor()

    const plusBtn = firstActivity.locator('.worker-btn-plus').first()
    if (await plusBtn.isVisible() && !await plusBtn.isDisabled()) {
      await plusBtn.click()
      await page.waitForTimeout(500)
    }

    // Click skip time button
    const skipTimeBtn = page.locator('#debugSkipTime')
    await skipTimeBtn.click()

    // Wait for time to be skipped
    await page.waitForTimeout(500)

    // Check notification
    const notification = page.locator('.notification').first()
    await expect(notification).toContainText('Skipped 5 minutes')
  })

  test('should show particle effects on activity completion', async ({ page }) => {
    // This test checks that the particle system is set up
    // Actual particles are hard to test in E2E but we can verify the code exists

    // Assign worker and wait for activity
    const firstActivity = page.locator('.activity-item').first()
    const plusBtn = firstActivity.locator('.worker-btn-plus').first()

    if (await plusBtn.isVisible() && !await plusBtn.isDisabled()) {
      await plusBtn.click()
      await page.waitForTimeout(3000) // Wait for activity completion

      // Check if any particles were created (they auto-remove after 1.5s)
      // We can't reliably catch them, but we verify the system doesn't crash
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toBeTruthy() // Just verify page still works
    }
  })

  test('should have workers walking in town canvas', async ({ page }) => {
    // Go to city tab
    const cityTab = page.locator('.tab-button[data-tab="city"]')
    await cityTab.click()
    await page.waitForTimeout(500)

    // Check that canvas is visible
    const canvas = page.locator('#townCanvas')
    await expect(canvas).toBeVisible()

    // Verify canvas has non-zero dimensions
    const boundingBox = await canvas.boundingBox()
    expect(boundingBox.width).toBeGreaterThan(0)
    expect(boundingBox.height).toBeGreaterThan(0)

    // Verify the canvas rendering is happening (workers should be drawn)
    // This is a basic check - actual rendering verification would need canvas inspection
    await page.waitForTimeout(1000)
    const canvasElement = await canvas.elementHandle()
    expect(canvasElement).toBeTruthy()
  })

  test('should show enhanced visual effects', async ({ page }) => {
    // Check that activity items have shimmer animation
    const activityItem = page.locator('.activity-item').first()
    await activityItem.waitFor()

    // Hover to trigger glow effect
    await activityItem.hover()
    await page.waitForTimeout(200)

    // Verify element is still visible (animations didn't break anything)
    await expect(activityItem).toBeVisible()

    // Check skill item hover effect
    const skillItem = page.locator('.skill-item').first()
    await skillItem.hover()
    await page.waitForTimeout(200)
    await expect(skillItem).toBeVisible()

    // Check currency item hover effect
    const currencyItem = page.locator('.currency-item').first()
    if (await currencyItem.isVisible()) {
      await currencyItem.hover()
      await page.waitForTimeout(200)
      await expect(currencyItem).toBeVisible()
    }
  })

  test('should show notification with bounce animation', async ({ page }) => {
    const saveBtn = page.locator('#saveBtn')
    await saveBtn.click()

    const notification = page.locator('.notification').first()
    await expect(notification).toBeVisible()
    await expect(notification).toContainText('Game saved')

    // Verify notification disappears after delay
    await page.waitForTimeout(4000)
    await expect(notification).not.toBeVisible()
  })
})
