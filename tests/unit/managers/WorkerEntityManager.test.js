import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorkerEntityManager } from '../../../src/managers/WorkerEntityManager.js'
import { EventBus } from '../../../src/core/EventBus.js'

describe('WorkerEntityManager', () => {
  let manager
  let eventBus
  let emitSpy
  let mockResourceManager
  let mockResourceNodes

  beforeEach(() => {
    eventBus = new EventBus()
    emitSpy = vi.spyOn(eventBus, 'emit')

    mockResourceManager = {
      get: vi.fn((id) => {
        if (id === 'basicWorker') return 2
        if (id === 'tractorWorker') return 1
        if (id === 'droneWorker') return 0
        return 0
      }),
      add: vi.fn()
    }

    mockResourceNodes = new Map()
    mockResourceNodes.set('wheat_field', {
      position: { x: 100, y: 200 },
      harvestTime: 2,
      outputs: { wheat: 1 },
      canHarvest: vi.fn(() => true),
      harvest: vi.fn(() => true)
    })

    manager = new WorkerEntityManager(eventBus, mockResourceManager)
  })

  describe('initialization', () => {
    it('should initialize with no workers', () => {
      expect(manager.workers.size).toBe(0)
      expect(manager.getTotalWorkerCount()).toBe(0)
    })

    it('should have worker type definitions', () => {
      expect(manager.workerTypes.has('basicWorker')).toBe(true)
      expect(manager.workerTypes.has('tractorWorker')).toBe(true)
      expect(manager.workerTypes.has('droneWorker')).toBe(true)
    })

    it('should define correct worker stats', () => {
      const basic = manager.workerTypes.get('basicWorker')
      expect(basic.walkSpeed).toBe(150)
      expect(basic.carrySpeed).toBe(90)
      expect(basic.harvestSpeedMultiplier).toBe(1.0)
      expect(basic.icon).toBe('👷')

      const tractor = manager.workerTypes.get('tractorWorker')
      expect(tractor.walkSpeed).toBe(200)
      expect(tractor.carrySpeed).toBe(150)
      expect(tractor.harvestSpeedMultiplier).toBe(1.5)
      expect(tractor.icon).toBe('🚜')

      const drone = manager.workerTypes.get('droneWorker')
      expect(drone.walkSpeed).toBe(300)
      expect(drone.carrySpeed).toBe(280)
      expect(drone.harvestSpeedMultiplier).toBe(2.0)
      expect(drone.icon).toBe('🚁')
    })

    it('should have a home position', () => {
      expect(manager.homePosition).toEqual({ x: 850, y: 300 })
    })

    it('should start with worker ID counter at 1', () => {
      expect(manager.nextWorkerId).toBe(1)
    })
  })

  describe('spawning workers', () => {
    it('should spawn a worker', () => {
      const workerId = manager.spawnWorker('basicWorker')

      expect(workerId).toBe('worker_1')
      expect(manager.workers.size).toBe(1)
      expect(manager.getWorker(workerId)).toBeDefined()
    })

    it('should increment worker ID counter', () => {
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('basicWorker')
      const thirdId = manager.spawnWorker('basicWorker')

      expect(thirdId).toBe('worker_3')
      expect(manager.nextWorkerId).toBe(4)
    })

    it('should apply worker type stats', () => {
      const workerId = manager.spawnWorker('tractorWorker')
      const worker = manager.getWorker(workerId)

      expect(worker.walkSpeed).toBe(200)
      expect(worker.carrySpeed).toBe(150)
      expect(worker.harvestSpeedMultiplier).toBe(1.5)
    })

    it('should emit spawn event', () => {
      const workerId = manager.spawnWorker('basicWorker')

      expect(emitSpy).toHaveBeenCalledWith('worker:spawned', {
        workerId,
        type: 'basicWorker'
      })
    })

    it('should spawn workers of different types', () => {
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('tractorWorker')
      manager.spawnWorker('droneWorker')

      expect(manager.getTotalWorkerCount()).toBe(3)
      expect(manager.getWorkersByType('basicWorker').length).toBe(1)
      expect(manager.getWorkersByType('tractorWorker').length).toBe(1)
      expect(manager.getWorkersByType('droneWorker').length).toBe(1)
    })
  })

  describe('despawning workers', () => {
    it('should despawn a worker', () => {
      const workerId = manager.spawnWorker('basicWorker')

      manager.despawnWorker(workerId)

      expect(manager.workers.size).toBe(0)
      expect(manager.getWorker(workerId)).toBeUndefined()
    })

    it('should emit despawn event', () => {
      const workerId = manager.spawnWorker('basicWorker')
      emitSpy.mockClear()

      manager.despawnWorker(workerId)

      expect(emitSpy).toHaveBeenCalledWith('worker:despawned', {
        workerId,
        type: 'basicWorker'
      })
    })

    it('should handle despawning non-existent worker gracefully', () => {
      expect(() => {
        manager.despawnWorker('invalid_id')
      }).not.toThrow()
    })
  })

  describe('getting workers', () => {
    beforeEach(() => {
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('tractorWorker')
    })

    it('should get a specific worker', () => {
      const worker = manager.getWorker('worker_1')

      expect(worker).toBeDefined()
      expect(worker.id).toBe('worker_1')
    })

    it('should return undefined for invalid worker ID', () => {
      expect(manager.getWorker('invalid')).toBeUndefined()
    })

    it('should get all workers', () => {
      const workers = manager.getAllWorkers()

      expect(workers).toBeInstanceOf(Array)
      expect(workers.length).toBe(3)
    })

    it('should get workers by type', () => {
      const basicWorkers = manager.getWorkersByType('basicWorker')
      const tractorWorkers = manager.getWorkersByType('tractorWorker')

      expect(basicWorkers.length).toBe(2)
      expect(tractorWorkers.length).toBe(1)
    })

    it('should return empty array for non-existent type', () => {
      const workers = manager.getWorkersByType('invalidType')
      expect(workers).toEqual([])
    })
  })

  describe('assignment', () => {
    let workerId

    beforeEach(() => {
      workerId = manager.spawnWorker('basicWorker')
    })

    it('should assign worker to node', () => {
      manager.assignWorker(workerId, 'wheat_field')

      const worker = manager.getWorker(workerId)
      expect(worker.targetNodeId).toBe('wheat_field')
      expect(worker.isAssigned()).toBe(true)
    })

    it('should emit assignment event', () => {
      emitSpy.mockClear()

      manager.assignWorker(workerId, 'wheat_field')

      expect(emitSpy).toHaveBeenCalledWith('worker:assigned', {
        workerId,
        nodeId: 'wheat_field',
        workerType: 'basicWorker'
      })
    })

    it('should unassign worker from node', () => {
      manager.assignWorker(workerId, 'wheat_field')

      manager.unassignWorker(workerId)

      const worker = manager.getWorker(workerId)
      expect(worker.targetNodeId).toBeNull()
      expect(worker.isAssigned()).toBe(false)
    })

    it('should emit unassignment event', () => {
      manager.assignWorker(workerId, 'wheat_field')
      emitSpy.mockClear()

      manager.unassignWorker(workerId)

      expect(emitSpy).toHaveBeenCalledWith('worker:unassigned', {
        workerId,
        previousNodeId: 'wheat_field',
        workerType: 'basicWorker'
      })
    })

    it('should handle assigning invalid worker ID', () => {
      expect(() => {
        manager.assignWorker('invalid', 'wheat_field')
      }).not.toThrow()
    })

    it('should handle unassigning invalid worker ID', () => {
      expect(() => {
        manager.unassignWorker('invalid')
      }).not.toThrow()
    })
  })

  describe('getting workers for node', () => {
    beforeEach(() => {
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('tractorWorker')

      manager.assignWorker('worker_1', 'wheat_field')
      manager.assignWorker('worker_2', 'wheat_field')
      manager.assignWorker('worker_3', 'wood_tree')
    })

    it('should get workers assigned to a specific node', () => {
      const workers = manager.getWorkersForNode('wheat_field')

      expect(workers.length).toBe(2)
      expect(workers[0].targetNodeId).toBe('wheat_field')
      expect(workers[1].targetNodeId).toBe('wheat_field')
    })

    it('should return empty array for node with no workers', () => {
      const workers = manager.getWorkersForNode('empty_node')
      expect(workers).toEqual([])
    })
  })

  describe('getting idle workers', () => {
    beforeEach(() => {
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('tractorWorker')

      manager.assignWorker('worker_1', 'wheat_field')
      // worker_2 and worker_3 are idle
    })

    it('should get all idle workers', () => {
      const idle = manager.getIdleWorkers()

      expect(idle.length).toBe(2)
      expect(idle[0].isAssigned()).toBe(false)
      expect(idle[1].isAssigned()).toBe(false)
    })

    it('should return empty array if no idle workers', () => {
      manager.assignWorker('worker_2', 'wheat_field')
      manager.assignWorker('worker_3', 'wheat_field')

      const idle = manager.getIdleWorkers()
      expect(idle).toEqual([])
    })
  })

  describe('node assignment summary', () => {
    beforeEach(() => {
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('tractorWorker')
      manager.spawnWorker('droneWorker')

      manager.assignWorker('worker_1', 'wheat_field')
      manager.assignWorker('worker_2', 'wheat_field')
      manager.assignWorker('worker_3', 'wheat_field')
    })

    it('should get assignment summary for node', () => {
      const summary = manager.getNodeAssignmentSummary('wheat_field')

      expect(summary).toEqual({
        basicWorker: 2,
        tractorWorker: 1
      })
    })

    it('should return empty object for node with no workers', () => {
      const summary = manager.getNodeAssignmentSummary('empty_node')
      expect(summary).toEqual({})
    })
  })

  describe('unassign all from node', () => {
    beforeEach(() => {
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('tractorWorker')

      manager.assignWorker('worker_1', 'wheat_field')
      manager.assignWorker('worker_2', 'wheat_field')
      manager.assignWorker('worker_3', 'wood_tree')
    })

    it('should unassign all workers from a node', () => {
      manager.unassignAllFromNode('wheat_field')

      const workers = manager.getWorkersForNode('wheat_field')
      expect(workers.length).toBe(0)

      const idle = manager.getIdleWorkers()
      expect(idle.length).toBe(2) // worker_1 and worker_2 now idle
    })

    it('should not affect workers on other nodes', () => {
      manager.unassignAllFromNode('wheat_field')

      const woodWorkers = manager.getWorkersForNode('wood_tree')
      expect(woodWorkers.length).toBe(1)
      expect(woodWorkers[0].id).toBe('worker_3')
    })
  })

  describe('sync with resources', () => {
    it('should spawn workers to match resource count', () => {
      manager.syncWithCurrency(mockResourceManager)

      expect(manager.getWorkersByType('basicWorker').length).toBe(2)
      expect(manager.getWorkersByType('tractorWorker').length).toBe(1)
      expect(manager.getWorkersByType('droneWorker').length).toBe(0)
    })

    it('should not spawn workers if already at correct count', () => {
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('basicWorker')

      const sizeBefore = manager.workers.size

      manager.syncWithCurrency(mockResourceManager)

      expect(manager.workers.size).toBe(sizeBefore + 1) // Only tractor spawned
    })

    it('should despawn excess workers', () => {
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('basicWorker') // 3 workers, but resource has 2

      manager.syncWithCurrency(mockResourceManager)

      expect(manager.getWorkersByType('basicWorker').length).toBe(2)
    })

    it('should despawn idle workers first', () => {
      const id1 = manager.spawnWorker('basicWorker')
      const id2 = manager.spawnWorker('basicWorker')
      const id3 = manager.spawnWorker('basicWorker')

      manager.assignWorker(id1, 'wheat_field')
      manager.assignWorker(id2, 'wheat_field')
      // id3 is idle

      manager.syncWithCurrency(mockResourceManager)

      // Should despawn id3 first (idle)
      expect(manager.getWorker(id3)).toBeUndefined()
      expect(manager.getWorker(id1)).toBeDefined()
      expect(manager.getWorker(id2)).toBeDefined()
    })

    it('should handle zero resources', () => {
      manager.spawnWorker('droneWorker')

      mockResourceManager.get = vi.fn(() => 0)

      manager.syncWithCurrency(mockResourceManager)

      expect(manager.getWorkersByType('droneWorker').length).toBe(0)
    })
  })

  describe('update', () => {
    it('should update all workers', () => {
      const id1 = manager.spawnWorker('basicWorker')
      const id2 = manager.spawnWorker('basicWorker')

      manager.assignWorker(id1, 'wheat_field')
      manager.assignWorker(id2, 'wheat_field')

      manager.update(1000, mockResourceNodes)

      const worker1 = manager.getWorker(id1)
      const worker2 = manager.getWorker(id2)

      // Workers should have started walking
      expect(worker1.state).toBe('walking_to')
      expect(worker2.state).toBe('walking_to')
    })

    it('should handle empty worker list', () => {
      expect(() => {
        manager.update(1000, mockResourceNodes)
      }).not.toThrow()
    })
  })

  describe('statistics', () => {
    beforeEach(() => {
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('tractorWorker')

      manager.assignWorker('worker_1', 'wheat_field')
      manager.assignWorker('worker_2', 'wheat_field')
    })

    it('should get comprehensive statistics', () => {
      const stats = manager.getStatistics()

      expect(stats.totalWorkers).toBe(3)
      expect(stats.activeWorkers).toBe(2)
      expect(stats.idleWorkers).toBe(1)
    })

    it('should break down stats by type', () => {
      const stats = manager.getStatistics()

      expect(stats.byType.basicWorker.total).toBe(2)
      expect(stats.byType.basicWorker.assigned).toBe(2)
      expect(stats.byType.basicWorker.idle).toBe(0)

      expect(stats.byType.tractorWorker.total).toBe(1)
      expect(stats.byType.tractorWorker.assigned).toBe(0)
      expect(stats.byType.tractorWorker.idle).toBe(1)

      expect(stats.byType.droneWorker.total).toBe(0)
    })

    it('should aggregate worker statistics', () => {
      const worker1 = manager.getWorker('worker_1')
      const worker2 = manager.getWorker('worker_2')

      worker1.totalHarvests = 5
      worker1.totalDistanceTraveled = 1000
      worker2.totalHarvests = 3
      worker2.totalDistanceTraveled = 800

      const stats = manager.getStatistics()

      expect(stats.totalHarvests).toBe(8)
      expect(stats.totalDistance).toBe(1800)
    })
  })

  describe('save/load state', () => {
    it('should save state of all workers', () => {
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('tractorWorker')

      manager.assignWorker('worker_1', 'wheat_field')

      const state = manager.getState()

      expect(state.nextWorkerId).toBe(3)
      expect(state.workers.length).toBe(2)
      expect(state.workers[0].id).toBe('worker_1')
      expect(state.workers[0].type).toBe('basicWorker')
      expect(state.workers[0].targetNodeId).toBe('wheat_field')
    })

    it('should load state correctly', () => {
      const state = {
        nextWorkerId: 10,
        workers: [
          {
            id: 'worker_8',
            type: 'basicWorker',
            targetNodeId: 'wheat_field',
            totalHarvests: 20,
            totalDistanceTraveled: 5000
          },
          {
            id: 'worker_9',
            type: 'tractorWorker',
            targetNodeId: null,
            totalHarvests: 10,
            totalDistanceTraveled: 3000
          }
        ]
      }

      manager.loadState(state, mockResourceManager)

      expect(manager.nextWorkerId).toBe(10)
      expect(manager.workers.size).toBe(2)

      const worker8 = manager.getWorker('worker_8')
      expect(worker8.type).toBe('basicWorker')
      expect(worker8.targetNodeId).toBe('wheat_field')
      expect(worker8.totalHarvests).toBe(20)
      expect(worker8.walkSpeed).toBe(150) // Stats applied

      const worker9 = manager.getWorker('worker_9')
      expect(worker9.type).toBe('tractorWorker')
      expect(worker9.walkSpeed).toBe(200) // Tractor stats
    })

    it('should clear existing workers on load', () => {
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('basicWorker')

      const state = {
        nextWorkerId: 5,
        workers: [
          {
            id: 'worker_3',
            type: 'basicWorker',
            targetNodeId: null,
            totalHarvests: 0,
            totalDistanceTraveled: 0
          }
        ]
      }

      manager.loadState(state, mockResourceManager)

      expect(manager.workers.size).toBe(1)
      expect(manager.getWorker('worker_1')).toBeUndefined()
      expect(manager.getWorker('worker_3')).toBeDefined()
    })

    it('should handle empty state gracefully', () => {
      manager.spawnWorker('basicWorker')

      expect(() => manager.loadState(null, mockResourceManager)).not.toThrow()
      expect(() => manager.loadState({}, mockResourceManager)).not.toThrow()
    })
  })

  describe('reset', () => {
    it('should reset all workers', () => {
      manager.spawnWorker('basicWorker')
      manager.spawnWorker('tractorWorker')
      manager.nextWorkerId = 10

      manager.reset()

      expect(manager.workers.size).toBe(0)
      expect(manager.nextWorkerId).toBe(1)
    })
  })

  describe('worker count', () => {
    it('should return correct total worker count', () => {
      expect(manager.getTotalWorkerCount()).toBe(0)

      manager.spawnWorker('basicWorker')
      expect(manager.getTotalWorkerCount()).toBe(1)

      manager.spawnWorker('tractorWorker')
      expect(manager.getTotalWorkerCount()).toBe(2)

      manager.despawnWorker('worker_1')
      expect(manager.getTotalWorkerCount()).toBe(1)
    })
  })
})
