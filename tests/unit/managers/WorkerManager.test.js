import { describe, it, expect, beforeEach } from 'vitest'
import { WorkerManager } from '../../../src/managers/WorkerManager.js'
import { EventBus } from '../../../src/core/EventBus.js'

describe('WorkerManager', () => {
  let workerManager
  let eventBus

  beforeEach(() => {
    eventBus = new EventBus()
    workerManager = new WorkerManager(eventBus)
  })

  describe('constructor', () => {
    it('should initialize with 0 total workers', () => {
      expect(workerManager.totalWorkers).toBe(0)
    })

    it('should initialize with empty assignments', () => {
      expect(workerManager.assignments).toEqual({})
    })
  })

  describe('addWorkers', () => {
    it('should add workers to total', () => {
      workerManager.addWorkers(5)
      expect(workerManager.totalWorkers).toBe(5)
    })

    it('should accumulate workers', () => {
      workerManager.addWorkers(3)
      workerManager.addWorkers(2)
      expect(workerManager.totalWorkers).toBe(5)
    })

    it('should emit worker:added event', () => {
      let eventEmitted = false
      eventBus.on('worker:added', (data) => {
        eventEmitted = true
        expect(data.amount).toBe(3)
        expect(data.totalWorkers).toBe(3)
      })

      workerManager.addWorkers(3)
      expect(eventEmitted).toBe(true)
    })
  })

  describe('getAvailableWorkers', () => {
    it('should return total workers when none assigned', () => {
      workerManager.totalWorkers = 5
      expect(workerManager.getAvailableWorkers()).toBe(5)
    })

    it('should subtract assigned workers from total', () => {
      workerManager.totalWorkers = 10
      workerManager.assignments['chopNormalTree'] = 3
      workerManager.assignments['mineCopperOre'] = 2
      expect(workerManager.getAvailableWorkers()).toBe(5)
    })
  })

  describe('canAssign', () => {
    it('should return false if no workers available', () => {
      workerManager.totalWorkers = 0
      expect(workerManager.canAssign('chopNormalTree', 1)).toBe(false)
    })

    it('should return false if requesting more than available', () => {
      workerManager.totalWorkers = 3
      expect(workerManager.canAssign('chopNormalTree', 5)).toBe(false)
    })

    it('should return true if workers available', () => {
      workerManager.totalWorkers = 5
      expect(workerManager.canAssign('chopNormalTree', 3)).toBe(true)
    })

    it('should account for already assigned workers', () => {
      workerManager.totalWorkers = 5
      workerManager.assignments['mineCopperOre'] = 3
      expect(workerManager.canAssign('chopNormalTree', 3)).toBe(false)
      expect(workerManager.canAssign('chopNormalTree', 2)).toBe(true)
    })
  })

  describe('assign', () => {
    it('should throw error if cannot assign', () => {
      workerManager.totalWorkers = 2
      expect(() => workerManager.assign('chopNormalTree', 5)).toThrow('Not enough available workers')
    })

    it('should assign workers to activity', () => {
      workerManager.totalWorkers = 5
      workerManager.assign('chopNormalTree', 3)
      expect(workerManager.assignments['chopNormalTree']).toBe(3)
    })

    it('should replace existing assignment', () => {
      workerManager.totalWorkers = 10
      workerManager.assign('chopNormalTree', 3)
      workerManager.assign('chopNormalTree', 5)
      expect(workerManager.assignments['chopNormalTree']).toBe(5)
    })

    it('should emit worker:assigned event', () => {
      let eventEmitted = false
      eventBus.on('worker:assigned', (data) => {
        eventEmitted = true
        expect(data.activityId).toBe('chopNormalTree')
        expect(data.workers).toBe(3)
      })

      workerManager.totalWorkers = 5
      workerManager.assign('chopNormalTree', 3)
      expect(eventEmitted).toBe(true)
    })
  })

  describe('unassign', () => {
    it('should remove workers from activity', () => {
      workerManager.totalWorkers = 5
      workerManager.assignments['chopNormalTree'] = 3
      workerManager.unassign('chopNormalTree')
      expect(workerManager.assignments['chopNormalTree']).toBeUndefined()
    })

    it('should emit worker:unassigned event', () => {
      let eventEmitted = false
      eventBus.on('worker:unassigned', (data) => {
        eventEmitted = true
        expect(data.activityId).toBe('chopNormalTree')
      })

      workerManager.totalWorkers = 5
      workerManager.assignments['chopNormalTree'] = 3
      workerManager.unassign('chopNormalTree')
      expect(eventEmitted).toBe(true)
    })
  })

  describe('getAssignment', () => {
    it('should return 0 if not assigned', () => {
      expect(workerManager.getAssignment('chopNormalTree')).toBe(0)
    })

    it('should return assigned workers', () => {
      workerManager.assignments['chopNormalTree'] = 5
      expect(workerManager.getAssignment('chopNormalTree')).toBe(5)
    })
  })

  describe('getSpeedMultiplier', () => {
    it('should return 1 if no workers assigned', () => {
      expect(workerManager.getSpeedMultiplier('chopNormalTree')).toBe(1)
    })

    it('should return 0.5 (half speed) if workers assigned', () => {
      workerManager.assignments['chopNormalTree'] = 3
      expect(workerManager.getSpeedMultiplier('chopNormalTree')).toBe(0.5)
    })
  })

  describe('isAutomated', () => {
    it('should return false if no workers assigned', () => {
      expect(workerManager.isAutomated('chopNormalTree')).toBe(false)
    })

    it('should return true if workers assigned', () => {
      workerManager.assignments['chopNormalTree'] = 1
      expect(workerManager.isAutomated('chopNormalTree')).toBe(true)
    })
  })

  describe('getState and loadState', () => {
    it('should save and restore worker state', () => {
      workerManager.totalWorkers = 10
      workerManager.assignments = {
        'chopNormalTree': 3,
        'mineCopperOre': 2
      }

      const state = workerManager.getState()
      const newManager = new WorkerManager(eventBus)
      newManager.loadState(state)

      expect(newManager.totalWorkers).toBe(10)
      expect(newManager.assignments['chopNormalTree']).toBe(3)
      expect(newManager.assignments['mineCopperOre']).toBe(2)
    })
  })

  describe('reset', () => {
    it('should clear all workers and assignments', () => {
      workerManager.totalWorkers = 10
      workerManager.assignments = { 'chopNormalTree': 3 }

      workerManager.reset()

      expect(workerManager.totalWorkers).toBe(0)
      expect(workerManager.assignments).toEqual({})
    })
  })
})
