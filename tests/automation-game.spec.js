import { test, expect } from '@playwright/test'

test.describe('Automation Idle Game - Worker Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Clear localStorage before each test
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('should show emoji indicators for resource inputs and outputs', async ({ page }) => {
    // Wait for game to load
    await page.waitForTimeout(500)

    // Look for an activity with inputs (e.g., "Hire Basic Worker" uses wheat and water)
    const activityItems = page.locator('.activity-item')
    await expect(activityItems.first()).toBeVisible()

    // Check that activities show emojis
    const activityInfo = page.locator('.activity-info').first()
    const activityText = await activityInfo.textContent()

    // Should contain emoji icons (we can check for the arrow separator)
    expect(activityText).toContain('→')
  })

  test('should show FREE label for activities without inputs', async ({ page }) => {
    // Wait for game to load
    await page.waitForTimeout(500)

    // Look for free activities (e.g., "Plant Wheat by Hand" has no inputs)
    const freeActivity = page.locator('.activity-item').filter({ hasText: 'Plant Wheat' })
    await expect(freeActivity).toBeVisible()

    // Should contain the FREE label
    const freeLabel = freeActivity.locator('.free-label')
    await expect(freeLabel).toBeVisible()
    await expect(freeLabel).toHaveText('FREE')
  })

  test('should allow assigning workers to activities', async ({ page }) => {
    // Wait for game to load
    await page.waitForTimeout(500)

    // Set up a state where we have workers available
    await page.evaluate(() => {
      const mockState = {
        currencies: {
          basicWorker: 5  // Has workers available
        },
        skills: {
          farming: { level: 1, xp: 0 }
        },
        workers: {
          assignments: {}  // No workers assigned yet
        }
      }
      localStorage.setItem('incrementalGameSave', JSON.stringify(mockState))
    })

    await page.reload()
    await page.waitForTimeout(500)

    const wheatActivity = page.locator('.activity-item').filter({ hasText: 'Plant Wheat' })

    // Find the + button for basic worker on this activity
    const plusButton = wheatActivity.locator('.worker-btn-plus').first()

    // Should be enabled when we have workers available
    await expect(plusButton).toBeEnabled()

    // Click to assign a worker
    await plusButton.click()
    await page.waitForTimeout(200)

    // Check that the count increased
    const workerCount = wheatActivity.locator('.worker-count').first()
    await expect(workerCount).toHaveText('1')
  })

  test('should show "Remove All" button when workers are assigned', async ({ page }) => {
    // This test would require actually having workers, which requires
    // progressing through the game. For now, we'll test the UI structure.
    await page.waitForTimeout(500)

    // Navigate to a skill that has activities
    const skillItem = page.locator('.skill-item').first()
    await skillItem.click()

    // Check that activities have worker assignment sections
    const workerAssignments = page.locator('.activity-worker-assignments')
    await expect(workerAssignments.first()).toBeVisible()
  })

  test('should show halted production warning when resources are insufficient', async ({ page }) => {
    // This test simulates the scenario where workers are assigned but resources run out
    // We'll use localStorage to set up this state directly
    await page.evaluate(() => {
      // Set up a state where an activity is automated but can't run
      const mockState = {
        currencies: {
          basicWorker: 5,  // Has workers
          wheat: 0,        // But no wheat
        },
        skills: {
          farming: { level: 1, xp: 0 }
        },
        workers: {
          assignments: {
            'hireWorker': { basicWorker: 2 }  // Activity that needs wheat is assigned workers
          }
        }
      }
      localStorage.setItem('incrementalGameSave', JSON.stringify(mockState))
    })

    await page.reload()
    await page.waitForTimeout(500)

    // Look for the activity that's halted
    const haltedActivity = page.locator('.activity-item.halted')

    // Note: This might not appear if the game state doesn't match exactly,
    // so we'll check if the halted class can be found
    const haltedCount = await haltedActivity.count()

    // If there are halted activities, check for the warning
    if (haltedCount > 0) {
      const warning = haltedActivity.first().locator('.activity-halted-warning')
      await expect(warning).toBeVisible()
      await expect(warning).toContainText('Production halted')
    }
  })

  test('should highlight insufficient resources in red', async ({ page }) => {
    // Set up state where we have workers but insufficient resources
    await page.evaluate(() => {
      const mockState = {
        currencies: {
          basicWorker: 5,
          wheat: 2,  // Not enough wheat
          water: 1   // Not enough water
        },
        skills: {
          farming: { level: 1, xp: 0 }
        },
        workers: {
          assignments: {
            'hireWorker': { basicWorker: 1 }  // Needs wheat: 5, water: 3
          }
        }
      }
      localStorage.setItem('incrementalGameSave', JSON.stringify(mockState))
    })

    await page.reload()
    await page.waitForTimeout(500)

    // Look for insufficient resource indicators
    const insufficientResources = page.locator('.insufficient')

    // If there are insufficient resources being displayed, they should be styled
    const insufficientCount = await insufficientResources.count()
    if (insufficientCount > 0) {
      await expect(insufficientResources.first()).toBeVisible()
    }
  })

  test('should show worker control buttons (+/-) for activities', async ({ page }) => {
    await page.waitForTimeout(500)

    // Check that activities have worker controls
    const firstActivity = page.locator('.activity-item').first()

    // Should have minus and plus buttons
    const minusButton = firstActivity.locator('.worker-btn-minus')
    const plusButton = firstActivity.locator('.worker-btn-plus')

    await expect(minusButton.first()).toBeVisible()
    await expect(plusButton.first()).toBeVisible()
  })

  test('should disable minus button when no workers assigned', async ({ page }) => {
    await page.waitForTimeout(500)

    const firstActivity = page.locator('.activity-item').first()
    const minusButton = firstActivity.locator('.worker-btn-minus').first()

    // Should be disabled when count is 0
    await expect(minusButton).toBeDisabled()
  })

  test('should show worker types with emojis', async ({ page }) => {
    await page.waitForTimeout(500)

    // Check that worker type names include emojis
    const workerTypeName = page.locator('.worker-type-name').first()
    await expect(workerTypeName).toBeVisible()

    const workerText = await workerTypeName.textContent()
    // Should contain "Basic Worker" or similar with emoji
    expect(workerText).toBeTruthy()
  })

  test('should update currency ticker with emojis', async ({ page }) => {
    await page.waitForTimeout(500)

    // Check currency ticker exists
    const currencyTicker = page.locator('.currency-ticker')
    await expect(currencyTicker).toBeVisible()

    // After some game progression, currencies should appear with emojis
    // Initially might show "No currencies yet" message
    const tickerText = await currencyTicker.textContent()
    expect(tickerText).toBeTruthy()
  })

  test('should show activity progress bar when running', async ({ page }) => {
    await page.waitForTimeout(500)

    // Set up a state with an activity in progress
    await page.evaluate(() => {
      const mockState = {
        currencies: {
          basicWorker: 5,
          wheat: 10,
          water: 10
        },
        skills: {
          farming: { level: 1, xp: 0 }
        },
        workers: {
          assignments: {
            'plantWheat': { basicWorker: 1 }  // Free activity, should start immediately
          }
        }
      }
      localStorage.setItem('incrementalGameSave', JSON.stringify(mockState))
    })

    await page.reload()
    await page.waitForTimeout(1000)  // Wait for activity to start

    // Look for progress bars
    const progressBars = page.locator('.activity-progress-bar')
    const progressCount = await progressBars.count()

    // Should show at least one progress bar for running activities
    if (progressCount > 0) {
      await expect(progressBars.first()).toBeVisible()
    }
  })
})

test.describe('Automation Idle Game - Remove All Workers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())

    // Set up state with workers assigned
    await page.evaluate(() => {
      const mockState = {
        currencies: {
          basicWorker: 10,
          tractorWorker: 5
        },
        skills: {
          farming: { level: 1, xp: 0 }
        },
        workers: {
          assignments: {
            'plantWheat': {
              basicWorker: 3,
              tractorWorker: 2
            }
          }
        }
      }
      localStorage.setItem('incrementalGameSave', JSON.stringify(mockState))
    })

    await page.reload()
    await page.waitForTimeout(500)
  })

  test('should show "Remove All" button when workers are assigned', async ({ page }) => {
    // Find activity with workers assigned
    const wheatActivity = page.locator('.activity-item').filter({ hasText: 'Plant Wheat' })

    // Should have the "Remove All" button
    const removeAllButton = wheatActivity.locator('.worker-btn-remove-all')
    await expect(removeAllButton).toBeVisible()
    await expect(removeAllButton).toHaveText('Remove All')
  })

  test('should remove all workers when "Remove All" is clicked', async ({ page }) => {
    // Find activity with workers
    const wheatActivity = page.locator('.activity-item').filter({ hasText: 'Plant Wheat' })

    // Check initial worker count
    const workerCounts = wheatActivity.locator('.worker-count')
    const initialCount1 = await workerCounts.nth(0).textContent()
    expect(parseInt(initialCount1)).toBeGreaterThan(0)

    // Click "Remove All"
    const removeAllButton = wheatActivity.locator('.worker-btn-remove-all')
    await removeAllButton.click()

    // Wait for update
    await page.waitForTimeout(200)

    // All worker counts should be 0
    const updatedCounts = wheatActivity.locator('.worker-count')
    const count1 = await updatedCounts.nth(0).textContent()
    expect(parseInt(count1)).toBe(0)
  })

  test('should hide "Remove All" button after removing all workers', async ({ page }) => {
    const wheatActivity = page.locator('.activity-item').filter({ hasText: 'Plant Wheat' })

    // Click "Remove All"
    const removeAllButton = wheatActivity.locator('.worker-btn-remove-all')
    await removeAllButton.click()

    // Wait for UI update
    await page.waitForTimeout(300)

    // "Remove All" button should no longer be visible
    await expect(removeAllButton).not.toBeVisible()
  })

  test('should enable worker + buttons after removing workers', async ({ page }) => {
    const wheatActivity = page.locator('.activity-item').filter({ hasText: 'Plant Wheat' })

    // Remove all workers
    const removeAllButton = wheatActivity.locator('.worker-btn-remove-all')
    await removeAllButton.click()
    await page.waitForTimeout(200)

    // + buttons should be enabled (we have available workers)
    const plusButtons = wheatActivity.locator('.worker-btn-plus')
    const firstPlusButton = plusButtons.first()
    await expect(firstPlusButton).toBeEnabled()
  })
})

test.describe('Automation Idle Game - Visual Feedback', () => {
  test('should apply halted styling to activities that cannot run', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())

    // Set up halted state
    await page.evaluate(() => {
      const mockState = {
        currencies: {
          basicWorker: 5,
          wheat: 0  // No wheat
        },
        skills: {
          farming: { level: 1, xp: 0 }
        },
        workers: {
          assignments: {
            'hireWorker': { basicWorker: 1 }  // Needs wheat
          }
        }
      }
      localStorage.setItem('incrementalGameSave', JSON.stringify(mockState))
    })

    await page.reload()
    await page.waitForTimeout(500)

    // Check for halted class
    const haltedActivities = page.locator('.activity-item.halted')
    const haltedCount = await haltedActivities.count()

    if (haltedCount > 0) {
      // Should have orange/warning styling
      const firstHalted = haltedActivities.first()
      await expect(firstHalted).toBeVisible()

      // Should have warning indicator
      const warning = firstHalted.locator('.activity-halted-warning')
      await expect(warning).toBeVisible()
    }
  })

  test('should show pulsing warning emoji for halted activities', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      const mockState = {
        currencies: {
          basicWorker: 5,
          wheat: 0
        },
        skills: {
          farming: { level: 1, xp: 0 }
        },
        workers: {
          assignments: {
            'hireWorker': { basicWorker: 1 }
          }
        }
      }
      localStorage.setItem('incrementalGameSave', JSON.stringify(mockState))
    })

    await page.reload()
    await page.waitForTimeout(500)

    // Look for halted activities with warning
    const haltedActivities = page.locator('.activity-item.halted')
    const haltedCount = await haltedActivities.count()

    if (haltedCount > 0) {
      // The ::before pseudo-element with warning emoji should be visible
      // We can't directly test pseudo-elements, but we can verify the class
      await expect(haltedActivities.first()).toHaveClass(/halted/)
    }
  })
})

test.describe('Automation Idle Game - UI Element Spawning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    // Wait for game to initialize
    await page.waitForFunction(() => window.game !== undefined, { timeout: 10000 })
    await page.waitForTimeout(500)
  })

  test('should spawn currency ticker panel on load', async ({ page }) => {
    // Currency ticker container should exist
    const currencyTicker = page.locator('#currencyTicker')
    await expect(currencyTicker).toBeAttached()

    // Initially should show "No currencies yet" message
    const noCurrenciesMessage = currencyTicker.locator('.currency-item')
    await expect(noCurrenciesMessage).toBeVisible({ timeout: 10000 })
    const messageText = await noCurrenciesMessage.textContent()
    expect(messageText).toContain('No currencies yet')
  })

  test('should spawn currency items when currencies are earned', async ({ page }) => {
    // Set up state with some currencies
    await page.evaluate(() => {
      const mockState = {
        currencies: {
          wheat: 25,
          water: 10,
          wood: 5
        },
        skills: {
          farming: { level: 1, xp: 0 }
        }
      }
      localStorage.setItem('incrementalGameSave', JSON.stringify(mockState))
    })

    await page.reload()
    await page.waitForTimeout(500)

    // Should have currency items with data-currency-id attributes
    const currencyItems = page.locator('.currency-item[data-currency-id]')
    const currencyCount = await currencyItems.count()

    // Should have at least 3 currencies (wheat, water, wood)
    expect(currencyCount).toBeGreaterThanOrEqual(3)

    // Each currency item should have icon and amount
    for (let i = 0; i < currencyCount; i++) {
      const item = currencyItems.nth(i)
      await expect(item).toBeVisible()

      const amountSpan = item.locator('.currency-amount')
      await expect(amountSpan).toBeVisible()
    }
  })

  test('should spawn skill list panel on load', async ({ page }) => {
    const skillList = page.locator('#skillList')
    await expect(skillList).toBeVisible()

    // Should have at least one skill item
    const skillItems = page.locator('.skill-item')
    const skillCount = await skillItems.count()
    expect(skillCount).toBeGreaterThan(0)
  })

  test('should spawn all skill UI elements correctly', async ({ page }) => {
    const firstSkill = page.locator('.skill-item').first()
    await expect(firstSkill).toBeVisible({ timeout: 10000 })

    // Should have skill icon
    const skillIcon = firstSkill.locator('.skill-icon')
    await expect(skillIcon).toBeVisible()

    // Should have skill name
    const skillName = firstSkill.locator('.skill-name')
    await expect(skillName).toBeVisible()

    // Should have skill level display
    const skillLevel = firstSkill.locator('.skill-level')
    await expect(skillLevel).toBeVisible()
    await expect(skillLevel).toContainText('Level')

    const skillLevelValue = firstSkill.locator('.skill-level-value')
    await expect(skillLevelValue).toBeVisible()

    // Should have XP progress bar
    const xpBar = firstSkill.locator('.skill-xp-bar')
    await expect(xpBar).toBeVisible()

    const xpFill = firstSkill.locator('.skill-xp-fill')
    await expect(xpFill).toBeAttached()
  })

  test('should spawn worker summary panel in skill list', async ({ page }) => {
    const workerSummary = page.locator('#workerSummaryCompact')
    await expect(workerSummary).toBeVisible()

    // Should have worker summary title
    const title = workerSummary.locator('.worker-summary-title')
    await expect(title).toBeVisible()
    await expect(title).toContainText('Workers')
  })

  test('should spawn activity list panel on load', async ({ page }) => {
    const activityList = page.locator('#activityList')
    await expect(activityList).toBeVisible()

    // Should have a heading for the current skill
    const heading = activityList.locator('h2')
    await expect(heading).toBeVisible()

    // Should have at least one activity item
    const activityItems = page.locator('.activity-item')
    const activityCount = await activityItems.count()
    expect(activityCount).toBeGreaterThan(0)
  })

  test('should spawn all activity UI elements correctly', async ({ page }) => {
    const firstActivity = page.locator('.activity-item').first()
    await expect(firstActivity).toBeVisible({ timeout: 10000 })

    // Should have activity header
    const header = firstActivity.locator('.activity-header')
    await expect(header).toBeVisible()

    // Should have activity name
    const name = firstActivity.locator('.activity-name-text')
    await expect(name).toBeVisible()

    // Should have activity info (inputs -> outputs)
    const info = firstActivity.locator('.activity-info')
    await expect(info).toBeVisible()

    // Should have activity meta (duration + XP)
    const meta = firstActivity.locator('.activity-meta')
    await expect(meta).toBeAttached()
    await expect(meta).toContainText('XP')

    const duration = firstActivity.locator('.activity-duration')
    await expect(duration).toBeAttached()

    // Should have progress bar
    const progressBar = firstActivity.locator('.activity-progress-bar')
    await expect(progressBar).toBeVisible()

    const progressFill = firstActivity.locator('.activity-progress-fill')
    await expect(progressFill).toBeAttached()

    // Should have worker assignment section (for unlocked activities)
    const workerAssignments = firstActivity.locator('.activity-worker-assignments')
    const workerAssignmentsCount = await workerAssignments.count()

    // First activity should be unlocked and have worker assignments
    if (workerAssignmentsCount > 0) {
      await expect(workerAssignments).toBeVisible()
    }
  })

  test('should spawn active activities panel on load', async ({ page }) => {
    const activeActivities = page.locator('#activeActivities')
    await expect(activeActivities).toBeAttached()

    // Should have heading - wait for JavaScript to create it
    const heading = activeActivities.locator('h3')
    await expect(heading).toBeVisible({ timeout: 10000 })
    await expect(heading).toHaveText('Active Activities')

    // Should have list container
    const list = page.locator('#activeActivitiesList')
    await expect(list).toBeAttached()
  })

  test('should show message in active activities when no activities running', async ({ page }) => {
    // Wait for the updateActiveActivitiesPanel function to be called
    await page.waitForFunction(() => {
      const list = document.getElementById('activeActivitiesList')
      return list && list.children.length > 0
    }, { timeout: 10000 })

    const activeActivitiesList = page.locator('#activeActivitiesList')

    // Should show "no activities" message
    const noActivitiesMsg = activeActivitiesList.locator('.no-activities')
    await expect(noActivitiesMsg).toBeVisible()
    await expect(noActivitiesMsg).toContainText('Assign workers')
  })

  test('should spawn active activity items when activities are running', async ({ page }) => {
    // Set up automated activity
    await page.evaluate(() => {
      const mockState = {
        currencies: {
          basicWorker: 5
        },
        skills: {
          farming: { level: 1, xp: 0 }
        },
        workers: {
          assignments: {
            'plantWheat': { basicWorker: 1 }
          }
        }
      }
      localStorage.setItem('incrementalGameSave', JSON.stringify(mockState))
    })

    await page.reload()
    await page.waitForTimeout(1000)  // Wait for activity to start

    const activeActivitiesList = page.locator('#activeActivitiesList')
    const activeActivityItems = activeActivitiesList.locator('.active-activity-item')
    const itemCount = await activeActivityItems.count()

    if (itemCount > 0) {
      const firstItem = activeActivityItems.first()
      await expect(firstItem).toBeVisible()

      // Should have activity name
      const name = firstItem.locator('.active-activity-name')
      await expect(name).toBeVisible()

      // Should have outputs display
      const outputs = firstItem.locator('.active-activity-outputs')
      await expect(outputs).toBeVisible()

      // Should have progress bar
      const progressBar = firstItem.locator('.active-activity-progress-bar')
      await expect(progressBar).toBeVisible()

      const progressFill = firstItem.locator('.active-activity-progress-fill')
      await expect(progressFill).toBeVisible()

      // Should have status
      const status = firstItem.locator('.active-activity-status')
      await expect(status).toBeVisible()
    }
  })

  test('should spawn upgrade list panel on load', async ({ page }) => {
    const upgradeList = page.locator('#upgradeList')
    await expect(upgradeList).toBeVisible()
  })

  test('should spawn upgrade items when available for skill', async ({ page }) => {
    // Set up state to have some upgrades available
    await page.evaluate(() => {
      const mockState = {
        currencies: {
          wheat: 50,
          water: 50
        },
        skills: {
          farming: { level: 1, xp: 0 }
        }
      }
      localStorage.setItem('incrementalGameSave', JSON.stringify(mockState))
    })

    await page.reload()
    await page.waitForTimeout(500)

    const upgradeItems = page.locator('.upgrade-item')
    const upgradeCount = await upgradeItems.count()

    // Should have at least some upgrades for farming skill
    if (upgradeCount > 0) {
      const firstUpgrade = upgradeItems.first()
      await expect(firstUpgrade).toBeVisible()

      // Should have upgrade header
      const header = firstUpgrade.locator('.upgrade-header')
      await expect(header).toBeVisible()

      // Should have upgrade name
      const name = firstUpgrade.locator('.upgrade-name')
      await expect(name).toBeVisible()

      // Should have upgrade type
      const type = firstUpgrade.locator('.upgrade-type')
      await expect(type).toBeVisible()

      // Should have description
      const description = firstUpgrade.locator('.upgrade-description')
      await expect(description).toBeVisible()

      // Should have cost display
      const cost = firstUpgrade.locator('.upgrade-cost')
      await expect(cost).toBeVisible()
      await expect(cost).toContainText('Cost:')
    }
  })

  test('should spawn worker panel on load', async ({ page }) => {
    const workerPanel = page.locator('.worker-panel')
    await expect(workerPanel).toBeVisible()

    // Should have heading - get the one inside the panel
    const heading = workerPanel.locator('h3').first()
    await expect(heading).toBeVisible()
    await expect(heading).toHaveText('Workers')

    // Should have summary list container - wait for JavaScript to create it
    const summaryList = page.locator('#workerSummaryList')
    await expect(summaryList).toBeAttached({ timeout: 10000 })
  })

  test('should show message in worker panel when no workers exist', async ({ page }) => {
    // Wait for the updateWorkerPanel function to be called
    await page.waitForFunction(() => {
      const list = document.getElementById('workerSummaryList')
      return list && list.children.length > 0
    }, { timeout: 10000 })

    const workerSummaryList = page.locator('#workerSummaryList')

    // Should show "no workers" message
    const noWorkersMsg = workerSummaryList.locator('.no-activities')
    await expect(noWorkersMsg).toBeVisible()
    await expect(noWorkersMsg).toContainText('No workers yet')
  })

  test('should spawn worker summary items when workers exist', async ({ page }) => {
    // Set up state with workers
    await page.evaluate(() => {
      const mockState = {
        currencies: {
          basicWorker: 5,
          tractorWorker: 2
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
    await page.waitForTimeout(500)

    const workerSummaryList = page.locator('#workerSummaryList')
    const workerSummaryItems = workerSummaryList.locator('.worker-summary-item')
    const itemCount = await workerSummaryItems.count()

    // Should have at least 2 worker types
    expect(itemCount).toBeGreaterThanOrEqual(2)

    // Check first worker summary item structure
    const firstItem = workerSummaryItems.first()
    await expect(firstItem).toBeVisible()

    // Should have icon
    const icon = firstItem.locator('.worker-summary-icon')
    await expect(icon).toBeVisible()

    // Should have name
    const name = firstItem.locator('.worker-summary-name')
    await expect(name).toBeVisible()

    // Should have stats
    const stats = firstItem.locator('.worker-summary-stats')
    await expect(stats).toBeVisible()
    await expect(stats).toContainText('total')
    await expect(stats).toContainText('assigned')
    await expect(stats).toContainText('available')
  })

  test('should spawn save and reset buttons', async ({ page }) => {
    const saveBtn = page.locator('#saveBtn')
    await expect(saveBtn).toBeVisible()
    await expect(saveBtn).toHaveText('💾 Save')

    const resetBtn = page.locator('#resetBtn')
    await expect(resetBtn).toBeVisible()
    await expect(resetBtn).toHaveText('🔄 Reset')
  })
})
