import { WorkerEntity } from '../entities/WorkerEntity.js'

/**
 * WorkerEntityManager - Manages all worker entities
 * Handles spawning, assignment, and updating workers
 */
export class WorkerEntityManager {
  constructor(eventBus, currencyManager) {
    this.workers = new Map()
    this.eventBus = eventBus
    this.currencyManager = currencyManager

    // Home position (right side of screen)
    this.homePosition = { x: 850, y: 300 }

    // Worker ID counter
    this.nextWorkerId = 1

    // Worker type stats
    this.workerTypes = new Map([
      ['basicWorker', {
        walkSpeed: 150,
        carrySpeed: 90,
        harvestSpeedMultiplier: 1.0,
        icon: '👷'
      }],
      ['tractorWorker', {
        walkSpeed: 200,
        carrySpeed: 150,
        harvestSpeedMultiplier: 1.5,
        icon: '🚜'
      }],
      ['droneWorker', {
        walkSpeed: 300,
        carrySpeed: 280,
        harvestSpeedMultiplier: 2.0,
        icon: '🚁'
      }]
    ])

    console.log(`✅ [WorkerEntityManager] Initialized`)
  }

  /**
   * Update all workers
   * @param {number} deltaTime - Time elapsed in milliseconds
   * @param {Map<string, ResourceNode>} resourceNodes - Resource nodes
   */
  update(deltaTime, resourceNodes) {
    this.workers.forEach(worker => {
      worker.update(deltaTime, resourceNodes, this.currencyManager)
    })
  }

  /**
   * Spawn a new worker entity
   * @param {string} workerType - Type of worker (basicWorker, etc.)
   * @returns {string} Worker ID
   */
  spawnWorker(workerType) {
    const id = `worker_${this.nextWorkerId++}`
    const worker = new WorkerEntity(id, workerType, this.homePosition)

    // Apply worker type stats
    const stats = this.workerTypes.get(workerType)
    if (stats) {
      worker.walkSpeed = stats.walkSpeed
      worker.carrySpeed = stats.carrySpeed
      worker.harvestSpeedMultiplier = stats.harvestSpeedMultiplier
    }

    this.workers.set(id, worker)

    this.eventBus.emit('worker:spawned', {
      workerId: id,
      type: workerType
    })

    console.log(`👷 [Worker] Spawned ${workerType} (${id})`)

    return id
  }

  /**
   * Despawn (remove) a worker
   * @param {string} workerId
   */
  despawnWorker(workerId) {
    const worker = this.workers.get(workerId)

    if (worker && this.workers.delete(workerId)) {
      this.eventBus.emit('worker:despawned', {
        workerId,
        type: worker.type
      })

      console.log(`🗑️ [Worker] Despawned ${worker.type} (${workerId})`)
    }
  }

  /**
   * Get a specific worker
   * @param {string} workerId
   * @returns {WorkerEntity|undefined}
   */
  getWorker(workerId) {
    return this.workers.get(workerId)
  }

  /**
   * Get all workers
   * @returns {WorkerEntity[]}
   */
  getAllWorkers() {
    return Array.from(this.workers.values())
  }

  /**
   * Assign worker to resource node
   * @param {string} workerId
   * @param {string} nodeId
   */
  assignWorker(workerId, nodeId) {
    const worker = this.workers.get(workerId)

    if (worker) {
      worker.assignTo(nodeId)

      this.eventBus.emit('worker:assigned', {
        workerId,
        nodeId,
        workerType: worker.type
      })

      console.log(`📌 [Worker] ${workerId} assigned to ${nodeId}`)
    }
  }

  /**
   * Unassign worker from current node
   * @param {string} workerId
   */
  unassignWorker(workerId) {
    const worker = this.workers.get(workerId)

    if (worker) {
      const previousNode = worker.targetNodeId

      worker.unassign()

      this.eventBus.emit('worker:unassigned', {
        workerId,
        previousNodeId: previousNode,
        workerType: worker.type
      })

      console.log(`📍 [Worker] ${workerId} unassigned`)
    }
  }

  /**
   * Get all workers assigned to a specific node
   * @param {string} nodeId
   * @returns {WorkerEntity[]}
   */
  getWorkersForNode(nodeId) {
    return this.getAllWorkers().filter(w => w.targetNodeId === nodeId)
  }

  /**
   * Get all idle (unassigned) workers
   * @returns {WorkerEntity[]}
   */
  getIdleWorkers() {
    return this.getAllWorkers().filter(w => !w.isAssigned())
  }

  /**
   * Get workers by type
   * @param {string} workerType
   * @returns {WorkerEntity[]}
   */
  getWorkersByType(workerType) {
    return this.getAllWorkers().filter(w => w.type === workerType)
  }

  /**
   * Sync workers with currency inventory
   * Spawns/despawns workers to match owned worker currencies
   * @param {CurrencyManager} currencyManager
   */
  syncWithCurrency(currencyManager) {
    this.workerTypes.forEach((stats, workerType) => {
      const owned = currencyManager.get(workerType) || 0
      const existing = this.getWorkersByType(workerType)

      // Spawn missing workers
      const toSpawn = owned - existing.length
      for (let i = 0; i < toSpawn; i++) {
        this.spawnWorker(workerType)
      }

      // Despawn extra workers (shouldn't happen normally)
      const toDespawn = existing.length - owned
      for (let i = 0; i < toDespawn; i++) {
        // Despawn idle workers first
        const idleWorker = existing.find(w => w.isIdle())
        if (idleWorker) {
          this.despawnWorker(idleWorker.id)
        } else if (existing[i]) {
          this.despawnWorker(existing[i].id)
        }
      }
    })
  }

  /**
   * Get assignment summary for a node
   * @param {string} nodeId
   * @returns {Object} { basicWorker: 2, tractorWorker: 1, ... }
   */
  getNodeAssignmentSummary(nodeId) {
    const workers = this.getWorkersForNode(nodeId)
    const summary = {}

    workers.forEach(worker => {
      summary[worker.type] = (summary[worker.type] || 0) + 1
    })

    return summary
  }

  /**
   * Unassign all workers from a node
   * @param {string} nodeId
   */
  unassignAllFromNode(nodeId) {
    const workers = this.getWorkersForNode(nodeId)

    workers.forEach(worker => {
      this.unassignWorker(worker.id)
    })

    console.log(`📍 [Worker] Unassigned all ${workers.length} workers from ${nodeId}`)
  }

  /**
   * Get total worker count
   * @returns {number}
   */
  getTotalWorkerCount() {
    return this.workers.size
  }

  /**
   * Get statistics for all workers
   * @returns {Object}
   */
  getStatistics() {
    const stats = {
      totalWorkers: this.workers.size,
      byType: {},
      totalHarvests: 0,
      totalDistance: 0,
      idleWorkers: 0,
      activeWorkers: 0
    }

    this.workerTypes.forEach((_, type) => {
      stats.byType[type] = {
        total: 0,
        assigned: 0,
        idle: 0
      }
    })

    this.workers.forEach(worker => {
      const typeStats = stats.byType[worker.type]
      if (typeStats) {
        typeStats.total++
        if (worker.isAssigned()) {
          typeStats.assigned++
          stats.activeWorkers++
        } else {
          typeStats.idle++
          stats.idleWorkers++
        }
      }

      stats.totalHarvests += worker.totalHarvests
      stats.totalDistance += worker.totalDistanceTraveled
    })

    return stats
  }

  /**
   * Get save state
   * @returns {Object}
   */
  getState() {
    const state = {
      workers: [],
      nextWorkerId: this.nextWorkerId
    }

    this.workers.forEach(worker => {
      state.workers.push(worker.getSaveState())
    })

    return state
  }

  /**
   * Load state from save
   * @param {Object} state
   * @param {CurrencyManager} currencyManager
   */
  loadState(state, currencyManager) {
    if (!state) return

    // Clear existing workers
    this.workers.clear()

    // Restore worker ID counter
    if (state.nextWorkerId !== undefined) {
      this.nextWorkerId = state.nextWorkerId
    }

    // Restore workers
    if (state.workers && Array.isArray(state.workers)) {
      state.workers.forEach(workerState => {
        const worker = new WorkerEntity(
          workerState.id,
          workerState.type,
          this.homePosition
        )

        // Apply worker type stats
        const stats = this.workerTypes.get(workerState.type)
        if (stats) {
          worker.walkSpeed = stats.walkSpeed
          worker.carrySpeed = stats.carrySpeed
          worker.harvestSpeedMultiplier = stats.harvestSpeedMultiplier
        }

        worker.loadState(workerState)
        this.workers.set(worker.id, worker)
      })
    }

    console.log(`📂 [WorkerEntityManager] Loaded ${this.workers.size} workers`)
  }

  /**
   * Reset all workers
   */
  reset() {
    this.workers.clear()
    this.nextWorkerId = 1

    console.log(`🔄 [WorkerEntityManager] Reset`)
  }
}
