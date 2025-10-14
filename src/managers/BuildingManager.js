import { buildingTypes, townSettings } from '../data/buildings.js'

/**
 * BuildingManager - Manages city buildings, construction, and upgrades
 */
export class BuildingManager {
  constructor(eventBus, resourceManager) {
    this.eventBus = eventBus
    this.resourceManager = resourceManager
    this.buildingTypes = buildingTypes
    this.townSettings = townSettings

    // Built buildings: { buildingId: [{ instanceId, level, upgrades: {}, constructionStartTime, constructionComplete, rooms: [] }] }
    this.buildings = {}

    // Town slots
    this.availableSlots = townSettings.startingSlots
    this.usedSlots = 0

    // Worker generation timers for houses
    this.houseWorkerTimers = {} // { instanceId: { room0: timeRemaining, room1: ... } }

    // Training halls - track training queues
    this.trainingQueues = {} // { instanceId: [{ programId, startTime, duration }] }

    // Track resources mined for unlock conditions
    this.resourcesMined = {}
  }

  /**
   * Get total building count across all types
   */
  getTotalBuildingCount() {
    let total = 0
    for (const buildings of Object.values(this.buildings)) {
      total += buildings.filter(b => b.constructionComplete).length
    }
    return total
  }

  /**
   * Check if a building type can be built
   */
  canBuild(buildingTypeId) {
    const buildingType = this.buildingTypes.find(b => b.id === buildingTypeId)
    if (!buildingType) return { canBuild: false, reason: 'Invalid building type' }

    // Check slot availability
    if (this.usedSlots >= this.availableSlots) {
      return { canBuild: false, reason: 'No available building slots' }
    }

    // Check max count
    const currentCount = this.buildings[buildingTypeId]?.length || 0
    if (currentCount >= buildingType.maxCount) {
      return { canBuild: false, reason: `Maximum ${buildingType.maxCount} ${buildingType.name}s allowed` }
    }

    // Check unlock condition
    if (buildingType.unlockCondition) {
      if (!this.isUnlocked(buildingType)) {
        return { canBuild: false, reason: 'Not yet unlocked' }
      }
    }

    // Check costs
    const cost = this.getBuildingCost(buildingTypeId)
    if (!this.resourceManager.canAfford(cost)) {
      return { canBuild: false, reason: 'Not enough resources' }
    }

    return { canBuild: true }
  }

  /**
   * Check if building is unlocked based on conditions
   */
  isUnlocked(buildingType) {
    if (!buildingType.unlockCondition) return true

    const condition = buildingType.unlockCondition

    if (condition.type === 'resource_mined') {
      const mined = this.resourcesMined[condition.resource] || 0
      return mined >= condition.amount
    }

    if (condition.type === 'buildings_built') {
      return this.getTotalBuildingCount() >= condition.count
    }

    return true
  }

  /**
   * Get building cost (scales with number built)
   */
  getBuildingCost(buildingTypeId) {
    const buildingType = this.buildingTypes.find(b => b.id === buildingTypeId)
    if (!buildingType) return {}

    const currentCount = this.buildings[buildingTypeId]?.length || 0
    const multiplier = Math.pow(buildingType.costMultiplier, currentCount)

    const cost = {}
    for (const [resource, amount] of Object.entries(buildingType.baseCost)) {
      cost[resource] = Math.floor(amount * multiplier)
    }

    return cost
  }

  /**
   * Start building construction
   */
  startConstruction(buildingTypeId) {
    const check = this.canBuild(buildingTypeId)
    if (!check.canBuild) {
      throw new Error(check.reason)
    }

    const buildingType = this.buildingTypes.find(b => b.id === buildingTypeId)
    const cost = this.getBuildingCost(buildingTypeId)

    // Spend resources
    this.resourceManager.spendCosts(cost)

    // Create building instance
    const instanceId = `${buildingTypeId}_${Date.now()}_${Math.random()}`
    const buildingInstance = {
      instanceId,
      buildingTypeId,
      level: 1,
      upgrades: {}, // { upgradeId: level }
      constructionStartTime: Date.now(),
      constructionComplete: false,
      constructionDuration: buildingType.constructionTime * 1000 // Convert to ms
    }

    // Initialize house-specific data
    if (buildingTypeId === 'house') {
      buildingInstance.rooms = []
      const roomCount = buildingType.roomsPerHouse + this.getBuildingBonus('roomsPerHouse')
      for (let i = 0; i < roomCount; i++) {
        buildingInstance.rooms.push({
          currentWorkers: 0,
          maxWorkers: buildingType.workersPerRoom + this.getBuildingBonus('workersPerRoom')
        })
      }

      // Initialize worker generation timers
      this.houseWorkerTimers[instanceId] = {}
      buildingInstance.rooms.forEach((room, idx) => {
        this.houseWorkerTimers[instanceId][`room${idx}`] = buildingType.workerGenerationTime * 1000
      })
    }

    // Initialize training hall-specific data
    if (buildingTypeId === 'trainingHall') {
      this.trainingQueues[instanceId] = []
    }

    // Add to buildings
    if (!this.buildings[buildingTypeId]) {
      this.buildings[buildingTypeId] = []
    }
    this.buildings[buildingTypeId].push(buildingInstance)

    // Use a slot
    this.usedSlots++

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('building:construction_started', {
        buildingTypeId,
        instanceId,
        duration: buildingType.constructionTime
      })
    }

    return instanceId
  }

  /**
   * Update construction timers and worker generation
   */
  update(deltaTime) {
    // Update construction timers
    for (const [buildingTypeId, instances] of Object.entries(this.buildings)) {
      for (const instance of instances) {
        if (!instance.constructionComplete) {
          const elapsed = Date.now() - instance.constructionStartTime
          if (elapsed >= instance.constructionDuration) {
            instance.constructionComplete = true

            if (this.eventBus) {
              this.eventBus.emit('building:construction_complete', {
                buildingTypeId,
                instanceId: instance.instanceId
              })
            }
          }
        }
      }
    }

    // Update house worker generation
    this.updateHouseWorkerGeneration(deltaTime)

    // Update training halls
    this.updateTrainingHalls(deltaTime)
  }

  /**
   * Update worker generation for houses
   */
  updateHouseWorkerGeneration(deltaTime) {
    const houses = this.buildings['house'] || []
    const houseType = this.buildingTypes.find(b => b.id === 'house')
    if (!houseType) return

    const baseGenerationTime = houseType.workerGenerationTime * 1000 // ms
    const bonusReduction = this.getBuildingBonus('workerGenerationTime') * 1000 // ms
    const effectiveGenerationTime = Math.max(5000, baseGenerationTime - bonusReduction) // Min 5 seconds

    for (const house of houses) {
      if (!house.constructionComplete) continue

      const timers = this.houseWorkerTimers[house.instanceId]
      if (!timers) continue

      house.rooms.forEach((room, idx) => {
        const roomKey = `room${idx}`

        // Only generate if room isn't full
        if (room.currentWorkers < room.maxWorkers) {
          timers[roomKey] -= deltaTime

          if (timers[roomKey] <= 0) {
            // Generate a worker
            room.currentWorkers++
            this.resourceManager.add('basicWorker', 1)

            // Reset timer
            timers[roomKey] = effectiveGenerationTime

            if (this.eventBus) {
              this.eventBus.emit('building:worker_generated', {
                instanceId: house.instanceId,
                roomIndex: idx
              })
            }
          }
        } else {
          // Room is full, reset timer
          timers[roomKey] = effectiveGenerationTime
        }
      })
    }
  }

  /**
   * Update training halls
   */
  updateTrainingHalls(deltaTime) {
    const trainingHalls = this.buildings['trainingHall'] || []
    const hallType = this.buildingTypes.find(b => b.id === 'trainingHall')
    if (!hallType) return

    for (const hall of trainingHalls) {
      if (!hall.constructionComplete) continue

      const queue = this.trainingQueues[hall.instanceId]
      if (!queue || queue.length === 0) continue

      // Check for completed training
      const now = Date.now()
      const completedIndices = []

      queue.forEach((training, idx) => {
        if (now >= training.startTime + training.duration) {
          completedIndices.push(idx)
        }
      })

      // Complete training (in reverse order to preserve indices)
      for (let i = completedIndices.length - 1; i >= 0; i--) {
        const idx = completedIndices[i]
        const training = queue[idx]
        this.completeTraining(hall.instanceId, training)
        queue.splice(idx, 1)
      }
    }
  }

  /**
   * Start training in a training hall
   */
  startTraining(instanceId, programId) {
    const hall = this.getBuildingInstance(instanceId)
    if (!hall || !hall.constructionComplete) {
      throw new Error('Training hall not found or not complete')
    }

    const hallType = this.buildingTypes.find(b => b.id === hall.buildingTypeId)
    if (!hallType || !hallType.trainingPrograms) {
      throw new Error('Invalid training hall')
    }

    const program = hallType.trainingPrograms.find(p => p.id === programId)
    if (!program) {
      throw new Error('Training program not found')
    }

    // Check training slots
    const queue = this.trainingQueues[instanceId] || []
    const maxSlots = hallType.trainingSlots + this.getBuildingBonus('trainingSlots')
    if (queue.length >= maxSlots) {
      throw new Error('All training slots are full')
    }

    // Check worker availability
    const currentWorkers = this.resourceManager.get(program.inputWorker) || 0
    if (currentWorkers < program.workersRequired) {
      throw new Error(`Not enough ${program.inputWorker}`)
    }

    // Check resource cost
    if (!this.resourceManager.canAfford(program.cost)) {
      throw new Error('Cannot afford training cost')
    }

    // Remove worker and spend resources
    this.resourceManager.add(program.inputWorker, -program.workersRequired)
    this.resourceManager.spendCosts(program.cost)

    // Calculate training time
    const baseTime = program.trainingTime * 1000 // ms
    const timeReduction = this.getBuildingBonus('trainingTimeReduction') * 1000 // ms
    const effectiveTime = Math.max(5000, baseTime - timeReduction) // Min 5 seconds

    // Add to queue
    queue.push({
      programId: program.id,
      outputWorker: program.outputWorker,
      startTime: Date.now(),
      duration: effectiveTime
    })

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('building:training_started', {
        instanceId,
        programId,
        duration: effectiveTime
      })
    }
  }

  /**
   * Complete training and give worker
   */
  completeTraining(instanceId, training) {
    // Give output worker
    this.resourceManager.add(training.outputWorker, 1)

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('building:training_complete', {
        instanceId,
        workerType: training.outputWorker
      })
    }
  }

  /**
   * Get training queue for a training hall
   */
  getTrainingQueue(instanceId) {
    return this.trainingQueues[instanceId] || []
  }

  /**
   * Get aggregate bonus from all buildings
   */
  getBuildingBonus(bonusType) {
    let totalBonus = 0

    for (const [buildingTypeId, instances] of Object.entries(this.buildings)) {
      const buildingType = this.buildingTypes.find(b => b.id === buildingTypeId)
      if (!buildingType) continue

      for (const instance of instances) {
        if (!instance.constructionComplete) continue

        // Base building effect
        if (buildingType.effect && buildingType.effect[bonusType] !== undefined) {
          if (typeof buildingType.effect[bonusType] === 'number') {
            totalBonus += buildingType.effect[bonusType]
          }
        }

        // Upgrade effects
        for (const [upgradeId, level] of Object.entries(instance.upgrades)) {
          const upgrade = buildingType.upgrades?.find(u => u.id === upgradeId)
          if (upgrade && upgrade.effect && upgrade.effect[bonusType] !== undefined) {
            if (typeof upgrade.effect[bonusType] === 'number') {
              totalBonus += upgrade.effect[bonusType] * level
            }
          }
        }
      }
    }

    return totalBonus
  }

  /**
   * Track resources mined for unlock conditions
   */
  trackResourceMined(resourceId, amount) {
    this.resourcesMined[resourceId] = (this.resourcesMined[resourceId] || 0) + amount
  }

  /**
   * Get all buildings of a type
   */
  getBuildings(buildingTypeId) {
    return this.buildings[buildingTypeId] || []
  }

  /**
   * Get building by instance ID
   */
  getBuildingInstance(instanceId) {
    for (const instances of Object.values(this.buildings)) {
      const found = instances.find(b => b.instanceId === instanceId)
      if (found) return found
    }
    return null
  }

  /**
   * Get all buildings (flattened array of all building instances)
   */
  getAllBuildings() {
    const allBuildings = []
    for (const instances of Object.values(this.buildings)) {
      allBuildings.push(...instances)
    }
    return allBuildings
  }

  /**
   * Get state for saving
   */
  getState() {
    return {
      buildings: JSON.parse(JSON.stringify(this.buildings)),
      availableSlots: this.availableSlots,
      usedSlots: this.usedSlots,
      houseWorkerTimers: JSON.parse(JSON.stringify(this.houseWorkerTimers)),
      trainingQueues: JSON.parse(JSON.stringify(this.trainingQueues)),
      resourcesMined: JSON.parse(JSON.stringify(this.resourcesMined))
    }
  }

  /**
   * Load state
   */
  loadState(state) {
    if (!state) return

    if (state.buildings) {
      this.buildings = JSON.parse(JSON.stringify(state.buildings))
    }
    if (state.availableSlots !== undefined) {
      this.availableSlots = state.availableSlots
    }
    if (state.usedSlots !== undefined) {
      this.usedSlots = state.usedSlots
    }
    if (state.houseWorkerTimers) {
      this.houseWorkerTimers = JSON.parse(JSON.stringify(state.houseWorkerTimers))
    }
    if (state.trainingQueues) {
      this.trainingQueues = JSON.parse(JSON.stringify(state.trainingQueues))
    }
    if (state.resourcesMined) {
      this.resourcesMined = JSON.parse(JSON.stringify(state.resourcesMined))
    }
  }

  /**
   * Reset
   */
  reset() {
    this.buildings = {}
    this.availableSlots = townSettings.startingSlots
    this.usedSlots = 0
    this.houseWorkerTimers = {}
    this.trainingQueues = {}
    this.resourcesMined = {}
  }
}
