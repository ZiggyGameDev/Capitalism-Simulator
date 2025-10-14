/**
 * Manages time-based activities
 * Handles starting, updating, completing, and auto-mode
 */
export class ActivityManager {
  constructor(activityDefinitions, currencyManager, skillManager, eventBus) {
    this.activityDefinitions = activityDefinitions || []
    this.currencyManager = currencyManager
    this.skillManager = skillManager
    this.eventBus = eventBus
    this.activeActivities = new Map()
  }

  /**
   * Check if an activity can be started
   * @param {string} activityId - Activity identifier
   * @returns {boolean} True if can start
   */
  canStart(activityId) {
    const activity = this.activityDefinitions.find(a => a.id === activityId)
    if (!activity) return false

    // Check if already running
    if (this.activeActivities.has(activityId)) return false

    // Check level requirement
    if (!this.skillManager.isActivityUnlocked(activityId)) return false

    // Check currency requirements
    if (!this.currencyManager.canAfford(activity.inputs || {})) return false

    return true
  }

  /**
   * Start an activity
   * @param {string} activityId - Activity identifier
   * @param {Object} options - Options like {autoMode: true}
   */
  start(activityId, options = {}) {
    if (!this.canStart(activityId)) {
      throw new Error(`Cannot start activity: ${activityId}`)
    }

    const activity = this.activityDefinitions.find(a => a.id === activityId)
    const now = Date.now()

    this.activeActivities.set(activityId, {
      activityId,
      startTime: now,
      duration: activity.duration * 1000,  // Convert to ms
      progress: 0,
      autoMode: options.autoMode || false
    })

    if (this.eventBus) {
      this.eventBus.emit('activity:started', {
        activityId,
        skillId: activity.skillId
      })
    }
  }

  /**
   * Update all active activities
   * @param {number} deltaTime - Time elapsed in ms
   */
  update(deltaTime) {
    const completed = []

    // Update all activities
    for (const [activityId, state] of this.activeActivities.entries()) {
      const elapsed = state.progress * state.duration + deltaTime
      const newProgress = elapsed / state.duration

      if (newProgress >= 1) {
        // Activity completed
        completed.push(activityId)
      } else {
        state.progress = newProgress
      }
    }

    // Complete all finished activities
    completed.forEach(activityId => {
      this._completeActivity(activityId)
    })
  }

  /**
   * Complete an activity (internal)
   * @private
   */
  _completeActivity(activityId) {
    const activity = this.activityDefinitions.find(a => a.id === activityId)
    const state = this.activeActivities.get(activityId)

    // Consume inputs
    this.currencyManager.spendCosts(activity.inputs || {})

    // Grant outputs
    Object.entries(activity.outputs || {}).forEach(([currencyId, amount]) => {
      this.currencyManager.add(currencyId, amount)
    })

    // Grant XP
    this.skillManager.addXP(activity.skillId, activity.xpGained)

    // Emit completion event
    if (this.eventBus) {
      this.eventBus.emit('activity:completed', {
        activityId,
        outputs: activity.outputs,
        xpGained: activity.xpGained,
        skillId: activity.skillId
      })
    }

    // Remove from active
    this.activeActivities.delete(activityId)

    // Restart if auto-mode and can afford
    if (state.autoMode && this.canStart(activityId)) {
      this.start(activityId, { autoMode: true })
    }
  }

  /**
   * Get progress of an activity (0-1)
   * @param {string} activityId - Activity identifier
   * @returns {number} Progress (0-1)
   */
  getProgress(activityId) {
    const state = this.activeActivities.get(activityId)
    if (!state) return 0
    return Math.min(1, state.progress)
  }

  /**
   * Get all active activities
   * @returns {Array} Active activities
   */
  getActiveActivities() {
    return Array.from(this.activeActivities.values())
  }

  /**
   * Stop an activity
   * @param {string} activityId - Activity identifier
   */
  stopActivity(activityId) {
    const state = this.activeActivities.get(activityId)
    if (!state) return

    if (this.eventBus) {
      this.eventBus.emit('activity:stopped', {
        activityId,
        progress: state.progress
      })
    }

    this.activeActivities.delete(activityId)
  }

  /**
   * Set auto-mode for an activity
   * @param {string} activityId - Activity identifier
   * @param {boolean} enabled - Enable/disable auto-mode
   */
  setAutoMode(activityId, enabled) {
    const state = this.activeActivities.get(activityId)
    if (state) {
      state.autoMode = enabled
    }
  }

  /**
   * Reset all activities
   */
  reset() {
    this.activeActivities.clear()
  }

  /**
   * Get activity definition
   * @param {string} activityId - Activity identifier
   * @returns {Object} Activity definition
   */
  getActivityInfo(activityId) {
    const activity = this.activityDefinitions.find(a => a.id === activityId)
    return activity || null
  }
}
