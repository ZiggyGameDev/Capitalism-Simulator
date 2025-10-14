/**
 * Manages time-based activities
 * Activities run ONLY when workers are assigned (no manual clicking)
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
   * Check if an activity can run (has workers and can afford inputs)
   * @param {string} activityId - Activity identifier
   * @returns {boolean} True if can run
   */
  canRun(activityId) {
    const activity = this.activityDefinitions.find(a => a.id === activityId)
    if (!activity) return false

    // Must have workers assigned
    if (!this.workerManager || !this.workerManager.isAutomated(activityId)) {
      return false
    }

    // Check level requirement
    if (!this.skillManager.isActivityUnlocked(activityId)) return false

    // Check currency requirements (with cost reduction applied)
    const effectiveInputs = this.getEffectiveInputs(activityId)
    if (!this.currencyManager.canAfford(effectiveInputs)) return false

    return true
  }

  /**
   * Update all active activities
   * Auto-starts activities that have workers assigned
   * @param {number} deltaTime - Time elapsed in ms
   */
  update(deltaTime) {
    // Start any activities that have workers but aren't running
    if (this.workerManager) {
      const allActivityIds = this.activityDefinitions.map(a => a.id)
      for (const activityId of allActivityIds) {
        if (this.workerManager.isAutomated(activityId)) {
          if (!this.activeActivities.has(activityId) && this.canRun(activityId)) {
            this._startActivity(activityId)
          }
        }
      }
    }

    const completed = []

    // Update all activities
    for (const [activityId, state] of this.activeActivities.entries()) {
      // Check if activity should still be running
      if (!this.canRun(activityId)) {
        // Stop if workers were unassigned or can't afford
        this._stopActivity(activityId)
        continue
      }

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
   * Start an activity (internal - called automatically when workers assigned)
   * @private
   */
  _startActivity(activityId) {
    if (this.activeActivities.has(activityId)) return

    const activity = this.activityDefinitions.find(a => a.id === activityId)
    if (!activity) return

    const now = Date.now()

    // Use effective duration (with worker speed and upgrades)
    const effectiveDuration = this.getEffectiveDuration(activityId)

    // If duration is 0 or Infinity, don't start
    if (effectiveDuration === 0 || !isFinite(effectiveDuration)) {
      return
    }

    this.activeActivities.set(activityId, {
      activityId,
      startTime: now,
      duration: effectiveDuration * 1000,  // Convert to ms
      progress: 0
    })

    if (this.eventBus) {
      this.eventBus.emit('activity:started', {
        activityId,
        skillId: activity.skillId
      })
    }
  }

  /**
   * Stop an activity (internal)
   * @private
   */
  _stopActivity(activityId) {
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

    // Consume speed boost resources
    if (this.workerManager) {
      this.workerManager.consumeSpeedBoosts(activityId)
    }

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

    // Will auto-restart on next update if workers still assigned and can afford
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

    // Apply worker speed multiplier (workers = inverted to get duration)
    if (this.workerManager) {
      const workerSpeedMultiplier = this.workerManager.getSpeedMultiplier(activityId, activity.skillId)
      if (workerSpeedMultiplier === 0) {
        return Infinity  // No workers = infinite duration (doesn't run)
      }
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
