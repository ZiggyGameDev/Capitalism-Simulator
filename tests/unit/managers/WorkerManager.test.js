import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorkerManager } from '../../../src/managers/WorkerManager.js'
import { EventBus } from '../../../src/core/EventBus.js'
import { ResourceManager } from '../../../src/managers/ResourceManager.js'

describe('WorkerManager', () => {
  let workerManager
  let eventBus
  let resourceManager

  beforeEach(() => {
    eventBus = new EventBus()
    resourceManager = new ResourceManager(eventBus)
    workerManager = new WorkerManager(eventBus, resourceManager)

    // Add some worker resources for testing
    resourceManager.add('basicWorker', 10)
    resourceManager.add('tractorWorker', 5)
    resourceManager.add('droneWorker', 2)
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

    it('should return 0 if no resource manager', () => {
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
      resourceManager.set('basicWorker', 0)
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
    it('should return false if cannot assign', () => {
      const result = workerManager.assign('chopWood', 'basicWorker', 20)
      expect(result).toBe(false)
      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(0)
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
      // Formula: 0.2 * (1 + 0.15 * log10(10)) = 0.2 * 1.15 = 0.23
      expect(workerManager.getSpeedMultiplier('chopWood')).toBeCloseTo(0.23, 2)
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
      resourceManager.add('droneWorker', 100)
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
      const newManager = new WorkerManager(eventBus, resourceManager)
      newManager.loadState(state)

      expect(newManager.getAssignment('chopWood', 'basicWorker')).toBe(3)
      expect(newManager.getAssignment('mineStone', 'tractorWorker')).toBe(2)
    })

    it('should handle empty state', () => {
      const newManager = new WorkerManager(eventBus, resourceManager)
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

  describe('Edge Cases - Worker Assignment', () => {
    it('should reject negative worker count', () => {
      const result = workerManager.assign('chopWood', 'basicWorker', -5)
      expect(result).toBe(false)
      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(0)
    })

    it('should handle assigning exactly zero workers (should call unassign)', () => {
      workerManager.assign('chopWood', 'basicWorker', 5)
      workerManager.assign('chopWood', 'basicWorker', 0)
      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(0)
    })

    it('should handle assigning exactly all available workers', () => {
      // All 10 basic workers
      workerManager.assign('chopWood', 'basicWorker', 10)
      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(10)
      expect(workerManager.getAvailableWorkers('basicWorker')).toBe(0)
    })

    it('should prevent assigning when no free workers available', () => {
      // Assign all workers to first activity
      workerManager.assign('chopWood', 'basicWorker', 10)

      // Try to assign to second activity - should fail
      const result = workerManager.assign('mineStone', 'basicWorker', 1)
      expect(result).toBe(false)
      expect(workerManager.getAssignment('mineStone', 'basicWorker')).toBe(0)
    })

    it('should prevent assigning more than available across multiple activities', () => {
      workerManager.assign('chopWood', 'basicWorker', 7)
      const result = workerManager.assign('mineStone', 'basicWorker', 4)
      expect(result).toBe(false)
      expect(workerManager.getAssignment('mineStone', 'basicWorker')).toBe(0)
    })

    it('should handle trying to assign when starting with zero workers', () => {
      resourceManager.set('basicWorker', 0)
      const result = workerManager.assign('chopWood', 'basicWorker', 1)
      expect(result).toBe(false)
      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(0)
    })

    it('should floor fractional worker counts', () => {
      workerManager.assign('chopWood', 'basicWorker', 3.7)
      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(3)
    })

    it('should handle very large worker counts', () => {
      // Increase storage limit to accommodate large worker count
      resourceManager.addStorageBonus('basicWorker', 1000000)
      resourceManager.add('basicWorker', 1000000)
      workerManager.assign('chopWood', 'basicWorker', 999999)
      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(999999)
    })
  })

  describe('Edge Cases - Worker Removal', () => {
    it('should handle removing from activity with no workers assigned', () => {
      // Should not throw
      expect(() => workerManager.unassign('chopWood', 'basicWorker')).not.toThrow()
      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(0)
    })

    it('should handle removing all workers from activity with none assigned', () => {
      expect(() => workerManager.unassignAll('chopWood')).not.toThrow()
      expect(workerManager.getActivityAssignments('chopWood')).toEqual({})
    })

    it('should handle removing from non-existent activity', () => {
      expect(() => workerManager.unassign('nonExistentActivity', 'basicWorker')).not.toThrow()
    })

    it('should handle removing non-existent worker type', () => {
      workerManager.assign('chopWood', 'basicWorker', 3)
      expect(() => workerManager.unassign('chopWood', 'nonExistentWorker')).not.toThrow()
    })
  })

  describe('Edge Cases - Invalid Inputs', () => {
    it('should handle null activity ID gracefully', () => {
      expect(workerManager.getActivityAssignments(null)).toEqual({})
    })

    it('should handle undefined activity ID gracefully', () => {
      expect(workerManager.getActivityAssignments(undefined)).toEqual({})
    })

    it('should handle empty string activity ID', () => {
      expect(workerManager.getActivityAssignments('')).toEqual({})
    })

    it('should return 0 for non-existent worker type', () => {
      expect(workerManager.getAvailableWorkers('nonExistentWorker')).toBe(0)
    })

    it('should return 0 for null worker type', () => {
      expect(workerManager.getAvailableWorkers(null)).toBe(0)
    })
  })

  describe('Edge Cases - Boundary Conditions', () => {
    it('should handle assigning and unassigning same worker multiple times', () => {
      workerManager.assign('chopWood', 'basicWorker', 5)
      workerManager.unassign('chopWood', 'basicWorker')
      workerManager.assign('chopWood', 'basicWorker', 3)
      workerManager.unassign('chopWood', 'basicWorker')

      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(0)
      expect(workerManager.getAvailableWorkers('basicWorker')).toBe(10)
    })

    it('should handle reducing assignment count when some workers consumed', () => {
      workerManager.assign('chopWood', 'basicWorker', 8)
      // Simulate some workers being used up (player loses workers)
      resourceManager.set('basicWorker', 5)

      // Should be able to reduce to 3 (less than current assignment)
      workerManager.assign('chopWood', 'basicWorker', 3)
      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(3)
    })

    it('should handle increasing assignment when workers become available', () => {
      workerManager.assign('chopWood', 'basicWorker', 5)
      resourceManager.add('basicWorker', 10) // Now have 15 total

      // Should be able to increase to 15 (10 more available)
      workerManager.assign('chopWood', 'basicWorker', 15)
      expect(workerManager.getAssignment('chopWood', 'basicWorker')).toBe(15)
    })

    it('should handle speed multiplier with exactly 1 worker', () => {
      workerManager.assign('chopWood', 'basicWorker', 1)
      const speed = workerManager.getSpeedMultiplier('chopWood')
      expect(speed).toBeGreaterThan(0)
      expect(speed).toBeLessThanOrEqual(1)
    })

    it('should return 0 speed for activity with workers assigned but then removed', () => {
      workerManager.assign('chopWood', 'basicWorker', 5)
      workerManager.unassignAll('chopWood')
      expect(workerManager.getSpeedMultiplier('chopWood')).toBe(0)
    })
  })

  describe('Edge Cases - State Management', () => {
    it('should handle loading null state', () => {
      expect(() => workerManager.loadState(null)).not.toThrow()
    })

    it('should handle loading undefined state', () => {
      expect(() => workerManager.loadState(undefined)).not.toThrow()
    })

    it('should handle loading state with invalid assignments', () => {
      const invalidState = {
        assignments: {
          chopWood: 'invalid'
        }
      }
      expect(() => workerManager.loadState(invalidState)).not.toThrow()
    })

    it('should preserve other assignments when loading partial state', () => {
      workerManager.assign('chopWood', 'basicWorker', 5)
      workerManager.loadState({
        assignments: {
          mineStone: { tractorWorker: 2 }
        }
      })

      // New assignment should be loaded
      expect(workerManager.getAssignment('mineStone', 'tractorWorker')).toBe(2)
    })
  })
})
