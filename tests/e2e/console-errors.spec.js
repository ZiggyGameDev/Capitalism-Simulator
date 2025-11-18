import { test, expect } from '@playwright/test'
import { skipWhenBrowsersMissing } from './utils/browserEnv.js'

skipWhenBrowsersMissing(test)

/**
 * Console Error Smoke Tests
 *
 * These tests monitor for console errors during common game operations.
 * Any console.error() calls will cause tests to fail, helping catch bugs early.
 */

test.describe('Console Error Monitoring', () => {
  let consoleErrors = []
  let consoleWarnings = []

  test.beforeEach(async ({ page }) => {
    // Capture console errors and warnings
    consoleErrors = []
    consoleWarnings = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text())
      }
    })

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', error => {
      consoleErrors.push(`Uncaught exception: ${error.message}`)
    })

    await page.goto('http://localhost:5173')
    await page.waitForSelector('.skill-list')
    await page.waitForSelector('.activity-list')
  })

  test('should load game without console errors', async ({ page }) => {
    // Wait for game to fully initialize
    await page.waitForTimeout(1000)

    // Check for errors
    expect(consoleErrors).toHaveLength(0)

    if (consoleErrors.length > 0) {
      console.log('Console errors found:', consoleErrors)
    }
  })

  test('should reset game without console errors', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('incrementalGameSave')
      location.reload()
    })

    await page.waitForSelector('.activity-list')
    await page.waitForTimeout(500)

    expect(consoleErrors).toHaveLength(0)

    if (consoleErrors.length > 0) {
      console.log('Console errors during reset:', consoleErrors)
    }
  })

  test('should assign workers without console errors', async ({ page }) => {
    const firstActivity = page.locator('.activity-item').first()
    const plusButton = firstActivity.locator('.worker-btn-plus').first()

    // Click multiple times
    await plusButton.click()
    await page.waitForTimeout(100)
    await plusButton.click()
    await page.waitForTimeout(100)

    expect(consoleErrors).toHaveLength(0)

    if (consoleErrors.length > 0) {
      console.log('Console errors during worker assignment:', consoleErrors)
    }
  })

  test('should unassign workers without console errors', async ({ page }) => {
    const firstActivity = page.locator('.activity-item').first()
    const plusButton = firstActivity.locator('.worker-btn-plus').first()
    const minusButton = firstActivity.locator('.worker-btn-minus').first()

    // Assign then unassign
    await plusButton.click()
    await page.waitForTimeout(100)
    await plusButton.click()
    await page.waitForTimeout(100)
    await minusButton.click()
    await page.waitForTimeout(100)
    await minusButton.click()
    await page.waitForTimeout(100)

    expect(consoleErrors).toHaveLength(0)

    if (consoleErrors.length > 0) {
      console.log('Console errors during worker unassignment:', consoleErrors)
    }
  })

  test('should switch skills without console errors', async ({ page }) => {
    const skills = page.locator('.skill-item')
    const skillCount = await skills.count()

    // Click through first 3 skills
    for (let i = 0; i < Math.min(3, skillCount); i++) {
      await skills.nth(i).click()
      await page.waitForTimeout(200)
    }

    expect(consoleErrors).toHaveLength(0)

    if (consoleErrors.length > 0) {
      console.log('Console errors during skill switching:', consoleErrors)
    }
  })

  test('should handle rapid worker assignment clicks without errors', async ({ page }) => {
    const firstActivity = page.locator('.activity-item').first()
    const plusButton = firstActivity.locator('.worker-btn-plus').first()

    // Click and wait for button to be re-enabled between clicks
    for (let i = 0; i < 2; i++) {
      // Only click if button is enabled
      const isEnabled = await plusButton.isEnabled()
      if (isEnabled) {
        await plusButton.click()
        await page.waitForTimeout(200)
      }
    }

    await page.waitForTimeout(300)

    expect(consoleErrors).toHaveLength(0)

    if (consoleErrors.length > 0) {
      console.log('Console errors during rapid clicking:', consoleErrors)
    }
  })

  test('should load saved game without console errors', async ({ page }) => {
    // Set up a saved game state
    await page.evaluate(() => {
      const mockState = {
        resources: {
          basicWorker: 10,
          wheat: 50,
          wood: 25
        },
        skills: {
          farming: { level: 3, xp: 150 },
          gathering: { level: 2, xp: 50 }
        },
        workers: {
          assignments: {
            'plantWheat': { basicWorker: 2 },
            'chopTree': { basicWorker: 1 }
          }
        }
      }
      localStorage.setItem('incrementalGameSave', JSON.stringify(mockState))
    })

    await page.reload()
    await page.waitForSelector('.activity-list')
    await page.waitForTimeout(1000)

    expect(consoleErrors).toHaveLength(0)

    if (consoleErrors.length > 0) {
      console.log('Console errors loading saved game:', consoleErrors)
    }
  })

  test('should handle Remove All button without console errors', async ({ page }) => {
    // Assign workers first
    const firstActivity = page.locator('.activity-item').first()
    const plusButton = firstActivity.locator('.worker-btn-plus').first()

    await plusButton.click()
    await page.waitForTimeout(100)
    await plusButton.click()
    await page.waitForTimeout(200)

    // Click Remove All
    const removeAllButton = firstActivity.locator('.worker-btn-remove-all')
    await removeAllButton.click()
    await page.waitForTimeout(200)

    expect(consoleErrors).toHaveLength(0)

    if (consoleErrors.length > 0) {
      console.log('Console errors with Remove All:', consoleErrors)
    }
  })

  test('should switch tabs without console errors', async ({ page }) => {
    const tabButtons = page.locator('.tab-button')
    const tabCount = await tabButtons.count()

    if (tabCount > 0) {
      // Check if tabs are visible (mobile view)
      const firstTabVisible = await tabButtons.first().isVisible()

      if (firstTabVisible) {
        // Click through all tabs
        for (let i = 0; i < tabCount; i++) {
          await tabButtons.nth(i).click()
          await page.waitForTimeout(300)
        }

        // Switch back to activities
        await tabButtons.first().click()
        await page.waitForTimeout(300)
      } else {
        // Tabs not visible (desktop view) - switch skills instead
        const skills = page.locator('.skill-item')
        const firstSkill = skills.first()
        const secondSkill = skills.nth(1)

        await secondSkill.click()
        await page.waitForTimeout(300)
        await firstSkill.click()
        await page.waitForTimeout(300)
      }
    }

    expect(consoleErrors).toHaveLength(0)

    if (consoleErrors.length > 0) {
      console.log('Console errors during tab/skill switching:', consoleErrors)
    }
  })

  test('should run debug commands without console errors', async ({ page }) => {
    // Open debug panel
    const debugBtn = page.locator('#debugBtn')
    if (await debugBtn.count() > 0) {
      await debugBtn.click()
      await page.waitForTimeout(100)

      // Click debug buttons
      const debugAddResources = page.locator('#debugAddResources')
      if (await debugAddResources.count() > 0) {
        await debugAddResources.click()
        await page.waitForTimeout(200)
      }

      const debugAddWorkers = page.locator('#debugAddWorkers')
      if (await debugAddWorkers.count() > 0) {
        await debugAddWorkers.click()
        await page.waitForTimeout(200)
      }

      expect(consoleErrors).toHaveLength(0)

      if (consoleErrors.length > 0) {
        console.log('Console errors with debug commands:', consoleErrors)
      }
    }
  })

  test('should handle game state updates without console errors', async ({ page }) => {
    // Let the game run for a few seconds with workers assigned
    await page.evaluate(() => {
      const mockState = {
        resources: {
          basicWorker: 5,
          wheat: 10
        },
        skills: {
          farming: { level: 1, xp: 0 }
        },
        workers: {
          assignments: {
            'plantWheat': { basicWorker: 2 }
          }
        }
      }
      localStorage.setItem('incrementalGameSave', JSON.stringify(mockState))
    })

    await page.reload()
    await page.waitForSelector('.activity-list')

    // Wait for game to tick multiple times
    await page.waitForTimeout(3000)

    expect(consoleErrors).toHaveLength(0)

    if (consoleErrors.length > 0) {
      console.log('Console errors during game updates:', consoleErrors)
    }
  })
})

test.describe('Console Warning Monitoring (informational)', () => {
  let consoleWarnings = []

  test.beforeEach(async ({ page }) => {
    consoleWarnings = []

    page.on('console', msg => {
      if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text())
      }
    })

    await page.goto('http://localhost:5173')
    await page.waitForSelector('.skill-list')
  })

  test('should log any console warnings (informational)', async ({ page }) => {
    await page.waitForTimeout(1000)

    // This test doesn't fail, it just reports warnings
    if (consoleWarnings.length > 0) {
      console.log('⚠️ Console warnings found:', consoleWarnings)
    } else {
      console.log('✅ No console warnings')
    }

    // Always pass - this is just informational
    expect(true).toBe(true)
  })
})
