import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BuildingManager } from '../../../src/managers/BuildingManager.js'
import { ResourceManager } from '../../../src/managers/ResourceManager.js'
import { EventBus } from '../../../src/core/EventBus.js'

describe('BuildingManager', () => {
  let buildingManager
  let resourceManager
  let eventBus

  beforeEach(() => {
    eventBus = new EventBus()
    resourceManager = new ResourceManager(eventBus)
    buildingManager = new BuildingManager(eventBus, resourceManager)
  })

  describe('initialization', () => {
    it('should initialize with no buildings', () => {
      expect(buildingManager.buildings).toEqual({})
    })

    it('should initialize with starting slots', () => {
      expect(buildingManager.availableSlots).toBe(5)
      expect(buildingManager.usedSlots).toBe(0)
    })

    it('should have building types defined', () => {
      expect(buildingManager.buildingTypes).toBeDefined()
      expect(buildingManager.buildingTypes.length).toBeGreaterThan(0)
    })

    it('should initialize resource tracking', () => {
      expect(buildingManager.resourcesMined).toEqual({})
    })

    it('should initialize house worker timers', () => {
      expect(buildingManager.houseWorkerTimers).toEqual({})
    })
  })

  describe('getTotalBuildingCount()', () => {
    it('should return 0 when no buildings exist', () => {
      expect(buildingManager.getTotalBuildingCount()).toBe(0)
    })

    it('should count only completed buildings', () => {
      // Add resources
      resourceManager.set('wood', 1000)
      resourceManager.set('stone', 1000)

      // Start construction of 2 houses
      buildingManager.startConstruction('house')
      buildingManager.startConstruction('house')

      expect(buildingManager.getTotalBuildingCount()).toBe(0)

      // Complete first house
      buildingManager.buildings['house'][0].constructionComplete = true
      expect(buildingManager.getTotalBuildingCount()).toBe(1)

      // Complete second house
      buildingManager.buildings['house'][1].constructionComplete = true
      expect(buildingManager.getTotalBuildingCount()).toBe(2)
    })

    it('should count buildings across multiple types', () => {
      resourceManager.set('wood', 10000)
      resourceManager.set('stone', 10000)
      resourceManager.set('gold', 1000)

      buildingManager.startConstruction('house')
      buildingManager.buildings['house'][0].constructionComplete = true

      // Unlock tavern
      buildingManager.trackResourceMined('wood', 500)
      buildingManager.startConstruction('tavern')
      buildingManager.buildings['tavern'][0].constructionComplete = true

      expect(buildingManager.getTotalBuildingCount()).toBe(2)
    })
  })

  describe('getBuildingCost()', () => {
    it('should return base cost for first building', () => {
      const cost = buildingManager.getBuildingCost('house')
      expect(cost).toEqual({ wood: 50, stone: 30 })
    })

    it('should scale cost with multiplier', () => {
      resourceManager.set('wood', 1000)
      resourceManager.set('stone', 1000)

      // Build first house
      buildingManager.startConstruction('house')

      // Second house should cost 1.5x
      const cost2 = buildingManager.getBuildingCost('house')
      expect(cost2).toEqual({ wood: 75, stone: 45 })

      // Build second house
      buildingManager.startConstruction('house')

      // Third house should cost 1.5^2 = 2.25x
      const cost3 = buildingManager.getBuildingCost('house')
      expect(cost3).toEqual({ wood: 112, stone: 67 })
    })

    it('should return empty object for invalid building', () => {
      const cost = buildingManager.getBuildingCost('invalid')
      expect(cost).toEqual({})
    })
  })

  describe('isUnlocked()', () => {
    it('should return true if no unlock condition', () => {
      const houseType = buildingManager.buildingTypes.find(b => b.id === 'house')
      expect(buildingManager.isUnlocked(houseType)).toBe(true)
    })

    it('should check resource_mined unlock condition', () => {
      const tavernType = buildingManager.buildingTypes.find(b => b.id === 'tavern')

      // Not unlocked initially
      expect(buildingManager.isUnlocked(tavernType)).toBe(false)

      // Track some wood mined
      buildingManager.trackResourceMined('wood', 300)
      expect(buildingManager.isUnlocked(tavernType)).toBe(false)

      // Track enough wood
      buildingManager.trackResourceMined('wood', 200)
      expect(buildingManager.isUnlocked(tavernType)).toBe(true)
    })

    it('should check buildings_built unlock condition', () => {
      const marketType = buildingManager.buildingTypes.find(b => b.id === 'market')

      // Not unlocked initially
      expect(buildingManager.isUnlocked(marketType)).toBe(false)

      // Build some buildings
      resourceManager.set('wood', 10000)
      resourceManager.set('stone', 10000)

      for (let i = 0; i < 5; i++) {
        buildingManager.startConstruction('house')
        buildingManager.buildings['house'][i].constructionComplete = true
      }

      expect(buildingManager.isUnlocked(marketType)).toBe(true)
    })
  })

  describe('canBuild()', () => {
    it('should return false for invalid building type', () => {
      const result = buildingManager.canBuild('invalid')
      expect(result.canBuild).toBe(false)
      expect(result.reason).toBe('Invalid building type')
    })

    it('should return false when no slots available', () => {
      resourceManager.set('wood', 10000)
      resourceManager.set('stone', 10000)

      // Fill all 5 starting slots
      for (let i = 0; i < 5; i++) {
        buildingManager.startConstruction('house')
      }

      const result = buildingManager.canBuild('house')
      expect(result.canBuild).toBe(false)
      expect(result.reason).toBe('No available building slots')
    })

    it('should return false when max count reached', () => {
      resourceManager.set('wood', 100000)
      resourceManager.set('stone', 100000)
      resourceManager.set('gold', 10000)

      // Increase available slots to accommodate test
      buildingManager.availableSlots = 20

      // Set up to build max market (1)
      buildingManager.trackResourceMined('wood', 1000)
      buildingManager.trackResourceMined('stone', 1000)

      // Build 5 houses to unlock market
      for (let i = 0; i < 5; i++) {
        buildingManager.startConstruction('house')
        buildingManager.buildings['house'][i].constructionComplete = true
      }

      // Build first market
      buildingManager.startConstruction('market')

      // Try to build second market
      const result = buildingManager.canBuild('market')
      expect(result.canBuild).toBe(false)
      expect(result.reason).toContain('Maximum')
    })

    it('should return false when not unlocked', () => {
      resourceManager.set('wood', 10000)
      resourceManager.set('stone', 10000)
      resourceManager.set('gold', 1000)

      const result = buildingManager.canBuild('tavern')
      expect(result.canBuild).toBe(false)
      expect(result.reason).toBe('Not yet unlocked')
    })

    it('should return false when cannot afford', () => {
      resourceManager.set('wood', 10)
      resourceManager.set('stone', 10)

      const result = buildingManager.canBuild('house')
      expect(result.canBuild).toBe(false)
      expect(result.reason).toBe('Not enough resources')
    })

    it('should return true when all conditions met', () => {
      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      const result = buildingManager.canBuild('house')
      expect(result.canBuild).toBe(true)
    })
  })

  describe('startConstruction()', () => {
    it('should throw error if cannot build', () => {
      expect(() => {
        buildingManager.startConstruction('house')
      }).toThrow()
    })

    it('should spend resources', () => {
      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      buildingManager.startConstruction('house')

      expect(resourceManager.get('wood')).toBe(50)
      expect(resourceManager.get('stone')).toBe(70)
    })

    it('should create building instance', () => {
      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      const instanceId = buildingManager.startConstruction('house')

      expect(buildingManager.buildings['house']).toBeDefined()
      expect(buildingManager.buildings['house'].length).toBe(1)
      expect(buildingManager.buildings['house'][0].instanceId).toBe(instanceId)
    })

    it('should use a slot', () => {
      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      expect(buildingManager.usedSlots).toBe(0)
      buildingManager.startConstruction('house')
      expect(buildingManager.usedSlots).toBe(1)
    })

    it('should set construction as incomplete', () => {
      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      buildingManager.startConstruction('house')
      expect(buildingManager.buildings['house'][0].constructionComplete).toBe(false)
    })

    it('should initialize house rooms', () => {
      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      const instanceId = buildingManager.startConstruction('house')
      const house = buildingManager.buildings['house'][0]

      expect(house.rooms).toBeDefined()
      expect(house.rooms.length).toBe(1) // 1 room by default
      expect(house.rooms[0].maxWorkers).toBe(5) // 5 workers per room
      expect(house.rooms[0].currentWorkers).toBe(0)
    })

    it('should initialize house worker timers', () => {
      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      const instanceId = buildingManager.startConstruction('house')

      expect(buildingManager.houseWorkerTimers[instanceId]).toBeDefined()
      expect(buildingManager.houseWorkerTimers[instanceId].room0).toBe(30000) // 30 seconds in ms
    })

    it('should emit construction_started event', () => {
      const spy = vi.fn()
      eventBus.on('building:construction_started', spy)

      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      buildingManager.startConstruction('house')

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          buildingTypeId: 'house',
          duration: 60
        })
      )
    })

    it('should allow building multiple of same type', () => {
      resourceManager.set('wood', 10000)
      resourceManager.set('stone', 10000)

      buildingManager.startConstruction('house')
      buildingManager.startConstruction('house')

      expect(buildingManager.buildings['house'].length).toBe(2)
    })
  })

  describe('update() - construction completion', () => {
    it('should complete construction after duration passes', () => {
      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      const instanceId = buildingManager.startConstruction('house')
      const house = buildingManager.buildings['house'][0]

      expect(house.constructionComplete).toBe(false)

      // Simulate time passing (60 seconds = 60000ms)
      house.constructionStartTime = Date.now() - 61000

      buildingManager.update(100)

      expect(house.constructionComplete).toBe(true)
    })

    it('should not complete construction before duration', () => {
      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      buildingManager.startConstruction('house')
      const house = buildingManager.buildings['house'][0]

      // Simulate only 30 seconds passing
      house.constructionStartTime = Date.now() - 30000

      buildingManager.update(100)

      expect(house.constructionComplete).toBe(false)
    })

    it('should emit construction_complete event', () => {
      const spy = vi.fn()
      eventBus.on('building:construction_complete', spy)

      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      const instanceId = buildingManager.startConstruction('house')
      const house = buildingManager.buildings['house'][0]

      house.constructionStartTime = Date.now() - 61000
      buildingManager.update(100)

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          buildingTypeId: 'house',
          instanceId
        })
      )
    })

    it('should only emit complete event once', () => {
      const spy = vi.fn()
      eventBus.on('building:construction_complete', spy)

      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      buildingManager.startConstruction('house')
      const house = buildingManager.buildings['house'][0]

      house.constructionStartTime = Date.now() - 61000
      buildingManager.update(100)
      buildingManager.update(100)
      buildingManager.update(100)

      expect(spy).toHaveBeenCalledTimes(1)
    })
  })

  describe('updateHouseWorkerGeneration()', () => {
    it('should generate workers over time', () => {
      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      const instanceId = buildingManager.startConstruction('house')
      const house = buildingManager.buildings['house'][0]

      // Complete construction
      house.constructionComplete = true

      // Initially 0 workers
      expect(resourceManager.get('basicWorker')).toBe(0)

      // Fast-forward 30 seconds (30000ms)
      buildingManager.updateHouseWorkerGeneration(30000)

      // Should generate 1 worker
      expect(resourceManager.get('basicWorker')).toBe(1)
      expect(house.rooms[0].currentWorkers).toBe(1)
    })

    it('should not generate workers if construction incomplete', () => {
      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      buildingManager.startConstruction('house')

      buildingManager.updateHouseWorkerGeneration(60000)

      expect(resourceManager.get('basicWorker')).toBe(0)
    })

    it('should stop generating when room is full', () => {
      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      const instanceId = buildingManager.startConstruction('house')
      const house = buildingManager.buildings['house'][0]
      house.constructionComplete = true

      // Generate until room is full (5 workers)
      for (let i = 0; i < 5; i++) {
        buildingManager.updateHouseWorkerGeneration(30000)
      }

      expect(house.rooms[0].currentWorkers).toBe(5)
      expect(resourceManager.get('basicWorker')).toBe(5)

      // Try to generate more
      buildingManager.updateHouseWorkerGeneration(30000)

      // Should still be 5
      expect(house.rooms[0].currentWorkers).toBe(5)
      expect(resourceManager.get('basicWorker')).toBe(5)
    })

    it('should emit worker_generated event', () => {
      const spy = vi.fn()
      eventBus.on('building:worker_generated', spy)

      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      const instanceId = buildingManager.startConstruction('house')
      const house = buildingManager.buildings['house'][0]
      house.constructionComplete = true

      buildingManager.updateHouseWorkerGeneration(30000)

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          instanceId,
          roomIndex: 0
        })
      )
    })

    it('should handle multiple houses generating workers', () => {
      resourceManager.set('wood', 10000)
      resourceManager.set('stone', 10000)

      // Build 2 houses
      buildingManager.startConstruction('house')
      buildingManager.startConstruction('house')

      buildingManager.buildings['house'][0].constructionComplete = true
      buildingManager.buildings['house'][1].constructionComplete = true

      // Generate workers
      buildingManager.updateHouseWorkerGeneration(30000)

      // Both houses should generate 1 worker each
      expect(resourceManager.get('basicWorker')).toBe(2)
    })

    it('should reset timer after generation', () => {
      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      const instanceId = buildingManager.startConstruction('house')
      const house = buildingManager.buildings['house'][0]
      house.constructionComplete = true

      // Generate first worker
      buildingManager.updateHouseWorkerGeneration(30000)
      expect(resourceManager.get('basicWorker')).toBe(1)

      // Not enough time for second worker
      buildingManager.updateHouseWorkerGeneration(10000)
      expect(resourceManager.get('basicWorker')).toBe(1)

      // Enough time for second worker
      buildingManager.updateHouseWorkerGeneration(20000)
      expect(resourceManager.get('basicWorker')).toBe(2)
    })
  })

  describe('getBuildingBonus()', () => {
    it('should return 0 when no buildings exist', () => {
      expect(buildingManager.getBuildingBonus('workerSpeedBonus')).toBe(0)
    })

    it('should sum bonuses from completed buildings', () => {
      resourceManager.set('wood', 10000)
      resourceManager.set('stone', 10000)
      resourceManager.set('gold', 10000)

      // Unlock tavern
      buildingManager.trackResourceMined('wood', 500)

      // Build tavern (10% speed bonus)
      buildingManager.startConstruction('tavern')
      buildingManager.buildings['tavern'][0].constructionComplete = true

      expect(buildingManager.getBuildingBonus('workerSpeedBonus')).toBe(0.1)
    })

    it('should not count incomplete buildings', () => {
      resourceManager.set('wood', 10000)
      resourceManager.set('stone', 10000)
      resourceManager.set('gold', 10000)

      buildingManager.trackResourceMined('wood', 500)
      buildingManager.startConstruction('tavern')

      // Not complete yet
      expect(buildingManager.getBuildingBonus('workerSpeedBonus')).toBe(0)
    })

    it('should sum bonuses from multiple buildings', () => {
      resourceManager.set('wood', 100000)
      resourceManager.set('stone', 100000)
      resourceManager.set('gold', 10000)

      buildingManager.trackResourceMined('wood', 500)

      // Build 2 taverns
      buildingManager.startConstruction('tavern')
      buildingManager.buildings['tavern'][0].constructionComplete = true

      buildingManager.startConstruction('tavern')
      buildingManager.buildings['tavern'][1].constructionComplete = true

      // 10% + 10% = 20%
      expect(buildingManager.getBuildingBonus('workerSpeedBonus')).toBe(0.2)
    })

    it('should include upgrade bonuses', () => {
      resourceManager.set('wood', 10000)
      resourceManager.set('stone', 10000)
      resourceManager.set('gold', 10000)

      buildingManager.trackResourceMined('wood', 500)
      buildingManager.startConstruction('tavern')
      const tavern = buildingManager.buildings['tavern'][0]
      tavern.constructionComplete = true

      // Add upgrade (5% bonus per level)
      tavern.upgrades['tavern_better_drinks'] = 2

      // Base 10% + (5% * 2) = 20%
      expect(buildingManager.getBuildingBonus('workerSpeedBonus')).toBe(0.2)
    })
  })

  describe('trackResourceMined()', () => {
    it('should track resources mined', () => {
      buildingManager.trackResourceMined('wood', 100)
      expect(buildingManager.resourcesMined['wood']).toBe(100)
    })

    it('should accumulate resources mined', () => {
      buildingManager.trackResourceMined('wood', 100)
      buildingManager.trackResourceMined('wood', 200)
      buildingManager.trackResourceMined('wood', 150)
      expect(buildingManager.resourcesMined['wood']).toBe(450)
    })

    it('should track multiple resource types', () => {
      buildingManager.trackResourceMined('wood', 100)
      buildingManager.trackResourceMined('stone', 50)
      buildingManager.trackResourceMined('iron', 25)

      expect(buildingManager.resourcesMined).toEqual({
        wood: 100,
        stone: 50,
        iron: 25
      })
    })
  })

  describe('getBuildings()', () => {
    it('should return empty array for non-existent type', () => {
      expect(buildingManager.getBuildings('house')).toEqual([])
    })

    it('should return buildings of specified type', () => {
      resourceManager.set('wood', 1000)
      resourceManager.set('stone', 1000)

      buildingManager.startConstruction('house')
      buildingManager.startConstruction('house')

      const houses = buildingManager.getBuildings('house')
      expect(houses.length).toBe(2)
    })
  })

  describe('getBuildingInstance()', () => {
    it('should return null for non-existent instance', () => {
      expect(buildingManager.getBuildingInstance('invalid')).toBeNull()
    })

    it('should return building by instance ID', () => {
      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      const instanceId = buildingManager.startConstruction('house')
      const instance = buildingManager.getBuildingInstance(instanceId)

      expect(instance).toBeDefined()
      expect(instance.instanceId).toBe(instanceId)
    })
  })

  describe('getState() and loadState()', () => {
    it('should save and restore buildings', () => {
      resourceManager.set('wood', 1000)
      resourceManager.set('stone', 1000)

      buildingManager.startConstruction('house')
      buildingManager.buildings['house'][0].constructionComplete = true

      const state = buildingManager.getState()

      const newManager = new BuildingManager(eventBus, resourceManager)
      newManager.loadState(state)

      expect(newManager.buildings['house']).toBeDefined()
      expect(newManager.buildings['house'][0].constructionComplete).toBe(true)
    })

    it('should save and restore slot counts', () => {
      resourceManager.set('wood', 1000)
      resourceManager.set('stone', 1000)

      buildingManager.startConstruction('house')
      buildingManager.availableSlots = 10

      const state = buildingManager.getState()

      const newManager = new BuildingManager(eventBus, resourceManager)
      newManager.loadState(state)

      expect(newManager.usedSlots).toBe(1)
      expect(newManager.availableSlots).toBe(10)
    })

    it('should save and restore house worker timers', () => {
      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      const instanceId = buildingManager.startConstruction('house')
      buildingManager.houseWorkerTimers[instanceId].room0 = 15000

      const state = buildingManager.getState()

      const newManager = new BuildingManager(eventBus, resourceManager)
      newManager.loadState(state)

      expect(newManager.houseWorkerTimers[instanceId].room0).toBe(15000)
    })

    it('should save and restore resources mined', () => {
      buildingManager.trackResourceMined('wood', 500)
      buildingManager.trackResourceMined('stone', 1000)

      const state = buildingManager.getState()

      const newManager = new BuildingManager(eventBus, resourceManager)
      newManager.loadState(state)

      expect(newManager.resourcesMined).toEqual({
        wood: 500,
        stone: 1000
      })
    })

    it('should handle loading null state', () => {
      const newManager = new BuildingManager(eventBus, resourceManager)
      expect(() => newManager.loadState(null)).not.toThrow()
    })
  })

  describe('Training Hall', () => {
    let trainingHallId

    beforeEach(() => {
      // Build a training hall
      resourceManager.set('wood', 200)
      resourceManager.set('stone', 200)
      resourceManager.set('basicWorker', 10)

      trainingHallId = buildingManager.startConstruction('trainingHall')
      const hall = buildingManager.getBuildingInstance(trainingHallId)
      hall.constructionComplete = true // Skip construction time for tests
    })

    it('should initialize training queue when built', () => {
      expect(buildingManager.trainingQueues[trainingHallId]).toBeDefined()
      expect(buildingManager.trainingQueues[trainingHallId]).toEqual([])
    })

    it('should start training a lumberjack', () => {
      resourceManager.set('wood', 50)

      const workersBefore = resourceManager.get('basicWorker')

      buildingManager.startTraining(trainingHallId, 'train_lumberjack')

      const workersAfter = resourceManager.get('basicWorker')

      expect(workersAfter).toBe(workersBefore - 1)
      expect(buildingManager.trainingQueues[trainingHallId]).toHaveLength(1)
    })

    it('should complete training and give specialized worker', () => {
      resourceManager.set('wood', 50)

      buildingManager.startTraining(trainingHallId, 'train_lumberjack')

      const lumberjacksBefore = resourceManager.get('lumberjack') || 0

      // Fast-forward training time
      const queue = buildingManager.trainingQueues[trainingHallId]
      queue[0].startTime = Date.now() - (queue[0].duration + 1000)

      buildingManager.update(16)

      const lumberjacksAfter = resourceManager.get('lumberjack') || 0

      expect(lumberjacksAfter).toBe(lumberjacksBefore + 1)
      expect(buildingManager.trainingQueues[trainingHallId]).toHaveLength(0)
    })

    it('should train miners', () => {
      resourceManager.set('stone', 50)

      buildingManager.startTraining(trainingHallId, 'train_miner')

      const queue = buildingManager.trainingQueues[trainingHallId]
      queue[0].startTime = Date.now() - (queue[0].duration + 1000)

      buildingManager.update(16)

      const miners = resourceManager.get('miner') || 0
      expect(miners).toBe(1)
    })

    it('should train farmers', () => {
      resourceManager.set('wheat', 50)

      buildingManager.startTraining(trainingHallId, 'train_farmer')

      const queue = buildingManager.trainingQueues[trainingHallId]
      queue[0].startTime = Date.now() - (queue[0].duration + 1000)

      buildingManager.update(16)

      const farmers = resourceManager.get('farmer') || 0
      expect(farmers).toBe(1)
    })

    it('should not exceed training slots', () => {
      resourceManager.set('wood', 500)

      const hallType = buildingManager.buildingTypes.find(b => b.id === 'trainingHall')
      const maxSlots = hallType.trainingSlots

      // Fill all slots
      for (let i = 0; i < maxSlots; i++) {
        buildingManager.startTraining(trainingHallId, 'train_lumberjack')
      }

      // Try to add one more
      expect(() => {
        buildingManager.startTraining(trainingHallId, 'train_lumberjack')
      }).toThrow('All training slots are full')
    })

    it('should not train without enough workers', () => {
      resourceManager.set('basicWorker', 0)
      resourceManager.set('wood', 50)

      expect(() => {
        buildingManager.startTraining(trainingHallId, 'train_lumberjack')
      }).toThrow('Not enough basicWorker')
    })

    it('should not train without enough resources', () => {
      resourceManager.set('wood', 5) // Not enough for training

      expect(() => {
        buildingManager.startTraining(trainingHallId, 'train_lumberjack')
      }).toThrow('Cannot afford training cost')
    })

    it('should emit training_started event', () => {
      const spy = vi.fn()
      eventBus.on('building:training_started', spy)

      resourceManager.set('wood', 50)

      buildingManager.startTraining(trainingHallId, 'train_lumberjack')

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          instanceId: trainingHallId,
          programId: 'train_lumberjack'
        })
      )
    })

    it('should emit training_complete event', () => {
      const spy = vi.fn()
      eventBus.on('building:training_complete', spy)

      resourceManager.set('wood', 50)

      buildingManager.startTraining(trainingHallId, 'train_lumberjack')

      // Fast-forward training
      const queue = buildingManager.trainingQueues[trainingHallId]
      queue[0].startTime = Date.now() - (queue[0].duration + 1000)
      buildingManager.update(16)

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          instanceId: trainingHallId,
          workerType: 'lumberjack'
        })
      )
    })

    it('should allow building up to 5 training halls', () => {
      resourceManager.set('wood', 10000)
      resourceManager.set('stone', 10000)

      // We already built one in beforeEach
      const hallsBuilt = [trainingHallId]

      // Build 4 more
      for (let i = 0; i < 4; i++) {
        const id = buildingManager.startConstruction('trainingHall')
        hallsBuilt.push(id)
      }

      expect(hallsBuilt).toHaveLength(5)

      // Try to build a 6th
      expect(() => {
        buildingManager.startConstruction('trainingHall')
      }).toThrow()
    })

    it('should process multiple training queues simultaneously', () => {
      resourceManager.set('wood', 500)

      // Start 3 trainings
      buildingManager.startTraining(trainingHallId, 'train_lumberjack')
      buildingManager.startTraining(trainingHallId, 'train_lumberjack')
      buildingManager.startTraining(trainingHallId, 'train_lumberjack')

      const queue = buildingManager.trainingQueues[trainingHallId]
      expect(queue).toHaveLength(3)

      // Fast-forward all trainings
      queue.forEach(training => {
        training.startTime = Date.now() - (training.duration + 1000)
      })

      buildingManager.update(16)

      const lumberjacks = resourceManager.get('lumberjack') || 0
      expect(lumberjacks).toBe(3)
      expect(buildingManager.trainingQueues[trainingHallId]).toHaveLength(0)
    })

    it('should throw error for invalid training hall', () => {
      expect(() => {
        buildingManager.startTraining('invalid_id', 'train_lumberjack')
      }).toThrow('Training hall not found')
    })

    it('should throw error for invalid training program', () => {
      expect(() => {
        buildingManager.startTraining(trainingHallId, 'invalid_program')
      }).toThrow('Training program not found')
    })

    it('should not train in incomplete training hall', () => {
      resourceManager.set('wood', 500)
      resourceManager.set('stone', 500)

      const newHallId = buildingManager.startConstruction('trainingHall')

      resourceManager.set('wood', 50)

      expect(() => {
        buildingManager.startTraining(newHallId, 'train_lumberjack')
      }).toThrow('Training hall not found or not complete')
    })

    it('should save and restore training queues', () => {
      resourceManager.set('wood', 50)

      buildingManager.startTraining(trainingHallId, 'train_lumberjack')

      const state = buildingManager.getState()

      const newManager = new BuildingManager(eventBus, resourceManager)
      newManager.loadState(state)

      expect(newManager.trainingQueues[trainingHallId]).toHaveLength(1)
      expect(newManager.trainingQueues[trainingHallId][0].outputWorker).toBe('lumberjack')
    })

    it('should clear training queues on reset', () => {
      resourceManager.set('wood', 50)

      buildingManager.startTraining(trainingHallId, 'train_lumberjack')

      buildingManager.reset()

      expect(buildingManager.trainingQueues).toEqual({})
    })

    it('should handle multiple training halls with separate queues', () => {
      resourceManager.set('wood', 10000)
      resourceManager.set('stone', 10000)

      // Build second training hall
      const hall2Id = buildingManager.startConstruction('trainingHall')
      const hall2 = buildingManager.getBuildingInstance(hall2Id)
      hall2.constructionComplete = true

      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      // Start training in both halls
      buildingManager.startTraining(trainingHallId, 'train_lumberjack')
      buildingManager.startTraining(hall2Id, 'train_miner')

      expect(buildingManager.trainingQueues[trainingHallId]).toHaveLength(1)
      expect(buildingManager.trainingQueues[hall2Id]).toHaveLength(1)

      expect(buildingManager.trainingQueues[trainingHallId][0].outputWorker).toBe('lumberjack')
      expect(buildingManager.trainingQueues[hall2Id][0].outputWorker).toBe('miner')
    })
  })

  describe('reset()', () => {
    it('should clear all buildings', () => {
      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      buildingManager.startConstruction('house')
      buildingManager.reset()

      expect(buildingManager.buildings).toEqual({})
    })

    it('should reset slot counts', () => {
      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      buildingManager.startConstruction('house')
      buildingManager.availableSlots = 10

      buildingManager.reset()

      expect(buildingManager.usedSlots).toBe(0)
      expect(buildingManager.availableSlots).toBe(5) // Back to starting slots
    })

    it('should clear house worker timers', () => {
      resourceManager.set('wood', 100)
      resourceManager.set('stone', 100)

      buildingManager.startConstruction('house')
      buildingManager.reset()

      expect(buildingManager.houseWorkerTimers).toEqual({})
    })

    it('should clear resources mined', () => {
      buildingManager.trackResourceMined('wood', 500)
      buildingManager.reset()

      expect(buildingManager.resourcesMined).toEqual({})
    })
  })
})
