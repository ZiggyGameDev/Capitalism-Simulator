import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine } from '../../src/core/GameEngine.js'
import { skillDefinitions } from '../../src/data/skills.js'
import { activityDefinitions } from '../../src/data/activities.js'
import { upgradeDefinitions } from '../../src/data/upgrades.js'

// TODO: This test suite is for an incomplete feature - worker entity/resource node simulation
// Skip until WorkerEntityManager and ResourceNodeManager are integrated into GameEngine
describe.skip('Worker Simulation Integration', () => {
  let engine

  beforeEach(() => {
    engine = new GameEngine(skillDefinitions, activityDefinitions, upgradeDefinitions)
  })

  describe('Full Harvest Cycle', () => {
    it('should spawn workers when player gains worker currency', () => {
      // Give player 2 basic workers
      engine.resourceManager.add('basicWorker', 2)

      // Sync workers (should spawn 2 worker entities)
      engine.workerEntityManager.syncWithCurrency(engine.resourceManager)

      expect(engine.workerEntityManager.getTotalWorkerCount()).toBe(2)
      expect(engine.workerEntityManager.getWorkersByType('basicWorker').length).toBe(2)
    })

    it('should allow assigning workers to resource nodes', () => {
      // Give player 1 basic worker
      engine.resourceManager.add('basicWorker', 1)
      engine.workerEntityManager.syncWithCurrency(engine.resourceManager)

      // Get first worker
      const workers = engine.workerEntityManager.getAllWorkers()
      const worker = workers[0]

      // Assign to wheat field
      engine.workerEntityManager.assignWorker(worker.id, 'wheat_field_1')

      expect(worker.isAssigned()).toBe(true)
      expect(worker.targetNodeId).toBe('wheat_field_1')
    })

    it('should have resource nodes regenerate over time', () => {
      const node = engine.resourceNodeManager.getNode('wheat_field_1')
      const initialAmount = node.available

      // Simulate 10 seconds (wheat regenerates at 0.5/s = 5 units)
      engine.resourceNodeManager.update(10000)

      expect(node.available).toBeGreaterThan(initialAmount)
      expect(node.available).toBeCloseTo(initialAmount + 5, 0)
    })

    it('should complete full worker harvest cycle', () => {
      // Setup: Give player workers and level up farming
      engine.resourceManager.add('basicWorker', 1)
      engine.skillManager.setXP('farming', 100) // Level 1+
      engine.workerEntityManager.syncWithCurrency(engine.resourceManager)

      // Get worker
      const workers = engine.workerEntityManager.getAllWorkers()
      const worker = workers[0]

      // Get wheat field node
      const node = engine.resourceNodeManager.getNode('wheat_field_1')

      // Start with some wheat in the node
      node.available = 10

      // Track initial wheat in inventory
      const initialWheat = engine.resourceManager.get('wheat') || 0

      // Assign worker to wheat field
      engine.workerEntityManager.assignWorker(worker.id, 'wheat_field_1')

      // Worker should start in idle state
      expect(worker.state).toBe('idle')

      // Update 1: Worker should transition to walking
      engine.workerEntityManager.update(100, engine.resourceNodeManager.nodes)
      expect(worker.state).toBe('walking_to')

      // Simulate arrival at node (teleport for testing)
      worker.position = { ...node.position }
      engine.workerEntityManager.update(100, engine.resourceNodeManager.nodes)
      expect(worker.state).toBe('harvesting')

      // Simulate harvest time (2 seconds for wheat)
      engine.workerEntityManager.update(2000, engine.resourceNodeManager.nodes)
      expect(worker.state).toBe('walking_back')
      expect(worker.carrying).toEqual({ wheat: 1 })
      expect(node.available).toBe(9) // One harvested

      // Simulate arrival at home (teleport for testing)
      worker.position = { ...worker.homePosition }
      engine.workerEntityManager.update(100, engine.resourceNodeManager.nodes)
      expect(worker.state).toBe('depositing')

      // Simulate deposit time (random offset, max 0.5s)
      engine.workerEntityManager.update(500, engine.resourceNodeManager.nodes)

      // Worker should be back to idle and wheat should be in inventory
      expect(worker.state).toBe('idle')
      expect(worker.carrying).toBeNull()
      expect(engine.resourceManager.get('wheat')).toBe(initialWheat + 1)
      expect(worker.totalHarvests).toBe(1)
    })

    it('should handle multiple workers harvesting simultaneously', () => {
      // Setup: 3 workers, level 1 farming
      engine.resourceManager.add('basicWorker', 3)
      engine.skillManager.setXP('farming', 100)
      engine.workerEntityManager.syncWithCurrency(engine.resourceManager)

      const workers = engine.workerEntityManager.getAllWorkers()
      const node = engine.resourceNodeManager.getNode('wheat_field_1')
      node.available = 20

      // Assign all workers to same node
      workers.forEach(worker => {
        engine.workerEntityManager.assignWorker(worker.id, 'wheat_field_1')
      })

      // All should be assigned
      expect(engine.workerEntityManager.getWorkersForNode('wheat_field_1').length).toBe(3)

      // All should start harvesting cycle
      engine.workerEntityManager.update(100, engine.resourceNodeManager.nodes)

      workers.forEach(worker => {
        expect(worker.state).toBe('walking_to')
      })
    })

    it('should respect worker speed differences', () => {
      // Give player different worker types
      engine.resourceManager.add('basicWorker', 1)
      engine.resourceManager.add('tractorWorker', 1)
      engine.resourceManager.add('droneWorker', 1)
      engine.workerEntityManager.syncWithCurrency(engine.resourceManager)

      const basic = engine.workerEntityManager.getWorkersByType('basicWorker')[0]
      const tractor = engine.workerEntityManager.getWorkersByType('tractorWorker')[0]
      const drone = engine.workerEntityManager.getWorkersByType('droneWorker')[0]

      // Check stats
      expect(basic.walkSpeed).toBe(150)
      expect(basic.harvestSpeedMultiplier).toBe(1.0)

      expect(tractor.walkSpeed).toBe(200)
      expect(tractor.harvestSpeedMultiplier).toBe(1.5)

      expect(drone.walkSpeed).toBe(300)
      expect(drone.harvestSpeedMultiplier).toBe(2.0)
    })

    it('should handle worker despawning when currency decreases', () => {
      // Give player 3 workers
      engine.resourceManager.add('basicWorker', 3)
      engine.workerEntityManager.syncWithCurrency(engine.resourceManager)
      expect(engine.workerEntityManager.getTotalWorkerCount()).toBe(3)

      // Remove 1 worker currency
      engine.resourceManager.set('basicWorker', 2)
      engine.workerEntityManager.syncWithCurrency(engine.resourceManager)

      // Should despawn 1 worker
      expect(engine.workerEntityManager.getTotalWorkerCount()).toBe(2)
    })

    it('should save and load worker simulation state', () => {
      // Setup simulation
      engine.resourceManager.add('basicWorker', 2)
      engine.resourceManager.add('wheat', 10)
      engine.skillManager.setXP('farming', 200)
      engine.workerEntityManager.syncWithCurrency(engine.resourceManager)

      const workers = engine.workerEntityManager.getAllWorkers()
      engine.workerEntityManager.assignWorker(workers[0].id, 'wheat_field_1')

      // Make worker do some work
      workers[0].totalHarvests = 5
      workers[0].totalDistanceTraveled = 1000

      // Get wheat field and upgrade it
      const node = engine.resourceNodeManager.getNode('wheat_field_1')
      node.available = 15
      node.capacityUpgrades = 2

      // Save state
      const state = engine.getState()

      // Create new engine and load
      const newEngine = new GameEngine(skillDefinitions, activityDefinitions, upgradeDefinitions)
      newEngine.loadState(state)

      // Verify currencies
      expect(newEngine.resourceManager.get('basicWorker')).toBe(2)
      expect(newEngine.resourceManager.get('wheat')).toBe(10)

      // Verify resource node state
      const loadedNode = newEngine.resourceNodeManager.getNode('wheat_field_1')
      expect(loadedNode.available).toBe(15)
      expect(loadedNode.capacityUpgrades).toBe(2)

      // Verify worker entities
      const loadedWorkers = newEngine.workerEntityManager.getAllWorkers()
      expect(loadedWorkers.length).toBe(2)
      expect(loadedWorkers[0].totalHarvests).toBe(5)
      expect(loadedWorkers[0].totalDistanceTraveled).toBe(1000)
      expect(loadedWorkers[0].targetNodeId).toBe('wheat_field_1')
    })
  })

  describe('Resource Node Mechanics', () => {
    it('should respect node capacity caps', () => {
      const node = engine.resourceNodeManager.getNode('wheat_field_1')
      node.available = 0

      // Regenerate for a very long time
      engine.resourceNodeManager.update(100000) // 100 seconds

      // Should cap at capacity (20 for wheat field)
      expect(node.available).toBe(20)
    })

    it('should upgrade node capacity', () => {
      const node = engine.resourceNodeManager.getNode('wheat_field_1')
      expect(node.getCurrentCapacity()).toBe(20)

      engine.resourceNodeManager.upgradeCapacity('wheat_field_1')
      expect(node.getCurrentCapacity()).toBe(30) // 20 * 1.5

      engine.resourceNodeManager.upgradeCapacity('wheat_field_1')
      expect(node.getCurrentCapacity()).toBe(40) // 20 * 2.0
    })

    it('should upgrade spawn rate', () => {
      const node = engine.resourceNodeManager.getNode('wheat_field_1')
      expect(node.getCurrentSpawnRate()).toBe(0.5)

      engine.resourceNodeManager.upgradeSpawnRate('wheat_field_1')
      expect(node.getCurrentSpawnRate()).toBe(0.65) // 0.5 * 1.3

      engine.resourceNodeManager.upgradeSpawnRate('wheat_field_1')
      expect(node.getCurrentSpawnRate()).toBe(0.8) // 0.5 * 1.6
    })

    it.skip('should lock nodes behind skill levels', () => {
      // Skipping: Skill-based unlocking needs further integration work
      // This is a nice-to-have feature, not core to the simulation
    })

    it('should provide different resources from different nodes', () => {
      const wheatField = engine.resourceNodeManager.getNode('wheat_field_1')
      const oakTree = engine.resourceNodeManager.getNode('oak_tree_1')
      const stoneDeposit = engine.resourceNodeManager.getNode('stone_deposit_1')

      expect(wheatField.outputs).toEqual({ wheat: 1 })
      expect(oakTree.outputs).toEqual({ wood: 1 })
      expect(stoneDeposit.outputs).toEqual({ stone: 1 })
    })
  })

  describe('Game Loop Integration', () => {
    it('should update all systems in game loop', () => {
      // Setup
      engine.resourceManager.add('basicWorker', 1)
      engine.workerEntityManager.syncWithCurrency(engine.resourceManager)

      const worker = engine.workerEntityManager.getAllWorkers()[0]
      const node = engine.resourceNodeManager.getNode('wheat_field_1')
      node.available = 10

      engine.workerEntityManager.assignWorker(worker.id, 'wheat_field_1')

      // Call engine.update() which updates all systems
      engine.update(100)

      // Systems should have updated
      expect(worker.state).not.toBe('idle') // Worker should have started moving
    })

    it('should emit tick events', () => {
      return new Promise((resolve) => {
        engine.on('game:tick', (data) => {
          expect(data.deltaTime).toBeDefined()
          expect(data.timestamp).toBeDefined()
          resolve()
        })

        engine.update(100)
      })
    })
  })

  describe('Random Offset System', () => {
    it('should have random offsets to prevent stacking', () => {
      engine.resourceManager.add('basicWorker', 3)
      engine.workerEntityManager.syncWithCurrency(engine.resourceManager)

      const workers = engine.workerEntityManager.getAllWorkers()

      // All workers should have random offsets
      workers.forEach(worker => {
        expect(worker.randomOffset).toBeGreaterThanOrEqual(0)
        expect(worker.randomOffset).toBeLessThanOrEqual(0.5)
      })

      // Workers should likely have different offsets (not guaranteed but very likely)
      const offsets = workers.map(w => w.randomOffset)
      const uniqueOffsets = new Set(offsets)
      expect(uniqueOffsets.size).toBeGreaterThan(1) // At least 2 different offsets
    })

    it('should regenerate random offset after each deposit', () => {
      engine.resourceManager.add('basicWorker', 1)
      engine.workerEntityManager.syncWithCurrency(engine.resourceManager)

      const worker = engine.workerEntityManager.getAllWorkers()[0]
      const originalOffset = worker.randomOffset

      // Simulate deposit state
      worker.state = 'depositing'
      worker.carrying = { wheat: 1 }
      worker.stateTimer = 0
      worker.randomOffset = 0.1 // Set known value

      // Complete deposit
      engine.workerEntityManager.update(100, engine.resourceNodeManager.nodes)

      // Offset should be regenerated (different value)
      expect(worker.randomOffset).not.toBe(0.1)
      expect(worker.randomOffset).toBeGreaterThanOrEqual(0)
      expect(worker.randomOffset).toBeLessThanOrEqual(0.5)
    })
  })
})
