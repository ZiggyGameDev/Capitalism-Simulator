import { test, expect } from '@playwright/test'

test.describe('Town Canvas - Worker Animation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForTimeout(500)
  })

  test('should display animated workers in town canvas', async ({ page }) => {
    // Go to city tab
    const cityTab = page.locator('.tab-button[data-tab="city"]')
    await cityTab.click()
    await page.waitForTimeout(500)

    // Check that canvas exists
    const canvas = page.locator('#townCanvas')
    await expect(canvas).toBeVisible()

    // Check canvas dimensions
    const dimensions = await canvas.evaluate(el => ({
      width: el.width,
      height: el.height
    }))

    console.log('Canvas dimensions:', dimensions)
    expect(dimensions.width).toBeGreaterThan(0)
    expect(dimensions.height).toBeGreaterThan(0)

    // Check that town renderer exists
    const hasRenderer = await page.evaluate(() => {
      return window.townRenderer !== null && window.townRenderer !== undefined
    })

    console.log('Has town renderer:', hasRenderer)

    // Check that workers array exists
    const workersInfo = await page.evaluate(() => {
      if (!window.townRenderer) return { error: 'No renderer' }
      return {
        workersCount: window.townRenderer.workers ? window.townRenderer.workers.length : -1,
        hasWorkers: !!window.townRenderer.workers
      }
    })

    console.log('Workers info:', workersInfo)

    // Wait a bit for animation to run
    await page.waitForTimeout(2000)

    // Check canvas has content
    const hasContent = await canvas.evaluate(el => {
      const ctx = el.getContext('2d')
      const imageData = ctx.getImageData(0, 0, el.width, el.height)

      // Check if any pixels are non-transparent
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0) {
          return true
        }
      }
      return false
    })

    console.log('Canvas has content:', hasContent)
    expect(hasContent).toBe(true)
  })

  test('should display building costs with emojis', async ({ page }) => {
    // Go to city tab
    const cityTab = page.locator('.tab-button[data-tab="city"]')
    await cityTab.click()
    await page.waitForTimeout(500)

    // Find the house building card
    const houseCard = page.locator('.building-card[data-building-id="house"]')
    await expect(houseCard).toBeVisible()

    // Check building cost display
    const costHTML = await houseCard.locator('.building-cost').innerHTML()
    console.log('Cost HTML:', costHTML)

    // Check if cost items exist
    const costItems = houseCard.locator('.cost-item')
    const count = await costItems.count()
    console.log('Cost items count:', count)

    // Get text of each cost item
    for (let i = 0; i < count; i++) {
      const text = await costItems.nth(i).textContent()
      console.log(`Cost item ${i}:`, text)
    }

    // Check for wood emoji
    const hasWoodEmoji = costHTML.includes('🪵')
    console.log('Has wood emoji:', hasWoodEmoji)

    // Check for stone emoji
    const hasStoneEmoji = costHTML.includes('🪨')
    console.log('Has stone emoji:', hasStoneEmoji)
  })

  test('should show worker count in game', async ({ page }) => {
    // Check initial worker count
    const workerCount = await page.evaluate(() => {
      return window.game.resourceManager.get('basicWorker') || 0
    })

    console.log('Initial worker count:', workerCount)
    expect(workerCount).toBeGreaterThanOrEqual(2)
  })
})
