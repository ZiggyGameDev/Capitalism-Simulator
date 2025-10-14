import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorkerEntity } from '../../../src/entities/WorkerEntity.js'

describe('WorkerEntity', () => {
  let worker
  let mockResourceNodes
  let mockCurrencyManager

  const homePosition = { x: 850, y: 300 }
  const nodePosition = { x: 100, y: 200 }

  beforeEach(() => {
    worker = new WorkerEntity('worker_1', 'basicWorker', homePosition)

    // Mock resource node
    mockResourceNodes = new Map()
    mockResourceNodes.set('wheat_field', {
      position: nodePosition,
      harvestTime: 2, // 2 seconds
      outputs: { wheat: 1 },
      canHarvest: vi.fn(() => true),
      harvest: vi.fn(() => true)
    })

    // Mock currency manager
    mockCurrencyManager = {
      add: vi.fn()
    }
  })

  describe('initialization', () => {
    it('should initialize with correct identity', () => {
      expect(worker.id).toBe('worker_1')
      expect(worker.type).toBe('basicWorker')
      expect(worker.position).toEqual(homePosition)
      expect(worker.homePosition).toEqual(homePosition)
    })

    it('should start in idle state', () => {
      expect(worker.state).toBe('idle')
      expect(worker.stateTimer).toBe(0)
      expect(worker.targetNodeId).toBeNull()
      expect(worker.carrying).toBeNull()
    })

    it('should have default worker stats', () => {
      expect(worker.walkSpeed).toBe(150)
      expect(worker.carrySpeed).toBe(90)
      expect(worker.harvestSpeedMultiplier).toBe(1.0)
    })

    it('should start with zero statistics', () => {
      expect(worker.totalHarvests).toBe(0)
      expect(worker.totalDistanceTraveled).toBe(0)
    })

    it('should have a random offset', () => {
      expect(worker.randomOffset).toBeGreaterThanOrEqual(0)
      expect(worker.randomOffset).toBeLessThanOrEqual(0.5)
    })
  })

  describe('assignment', () => {
    it('should assign worker to a node', () => {
      worker.assignTo('wheat_field')

      expect(worker.targetNodeId).toBe('wheat_field')
      expect(worker.isAssigned()).toBe(true)
    })

    it('should unassign worker from node', () => {
      worker.assignTo('wheat_field')
      worker.state = 'harvesting'
      worker.carrying = { wheat: 1 }

      worker.unassign()

      expect(worker.targetNodeId).toBeNull()
      expect(worker.state).toBe('idle')
      expect(worker.carrying).toBeNull()
      expect(worker.isAssigned()).toBe(false)
    })

    it('should reset to idle when assigned (if not carrying)', () => {
      worker.state = 'harvesting'

      worker.assignTo('wheat_field')

      expect(worker.state).toBe('idle')
      expect(worker.stateTimer).toBe(0)
    })

    it('should not interrupt carrying when assigned', () => {
      worker.state = 'walking_back'

      worker.assignTo('wheat_field')

      expect(worker.state).toBe('walking_back') // Should finish carrying first
    })
  })

  describe('isIdle', () => {
    it('should return true when idle and unassigned', () => {
      expect(worker.isIdle()).toBe(true)
    })

    it('should return false when assigned', () => {
      worker.assignTo('wheat_field')
      expect(worker.isIdle()).toBe(false)
    })

    it('should return false when working', () => {
      worker.state = 'harvesting'
      expect(worker.isIdle()).toBe(false)
    })
  })

  describe('movement calculations', () => {
    it('should move toward target position', () => {
      const target = { x: 200, y: 200 }
      const result = worker.moveToward(target, 100, 1000) // 100 px/s for 1 second

      expect(worker.position.x).toBeLessThan(homePosition.x) // Moving left toward target
      expect(result.distanceMoved).toBeCloseTo(100, 0)
      expect(result.arrived).toBe(false)
    })

    it('should arrive when close enough', () => {
      const target = { x: 852, y: 302 } // Very close to home
      const result = worker.moveToward(target, 100, 100)

      expect(result.arrived).toBe(true)
      expect(worker.position).toEqual(target)
    })

    it('should not overshoot target', () => {
      const target = { x: 860, y: 300 } // 10 pixels away
      const result = worker.moveToward(target, 100, 1000) // Would move 100px

      expect(worker.position).toEqual(target)
      expect(result.distanceMoved).toBeCloseTo(10, 0)
      expect(result.arrived).toBe(true)
    })

    it('should handle diagonal movement', () => {
      const target = { x: 750, y: 400 }
      const startDistance = Math.sqrt(
        Math.pow(target.x - homePosition.x, 2) +
        Math.pow(target.y - homePosition.y, 2)
      )

      worker.moveToward(target, 100, 1000)

      const endDistance = Math.sqrt(
        Math.pow(target.x - worker.position.x, 2) +
        Math.pow(target.y - worker.position.y, 2)
      )

      expect(endDistance).toBeLessThan(startDistance)
    })
  })

  describe('state machine - idle', () => {
    it('should stay idle if not assigned', () => {
      worker.update(1000, mockResourceNodes, mockCurrencyManager)

      expect(worker.state).toBe('idle')
    })

    it('should start walking when assigned and node has resources', () => {
      worker.assignTo('wheat_field')

      worker.update(100, mockResourceNodes, mockCurrencyManager)

      expect(worker.state).toBe('walking_to')
      expect(worker.destination).toEqual(nodePosition)
    })

    it('should not walk if node cannot be harvested', () => {
      mockResourceNodes.get('wheat_field').canHarvest = vi.fn(() => false)
      worker.assignTo('wheat_field')

      worker.update(100, mockResourceNodes, mockCurrencyManager)

      expect(worker.state).toBe('idle')
    })
  })

  describe('state machine - walking_to', () => {
    beforeEach(() => {
      worker.assignTo('wheat_field')
      worker.startWalkingTo(nodePosition)
    })

    it('should move toward destination', () => {
      const startX = worker.position.x

      worker.update(1000, mockResourceNodes, mockCurrencyManager) // 1 second at 150 px/s

      expect(worker.position.x).toBeLessThan(startX) // Moving left
      expect(worker.totalDistanceTraveled).toBeGreaterThan(0)
    })

    it('should transition to harvesting when arrived', () => {
      worker.position = { x: 102, y: 202 } // Very close

      worker.update(100, mockResourceNodes, mockCurrencyManager)

      expect(worker.state).toBe('harvesting')
      expect(worker.stateTimer).toBe(0)
    })

    it('should return to idle if destination is lost', () => {
      worker.destination = null

      worker.update(100, mockResourceNodes, mockCurrencyManager)

      expect(worker.state).toBe('idle')
    })
  })

  describe('state machine - harvesting', () => {
    beforeEach(() => {
      worker.assignTo('wheat_field')
      worker.state = 'harvesting'
      worker.stateTimer = 0
    })

    it('should wait for harvest duration', () => {
      worker.update(1000, mockResourceNodes, mockCurrencyManager) // 1 second (need 2)

      expect(worker.state).toBe('harvesting')
      expect(mockResourceNodes.get('wheat_field').harvest).not.toHaveBeenCalled()
    })

    it('should harvest after duration completes', () => {
      worker.harvestSpeedMultiplier = 1.0 // 2 seconds to harvest

      worker.update(2000, mockResourceNodes, mockCurrencyManager)

      expect(mockResourceNodes.get('wheat_field').harvest).toHaveBeenCalled()
      expect(worker.carrying).toEqual({ wheat: 1 })
      expect(worker.totalHarvests).toBe(1)
      expect(worker.state).toBe('walking_back')
    })

    it('should harvest faster with speed multiplier', () => {
      worker.harvestSpeedMultiplier = 2.0 // 1 second to harvest (2s / 2.0)

      worker.update(1000, mockResourceNodes, mockCurrencyManager)

      expect(worker.carrying).toEqual({ wheat: 1 })
      expect(worker.state).toBe('walking_back')
    })

    it('should return to idle if node disappears', () => {
      mockResourceNodes.delete('wheat_field')

      worker.update(3000, mockResourceNodes, mockCurrencyManager)

      expect(worker.state).toBe('idle')
      expect(worker.carrying).toBeNull()
    })

    it('should return to idle if harvest fails', () => {
      mockResourceNodes.get('wheat_field').harvest = vi.fn(() => false)

      worker.update(2000, mockResourceNodes, mockCurrencyManager)

      expect(worker.state).toBe('idle')
      expect(worker.carrying).toBeNull()
    })
  })

  describe('state machine - walking_back', () => {
    beforeEach(() => {
      worker.position = { x: 100, y: 200 }
      worker.carrying = { wheat: 1 }
      worker.state = 'walking_back'
    })

    it('should move toward home', () => {
      const startX = worker.position.x

      worker.update(1000, mockResourceNodes, mockCurrencyManager) // 1 second at 90 px/s (slower)

      expect(worker.position.x).toBeGreaterThan(startX) // Moving right (toward home)
      expect(worker.totalDistanceTraveled).toBeGreaterThan(0)
    })

    it('should move slower when carrying', () => {
      const distanceToHome = Math.sqrt(
        Math.pow(homePosition.x - worker.position.x, 2) +
        Math.pow(homePosition.y - worker.position.y, 2)
      )

      worker.update(1000, mockResourceNodes, mockCurrencyManager) // 1 second at 90 px/s

      const movedDistance = worker.totalDistanceTraveled
      expect(movedDistance).toBeCloseTo(90, 0) // Carry speed, not walk speed
    })

    it('should transition to depositing when arrived home', () => {
      worker.position = { x: 848, y: 298 } // Very close to home

      worker.update(100, mockResourceNodes, mockCurrencyManager)

      expect(worker.state).toBe('depositing')
      expect(worker.stateTimer).toBe(0)
    })
  })

  describe('state machine - depositing', () => {
    beforeEach(() => {
      worker.position = { ...homePosition }
      worker.carrying = { wheat: 1, wood: 2 }
      worker.state = 'depositing'
      worker.stateTimer = 0
      worker.randomOffset = 0.3 // Fixed for testing
    })

    it('should wait for random offset delay', () => {
      worker.update(100, mockResourceNodes, mockCurrencyManager) // 0.1 seconds (need 0.3)

      expect(worker.state).toBe('depositing')
      expect(mockCurrencyManager.add).not.toHaveBeenCalled()
    })

    it('should deposit resources after delay', () => {
      worker.update(300, mockResourceNodes, mockCurrencyManager) // 0.3 seconds

      expect(mockCurrencyManager.add).toHaveBeenCalledWith('wheat', 1)
      expect(mockCurrencyManager.add).toHaveBeenCalledWith('wood', 2)
      expect(worker.carrying).toBeNull()
      expect(worker.state).toBe('idle')
    })

    it('should regenerate random offset after deposit', () => {
      const oldOffset = worker.randomOffset

      worker.update(300, mockResourceNodes, mockCurrencyManager)

      // Offset should be regenerated (can't test exact value due to randomness)
      expect(worker.randomOffset).toBeGreaterThanOrEqual(0)
      expect(worker.randomOffset).toBeLessThanOrEqual(0.5)
    })

    it('should handle null currency manager gracefully', () => {
      expect(() => {
        worker.update(300, mockResourceNodes, null)
      }).not.toThrow()

      expect(worker.state).toBe('idle')
      expect(worker.carrying).toBeNull()
    })
  })

  describe('state progress', () => {
    it('should return 0 for idle state', () => {
      expect(worker.getStateProgress()).toBe(0)
    })

    it('should calculate progress for harvesting', () => {
      worker.state = 'harvesting'
      worker.stateTimer = 1000 // 1 second

      const progress = worker.getStateProgress()

      expect(progress).toBeGreaterThan(0)
      expect(progress).toBeLessThan(1)
    })

    it('should calculate progress for depositing', () => {
      worker.state = 'depositing'
      worker.randomOffset = 0.4 // 0.4 seconds total
      worker.stateTimer = 200 // 0.2 seconds elapsed

      const progress = worker.getStateProgress()

      expect(progress).toBeCloseTo(0.5, 1) // 50% done
    })

    it('should calculate progress for walking_to', () => {
      worker.state = 'walking_to'
      worker.destination = { x: 100, y: 200 }
      worker.position = { x: 475, y: 250 } // Roughly halfway

      const progress = worker.getStateProgress()

      expect(progress).toBeGreaterThan(0.3)
      expect(progress).toBeLessThan(0.7)
    })
  })

  describe('render state', () => {
    it('should provide complete render state', () => {
      worker.assignTo('wheat_field')
      worker.state = 'harvesting'
      worker.carrying = { wheat: 1 }

      const renderState = worker.getRenderState()

      expect(renderState.id).toBe('worker_1')
      expect(renderState.type).toBe('basicWorker')
      expect(renderState.position).toEqual(worker.position)
      expect(renderState.state).toBe('harvesting')
      expect(renderState.carrying).toEqual({ wheat: 1 })
      expect(renderState.targetNodeId).toBe('wheat_field')
      expect(renderState.progress).toBeGreaterThanOrEqual(0)
    })
  })

  describe('statistics', () => {
    it('should provide stats for UI', () => {
      worker.totalHarvests = 10
      worker.totalDistanceTraveled = 1234.56
      worker.assignTo('wheat_field')
      worker.state = 'harvesting'

      const stats = worker.getStats()

      expect(stats.totalHarvests).toBe(10)
      expect(stats.totalDistanceTraveled).toBe(1234) // Floored
      expect(stats.state).toBe('harvesting')
      expect(stats.assigned).toBe(true)
    })
  })

  describe('save/load state', () => {
    it('should save state correctly', () => {
      worker.assignTo('wheat_field')
      worker.totalHarvests = 15
      worker.totalDistanceTraveled = 5000

      const state = worker.getSaveState()

      expect(state).toEqual({
        id: 'worker_1',
        type: 'basicWorker',
        targetNodeId: 'wheat_field',
        totalHarvests: 15,
        totalDistanceTraveled: 5000
      })
    })

    it('should load state correctly', () => {
      const state = {
        targetNodeId: 'wood_tree',
        totalHarvests: 20,
        totalDistanceTraveled: 8000
      }

      worker.loadState(state)

      expect(worker.targetNodeId).toBe('wood_tree')
      expect(worker.totalHarvests).toBe(20)
      expect(worker.totalDistanceTraveled).toBe(8000)
      expect(worker.state).toBe('idle') // Reset to idle
      expect(worker.position).toEqual(homePosition) // Reset to home
    })

    it('should handle partial state loading', () => {
      worker.totalHarvests = 10

      worker.loadState({ targetNodeId: 'wheat_field' })

      expect(worker.targetNodeId).toBe('wheat_field')
      expect(worker.totalHarvests).toBe(10) // Unchanged
    })
  })

  describe('full worker cycle', () => {
    it('should complete full harvest cycle', () => {
      worker.assignTo('wheat_field')
      worker.harvestSpeedMultiplier = 1.0
      worker.randomOffset = 0.1 // Short delay for testing

      // Start: idle at home
      expect(worker.state).toBe('idle')

      // Update 1: Transition to walking_to
      worker.update(100, mockResourceNodes, mockCurrencyManager)
      expect(worker.state).toBe('walking_to')

      // Simulate arrival at node
      worker.position = { ...nodePosition }
      worker.update(100, mockResourceNodes, mockCurrencyManager)
      expect(worker.state).toBe('harvesting')

      // Complete harvest (2 seconds)
      worker.update(2000, mockResourceNodes, mockCurrencyManager)
      expect(worker.state).toBe('walking_back')
      expect(worker.carrying).toEqual({ wheat: 1 })

      // Simulate arrival at home
      worker.position = { ...homePosition }
      worker.update(100, mockResourceNodes, mockCurrencyManager)
      expect(worker.state).toBe('depositing')

      // Complete deposit (0.1 seconds)
      worker.update(100, mockResourceNodes, mockCurrencyManager)
      expect(worker.state).toBe('idle')
      expect(worker.carrying).toBeNull()
      expect(mockCurrencyManager.add).toHaveBeenCalledWith('wheat', 1)
      expect(worker.totalHarvests).toBe(1)
    })
  })
})
