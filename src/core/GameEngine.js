import { EventBus } from './EventBus.js'
import { ResourceManager } from '../managers/ResourceManager.js'
import { SkillManager } from '../managers/SkillManager.js'
import { ActivityManager } from '../managers/ActivityManager.js'
import { UpgradeManager } from '../managers/UpgradeManager.js'
import { WorkerManager } from '../managers/WorkerManager.js'
import { BuildingManager } from '../managers/BuildingManager.js'
import { AudioManager } from '../managers/AudioManager.js'
import { levelFromXP } from '../utils/calculations.js'

/**
 * Main game engine - coordinates all systems
 */
export class GameEngine {
  constructor(skillDefinitions, activityDefinitions, upgradeDefinitions = []) {
    this.eventBus = new EventBus()
    this.resourceManager = new ResourceManager(this.eventBus)
    this.skillManager = new SkillManager(skillDefinitions, activityDefinitions, this.eventBus)
    this.upgradeManager = new UpgradeManager(upgradeDefinitions, this.resourceManager, this.skillManager, this.eventBus)
    this.workerManager = new WorkerManager(this.eventBus, this.resourceManager)
    this.buildingManager = new BuildingManager(this.eventBus, this.resourceManager)
    this.activityManager = new ActivityManager(activityDefinitions, this.resourceManager, this.skillManager, this.eventBus, this.upgradeManager, this.workerManager)
    this.audioManager = new AudioManager()

    // Listen for resource changes to track mined amounts
    this.eventBus.on('activity:completed', (data) => {
      if (data.outputs) {
        Object.entries(data.outputs).forEach(([resourceId, amount]) => {
          this.buildingManager.trackResourceMined(resourceId, amount)
        })
      }
    })

    // Play sound effects on game events
    this.eventBus.on('activity:completed', () => {
      this.audioManager.playCollectSound()
    })

    this.eventBus.on('skill:levelup', () => {
      this.audioManager.playLevelUpSound()
    })

    this.eventBus.on('building:construction_complete', (data) => {
      this.audioManager.playSuccessSound()

      // Apply storage bonus for warehouses
      if (data.buildingTypeId === 'warehouse') {
        const warehouseType = this.buildingManager.buildingTypes.find(b => b.id === 'warehouse')
        if (warehouseType && warehouseType.storageBonus) {
          // Apply storage bonus to ALL resources
          const allResourceIds = Object.keys(this.resourceManager.getAll())
          allResourceIds.forEach(resourceId => {
            this.resourceManager.addStorageBonus(resourceId, warehouseType.storageBonus)
          })
        }
      }
    })

    this.isRunning = false
    this.isPaused = false
    this.lastUpdateTime = 0
  }

  /**
   * Start the game loop
   */
  start() {
    if (this.isRunning) return

    this.isRunning = true
    this.isPaused = false
    this.lastUpdateTime = Date.now()
    this._gameLoop()
  }

  /**
   * Pause the game
   */
  pause() {
    this.isPaused = true
  }

  /**
   * Resume the game
   */
  resume() {
    if (!this.isRunning) {
      this.start()
      return
    }
    this.isPaused = false
    this.lastUpdateTime = Date.now()  // Reset time to prevent huge delta
  }

  /**
   * Stop the game loop
   */
  stop() {
    this.isRunning = false
    this.isPaused = false
  }

  /**
   * Main game loop
   * @private
   */
  _gameLoop() {
    if (!this.isRunning) return

    if (!this.isPaused) {
      const now = Date.now()
      const deltaTime = now - this.lastUpdateTime
      this.lastUpdateTime = now

      this.update(deltaTime)
    }

    // Request next frame
    requestAnimationFrame(() => this._gameLoop())
  }

  /**
   * Update all game systems
   * @param {number} deltaTime - Time elapsed in ms
   */
  update(deltaTime) {
    // Update activities
    this.activityManager.update(deltaTime)

    // Update buildings (construction and worker generation)
    this.buildingManager.update(deltaTime)

    // Emit tick event for UI updates
    this.eventBus.emit('game:tick', {
      deltaTime,
      timestamp: Date.now()
    })
  }

  /**
   * Subscribe to game events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    this.eventBus.on(event, callback)
  }

  /**
   * Unsubscribe from game events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    this.eventBus.off(event, callback)
  }

  /**
   * Get game state for saving
   * @returns {Object} Game state
   */
  getState() {
    return {
      version: 2, // Increment when save format changes
      resourceManager: this.resourceManager.getState(),
      skills: this.skillManager.getAllSkills(),
      upgrades: this.upgradeManager.getState(),
      workers: this.workerManager.getState(),
      buildings: this.buildingManager.getState(),
      lastSaveTime: Date.now()
    }
  }

  /**
   * Load game state
   * @param {Object} state - Game state
   */
  loadState(state) {
    // Check version - if old version, ignore the save
    if (!state.version || state.version < 2) {
      console.warn('Old save version detected - starting fresh')
      return
    }

    // Load resources - handle both new and legacy formats
    if (state.resourceManager) {
      // New format with storage bonuses
      this.resourceManager.loadState(state.resourceManager)
    } else {
      // Legacy format - just resources
      const resources = state.resources || state.currencies
      if (resources) {
        Object.entries(resources).forEach(([id, amount]) => {
          this.resourceManager.set(id, amount)
        })
      }
    }

    // Load skills
    if (state.skills) {
      Object.entries(state.skills).forEach(([id, skillState]) => {
        if (skillState.xp) {
          this.skillManager.setXP(id, skillState.xp)
        }
      })
    }

    // Load upgrades
    if (state.upgrades) {
      this.upgradeManager.loadState(state.upgrades)
    }

    // Load workers
    if (state.workers) {
      this.workerManager.loadState(state.workers)
    }

    // Load buildings
    if (state.buildings) {
      this.buildingManager.loadState(state.buildings)
    }

    // Calculate and apply offline progress if lastSaveTime exists
    if (state.lastSaveTime) {
      const now = Date.now()
      const offlineTime = now - state.lastSaveTime

      if (offlineTime > 0) {
        const offlineResult = this.calculateOfflineProgress(offlineTime, state)
        this.applyOfflineProgress(offlineResult)
      }
    }

    // Note: Activities will auto-start on next update() call if workers are assigned
  }

  /**
   * Reset the game
   */
  reset() {
    this.resourceManager.reset()
    this.skillManager.reset()
    this.activityManager.reset()
    this.upgradeManager.reset()
    this.workerManager.reset()
    this.buildingManager.reset()

    // Give starting workers for new game
    this.resourceManager.add('basicWorker', 2)
  }

  /**
   * Calculate offline progress from saved state
   * @param {number} offlineTime - Time offline in milliseconds
   * @param {Object} savedState - The saved game state
   * @returns {Object} Offline progress summary
   */
  calculateOfflineProgress(offlineTime, savedState) {
    const MAX_OFFLINE_TIME = 8 * 60 * 60 * 1000 // 8 hours in ms
    const cappedTime = Math.min(offlineTime, MAX_OFFLINE_TIME)

    const result = {
      activitiesCompleted: [],
      resourcesEarned: {},
      xpEarned: {},
      totalTime: cappedTime
    }

    // Get automated activities (activities with workers assigned)
    if (!savedState.workers || !savedState.workers.assignments) {
      result.totalTime = 0
      return result
    }

    const workerAssignments = savedState.workers.assignments
    const automatedActivityIds = Object.keys(workerAssignments).filter(
      activityId => Object.values(workerAssignments[activityId] || {}).some(count => count > 0)
    )

    if (automatedActivityIds.length === 0) {
      result.totalTime = 0
      return result
    }

    // Create a temporary resource state to track resources
    const tempResources = { ...(savedState.resources || savedState.currencies) }

    // Simulate time passing - find smallest duration to advance time in chunks
    let simulatedTime = 0

    while (simulatedTime < cappedTime) {
      // Find the shortest activity duration
      let shortestDuration = Infinity
      for (const activityId of automatedActivityIds) {
        const activity = this.activityManager.activityDefinitions.find(a => a.id === activityId)
        if (activity) {
          shortestDuration = Math.min(shortestDuration, activity.duration * 1000)
        }
      }

      // If no valid activities found, break
      if (shortestDuration === Infinity) break

      // Check if we have enough time remaining
      if (simulatedTime + shortestDuration > cappedTime) break

      let anyActivityCompleted = false

      // Try to complete each automated activity that has finished
      for (const activityId of automatedActivityIds) {
        const activity = this.activityManager.activityDefinitions.find(a => a.id === activityId)

        if (!activity) continue

        // Check if this activity duration matches or is less than the time chunk
        const activityDuration = activity.duration * 1000
        if (activityDuration > shortestDuration) continue

        // Check if we can afford the inputs
        let canAfford = true
        for (const [resourceId, amount] of Object.entries(activity.inputs)) {
          if ((tempResources[resourceId] || 0) < amount) {
            canAfford = false
            break
          }
        }

        if (!canAfford) continue

        // Check level requirement
        const skillState = savedState.skills[activity.skillId]
        if (!skillState) continue

        const skillLevel = levelFromXP(skillState.xp)
        if (skillLevel < activity.levelRequired) continue

        // Can complete this activity!
        anyActivityCompleted = true

        // Consume inputs
        for (const [resourceId, amount] of Object.entries(activity.inputs)) {
          tempResources[resourceId] = (tempResources[resourceId] || 0) - amount
        }

        // Grant outputs
        for (const [resourceId, amount] of Object.entries(activity.outputs)) {
          tempResources[resourceId] = (tempResources[resourceId] || 0) + amount
          result.resourcesEarned[resourceId] = (result.resourcesEarned[resourceId] || 0) + amount
        }

        // Grant XP
        result.xpEarned[activity.skillId] = (result.xpEarned[activity.skillId] || 0) + activity.xpGained

        // Record completion
        const existing = result.activitiesCompleted.find(a => a.activityId === activity.id)
        if (existing) {
          existing.completions++
        } else {
          result.activitiesCompleted.push({
            activityId: activity.id,
            completions: 1
          })
        }
      }

      // Advance time by shortest duration
      simulatedTime += shortestDuration

      // If no activities could be completed, break the loop
      if (!anyActivityCompleted) {
        break
      }
    }

    return result
  }

  /**
   * Apply offline progress to the game state
   * @param {Object} offlineResult - Result from calculateOfflineProgress
   */
  applyOfflineProgress(offlineResult) {
    // Apply resources
    for (const [resourceId, amount] of Object.entries(offlineResult.resourcesEarned)) {
      this.resourceManager.add(resourceId, amount)
    }

    // Apply XP
    for (const [skillId, xp] of Object.entries(offlineResult.xpEarned)) {
      this.skillManager.addXP(skillId, xp)
    }

    // Emit event
    this.eventBus.emit('game:offlineProgress', offlineResult)
  }

}
