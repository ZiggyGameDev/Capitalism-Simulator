import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ActivityManager } from '../../../src/managers/ActivityManager.js'
import { ResourceManager } from '../../../src/managers/ResourceManager.js'
import { SkillManager } from '../../../src/managers/SkillManager.js'
import { WorkerManager } from '../../../src/managers/WorkerManager.js'
import { EventBus } from '../../../src/core/EventBus.js'

describe('ActivityManager', () => {
  let am, rm, sm, wm, eventBus
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
    rm = new ResourceManager(eventBus)
    sm = new SkillManager(skills, activities, eventBus)
    wm = new WorkerManager(eventBus, rm)
    am = new ActivityManager(activities, rm, sm, eventBus, null, wm)

    // Add some workers for testing
    rm.add('basicWorker', 10)
  })

  describe('canRun()', () => {
    it('should return false if no workers assigned', () => {
      expect(am.canRun('chopTree')).toBe(false)
    })

    it('should return true if workers assigned and requirements met', () => {
      wm.assign('chopTree', 'basicWorker', 1)
      expect(am.canRun('chopTree')).toBe(true)
    })

    it('should return false if level requirement not met', () => {
      wm.assign('trainDog', 'basicWorker', 1)
      expect(am.canRun('trainDog')).toBe(false)
    })

    it('should return false if missing resources', () => {
      sm.addXP('dogHandling', 500)  // Get to level 5+
      wm.assign('trainDog', 'basicWorker', 1)
      expect(am.canRun('trainDog')).toBe(false)  // Missing puppy + food
    })

    it('should return true if all requirements met', () => {
      sm.addXP('dogHandling', 500)
      rm.add('puppy', 1)
      rm.add('food', 3)
      wm.assign('trainDog', 'basicWorker', 1)
      expect(am.canRun('trainDog')).toBe(true)
    })

    it('should return false for non-existent activity', () => {
      expect(am.canRun('invalid')).toBe(false)
    })
  })

  describe('update() with worker automation', () => {
    it('should auto-start activity when workers assigned', () => {
      wm.assign('chopTree', 'basicWorker', 1)
      am.update(100)  // Trigger update
      const active = am.getActiveActivities()
      expect(active).toHaveLength(1)
      expect(active[0].activityId).toBe('chopTree')
    })

    it('should update activity progress', () => {
      wm.assign('chopTree', 'basicWorker', 1)
      am.update(100)  // Start activity
      am.update(1000)  // 1 second passed

      const progress = am.getProgress('chopTree')
      // Progress depends on worker speed multiplier
      expect(progress).toBeGreaterThan(0)
      expect(progress).toBeLessThan(1)
    })

    it('should complete activity when time elapsed', () => {
      wm.assign('chopTree', 'basicWorker', 1)
      const completeSpy = vi.fn()
      eventBus.on('activity:completed', completeSpy)

      am.update(100)  // Start
      const duration = am.getEffectiveDuration('chopTree')
      am.update(duration * 1000 + 100)  // Complete

      expect(completeSpy).toHaveBeenCalled()
      expect(rm.get('wood')).toBe(1)
      expect(sm.getXP('woodcutting')).toBe(5)
    })

    it('should consume inputs on completion', () => {
      sm.addXP('dogHandling', 500)
      rm.add('puppy', 1)
      rm.add('food', 3)
      wm.assign('trainDog', 'basicWorker', 1)

      am.update(100)  // Start
      const duration = am.getEffectiveDuration('trainDog')
      am.update(duration * 1000 + 100)  // Complete

      expect(rm.get('puppy')).toBe(0)
      expect(rm.get('food')).toBe(0)
      expect(rm.get('guardDog')).toBe(1)
    })

    it('should auto-restart if workers still assigned', () => {
      wm.assign('chopTree', 'basicWorker', 1)
      am.update(100)  // Start
      const duration = am.getEffectiveDuration('chopTree')
      am.update(duration * 1000 + 100)  // Complete first run

      // Should auto-restart
      am.update(100)
      const active = am.getActiveActivities()
      expect(active).toHaveLength(1)
      expect(active[0].progress).toBeLessThan(0.5)  // Just restarted
    })

    it('should stop if resources run out', () => {
      sm.addXP('dogHandling', 500)
      rm.add('puppy', 1)
      rm.add('food', 3)
      wm.assign('trainDog', 'basicWorker', 1)

      am.update(100)  // Start
      const duration = am.getEffectiveDuration('trainDog')
      am.update(duration * 1000 + 100)  // Complete

      // Only had resources for 1 completion
      am.update(100)
      expect(am.getActiveActivities()).toHaveLength(0)
    })

    it('should stop activity when workers unassigned', () => {
      wm.assign('chopTree', 'basicWorker', 1)
      am.update(100)  // Start
      expect(am.getActiveActivities()).toHaveLength(1)

      wm.unassign('chopTree', 'basicWorker')
      am.update(100)  // Update after unassign
      expect(am.getActiveActivities()).toHaveLength(0)
    })

    it('should emit activity:completed with correct data', () => {
      const completeSpy = vi.fn()
      eventBus.on('activity:completed', completeSpy)
      wm.assign('chopTree', 'basicWorker', 1)

      am.update(100)  // Start
      const duration = am.getEffectiveDuration('chopTree')
      am.update(duration * 1000 + 100)  // Complete

      expect(completeSpy).toHaveBeenCalledWith({
        activityId: 'chopTree',
        outputs: { wood: 1 },
        xpGained: 5,
        skillId: 'woodcutting'
      })
    })

    it('should emit activity:started event', () => {
      const startSpy = vi.fn()
      eventBus.on('activity:started', startSpy)
      wm.assign('chopTree', 'basicWorker', 1)
      am.update(100)

      expect(startSpy).toHaveBeenCalledWith({
        activityId: 'chopTree',
        skillId: 'woodcutting'
      })
    })

    it('should emit activity:stopped event when workers removed', () => {
      const stopSpy = vi.fn()
      eventBus.on('activity:stopped', stopSpy)

      wm.assign('chopTree', 'basicWorker', 1)
      am.update(100)  // Start

      wm.unassign('chopTree', 'basicWorker')
      am.update(100)  // Stop

      expect(stopSpy).toHaveBeenCalled()
    })
  })

  describe('getProgress()', () => {
    it('should return 0 for non-running activity', () => {
      expect(am.getProgress('chopTree')).toBe(0)
    })

    it('should return progress between 0 and 1', () => {
      wm.assign('chopTree', 'basicWorker', 1)
      am.update(100)  // Start
      am.update(500)
      const progress = am.getProgress('chopTree')
      expect(progress).toBeGreaterThan(0)
      expect(progress).toBeLessThan(1)
    })

    it('should not exceed 1', () => {
      wm.assign('chopTree', 'basicWorker', 1)
      am.update(100)  // Start
      am.update(100000)  // Way more than duration
      expect(am.getProgress('chopTree')).toBe(0)  // Already completed
    })
  })

  describe('getActiveActivities()', () => {
    it('should return empty array initially', () => {
      expect(am.getActiveActivities()).toEqual([])
    })

    it('should return array with all automated activities', () => {
      wm.assign('chopTree', 'basicWorker', 1)
      wm.assign('fishShrimp', 'basicWorker', 1)
      am.update(100)

      const active = am.getActiveActivities()
      expect(active).toHaveLength(2)
      expect(active[0]).toHaveProperty('progress')
      expect(active[0]).toHaveProperty('startTime')
    })
  })

  describe('reset()', () => {
    it('should stop all activities', () => {
      wm.assign('chopTree', 'basicWorker', 1)
      wm.assign('fishShrimp', 'basicWorker', 1)
      am.update(100)

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

  describe('getEffectiveDuration()', () => {
    it('should return Infinity when no workers assigned', () => {
      const duration = am.getEffectiveDuration('chopTree')
      expect(duration).toBe(Infinity)
    })

    it('should return modified duration when workers assigned', () => {
      wm.assign('chopTree', 'basicWorker', 1)
      const duration = am.getEffectiveDuration('chopTree')
      // With workers, duration changes based on speed multiplier
      expect(duration).toBeGreaterThan(0)
      expect(duration).toBeLessThan(Infinity)
    })

    it('should scale with number of workers', () => {
      wm.assign('chopTree', 'basicWorker', 1)
      const duration1 = am.getEffectiveDuration('chopTree')

      wm.assign('chopTree', 'basicWorker', 5)
      const duration5 = am.getEffectiveDuration('chopTree')

      // More workers = faster = lower duration
      expect(duration5).toBeLessThan(duration1)
    })
  })

  describe('getEffectiveInputs()', () => {
    it('should return activity inputs', () => {
      const inputs = am.getEffectiveInputs('trainDog')
      expect(inputs).toEqual({ puppy: 1, food: 3 })
    })

    it('should return empty object for free activities', () => {
      const inputs = am.getEffectiveInputs('chopTree')
      expect(inputs).toEqual({})
    })
  })

  describe('getEffectiveOutputs()', () => {
    it('should return activity outputs', () => {
      const outputs = am.getEffectiveOutputs('chopTree')
      expect(outputs).toEqual({ wood: 1 })
    })

    it('should return outputs for multi-output activities', () => {
      const outputs = am.getEffectiveOutputs('trainDog')
      expect(outputs).toEqual({ guardDog: 1 })
    })
  })
})
