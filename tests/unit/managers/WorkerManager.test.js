import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorkerManager } from '../../../src/managers/WorkerManager.js'
import { EventBus } from '../../../src/core/EventBus.js'
import { CurrencyManager } from '../../../src/managers/CurrencyManager.js'

describe('WorkerManager', () => {
  let workerManager
  let eventBus
  let currencyManager

  beforeEach(() => {
    eventBus = new EventBus()
    currencyManager = new CurrencyManager(eventBus)
    workerManager = new WorkerManager(eventBus, currencyManager)

    // Add some worker currencies for testing
    currencyManager.add('basicWorker', 10)
    currencyManager.add('tractorWorker', 5)
    currencyManager.add('droneWorker', 2)
  })

  describe('constructor', () => {
    it('should initialize with empty assignments', () => {
      expect(workerManager.assignments).toEqual({})
    })

    it('should have worker types defined', () => {
      expect(workerManager.workerTypes).toBeDefined()
      expect(workerManager.workerTypes.length).toBeGreaterThan(0)
    })
  })

  describe('getAvailableWorkers', () => {
    it('should return total workers when none assigned', () => {
      expect(workerManager.getAvailableWorkers('basicWorker')).toBe(10)
    })

    it('should return 0 if no currency manager', () => {
      const wm = new WorkerManager(eventBus, null)
      expect(wm.getAvailableWorkers('basicWorker')).toBe(0)
    })

    it('should subtract assigned workers from total', () => {
      workerManager.assign('chopWood', 'basicWorker', 3)
      workerManager.assign('mineStone', 'basicWorker', 2)
      expect(workerManager.getAvailableWorkers('basicWorker')).toBe(5)
    })

    it('should track different worker types separately', () => {
      workerManager.assign('chopWood', 'basicWorker', 3)
      workerManager.assign('mineStone', 'tractorWorker', 2)

      expect(workerManager.getAvailableWorkers('basicWorker')).toBe(7)
      expect(workerManager.getAvailableWorkers('tractorWorker')).toBe(3)
      expect(workerManager.getAvailableWorkers('droneWorker')).toBe(2)
    })
  })

  describe('getAssignedWorkers', () => {
    it('should return 0 when no workers assigned', () => {
      expect(workerManager.getAssignedWorkers('basicWorker')).toBe(0)
    })

    it('should return total assigned across all activities', () => {
      workerManager.assign('chopWood', 'basicWorker', 3)
      workerManager.assign('mineStone', 'basicWorker', 2)
      expect(workerManager.getAssignedWorkers('basicWorker')).toBe(5)
    })
  })

  describe('canAssign', () => {
    it('should return false if no workers available', () => {
      currencyManager.set('basicWorker', 0)
      expect(workerManager.canAssign('chopWood', 'basicWorker', 1)).toBe(false)
    })

    it('should return false if requesting more than available', () => {
      expect(workerManager.canAssign('chopWood', 'basicWorker', 15)).toBe(false)
    })

    it('should return true if workers available', () => {
      expect(workerManager.canAssign('chopWood', 'basicWorker', 5)).toBe(true)
    })

    it('should allow reassigning same activity to reduce count', () => {
      workerManager.assign('chopWood', 'basicWorker', 8)
      // Should be able to reduce from 8 to 5 even though only 2 are available elsewhere
      expect(workerManager.canAssign('chopWood', 'basicWorker', 5)).toBe(true)
    })
  })

  describe('assign', () => {
    it('should throw error if cannot assign', () => {
      expect(() => workerManager.assign('chopWood', 'basicWorker', 20))
        .toThrow('Not enough available workers')
    })

    it('should assign workers to activity', () => {
      workerManager.assign('chopWood', 'basicWorker', 3)
      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(3)
    })

    it('should replace existing assignment', () => {
      workerManager.assign('chopWood', 'basicWorker', 3)
      workerManager.assign('chopWood', 'basicWorker', 5)
      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(5)
    })

    it('should call unassign if count is 0', () => {
      workerManager.assign('chopWood', 'basicWorker', 3)
      workerManager.assign('chopWood', 'basicWorker', 0)
      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(0)
    })

    it('should emit worker:assigned event', () => {
      let eventData = null
      eventBus.on('worker:assigned', (data) => {
        eventData = data
      })

      workerManager.assign('chopWood', 'basicWorker', 3)

      expect(eventData).toBeTruthy()
      expect(eventData.activityId).toBe('chopWood')
      expect(eventData.workerTypeId).toBe('basicWorker')
      expect(eventData.count).toBe(3)
    })

    it('should allow multiple worker types on same activity', () => {
      workerManager.assign('chopWood', 'basicWorker', 3)
      workerManager.assign('chopWood', 'tractorWorker', 2)

      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(3)
      expect(workerManager.getAssignment('chopWood', 'tractorWorker')).toBe(2)
    })
  })

  describe('unassign', () => {
    it('should remove workers from activity', () => {
      workerManager.assign('chopWood', 'basicWorker', 3)
      workerManager.unassign('chopWood', 'basicWorker')
      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(0)
    })

    it('should handle unassigning when nothing assigned', () => {
      workerManager.unassign('chopWood', 'basicWorker')
      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(0)
    })

    it('should emit worker:unassigned event', () => {
      let eventData = null
      eventBus.on('worker:unassigned', (data) => {
        eventData = data
      })

      workerManager.assign('chopWood', 'basicWorker', 3)
      workerManager.unassign('chopWood', 'basicWorker')

      expect(eventData).toBeTruthy()
      expect(eventData.activityId).toBe('chopWood')
      expect(eventData.workerTypeId).toBe('basicWorker')
    })

    it('should clean up empty activity assignments', () => {
      workerManager.assign('chopWood', 'basicWorker', 3)
      workerManager.unassign('chopWood', 'basicWorker')
      expect(workerManager.assignments['chopWood']).toBeUndefined()
    })
  })

  describe('unassignAll', () => {
    it('should remove all workers from activity', () => {
      workerManager.assign('chopWood', 'basicWorker', 3)
      workerManager.assign('chopWood', 'tractorWorker', 2)
      workerManager.assign('chopWood', 'droneWorker', 1)

      workerManager.unassignAll('chopWood')

      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(0)
      expect(workerManager.getAssignment('chopWood', 'tractorWorker')).toBe(0)
      expect(workerManager.getAssignment('chopWood', 'droneWorker')).toBe(0)
    })

    it('should handle unassigning when nothing assigned', () => {
      workerManager.unassignAll('chopWood')
      expect(workerManager.assignments['chopWood']).toBeUndefined()
    })

    it('should emit events for each worker type', () => {
      const events = []
      eventBus.on('worker:unassigned', (data) => {
        events.push(data)
      })

      workerManager.assign('chopWood', 'basicWorker', 3)
      workerManager.assign('chopWood', 'tractorWorker', 2)
      workerManager.unassignAll('chopWood')

      expect(events.length).toBe(2)
      expect(events.some(e => e.workerTypeId === 'basicWorker')).toBe(true)
      expect(events.some(e => e.workerTypeId === 'tractorWorker')).toBe(true)
    })

    it('should not affect other activities', () => {
      workerManager.assign('chopWood', 'basicWorker', 3)
      workerManager.assign('mineStone', 'basicWorker', 2)

      workerManager.unassignAll('chopWood')

      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(0)
      expect(workerManager.getAssignment('mineStone', 'basicWorker')).toBe(2)
    })
  })

  describe('getAssignment', () => {
    it('should return 0 if not assigned', () => {
      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(0)
    })

    it('should return assigned workers', () => {
      workerManager.assign('chopWood', 'basicWorker', 5)
      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(5)
    })
  })

  describe('getActivityAssignments', () => {
    it('should return empty object if no assignments', () => {
      expect(workerManager.getActivityAssignments('chopWood')).toEqual({})
    })

    it('should return all worker types assigned to activity', () => {
      workerManager.assign('chopWood', 'basicWorker', 3)
      workerManager.assign('chopWood', 'tractorWorker', 2)

      const assignments = workerManager.getActivityAssignments('chopWood')
      expect(assignments).toEqual({
        basicWorker: 3,
        tractorWorker: 2
      })
    })
  })

  describe('getSpeedMultiplier', () => {
    it('should return 0 if no workers assigned', () => {
      expect(workerManager.getSpeedMultiplier('chopWood')).toBe(0)
    })

    it('should return base speed for 1 basic worker', () => {
      workerManager.assign('chopWood', 'basicWorker', 1)
      // Basic worker has baseSpeed 0.2
      expect(workerManager.getSpeedMultiplier('chopWood')).toBeCloseTo(0.2, 2)
    })

    it('should scale logarithmically with more workers', () => {
      workerManager.assign('chopWood', 'basicWorker', 10)
      // Formula: 0.2 * (1 + 0.3 * log10(10)) = 0.2 * 1.3 = 0.26
      expect(workerManager.getSpeedMultiplier('chopWood')).toBeCloseTo(0.26, 2)
    })

    it('should return best speed among multiple worker types', () => {
      workerManager.assign('chopWood', 'basicWorker', 1) // 0.2
      workerManager.assign('chopWood', 'tractorWorker', 1) // 0.5
      // Should return the best (highest) speed
      expect(workerManager.getSpeedMultiplier('chopWood')).toBeCloseTo(0.5, 2)
    })

    it('should cap at 1.0 max speed', () => {
      // Even if calculations would exceed 1.0, cap at 1.0
      // Add more drone workers for this test
      currencyManager.add('droneWorker', 100)
      workerManager.assign('chopWood', 'droneWorker', 100)
      expect(workerManager.getSpeedMultiplier('chopWood')).toBeLessThanOrEqual(1.0)
    })
  })

  describe('isAutomated', () => {
    it('should return false if no workers assigned', () => {
      expect(workerManager.isAutomated('chopWood')).toBe(false)
    })

    it('should return true if any workers assigned', () => {
      workerManager.assign('chopWood', 'basicWorker', 1)
      expect(workerManager.isAutomated('chopWood')).toBe(true)
    })

    it('should return true if any worker type has assignment > 0', () => {
      workerManager.assign('chopWood', 'basicWorker', 0)
      workerManager.assign('chopWood', 'tractorWorker', 1)
      expect(workerManager.isAutomated('chopWood')).toBe(true)
    })
  })

  describe('getState and loadState', () => {
    it('should save and restore worker state', () => {
      workerManager.assign('chopWood', 'basicWorker', 3)
      workerManager.assign('mineStone', 'tractorWorker', 2)

      const state = workerManager.getState()
      const newManager = new WorkerManager(eventBus, currencyManager)
      newManager.loadState(state)

      expect(newManager.getAssignment('chopWood', 'basicWorker')).toBe(3)
      expect(newManager.getAssignment('mineStone', 'tractorWorker')).toBe(2)
    })

    it('should handle empty state', () => {
      const newManager = new WorkerManager(eventBus, currencyManager)
      newManager.loadState({})
      expect(newManager.assignments).toEqual({})
    })
  })

  describe('reset', () => {
    it('should clear all assignments', () => {
      workerManager.assign('chopWood', 'basicWorker', 3)
      workerManager.assign('mineStone', 'tractorWorker', 2)

      workerManager.reset()

      expect(workerManager.assignments).toEqual({})
      expect(workerManager.activeBoosts).toEqual({})
    })
  })
})
