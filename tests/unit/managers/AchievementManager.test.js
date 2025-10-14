import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AchievementManager } from '../../../src/managers/AchievementManager.js'
import { EventBus } from '../../../src/core/EventBus.js'

describe('AchievementManager', () => {
  let achievementManager
  let eventBus

  const testAchievements = [
    {
      id: 'test_skill',
      name: 'Test Skill Achievement',
      type: 'skillLevel',
      requirement: { skillId: 'woodcutting', level: 5 },
      reward: { wood: 50 }
    },
    {
      id: 'test_currency',
      name: 'Test Currency Achievement',
      type: 'currencyEarned',
      requirement: { currencyId: 'wood', amount: 100 },
      reward: { wood: 25 }
    },
    {
      id: 'test_activity',
      name: 'Test Activity Achievement',
      type: 'activityCount',
      requirement: { skillId: 'woodcutting', count: 10 },
      reward: { wood: 75 }
    },
    {
      id: 'test_upgrade',
      name: 'Test Upgrade Achievement',
      type: 'upgradeCount',
      requirement: { count: 1 },
      reward: { wood: 30 }
    },
    {
      id: 'test_total_level',
      name: 'Test Total Level',
      type: 'totalLevel',
      requirement: { level: 10 },
      reward: { wood: 100 }
    }
  ]

  beforeEach(() => {
    eventBus = new EventBus()
    achievementManager = new AchievementManager(testAchievements, eventBus)
  })

  describe('constructor', () => {
    it('should initialize with empty unlocked list', () => {
      expect(achievementManager.unlocked).toEqual([])
    })

    it('should initialize tracking stats', () => {
      expect(achievementManager.stats.currenciesEarned).toEqual({})
      expect(achievementManager.stats.activitiesCompleted).toEqual({})
    })
  })

  describe('checkAchievement', () => {
    it('should unlock skill level achievement when requirement met', () => {
      const gameState = {
        skills: { woodcutting: { level: 5 } }
      }

      const unlocked = achievementManager.checkAchievement('test_skill', gameState)
      expect(unlocked).toBe(true)
      expect(achievementManager.isUnlocked('test_skill')).toBe(true)
    })

    it('should not unlock if already unlocked', () => {
      achievementManager.unlocked.push('test_skill')
      const gameState = {
        skills: { woodcutting: { level: 5 } }
      }

      const unlocked = achievementManager.checkAchievement('test_skill', gameState)
      expect(unlocked).toBe(false)
    })

    it('should emit achievement:unlocked event', () => {
      let eventEmitted = false
      eventBus.on('achievement:unlocked', () => { eventEmitted = true })

      const gameState = {
        skills: { woodcutting: { level: 5 } }
      }

      achievementManager.checkAchievement('test_skill', gameState)
      expect(eventEmitted).toBe(true)
    })
  })

  describe('trackCurrency', () => {
    it('should track currency earned', () => {
      achievementManager.trackCurrency('wood', 50)
      expect(achievementManager.stats.currenciesEarned.wood).toBe(50)
    })

    it('should accumulate currency earned', () => {
      achievementManager.trackCurrency('wood', 50)
      achievementManager.trackCurrency('wood', 30)
      expect(achievementManager.stats.currenciesEarned.wood).toBe(80)
    })
  })

  describe('trackActivity', () => {
    it('should track activity completed', () => {
      achievementManager.trackActivity('woodcutting')
      expect(achievementManager.stats.activitiesCompleted.woodcutting).toBe(1)
    })

    it('should accumulate activity count', () => {
      achievementManager.trackActivity('woodcutting')
      achievementManager.trackActivity('woodcutting')
      achievementManager.trackActivity('woodcutting')
      expect(achievementManager.stats.activitiesCompleted.woodcutting).toBe(3)
    })
  })

  describe('checkAll', () => {
    it('should check all achievements and return newly unlocked', () => {
      const gameState = {
        skills: { woodcutting: { level: 5 } },
        upgrades: { purchased: [] }
      }

      const unlocked = achievementManager.checkAll(gameState)
      expect(unlocked.length).toBeGreaterThan(0)
      expect(unlocked[0].id).toBe('test_skill')
    })

    it('should check currency achievements', () => {
      achievementManager.trackCurrency('wood', 100)
      const gameState = {
        skills: {},
        upgrades: { purchased: [] }
      }

      const unlocked = achievementManager.checkAll(gameState)
      const currencyAch = unlocked.find(a => a.id === 'test_currency')
      expect(currencyAch).toBeDefined()
    })
  })

  describe('getState and loadState', () => {
    it('should save and restore unlocked achievements', () => {
      achievementManager.unlocked = ['test_skill', 'test_currency']
      achievementManager.stats.currenciesEarned = { wood: 100 }

      const state = achievementManager.getState()
      const newManager = new AchievementManager(testAchievements, eventBus)
      newManager.loadState(state)

      expect(newManager.isUnlocked('test_skill')).toBe(true)
      expect(newManager.stats.currenciesEarned.wood).toBe(100)
    })
  })

  describe('reset', () => {
    it('should clear all unlocked achievements and stats', () => {
      achievementManager.unlocked = ['test_skill']
      achievementManager.stats.currenciesEarned = { wood: 100 }

      achievementManager.reset()

      expect(achievementManager.unlocked).toEqual([])
      expect(achievementManager.stats.currenciesEarned).toEqual({})
    })
  })
})
