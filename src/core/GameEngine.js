import { EventBus } from './EventBus.js'
import { CurrencyManager } from '../managers/CurrencyManager.js'
import { SkillManager } from '../managers/SkillManager.js'
import { ActivityManager } from '../managers/ActivityManager.js'
import { UpgradeManager } from '../managers/UpgradeManager.js'
import { levelFromXP } from '../utils/calculations.js'

/**
 * Main game engine - coordinates all systems
 */
export class GameEngine {
  constructor(skillDefinitions, activityDefinitions, upgradeDefinitions = []) {
    this.eventBus = new EventBus()
    this.currencyManager = new CurrencyManager()
    this.skillManager = new SkillManager(skillDefinitions, activityDefinitions, this.eventBus)
    this.upgradeManager = new UpgradeManager(upgradeDefinitions, this.currencyManager, this.skillManager, this.eventBus)
    this.activityManager = new ActivityManager(activityDefinitions, this.currencyManager, this.skillManager, this.eventBus, this.upgradeManager)

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
    // Update activities (most important)
    this.activityManager.update(deltaTime)

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
      currencies: this.currencyManager.getAll(),
      skills: this.skillManager.getAllSkills(),
      activeActivities: this.activityManager.getActiveActivities().map(a => ({
        activityId: a.activityId,
        autoMode: a.autoMode
      })),
      upgrades: this.upgradeManager.getState(),
      lastSaveTime: Date.now()
    }
  }

  /**
   * Load game state
   * @param {Object} state - Game state
   */
  loadState(state) {
    // Load currencies
    if (state.currencies) {
      Object.entries(state.currencies).forEach(([id, amount]) => {
        this.currencyManager.set(id, amount)
      })
    }

    // Load skills
    if (state.skills) {
      Object.entries(state.skills).forEach(([id, skillState]) => {
        if (skillState.xp) {
          this.skillManager.addXP(id, skillState.xp)
        }
      })
    }

    // Load upgrades
    if (state.upgrades) {
      this.upgradeManager.loadState(state.upgrades)
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

    // Restart auto-activities
    if (state.activeActivities) {
      state.activeActivities.forEach(activity => {
        if (activity.autoMode && this.activityManager.canStart(activity.activityId)) {
          this.activityManager.start(activity.activityId, { autoMode: true })
        }
      })
    }
  }

  /**
   * Reset the game
   */
  reset() {
    this.currencyManager.reset()
    this.skillManager.reset()
    this.activityManager.reset()
    this.upgradeManager.reset()
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
      currenciesEarned: {},
      xpEarned: {},
      totalTime: cappedTime
    }

    // If no auto-activities, return empty result
    if (!savedState.activeActivities || savedState.activeActivities.length === 0) {
      result.totalTime = 0
      return result
    }

    // Create a temporary currency state to track resources
    const tempCurrencies = { ...savedState.currencies }

    // Get auto-activities
    const autoActivities = savedState.activeActivities.filter(a => a.autoMode)

    if (autoActivities.length === 0) {
      result.totalTime = 0
      return result
    }

    // Simulate time passing - find smallest duration to advance time in chunks
    let simulatedTime = 0

    while (simulatedTime < cappedTime) {
      // Find the shortest activity duration
      let shortestDuration = Infinity
      for (const activityState of autoActivities) {
        const activity = this.activityManager.activityDefinitions.find(a => a.id === activityState.activityId)
        if (activity) {
          shortestDuration = Math.min(shortestDuration, activity.duration * 1000)
        }
      }

      // If no valid activities found, break
      if (shortestDuration === Infinity) break

      // Check if we have enough time remaining
      if (simulatedTime + shortestDuration > cappedTime) break

      let anyActivityCompleted = false

      // Try to complete each auto-activity that has finished
      for (const activityState of autoActivities) {
        const activity = this.activityManager.activityDefinitions.find(a => a.id === activityState.activityId)

        if (!activity) continue

        // Check if this activity duration matches or is less than the time chunk
        const activityDuration = activity.duration * 1000
        if (activityDuration > shortestDuration) continue

        // Check if we can afford the inputs
        let canAfford = true
        for (const [currencyId, amount] of Object.entries(activity.inputs)) {
          if ((tempCurrencies[currencyId] || 0) < amount) {
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
        for (const [currencyId, amount] of Object.entries(activity.inputs)) {
          tempCurrencies[currencyId] = (tempCurrencies[currencyId] || 0) - amount
        }

        // Grant outputs
        for (const [currencyId, amount] of Object.entries(activity.outputs)) {
          tempCurrencies[currencyId] = (tempCurrencies[currencyId] || 0) + amount
          result.currenciesEarned[currencyId] = (result.currenciesEarned[currencyId] || 0) + amount
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
    // Apply currencies
    for (const [currencyId, amount] of Object.entries(offlineResult.currenciesEarned)) {
      this.currencyManager.add(currencyId, amount)
    }

    // Apply XP
    for (const [skillId, xp] of Object.entries(offlineResult.xpEarned)) {
      this.skillManager.addXP(skillId, xp)
    }

    // Emit event
    this.eventBus.emit('game:offlineProgress', offlineResult)
  }
}
