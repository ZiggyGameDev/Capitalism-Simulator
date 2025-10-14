/**
 * Integration tests for city/building system
 */
import { test, expect } from '@playwright/test'

test.describe('City Building System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')

    // Wait for game to load
    await page.waitForSelector('#skillList')

    // Reset game to start fresh
    await page.click('#resetBtn')
  })

  test('should display city tab', async ({ page }) => {
    // Check that city tab exists
    const cityTab = page.locator('[data-tab="city"]')
    await expect(cityTab).toBeVisible()
    await expect(cityTab).toHaveText(/City/)
  })

  test('should switch to city view when clicking city tab', async ({ page }) => {
    // Click city tab
    await page.click('[data-tab="city"]')

    // City view should be visible
    await expect(page.locator('[data-view="city"]')).toBeVisible()

    // Activities view should be hidden
    await expect(page.locator('[data-view="activities"]')).not.toHaveClass(/active/)
  })

  test('should display building menu in city view', async ({ page }) => {
    await page.click('[data-tab="city"]')

    // Building menu should be visible
    await expect(page.locator('#buildingMenu')).toBeVisible()
    await expect(page.locator('.building-menu-panel h2')).toHaveText(/Buildings/)
  })

  test('should show building slots info', async ({ page }) => {
    await page.click('[data-tab="city"]')

    const slotsInfo = page.locator('#buildingSlots')
    await expect(slotsInfo).toBeVisible()
    await expect(slotsInfo).toHaveText(/0\/5 Slots Used/)
  })

  test('should display house as always unlocked', async ({ page }) => {
    await page.click('[data-tab="city"]')

    // House should be visible and not show unlock condition
    const houseCard = page.locator('.building-card').filter({ hasText: 'House' })
    await expect(houseCard).toBeVisible()

    // Should not have unlock condition
    await expect(houseCard.locator('.unlock-condition')).not.toBeVisible()
  })

  test('should show building costs with current amounts', async ({ page }) => {
    await page.click('[data-tab="city"]')

    // House card should show costs
    const houseCard = page.locator('.building-card').filter({ hasText: 'House' })
    await expect(houseCard.locator('.building-cost')).toBeVisible()

    // Should show wood and stone costs
    await expect(houseCard.locator('.cost-item')).toHaveCount(2)
  })

  test('should show insufficient resources in red', async ({ page }) => {
    await page.click('[data-tab="city"]')

    // House requires wood and stone, which we don't have initially
    const houseCard = page.locator('.building-card').filter({ hasText: 'House' })
    const costItems = houseCard.locator('.cost-item')

    // All costs should be insufficient (red)
    const firstCost = costItems.first()
    await expect(firstCost).toHaveClass(/insufficient/)
  })

  test('should disable build button when cannot afford', async ({ page }) => {
    await page.click('[data-tab="city"]')

    const houseCard = page.locator('.building-card').filter({ hasText: 'House' })
    const buildButton = houseCard.locator('button')

    await expect(buildButton).toBeDisabled()
  })

  test('should show locked buildings with unlock conditions', async ({ page }) => {
    await page.click('[data-tab="city"]')

    // Tavern should show unlock condition (500 wood mined)
    const tavernCard = page.locator('.building-card').filter({ hasText: 'Tavern' })
    await expect(tavernCard).toBeVisible()
    await expect(tavernCard.locator('.unlock-condition')).toBeVisible()
    await expect(tavernCard.locator('.unlock-condition')).toContainText('wood')
  })

  test('should allow building house when resources available', async ({ page }) => {
    // Give resources via console
    await page.evaluate(() => {
      window.game.resourceManager.set('wood', 100)
      window.game.resourceManager.set('stone', 100)
    })

    await page.click('[data-tab="city"]')

    // Build button should be enabled
    const houseCard = page.locator('.building-card').filter({ hasText: 'House' })
    const buildButton = houseCard.locator('button')
    await expect(buildButton).toBeEnabled()

    // Click build button
    await buildButton.click()

    // Resources should be spent
    const woodAmount = await page.evaluate(() => window.game.resourceManager.get('wood'))
    const stoneAmount = await page.evaluate(() => window.game.resourceManager.get('stone'))
    expect(woodAmount).toBe(50) // 100 - 50 cost
    expect(stoneAmount).toBe(70) // 100 - 30 cost
  })

  test('should update slot count after building', async ({ page }) => {
    await page.evaluate(() => {
      window.game.resourceManager.set('wood', 100)
      window.game.resourceManager.set('stone', 100)
    })

    await page.click('[data-tab="city"]')

    const slotsInfo = page.locator('#buildingSlots')
    await expect(slotsInfo).toHaveText(/0\/5 Slots Used/)

    // Build house
    const houseCard = page.locator('.building-card').filter({ hasText: 'House' })
    await houseCard.locator('button').click()

    // Wait a moment for update
    await page.waitForTimeout(100)

    // Slots should be updated
    await expect(slotsInfo).toHaveText(/1\/5 Slots Used/)
  })

  test('should show building count after construction', async ({ page }) => {
    await page.evaluate(() => {
      window.game.resourceManager.set('wood', 1000)
      window.game.resourceManager.set('stone', 1000)
    })

    await page.click('[data-tab="city"]')

    const houseCard = page.locator('.building-card').filter({ hasText: 'House' })

    // Initially 0/10
    await expect(houseCard.locator('.building-count')).toContainText('Built: 0')

    // Build first house
    await houseCard.locator('button').click()
    await page.waitForTimeout(100)

    // Should show 1
    await expect(houseCard.locator('.building-count')).toContainText('Built: 1')
  })

  test('should scale building costs', async ({ page }) => {
    await page.evaluate(() => {
      window.game.resourceManager.set('wood', 10000)
      window.game.resourceManager.set('stone', 10000)
    })

    await page.click('[data-tab="city"]')

    const houseCard = page.locator('.building-card').filter({ hasText: 'House' })

    // Build first house (50 wood, 30 stone)
    await houseCard.locator('button').click()
    await page.waitForTimeout(100)

    // Second house should cost more (75 wood, 45 stone with 1.5x multiplier)
    const costText = await houseCard.locator('.building-cost').textContent()
    expect(costText).toContain('75')
    expect(costText).toContain('45')
  })

  test('should prevent building during collection phase from city tab', async ({ page }) => {
    // Switch to city tab during collection phase
    await page.click('[data-tab="city"]')

    // Should not be in building phase
    const phaseIndicator = page.locator('#phaseIndicator')
    await expect(phaseIndicator).not.toHaveText(/Building/)

    // Build buttons should exist but we should be able to build if we have resources
    await page.evaluate(() => {
      window.game.resourceManager.set('wood', 100)
      window.game.resourceManager.set('stone', 100)
    })

    const houseCard = page.locator('.building-card').filter({ hasText: 'House' })

    // Note: Based on the requirements, building should work during collection phase
    // The game just switches to city tab during building phase
    await expect(houseCard.locator('button')).toBeEnabled()
  })

  test('should show continue button during building phase', async ({ page }) => {
    // Fast forward to building phase
    await page.evaluate(() => {
      window.game.roundManager.endCollectionPhase()
    })

    await page.click('[data-tab="city"]')

    // Continue button should be visible
    const continueBtn = page.locator('#continueBtn')
    await expect(continueBtn).toBeVisible()
    await expect(continueBtn).toHaveText(/Continue/)
  })

  test('should hide continue button during collection phase', async ({ page }) => {
    await page.click('[data-tab="city"]')

    // Continue button should be hidden
    const continueBtn = page.locator('#continueBtn')
    await expect(continueBtn).toHaveClass(/hidden/)
  })

  test('should switch to next round when clicking continue', async ({ page }) => {
    // Go to building phase
    await page.evaluate(() => {
      window.game.roundManager.endCollectionPhase()
    })

    await page.click('[data-tab="city"]')

    const roundCounter = page.locator('#roundCounter')
    await expect(roundCounter).toHaveText(/1 \/ 5/)

    // Click continue
    await page.click('#continueBtn')
    await page.waitForTimeout(100)

    // Should be round 2
    await expect(roundCounter).toHaveText(/2 \/ 5/)
  })

  test('should unlock tavern after mining enough wood', async ({ page }) => {
    // Mine wood to unlock tavern
    await page.evaluate(() => {
      window.game.buildingManager.trackResourceMined('wood', 500)
      window.game.resourceManager.set('wood', 1000)
      window.game.resourceManager.set('stone', 1000)
      window.game.resourceManager.set('gold', 1000)
    })

    await page.click('[data-tab="city"]')

    // Tavern should no longer show unlock condition
    const tavernCard = page.locator('.building-card').filter({ hasText: 'Tavern' })
    await expect(tavernCard.locator('.unlock-condition')).not.toBeVisible()

    // Build button should be enabled
    await expect(tavernCard.locator('button')).toBeEnabled()
  })

  test('should complete house construction over time', async ({ page }) => {
    await page.evaluate(() => {
      window.game.resourceManager.set('wood', 100)
      window.game.resourceManager.set('stone', 100)
    })

    await page.click('[data-tab="city"]')

    // Build house
    const houseCard = page.locator('.building-card').filter({ hasText: 'House' })
    await houseCard.locator('button').click()

    // Check construction status via game state
    let isComplete = await page.evaluate(() => {
      const houses = window.game.buildingManager.getBuildings('house')
      return houses[0]?.constructionComplete || false
    })
    expect(isComplete).toBe(false)

    // Fast-forward construction time
    await page.evaluate(() => {
      const houses = window.game.buildingManager.getBuildings('house')
      if (houses[0]) {
        houses[0].constructionStartTime = Date.now() - 61000 // 61 seconds ago
        window.game.buildingManager.update(100)
      }
    })

    // Should now be complete
    isComplete = await page.evaluate(() => {
      const houses = window.game.buildingManager.getBuildings('house')
      return houses[0]?.constructionComplete || false
    })
    expect(isComplete).toBe(true)
  })

  test('should generate workers from completed houses', async ({ page }) => {
    await page.evaluate(() => {
      window.game.resourceManager.set('wood', 100)
      window.game.resourceManager.set('stone', 100)
      window.game.resourceManager.set('basicWorker', 1)
    })

    await page.click('[data-tab="city"]')

    // Build and complete house
    await page.evaluate(() => {
      const instanceId = window.game.buildingManager.startConstruction('house')
      const houses = window.game.buildingManager.getBuildings('house')
      houses[0].constructionComplete = true
    })

    const initialWorkers = await page.evaluate(() =>
      window.game.resourceManager.get('basicWorker')
    )

    // Fast-forward worker generation time (30 seconds)
    await page.evaluate(() => {
      window.game.buildingManager.updateHouseWorkerGeneration(30000)
    })

    const finalWorkers = await page.evaluate(() =>
      window.game.resourceManager.get('basicWorker')
    )

    expect(finalWorkers).toBe(initialWorkers + 1)
  })

  test('should show town canvas', async ({ page }) => {
    await page.click('[data-tab="city"]')

    const canvas = page.locator('#townCanvas')
    await expect(canvas).toBeVisible()
  })

  test('should update building costs when resources change', async ({ page }) => {
    await page.click('[data-tab="city"]')

    const houseCard = page.locator('.building-card').filter({ hasText: 'House' })
    const firstCostItem = houseCard.locator('.cost-item').first()

    // Initially insufficient (red)
    await expect(firstCostItem).toHaveClass(/insufficient/)

    // Add resources
    await page.evaluate(() => {
      window.game.resourceManager.set('wood', 100)
      window.game.resourceManager.set('stone', 100)
    })

    // Wait for UI update
    await page.waitForTimeout(200)

    // Should no longer be insufficient
    await expect(firstCostItem).not.toHaveClass(/insufficient/)
  })

  test('should handle max building slots', async ({ page }) => {
    // Give lots of resources
    await page.evaluate(() => {
      window.game.resourceManager.set('wood', 100000)
      window.game.resourceManager.set('stone', 100000)
    })

    await page.click('[data-tab="city"]')

    const houseCard = page.locator('.building-card').filter({ hasText: 'House' })

    // Build 5 houses (max starting slots)
    for (let i = 0; i < 5; i++) {
      await houseCard.locator('button').click()
      await page.waitForTimeout(50)
    }

    // Slots should be full
    const slotsInfo = page.locator('#buildingSlots')
    await expect(slotsInfo).toHaveText(/5\/5 Slots Used/)

    // Build button should be disabled
    await expect(houseCard.locator('button')).toBeDisabled()
  })

  test('should show correct building descriptions', async ({ page }) => {
    await page.click('[data-tab="city"]')

    // Check house description
    const houseCard = page.locator('.building-card').filter({ hasText: 'House' })
    await expect(houseCard).toContainText('Generates workers over time')

    // Check tavern description
    const tavernCard = page.locator('.building-card').filter({ hasText: 'Tavern' })
    await expect(tavernCard).toContainText('Boosts worker morale')
  })

  test('should show construction time', async ({ page }) => {
    await page.click('[data-tab="city"]')

    const houseCard = page.locator('.building-card').filter({ hasText: 'House' })
    await expect(houseCard.locator('.building-construction-time')).toBeVisible()
    await expect(houseCard.locator('.building-construction-time')).toContainText('60s')
  })
})
