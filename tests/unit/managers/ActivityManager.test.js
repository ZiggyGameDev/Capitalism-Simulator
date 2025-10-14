import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ActivityManager } from '../../../src/managers/ActivityManager.js'
import { CurrencyManager } from '../../../src/managers/CurrencyManager.js'
import { SkillManager } from '../../../src/managers/SkillManager.js'
import { EventBus } from '../../../src/core/EventBus.js'

describe('ActivityManager', () => {
  let am, cm, sm, eventBus
  const activities = [
    {
      id: 'chopTree',
      name: 'Chop Tree',
      skillId: 'woodcutting',
      levelRequired: 1,
      inputs: {},
      outputs: { wood: 1 },
      duration: 2,  // seconds
      xpGained: 5
    },
    {
      id: 'trainDog',
      name: 'Train Dog',
      skillId: 'dogHandling',
      levelRequired: 5,
      inputs: { puppy: 1, food: 3 },
      outputs: { guardDog: 1 },
      duration: 5,
      xpGained: 25
    },
    {
      id: 'fishShrimp',
      name: 'Fish Shrimp',
      skillId: 'fishing',
      levelRequired: 1,
      inputs: {},
      outputs: { shrimp: 1 },
      duration: 3,
      xpGained: 8
    }
  ]

  const skills = [
    { id: 'woodcutting', name: 'Woodcutting' },
    { id: 'dogHandling', name: 'Dog Handling' },
    { id: 'fishing', name: 'Fishing' }
  ]

  beforeEach(() => {
    eventBus = new EventBus()
    cm = new CurrencyManager()
    sm = new SkillManager(skills, activities, eventBus)
    am = new ActivityManager(activities, cm, sm, eventBus)
  })

  describe('canStart()', () => {
    it('should return true if all requirements met', () => {
      expect(am.canStart('chopTree')).toBe(true)
    })

    it('should return false if level requirement not met', () => {
      expect(am.canStart('trainDog')).toBe(false)
    })

    it('should return false if missing currency', () => {
      sm.addXP('dogHandling', 500)  // Get to level 5+
      expect(am.canStart('trainDog')).toBe(false)  // Missing puppy + food
    })

    it('should return true if all requirements met', () => {
      sm.addXP('dogHandling', 500)
      cm.add('puppy', 1)
      cm.add('food', 3)
      expect(am.canStart('trainDog')).toBe(true)
    })

    it('should return false for non-existent activity', () => {
      expect(am.canStart('invalid')).toBe(false)
    })

    it('should return false if activity already running', () => {
      am.start('chopTree')
      expect(am.canStart('chopTree')).toBe(false)
    })
  })

  describe('start()', () => {
    it('should start activity if requirements met', () => {
      am.start('chopTree')
      const active = am.getActiveActivities()
      expect(active).toHaveLength(1)
      expect(active[0].activityId).toBe('chopTree')
    })

    it('should throw if requirements not met', () => {
      expect(() => am.start('trainDog')).toThrow()
    })

    it('should prevent starting same activity twice', () => {
      am.start('chopTree')
      expect(() => am.start('chopTree')).toThrow()
    })

    it('should emit activity:started event', () => {
      const startSpy = vi.fn()
      eventBus.on('activity:started', startSpy)
      am.start('chopTree')

      expect(startSpy).toHaveBeenCalledWith({
        activityId: 'chopTree',
        skillId: 'woodcutting'
      })
    })

    it('should allow multiple different activities', () => {
      am.start('chopTree')
      am.start('fishShrimp')
      expect(am.getActiveActivities()).toHaveLength(2)
    })
  })

  describe('update()', () => {
    it('should update activity progress', () => {
      am.start('chopTree')
      am.update(1000)  // 1 second passed
      const progress = am.getProgress('chopTree')
      expect(progress).toBeCloseTo(0.5, 2)  // 1s / 2s = 50%
    })

    it('should complete activity when time elapsed', () => {
      am.start('chopTree')
      const completeSpy = vi.fn()
      eventBus.on('activity:completed', completeSpy)

      am.update(2000)  // Full duration

      expect(completeSpy).toHaveBeenCalled()
      expect(cm.get('wood')).toBe(1)
      expect(sm.getXP('woodcutting')).toBe(5)
      expect(am.getActiveActivities()).toHaveLength(0)
    })

    it('should consume inputs on completion', () => {
      sm.addXP('dogHandling', 500)
      cm.add('puppy', 1)
      cm.add('food', 3)

      am.start('trainDog')
      am.update(5000)

      expect(cm.get('puppy')).toBe(0)
      expect(cm.get('food')).toBe(0)
      expect(cm.get('guardDog')).toBe(1)
    })

    it('should restart if auto-mode enabled', () => {
      am.start('chopTree', { autoMode: true })
      am.update(2000)

      // Should auto-restart
      const active = am.getActiveActivities()
      expect(active).toHaveLength(1)
      expect(active[0].progress).toBeLessThan(0.1)  // Just restarted
    })

    it('should stop auto-mode if cannot afford', () => {
      sm.addXP('dogHandling', 500)
      cm.add('puppy', 1)
      cm.add('food', 3)

      am.start('trainDog', { autoMode: true })
      am.update(5000)

      // Only had resources for 1 completion
      expect(am.getActiveActivities()).toHaveLength(0)
    })

    it('should handle multiple activities updating', () => {
      am.start('chopTree')
      am.start('fishShrimp')
      am.update(2000)

      // ChopTree completes (2s), fishShrimp at 2/3 progress
      expect(cm.get('wood')).toBe(1)
      expect(cm.get('shrimp')).toBe(0)  // Not done yet
      expect(am.getProgress('fishShrimp')).toBeCloseTo(0.666, 2)
    })

    it('should emit activity:completed with correct data', () => {
      const completeSpy = vi.fn()
      eventBus.on('activity:completed', completeSpy)

      am.start('chopTree')
      am.update(2000)

      expect(completeSpy).toHaveBeenCalledWith({
        activityId: 'chopTree',
        outputs: { wood: 1 },
        xpGained: 5,
        skillId: 'woodcutting'
      })
    })
  })

  describe('getProgress()', () => {
    it('should return 0 for non-running activity', () => {
      expect(am.getProgress('chopTree')).toBe(0)
    })

    it('should return progress between 0 and 1', () => {
      am.start('chopTree')
      am.update(500)
      const progress = am.getProgress('chopTree')
      expect(progress).toBeGreaterThan(0)
      expect(progress).toBeLessThan(1)
    })

    it('should not exceed 1', () => {
      am.start('chopTree')
      am.update(10000)  // Way more than duration
      expect(am.getProgress('chopTree')).toBe(0)  // Already completed
    })
  })

  describe('stopActivity()', () => {
    it('should stop running activity', () => {
      am.start('chopTree')
      am.stopActivity('chopTree')
      expect(am.getActiveActivities()).toHaveLength(0)
    })

    it('should not grant rewards if stopped early', () => {
      am.start('chopTree')
      am.update(1000)  // Only halfway
      am.stopActivity('chopTree')

      expect(cm.get('wood')).toBe(0)
      expect(sm.getXP('woodcutting')).toBe(0)
    })

    it('should handle stopping non-existent activity', () => {
      expect(() => am.stopActivity('chopTree')).not.toThrow()
    })

    it('should emit activity:stopped event', () => {
      const stopSpy = vi.fn()
      eventBus.on('activity:stopped', stopSpy)

      am.start('chopTree')
      am.stopActivity('chopTree')

      expect(stopSpy).toHaveBeenCalledWith({
        activityId: 'chopTree',
        progress: expect.any(Number)
      })
    })
  })

  describe('setAutoMode()', () => {
    it('should enable auto-mode for running activity', () => {
      am.start('chopTree')
      am.setAutoMode('chopTree', true)
      am.update(2000)

      // Should restart
      expect(am.getActiveActivities()).toHaveLength(1)
    })

    it('should disable auto-mode', () => {
      am.start('chopTree', { autoMode: true })
      am.setAutoMode('chopTree', false)
      am.update(2000)

      // Should not restart
      expect(am.getActiveActivities()).toHaveLength(0)
    })

    it('should handle setting auto-mode for non-running activity', () => {
      expect(() => am.setAutoMode('chopTree', true)).not.toThrow()
    })
  })

  describe('getActiveActivities()', () => {
    it('should return empty array initially', () => {
      expect(am.getActiveActivities()).toEqual([])
    })

    it('should return array of active activities', () => {
      am.start('chopTree')
      am.start('fishShrimp')

      const active = am.getActiveActivities()
      expect(active).toHaveLength(2)
      expect(active[0]).toHaveProperty('activityId')
      expect(active[0]).toHaveProperty('progress')
      expect(active[0]).toHaveProperty('startTime')
    })
  })

  describe('reset()', () => {
    it('should stop all activities', () => {
      am.start('chopTree')
      am.start('fishShrimp')
      am.reset()
      expect(am.getActiveActivities()).toHaveLength(0)
    })
  })

  describe('getActivityInfo()', () => {
    it('should return activity definition', () => {
      const info = am.getActivityInfo('chopTree')
      expect(info).toEqual({
        id: 'chopTree',
        name: 'Chop Tree',
        skillId: 'woodcutting',
        levelRequired: 1,
        inputs: {},
        outputs: { wood: 1 },
        duration: 2,
        xpGained: 5
      })
    })

    it('should return null for non-existent activity', () => {
      expect(am.getActivityInfo('invalid')).toBeNull()
    })
  })

  describe('Worker Integration', () => {
    let workerManager

    beforeEach(async () => {
      const { WorkerManager } = await import('../../../src/managers/WorkerManager.js')
      workerManager = new WorkerManager(eventBus)
      // Create new ActivityManager with workerManager
      am = new ActivityManager(activities, cm, sm, eventBus, null, workerManager)
    })

    describe('getEffectiveDuration with workers', () => {
      it('should return normal duration when no workers assigned', () => {
        const duration = am.getEffectiveDuration('chopTree')
        expect(duration).toBe(2)  // Base duration
      })

      it('should double duration when workers assigned (half speed)', () => {
        workerManager.addWorkers(5)
        workerManager.assign('chopTree', 3)

        const duration = am.getEffectiveDuration('chopTree')
        expect(duration).toBe(4)  // 2 / 0.5 = 4 (twice as long)
      })

      it('should return normal duration when workers unassigned', () => {
        workerManager.addWorkers(5)
        workerManager.assign('chopTree', 3)
        workerManager.unassign('chopTree')

        const duration = am.getEffectiveDuration('chopTree')
        expect(duration).toBe(2)  // Back to normal
      })
    })

    describe('Activity completion with workers', () => {
      it('should take twice as long with workers assigned', () => {
        workerManager.addWorkers(5)
        workerManager.assign('chopTree', 3)

        am.start('chopTree')
        am.update(2000)  // Normal duration

        // Should not be complete yet (needs 4 seconds with workers)
        expect(am.getActiveActivities()).toHaveLength(1)
        expect(am.getProgress('chopTree')).toBeCloseTo(0.5, 2)

        am.update(2000)  // Another 2 seconds = 4 total

        // Now should be complete
        expect(am.getActiveActivities()).toHaveLength(0)
        expect(cm.get('wood')).toBe(1)
      })

      it('should grant same outputs regardless of workers', () => {
        workerManager.addWorkers(5)
        workerManager.assign('chopTree', 3)

        am.start('chopTree')
        am.update(4000)  // Full worker duration

        expect(cm.get('wood')).toBe(1)  // Same output
        expect(sm.getXP('woodcutting')).toBe(5)  // Same XP
      })
    })
  })
})
