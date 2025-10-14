import { EventBus } from './EventBus.js'
import { CurrencyManager } from '../managers/CurrencyManager.js'
import { SkillManager } from '../managers/SkillManager.js'
import { ActivityManager } from '../managers/ActivityManager.js'

/**
 * Main game engine - coordinates all systems
 */
export class GameEngine {
  constructor(skillDefinitions, activityDefinitions) {
    this.eventBus = new EventBus()
    this.currencyManager = new CurrencyManager()
    this.skillManager = new SkillManager(skillDefinitions, activityDefinitions, this.eventBus)
    this.activityManager = new ActivityManager(activityDefinitions, this.currencyManager, this.skillManager, this.eventBus)

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
      }))
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
  }
}
