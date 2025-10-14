import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameEngine } from '../../src/core/GameEngine.js'
import { skills } from '../../src/data/skills-expanded.js'
import { activities } from '../../src/data/activities-expanded.js'
import { upgrades } from '../../src/data/upgrades.js'

describe('Game Loop Integration', () => {
  let game

  beforeEach(() => {
    console.log('\n=== Test Setup: Creating new GameEngine ===')
    game = new GameEngine(skills, activities, upgrades)
    game.start()
    console.log('✓ GameEngine created and started')
  })

  describe('Activity System', () => {
    it('should update activities continuously', () => {
      console.log('\n  Setting up test scenario:')
      // Give player level 1 gathering
      game.skillManager.setXP('gathering', 100)
      console.log('  ✓ Given player level 1 gathering skill')

      // Add resources and assign a worker
      game.resourceManager.add('basicWorker', 1)
      console.log('  ✓ Added 1 basicWorker')

      game.workerManager.assign('chopWood', 'basicWorker', 1)
      console.log('  ✓ Assigned 1 worker to chopWood activity')

      // Activity won't start until next update
      console.log('\n  Starting activity (100ms update)...')
      game.update(100)

      const activeCount = game.activityManager.getActiveActivities().length
      console.log(`  ✓ Active activities: ${activeCount}`)
      expect(activeCount).toBe(1)

      // Activity should progress
      const activityBefore = game.activityManager.getActiveActivities()[0]
      const progressBefore = activityBefore.progress
      console.log(`\n  Progress before: ${(progressBefore * 100).toFixed(1)}%`)

      console.log('  Updating 1000ms...')
      game.update(1000)

      const activityAfter = game.activityManager.getActiveActivities()[0]
      const progressAfter = activityAfter.progress
      console.log(`  Progress after: ${(progressAfter * 100).toFixed(1)}%`)
      console.log(`  ✓ Activity progressed by ${((progressAfter - progressBefore) * 100).toFixed(1)}%`)

      expect(progressAfter).toBeGreaterThan(progressBefore)
    })

    it('should update buildings continuously', () => {
      game.resourceManager.add('wood', 100)
      game.resourceManager.add('stone', 100)

      const houseId = game.buildingManager.startConstruction('house')
      const house = game.buildingManager.getBuildingInstance(houseId)

      expect(house.constructionComplete).toBe(false)

      // Fast-forward construction time
      house.constructionStartTime = Date.now() - (house.constructionDuration + 1000)

      game.update(100)

      expect(house.constructionComplete).toBe(true)
    })
  })

  describe('Worker Assignment', () => {
    beforeEach(() => {
      // Give player a worker and level 1 gathering
      game.resourceManager.add('basicWorker', 1)
      game.skillManager.setXP('gathering', 100)
    })

    it('should allow assigning workers to activities', () => {
      const result = game.workerManager.assign('chopWood', 'basicWorker', 1)

      expect(result).toBe(true)
      expect(game.workerManager.getAssignment('chopWood', 'basicWorker')).toBe(1)
    })

    it('should start activities when workers are assigned', () => {
      game.workerManager.assign('chopWood', 'basicWorker', 1)

      // Activity starts on next update
      game.update(100)

      const activeActivities = game.activityManager.getActiveActivities()

      expect(activeActivities).toHaveLength(1)
      expect(activeActivities[0].activityId).toBe('chopWood')
    })

    it('should not allow assigning more workers than available', () => {
      // Only have 1 worker
      const result = game.workerManager.assign('chopWood', 'basicWorker', 2)

      expect(result).toBe(false)
      expect(game.workerManager.getAssignment('chopWood', 'basicWorker')).toBe(0)
    })

    it('should allow unassigning workers', () => {
      game.workerManager.assign('chopWood', 'basicWorker', 1)
      game.workerManager.unassign('chopWood', 'basicWorker', 1)

      expect(game.workerManager.getAssignment('chopWood', 'basicWorker')).toBe(0)
    })

    it('should stop activities when all workers are unassigned', () => {
      game.workerManager.assign('chopWood', 'basicWorker', 1)
      game.workerManager.unassign('chopWood', 'basicWorker', 1)

      const activeActivities = game.activityManager.getActiveActivities()

      expect(activeActivities).toHaveLength(0)
    })
  })

  describe('Save/Load State', () => {
    it('should save and restore worker assignments', () => {
      game.resourceManager.add('basicWorker', 5)
      game.skillManager.setXP('gathering', 100)
      game.skillManager.setXP('mining', 100)

      game.workerManager.assign('chopWood', 'basicWorker', 3)
      game.workerManager.assign('mineStone', 'basicWorker', 2)

      const state = game.getState()

      const newGame = new GameEngine(skills, activities, upgrades)
      newGame.loadState(state)

      expect(newGame.workerManager.getAssignment('chopWood', 'basicWorker')).toBe(3)
      expect(newGame.workerManager.getAssignment('mineStone', 'basicWorker')).toBe(2)
    })

    it('should restart activities after loading', () => {
      game.resourceManager.add('basicWorker', 1)
      game.skillManager.setXP('gathering', 100)
      game.workerManager.assign('chopWood', 'basicWorker', 1)

      const state = game.getState()

      const newGame = new GameEngine(skills, activities, upgrades)
      newGame.loadState(state)
      newGame.start() // Must start the game

      // Activities should be running after first update
      newGame.update(100)

      expect(newGame.activityManager.getActiveActivities()).toHaveLength(1)
    })
  })

  describe('Building System', () => {
    it('should allow building construction at any time', () => {
      console.log('\n=== Building Construction Test ===')

      // Give player resources
      console.log('\nSetting up resources:')
      game.resourceManager.add('wood', 100)
      game.resourceManager.add('stone', 50)
      console.log('  ✓ Added wood=100, stone=50')

      // Build a house
      console.log('\nStarting house construction:')
      const currentWood = game.resourceManager.get('wood')
      const currentStone = game.resourceManager.get('stone')
      console.log(`  Before: wood=${currentWood}, stone=${currentStone}`)

      const houseId = game.buildingManager.startConstruction('house')
      console.log(`  ✓ Started construction (ID: ${houseId})`)

      const afterWood = game.resourceManager.get('wood')
      const afterStone = game.resourceManager.get('stone')
      console.log(`  After: wood=${afterWood}, stone=${afterStone}`)
      console.log(`  ✓ Resources deducted correctly`)

      expect(houseId).toBeTruthy()
      expect(afterWood).toBe(currentWood - 50)
      expect(afterStone).toBe(currentStone - 30)
      console.log('\n✓ Building construction successful!')
    })

    it('should generate workers and resources from buildings', () => {
      console.log('\n=== Building Production Test ===')

      // Build and complete a house
      game.resourceManager.add('wood', 100)
      game.resourceManager.add('stone', 50)

      const houseId = game.buildingManager.startConstruction('house')
      const house = game.buildingManager.getBuildingInstance(houseId)

      // Complete construction instantly for testing
      house.constructionComplete = true
      console.log('  ✓ House construction completed')

      const workersBefore = game.resourceManager.get('basicWorker') || 0
      console.log(`  Workers before: ${workersBefore}`)

      // Fast-forward time to generate workers
      game.update(60000) // 60 seconds
      console.log('  ✓ Simulated 60 seconds')

      const workersAfter = game.resourceManager.get('basicWorker') || 0
      console.log(`  Workers after: ${workersAfter}`)
      console.log(`  ✓ Generated ${workersAfter - workersBefore} workers`)

      expect(workersAfter).toBeGreaterThan(workersBefore)
      console.log('\n✓ Building production successful!')
    })
  })
})
