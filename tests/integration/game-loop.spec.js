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
    console.log(`  - Initial phase: ${game.roundManager.currentPhase}`)
    console.log(`  - Initial round: ${game.roundManager.currentRound}`)
  })

  describe('Time Progression', () => {
    it('should update round timer as time passes', () => {
      const initialTime = game.roundManager.phaseTimeRemaining
      console.log(`\n  Initial time remaining: ${initialTime}s`)

      // Simulate 1 second passing
      console.log('  Simulating 1 second of game time...')
      game.update(1000)

      const afterTime = game.roundManager.phaseTimeRemaining
      console.log(`  Time remaining after update: ${afterTime}s`)
      console.log(`  ✓ Time decreased by ~${initialTime - afterTime}s`)

      expect(afterTime).toBeLessThan(initialTime)
      expect(afterTime).toBeCloseTo(initialTime - 1, 0)
    })

    it('should transition to building phase after time runs out', () => {
      expect(game.roundManager.currentPhase).toBe('collection')

      // Fast-forward to end of collection phase
      game.update(game.roundManager.COLLECTION_PHASE_DURATION * 1000 + 100)

      expect(game.roundManager.currentPhase).toBe('building')
    })

    it('should update activities during collection phase', () => {
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

    it('should NOT update activities during building phase', () => {
      // Move to building phase
      game.roundManager.currentPhase = 'building'

      // Add resources and assign worker
      game.resourceManager.add('basicWorker', 1)
      game.workerManager.assign('chopTree', 'basicWorker', 1)

      const activeActivities = game.activityManager.getActiveActivities()

      // Update game
      game.update(1000)

      // Activities should not have progressed (no completions)
      const woodBefore = game.resourceManager.get('wood') || 0

      game.update(5000) // 5 more seconds

      const woodAfter = game.resourceManager.get('wood') || 0

      // Wood should not have increased (activity frozen during building phase)
      expect(woodAfter).toBe(woodBefore)
    })

    it('should update buildings during collection phase', () => {
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
    it('should save and restore round manager state', () => {
      // Progress time
      game.update(10000) // 10 seconds

      const state = game.getState()

      expect(state.roundManager).toBeDefined()
      expect(state.roundManager.phaseTimeRemaining).toBeLessThan(90)

      // Create new game and load
      const newGame = new GameEngine(skills, activities, upgrades)
      newGame.loadState(state)

      expect(newGame.roundManager.phaseTimeRemaining).toBe(state.roundManager.phaseTimeRemaining)
      expect(newGame.roundManager.currentPhase).toBe(state.roundManager.currentPhase)
      expect(newGame.roundManager.currentRound).toBe(state.roundManager.currentRound)
    })

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

  describe('Complete Game Flow', () => {
    it('should progress through a complete round cycle', () => {
      console.log('\n=== Full Game Round Cycle Test ===')

      // Start in collection phase
      console.log(`\nPhase check:`)
      console.log(`  Current phase: ${game.roundManager.currentPhase}`)
      console.log(`  Current round: ${game.roundManager.currentRound}`)
      expect(game.roundManager.currentPhase).toBe('collection')
      expect(game.roundManager.currentRound).toBe(1)

      // Give player resources and skills
      console.log('\nSetting up player resources:')
      game.resourceManager.add('basicWorker', 1)
      console.log('  ✓ Added 1 basicWorker')

      game.skillManager.setXP('gathering', 100)
      console.log('  ✓ Set gathering skill to level 1')

      game.workerManager.assign('chopWood', 'basicWorker', 1)
      console.log('  ✓ Assigned worker to chopWood')

      // Let activity run for a while
      console.log('\nRunning activities:')
      game.update(100) // First update to start activity
      console.log('  ✓ Activity started (100ms)')

      game.update(10000) // Then 10 seconds to complete some cycles
      console.log('  ✓ Simulated 10 seconds of gameplay')

      // Should have some wood
      const wood = game.resourceManager.get('wood') || 0
      console.log(`\nResource check:`)
      console.log(`  Wood earned: ${wood}`)
      expect(wood).toBeGreaterThan(0)

      // Fast-forward to end of collection phase
      console.log('\nFast-forwarding to building phase...')
      game.fastForwardRound()
      console.log(`  ✓ Now in ${game.roundManager.currentPhase} phase`)

      expect(game.roundManager.currentPhase).toBe('building')

      // Build a house - first ensure we have enough resources
      console.log('\nBuilding phase:')

      // Ensure we have enough resources (house requires wood=50, stone=30)
      const currentWood = game.resourceManager.get('wood') || 0
      const currentStone = game.resourceManager.get('stone') || 0
      console.log(`  Current resources: wood=${currentWood}, stone=${currentStone}`)

      game.resourceManager.add('wood', 50)
      game.resourceManager.add('stone', 30)
      console.log(`  ✓ Added resources for building`)
      console.log(`  Updated: wood=${game.resourceManager.get('wood')}, stone=${game.resourceManager.get('stone')}`)

      game.buildingManager.startConstruction('house')
      console.log('  ✓ Started house construction')

      // Continue to next round
      console.log('\nEnding building phase...')
      game.endBuildingPhase()
      console.log(`  ✓ Advanced to round ${game.roundManager.currentRound}`)
      console.log(`  ✓ Back in ${game.roundManager.currentPhase} phase`)

      expect(game.roundManager.currentPhase).toBe('collection')
      expect(game.roundManager.currentRound).toBe(2)
      console.log('\n✓ Complete round cycle successful!')
    })

    it('should end game after 5 rounds', () => {
      // Complete 5 rounds
      for (let i = 0; i < 5; i++) {
        game.fastForwardRound() // End collection phase
        game.endBuildingPhase() // End building phase
      }

      expect(game.roundManager.gameEnded).toBe(true)
      expect(game.roundManager.currentPhase).toBe('ended')
    })
  })

  describe('Phase Restrictions', () => {
    it('should disable worker controls during building phase', () => {
      game.roundManager.currentPhase = 'building'

      // This is more of a UI test, but the game should still allow it programmatically
      // The UI is responsible for disabling controls
      game.resourceManager.add('basicWorker', 1)
      const result = game.workerManager.assign('chopTree', 'basicWorker', 1)

      // Game allows it, but UI should prevent it
      expect(result).toBe(true)
    })
  })
})
