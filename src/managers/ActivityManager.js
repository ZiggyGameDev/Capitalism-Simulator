/**
 * Manages time-based activities
 * Handles starting, updating, completing, and auto-mode
 */
export class ActivityManager {
  constructor(activityDefinitions, currencyManager, skillManager, eventBus, upgradeManager = null, workerManager = null) {
    this.activityDefinitions = activityDefinitions || []
    this.currencyManager = currencyManager
    this.skillManager = skillManager
    this.eventBus = eventBus
    this.upgradeManager = upgradeManager
    this.workerManager = workerManager
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

    // Check currency requirements (with cost reduction applied)
    const effectiveInputs = this.getEffectiveInputs(activityId)
    if (!this.currencyManager.canAfford(effectiveInputs)) return false

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

    // Use effective duration (with speed upgrades)
    const effectiveDuration = this.getEffectiveDuration(activityId)

    this.activeActivities.set(activityId, {
      activityId,
      startTime: now,
      duration: effectiveDuration * 1000,  // Convert to ms
      progress: 0,
      autoMode: options.autoMode !== undefined ? options.autoMode : true  // Auto-mode ON by default
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
        // Set progress to exactly 1 so UI shows 100% before completing
        state.progress = 1
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

    // Get effective inputs and outputs (with upgrades)
    const effectiveInputs = this.getEffectiveInputs(activityId)
    const effectiveOutputs = this.getEffectiveOutputs(activityId)

    // Consume inputs (with cost reduction applied)
    this.currencyManager.spendCosts(effectiveInputs)

    // Grant outputs (with bonuses applied)
    Object.entries(effectiveOutputs).forEach(([currencyId, amount]) => {
      this.currencyManager.add(currencyId, amount)
    })

    // Grant XP
    this.skillManager.addXP(activity.skillId, activity.xpGained)

    // Emit completion event
    if (this.eventBus) {
      this.eventBus.emit('activity:completed', {
        activityId,
        outputs: effectiveOutputs,
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

  /**
   * Get effective duration with speed upgrades and worker automation applied
   * @param {string} activityId - Activity identifier
   * @returns {number} Effective duration in seconds
   */
  getEffectiveDuration(activityId) {
    const activity = this.activityDefinitions.find(a => a.id === activityId)
    if (!activity) return 0

    let duration = activity.duration

    // Apply upgrade speed multiplier (faster = lower duration)
    if (this.upgradeManager) {
      const speedMultiplier = this.upgradeManager.getSpeedMultiplier(activityId)
      duration = duration * speedMultiplier
    }

    // Apply worker speed multiplier (workers slower = higher duration)
    if (this.workerManager) {
      const workerSpeedMultiplier = this.workerManager.getSpeedMultiplier(activityId)
      duration = duration / workerSpeedMultiplier
    }

    return duration
  }

  /**
   * Get effective input costs with cost reduction applied
   * @param {string} activityId - Activity identifier
   * @returns {Object} Effective input costs
   */
  getEffectiveInputs(activityId) {
    const activity = this.activityDefinitions.find(a => a.id === activityId)
    if (!activity) return {}

    let inputs = { ...activity.inputs }

    if (this.upgradeManager) {
      const costReduction = this.upgradeManager.getCostReduction(activityId)
      if (costReduction > 0) {
        for (const [currencyId, amount] of Object.entries(inputs)) {
          inputs[currencyId] = Math.max(0, Math.floor(amount * (1 - costReduction)))
        }
      }
    }

    return inputs
  }

  /**
   * Get effective outputs with bonuses applied
   * @param {string} activityId - Activity identifier
   * @returns {Object} Effective outputs
   */
  getEffectiveOutputs(activityId) {
    const activity = this.activityDefinitions.find(a => a.id === activityId)
    if (!activity) return {}

    let outputs = { ...activity.outputs }

    if (this.upgradeManager) {
      const outputBonus = this.upgradeManager.getOutputBonus(activityId)
      for (const [currencyId, bonusAmount] of Object.entries(outputBonus)) {
        outputs[currencyId] = (outputs[currencyId] || 0) + bonusAmount
      }
    }

    return outputs
  }
}
