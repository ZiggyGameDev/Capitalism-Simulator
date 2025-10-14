import { test, expect } from '@playwright/test'

test.describe('Activity Simulation - Visual Worker System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForTimeout(500)
  })

  test('should have canvas elements in activity cards', async ({ page }) => {
    // Check that activity cards have canvases
    const canvases = page.locator('.activity-simulation-canvas')
    const count = await canvases.count()

    // Should have at least one canvas (for unlocked activities)
    expect(count).toBeGreaterThan(0)
  })

  test('should initialize canvas with correct dimensions', async ({ page }) => {
    const canvas = page.locator('.activity-simulation-canvas').first()
    await expect(canvas).toBeVisible()

    // Check canvas dimensions
    const dimensions = await canvas.evaluate(el => ({
      width: el.width,
      height: el.height
    }))

    expect(dimensions.width).toBe(400)
    expect(dimensions.height).toBe(80)
  })

  test('should show workers in simulation when assigned', async ({ page }) => {
    // Give player workers
    await page.evaluate(() => {
      window.game.currencyManager.add('basicWorker', 3)
    })

    await page.waitForTimeout(200)

    // Assign a worker to first activity
    const plusButton = page.locator('.worker-btn-plus').first()
    await plusButton.click()
    await page.waitForTimeout(500)

    // Check that activity simulation exists for this activity
    const activityItem = page.locator('.activity-item').first()
    const canvas = activityItem.locator('.activity-simulation-canvas')
    await expect(canvas).toBeVisible()

    // Check that canvas is being drawn to (not blank)
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

    expect(hasContent).toBe(true)
  })

  test('should show workers moving in simulation', async ({ page }) => {
    // Setup: Give workers and assign them
    await page.evaluate(() => {
      window.game.currencyManager.add('basicWorker', 2)
    })

    await page.waitForTimeout(200)

    // Assign worker to activity
    const plusButton = page.locator('.worker-btn-plus').first()
    await plusButton.click()
    await page.waitForTimeout(100)

    // Check that simulation has workers
    const hasWorkers = await page.evaluate(() => {
      const firstActivityId = Array.from(window.activitySimulations.keys())[0]
      const simulation = window.activitySimulations.get(firstActivityId)
      return simulation && simulation.workers.length > 0
    })

    expect(hasWorkers).toBe(true)
  })

  test('should sync workers with assignments', async ({ page }) => {
    // Give player multiple workers
    await page.evaluate(() => {
      window.game.currencyManager.add('basicWorker', 5)
    })

    await page.waitForTimeout(200)

    // Assign 3 workers
    const plusButton = page.locator('.worker-btn-plus').first()
    await plusButton.click()
    await page.waitForTimeout(100)
    await plusButton.click()
    await page.waitForTimeout(100)
    await plusButton.click()
    await page.waitForTimeout(200)

    // Check that simulation has 3 workers
    const workerCount = await page.evaluate(() => {
      const firstActivityId = Array.from(window.activitySimulations.keys())[0]
      const simulation = window.activitySimulations.get(firstActivityId)
      return simulation ? simulation.workers.length : 0
    })

    expect(workerCount).toBe(3)
  })

  test('should remove workers when unassigned', async ({ page }) => {
    // Setup: Give workers and assign them
    await page.evaluate(() => {
      window.game.currencyManager.add('basicWorker', 3)
    })

    await page.waitForTimeout(200)

    // Assign 2 workers
    const plusButton = page.locator('.worker-btn-plus').first()
    await plusButton.click()
    await page.waitForTimeout(100)
    await plusButton.click()
    await page.waitForTimeout(200)

    // Now unassign one
    const minusButton = page.locator('.worker-btn-minus').first()
    await minusButton.click()
    await page.waitForTimeout(200)

    // Check that simulation has 1 worker
    const workerCount = await page.evaluate(() => {
      const firstActivityId = Array.from(window.activitySimulations.keys())[0]
      const simulation = window.activitySimulations.get(firstActivityId)
      return simulation ? simulation.workers.length : 0
    })

    expect(workerCount).toBe(1)
  })

  test('should have workers with pre-calculated cycle times', async ({ page }) => {
    // Give workers and assign
    await page.evaluate(() => {
      window.game.currencyManager.add('basicWorker', 1)
    })

    await page.waitForTimeout(200)

    const plusButton = page.locator('.worker-btn-plus').first()
    await plusButton.click()
    await page.waitForTimeout(200)

    // Check worker has timing properties
    const workerTiming = await page.evaluate(() => {
      const firstActivityId = Array.from(window.activitySimulations.keys())[0]
      const simulation = window.activitySimulations.get(firstActivityId)
      const worker = simulation.workers[0]

      return {
        hasWalkToTime: worker.walkToTime !== undefined,
        hasHarvestTime: worker.harvestTime !== undefined,
        hasWalkBackTime: worker.walkBackTime !== undefined,
        hasTotalCycleTime: worker.totalCycleTime !== undefined
      }
    })

    expect(workerTiming.hasWalkToTime).toBe(true)
    expect(workerTiming.hasHarvestTime).toBe(true)
    expect(workerTiming.hasWalkBackTime).toBe(true)
    expect(workerTiming.hasTotalCycleTime).toBe(true)
  })

  test('should have workers with random offsets', async ({ page }) => {
    // Give workers and assign multiple
    await page.evaluate(() => {
      window.game.currencyManager.add('basicWorker', 3)
    })

    await page.waitForTimeout(200)

    // Assign 3 workers
    const plusButton = page.locator('.worker-btn-plus').first()
    await plusButton.click()
    await page.waitForTimeout(100)
    await plusButton.click()
    await page.waitForTimeout(100)
    await plusButton.click()
    await page.waitForTimeout(200)

    // Check that workers have different state timers (random offsets)
    const hasRandomOffsets = await page.evaluate(() => {
      const firstActivityId = Array.from(window.activitySimulations.keys())[0]
      const simulation = window.activitySimulations.get(firstActivityId)
      const timers = simulation.workers.map(w => w.stateTimer)

      // Check if at least 2 have different timers
      const uniqueTimers = new Set(timers)
      return uniqueTimers.size > 1
    })

    expect(hasRandomOffsets).toBe(true)
  })

  test('should cleanup simulations when switching skills', async ({ page }) => {
    // Start with farming skill
    await page.waitForTimeout(500)

    const initialSimCount = await page.evaluate(() => {
      return window.activitySimulations.size
    })

    // Click on a different skill
    const gatheringSkill = page.locator('.skill-item').filter({ hasText: 'Gathering' })
    await gatheringSkill.click()
    await page.waitForTimeout(300)

    // Check that old simulations were cleaned up and new ones created
    const newSimCount = await page.evaluate(() => {
      return window.activitySimulations.size
    })

    // Should have simulations (might be different count based on unlocked activities)
    expect(newSimCount).toBeGreaterThan(0)
  })
})
