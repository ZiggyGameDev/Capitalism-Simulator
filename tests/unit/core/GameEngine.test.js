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

      expect(state).toHaveProperty('currencies')
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

    it('should include currencies in state', () => {
      engine.currencyManager.add('wheat', 50)
      const state = engine.getState()

      expect(state.currencies.wheat).toBe(50)
    })
  })

  describe('loadState()', () => {
    it('should restore currency amounts', () => {
      const state = {
        currencies: { wheat: 100, wood: 50 },
        skills: {}
      }

      engine.loadState(state)

      expect(engine.currencyManager.get('wheat')).toBe(100)
      expect(engine.currencyManager.get('wood')).toBe(50)
    })

    it('should restore skill XP', () => {
      const state = {
        currencies: {},
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
        currencies: {},
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
        currencies: {},
        skills: { farming: { xp: 100, level: 2 } }
      })
      expect(engine.skillManager.getXP('farming')).toBe(100)

      // Load second state with different XP
      engine.loadState({
        currencies: {},
        skills: { farming: { xp: 250, level: 4 } }
      })
      expect(engine.skillManager.getXP('farming')).toBe(250) // Should be 250, not 350!

      // Load original state again
      engine.loadState({
        currencies: {},
        skills: { farming: { xp: 100, level: 2 } }
      })
      expect(engine.skillManager.getXP('farming')).toBe(100) // Should be 100, not 350!
    })
  })

  describe('reset()', () => {
    it('should reset currencies to zero', () => {
      engine.currencyManager.add('wheat', 100)
      engine.reset()

      expect(engine.currencyManager.get('wheat')).toBe(0)
    })

    it('should reset skills to level 1 with 0 XP', () => {
      engine.skillManager.addXP('farming', 500)
      engine.reset()

      expect(engine.skillManager.getXP('farming')).toBe(0)
      expect(engine.skillManager.getLevel('farming')).toBe(1)
    })

    it('should reset workers to zero after reset', () => {
      engine.currencyManager.add('basicWorker', 5)
      engine.reset()
      expect(engine.currencyManager.get('basicWorker')).toBe(0)
    })
  })

  describe('Save/Load Round Trip', () => {
    it('should preserve all data through save/load cycle', () => {
      // Set up game state
      engine.currencyManager.add('wheat', 100)
      engine.currencyManager.add('wood', 50)
      engine.skillManager.addXP('farming', 150)

      // Save state
      const savedState = engine.getState()

      // Create new engine and load state
      const newEngine = new GameEngine(testSkills, testActivities, [])
      newEngine.loadState(savedState)

      // Verify all data is preserved
      expect(newEngine.currencyManager.get('wheat')).toBe(100)
      expect(newEngine.currencyManager.get('wood')).toBe(50)
      expect(newEngine.skillManager.getXP('farming')).toBe(150)
    })

    it('should handle multiple save/load cycles without data corruption', () => {
      // Initial state
      engine.currencyManager.add('wheat', 100)
      engine.skillManager.addXP('farming', 200)

      // Cycle 1: Save and load
      let state = engine.getState()
      engine.loadState(state)
      expect(engine.currencyManager.get('wheat')).toBe(100)
      expect(engine.skillManager.getXP('farming')).toBe(200)

      // Cycle 2: Save and load again
      state = engine.getState()
      engine.loadState(state)
      expect(engine.currencyManager.get('wheat')).toBe(100)
      expect(engine.skillManager.getXP('farming')).toBe(200)

      // Cycle 3: Save and load a third time
      state = engine.getState()
      engine.loadState(state)
      expect(engine.currencyManager.get('wheat')).toBe(100)
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

  it('should start with no currencies on construction', () => {
    expect(engine.currencyManager.get('basicWorker')).toBe(0)
    expect(engine.currencyManager.get('wheat')).toBe(0)
  })
})
