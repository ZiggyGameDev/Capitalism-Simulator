import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine } from '../../../src/core/GameEngine.js'

const testSkills = [
  { id: 'farming', name: 'Farming', icon: '🌱' }
]

const testActivities = [
  {
    id: 'plantWheat',
    name: 'Plant Wheat',
    skillId: 'farming',
    levelRequired: 1,
    inputs: {},
    outputs: { wheat: 1 },
    duration: 3,
    xpGained: 5
  }
]

describe('GameEngine - Save/Load System', () => {
  let engine

  beforeEach(() => {
    engine = new GameEngine(testSkills, testActivities, [])
  })

  describe('getState()', () => {
    it('should return complete game state', () => {
      const state = engine.getState()

      expect(state).toHaveProperty('resourceManager')
      expect(state).toHaveProperty('skills')
      expect(state).toHaveProperty('upgrades')
      expect(state).toHaveProperty('workers')
      expect(state).toHaveProperty('lastSaveTime')
    })

    it('should include skill XP in state', () => {
      engine.skillManager.addXP('farming', 100)
      const state = engine.getState()

      expect(state.skills.farming.xp).toBe(100)
    })

    it('should include resources in state', () => {
      engine.resourceManager.add('wheat', 50)
      const state = engine.getState()

      expect(state.resourceManager.resources.wheat).toBe(50)
    })
  })

  describe('loadState()', () => {
    it('should restore resource amounts', () => {
      const state = {
        version: 2,
        resources: { wheat: 100, wood: 50 },
        skills: {}
      }

      engine.loadState(state)

      expect(engine.resourceManager.get('wheat')).toBe(100)
      expect(engine.resourceManager.get('wood')).toBe(50)
    })

    it('should restore skill XP', () => {
      const state = {
        version: 2,
        resources: {},
        skills: {
          farming: { xp: 150, level: 3 }
        }
      }

      engine.loadState(state)

      expect(engine.skillManager.getXP('farming')).toBe(150)
    })

    it('should NOT duplicate XP on repeated loads (BUG FIX)', () => {
      // This test verifies the fix for Bug #4
      const state = {
        version: 2,
        resources: {},
        skills: {
          farming: { xp: 100, level: 2 }
        }
      }

      // Load once
      engine.loadState(state)
      expect(engine.skillManager.getXP('farming')).toBe(100)

      // Load again with same state
      engine.loadState(state)
      expect(engine.skillManager.getXP('farming')).toBe(100) // Should still be 100, not 200!

      // Load a third time
      engine.loadState(state)
      expect(engine.skillManager.getXP('farming')).toBe(100) // Should still be 100, not 300!
    })

    it('should handle loading different XP values correctly', () => {
      // Load first state
      engine.loadState({
        version: 2,
        resources: {},
        skills: { farming: { xp: 100, level: 2 } }
      })
      expect(engine.skillManager.getXP('farming')).toBe(100)

      // Load second state with different XP
      engine.loadState({
        version: 2,
        resources: {},
        skills: { farming: { xp: 250, level: 4 } }
      })
      expect(engine.skillManager.getXP('farming')).toBe(250) // Should be 250, not 350!

      // Load original state again
      engine.loadState({
        version: 2,
        resources: {},
        skills: { farming: { xp: 100, level: 2 } }
      })
      expect(engine.skillManager.getXP('farming')).toBe(100) // Should be 100, not 350!
    })
  })

  describe('reset()', () => {
    it('should reset resources to zero', () => {
      engine.resourceManager.add('wheat', 100)
      engine.reset()

      expect(engine.resourceManager.get('wheat')).toBe(0)
    })

    it('should reset skills to level 1 with 0 XP', () => {
      engine.skillManager.addXP('farming', 500)
      engine.reset()

      expect(engine.skillManager.getXP('farming')).toBe(0)
      expect(engine.skillManager.getLevel('farming')).toBe(1)
    })

    it('should reset workers to zero after reset', () => {
      engine.resourceManager.add('basicWorker', 5)
      engine.reset()
      // Reset now gives 2 starting workers for new games
      expect(engine.resourceManager.get('basicWorker')).toBe(2)
    })
  })

  describe('Save/Load Round Trip', () => {
    it('should preserve all data through save/load cycle', () => {
      // Set up game state
      engine.resourceManager.add('wheat', 100)
      engine.resourceManager.add('wood', 50)
      engine.skillManager.addXP('farming', 150)

      // Save state
      const savedState = engine.getState()

      // Create new engine and load state
      const newEngine = new GameEngine(testSkills, testActivities, [])
      newEngine.loadState(savedState)

      // Verify all data is preserved
      expect(newEngine.resourceManager.get('wheat')).toBe(100)
      expect(newEngine.resourceManager.get('wood')).toBe(50)
      expect(newEngine.skillManager.getXP('farming')).toBe(150)
    })

    it('should handle multiple save/load cycles without data corruption', () => {
      // Initial state
      engine.resourceManager.add('wheat', 100)
      engine.skillManager.addXP('farming', 200)

      // Cycle 1: Save and load
      let state = engine.getState()
      engine.loadState(state)
      expect(engine.resourceManager.get('wheat')).toBe(100)
      expect(engine.skillManager.getXP('farming')).toBe(200)

      // Cycle 2: Save and load again
      state = engine.getState()
      engine.loadState(state)
      expect(engine.resourceManager.get('wheat')).toBe(100)
      expect(engine.skillManager.getXP('farming')).toBe(200)

      // Cycle 3: Save and load a third time
      state = engine.getState()
      engine.loadState(state)
      expect(engine.resourceManager.get('wheat')).toBe(100)
      expect(engine.skillManager.getXP('farming')).toBe(200)
    })
  })
})

describe('GameEngine - Lifecycle', () => {
  let engine

  beforeEach(() => {
    engine = new GameEngine(testSkills, testActivities, [])
  })

  it('should start with running=false', () => {
    expect(engine.isRunning).toBe(false)
  })

  it('should start with paused=false', () => {
    expect(engine.isPaused).toBe(false)
  })

  it('should set isRunning to true when started', () => {
    engine.start()
    expect(engine.isRunning).toBe(true)
  })

  it('should set isPaused to true when paused', () => {
    engine.start()
    engine.pause()
    expect(engine.isPaused).toBe(true)
  })

  it('should set isRunning to false when stopped', () => {
    engine.start()
    engine.stop()
    expect(engine.isRunning).toBe(false)
  })

  it('should start with no resources on construction', () => {
    expect(engine.resourceManager.get('basicWorker')).toBe(0)
    expect(engine.resourceManager.get('wheat')).toBe(0)
  })
})
