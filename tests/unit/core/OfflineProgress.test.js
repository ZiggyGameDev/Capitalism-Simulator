import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine } from '../../../src/core/GameEngine.js'
import { skills } from '../../../src/data/skills.js'
import { activities } from '../../../src/data/activities.js'

describe('Offline Progress', () => {
  let game

  beforeEach(() => {
    game = new GameEngine(skills, activities)
  })

  describe('calculateOfflineProgress', () => {
    it('should return zero progress if no activities were running', () => {
      const result = game.calculateOfflineProgress(60000, {
        version: 2,
        resources: {},
        skills: {},
        workers: { assignments: {} }
      })

      expect(result.activitiesCompleted).toEqual([])
      expect(result.totalTime).toBe(0)
    })

    it('should simulate activity completions during offline time', () => {
      // Start a free activity (chop normal tree - 2 seconds) with workers assigned
      const state = {
        version: 2,
        resources: { basicWorker: 1 },
        skills: { woodcutting: { xp: 0, level: 1 } },
        workers: {
          assignments: {
            'chopNormalTree': { basicWorker: 1 }
          }
        }
      }

      // 10 seconds offline = 5 completions of 2-second activity
      const result = game.calculateOfflineProgress(10000, state)

      expect(result.activitiesCompleted.length).toBeGreaterThan(0)
      expect(result.totalTime).toBe(10000)
    })

    it('should respect resource requirements for activities', () => {
      // Activity needs inputs but state has no resources
      const state = {
        version: 2,
        resources: { basicWorker: 1 },
        skills: { cooking: { xp: 50, level: 2 } },
        workers: {
          assignments: {
            'cookShrimp': { basicWorker: 1 }
          }
        }
      }

      // cookShrimp needs rawShrimp, which we don't have
      const result = game.calculateOfflineProgress(10000, state)

      expect(result.activitiesCompleted.length).toBe(0)
    })

    it('should award resources from completed activities', () => {
      const state = {
        version: 2,
        resources: { basicWorker: 1 },
        skills: { woodcutting: { xp: 0, level: 1 } },
        workers: {
          assignments: {
            'chopNormalTree': { basicWorker: 1 }
          }
        }
      }

      const result = game.calculateOfflineProgress(10000, state)

      // Should have earned wood
      expect(result.resourcesEarned.wood).toBeGreaterThan(0)
    })

    it('should award XP from completed activities', () => {
      const state = {
        version: 2,
        resources: { basicWorker: 1 },
        skills: { woodcutting: { xp: 0, level: 1 } },
        workers: {
          assignments: {
            'chopNormalTree': { basicWorker: 1 }
          }
        }
      }

      const result = game.calculateOfflineProgress(10000, state)

      // Should have earned woodcutting XP
      expect(result.xpEarned.woodcutting).toBeGreaterThan(0)
    })

    it('should cap offline progress at 8 hours', () => {
      const state = {
        version: 2,
        resources: { basicWorker: 1 },
        skills: { woodcutting: { xp: 0, level: 1 } },
        workers: {
          assignments: {
            'chopNormalTree': { basicWorker: 1 }
          }
        }
      }

      const tenHours = 10 * 60 * 60 * 1000
      const eightHours = 8 * 60 * 60 * 1000

      const result = game.calculateOfflineProgress(tenHours, state)

      // Should only simulate 8 hours
      expect(result.totalTime).toBe(eightHours)
    })

    it('should handle multiple simultaneous activities', () => {
      const state = {
        version: 2,
        resources: { basicWorker: 2 },
        skills: {
          woodcutting: { xp: 0, level: 1 },
          mining: { xp: 0, level: 1 }
        },
        workers: {
          assignments: {
            'chopNormalTree': { basicWorker: 1 },
            'mineCopperOre': { basicWorker: 1 }
          }
        }
      }

      const result = game.calculateOfflineProgress(10000, state)

      // Should have completed both activities
      expect(result.activitiesCompleted.length).toBeGreaterThan(0)
      expect(result.resourcesEarned.wood).toBeGreaterThan(0)
      expect(result.resourcesEarned.copperOre).toBeGreaterThan(0)
    })

    it('should stop processing activity when resources run out', () => {
      // Start with limited resources
      const state = {
        version: 2,
        resources: {
          basicWorker: 1,
          shrimp: 2  // Only enough for 2 completions
        },
        skills: { cooking: { xp: 50, level: 2 } },
        workers: {
          assignments: {
            'cookShrimp': { basicWorker: 1 }
          }
        }
      }

      // Request 60 seconds offline (would be 30 completions at 2s each)
      const result = game.calculateOfflineProgress(60000, state)

      // Should only complete 2 times (until resources run out)
      const cookCompletions = result.activitiesCompleted.find(a => a.activityId === 'cookShrimp')
      expect(cookCompletions.completions).toBe(2) // 2 shrimp, 1 per completion = 2 completions
    })

    it('should handle production chains correctly', () => {
      // Have resources to run a production chain
      const state = {
        version: 2,
        resources: {
          basicWorker: 1,
          puppy: 3,
          cookedShrimp: 10
        },
        skills: { dogHandling: { xp: 152, level: 5 } }, // 152 XP = level 5
        workers: {
          assignments: {
            'trainGuardDog': { basicWorker: 1 }
          }
        }
      }

      // 30 seconds offline - trainGuardDog takes 5s and needs 1 puppy + 3 cooked shrimp
      const result = game.calculateOfflineProgress(30000, state)

      // Should complete 3 times (limited by 3 puppies)
      const trainCompletions = result.activitiesCompleted.find(a => a.activityId === 'trainGuardDog')
      expect(trainCompletions.completions).toBe(3)
      expect(result.resourcesEarned.guardDog).toBe(3)
      expect(result.resourcesEarned.bones).toBe(6) // 2 bones per completion
    })
  })

  describe('applyOfflineProgress', () => {
    it('should apply calculated offline progress to game state', () => {
      // Set up a saved state
      game.resourceManager.set('wood', 0)
      game.skillManager.addXP('woodcutting', 0)

      const offlineResult = {
        activitiesCompleted: [
          { activityId: 'chopNormalTree', completions: 5 }
        ],
        resourcesEarned: { wood: 5 },
        xpEarned: { woodcutting: 25 },
        totalTime: 10000
      }

      game.applyOfflineProgress(offlineResult)

      expect(game.resourceManager.get('wood')).toBe(5)
      expect(game.skillManager.getXP('woodcutting')).toBe(25)
    })

    it('should emit an offline progress event', () => {
      let eventEmitted = false
      let eventData = null

      game.on('game:offlineProgress', (data) => {
        eventEmitted = true
        eventData = data
      })

      const offlineResult = {
        activitiesCompleted: [{ activityId: 'chopNormalTree', completions: 5 }],
        resourcesEarned: { wood: 5 },
        xpEarned: { woodcutting: 25 },
        totalTime: 10000
      }

      game.applyOfflineProgress(offlineResult)

      expect(eventEmitted).toBe(true)
      expect(eventData.totalTime).toBe(10000)
      expect(eventData.resourcesEarned.wood).toBe(5)
    })
  })

  describe('loadState with offline progress', () => {
    it('should calculate and apply offline progress when loading', () => {
      const now = Date.now()
      const tenSecondsAgo = now - 10000

      const state = {
        version: 2,
        resources: { basicWorker: 1 },
        skills: { woodcutting: { xp: 0, level: 1 } },
        workers: {
          assignments: {
            'chopNormalTree': { basicWorker: 1 }
          }
        },
        lastSaveTime: tenSecondsAgo
      }

      game.loadState(state)

      // Should have earned wood from offline progress
      expect(game.resourceManager.get('wood')).toBeGreaterThan(0)
    })

    it('should not apply offline progress if no lastSaveTime', () => {
      const state = {
        version: 2,
        resources: { basicWorker: 1 },
        skills: { woodcutting: { xp: 0, level: 1 } },
        workers: {
          assignments: {
            'chopNormalTree': { basicWorker: 1 }
          }
        }
        // No lastSaveTime property
      }

      game.loadState(state)

      // Should not have earned anything
      expect(game.resourceManager.get('wood')).toBe(0)
    })
  })
})
