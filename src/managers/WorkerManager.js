import { workerTypes, speedBoosts } from '../data/workerTypes.js'

/**
 * Manages workers - automation that runs activities automatically
 * Supports multiple worker types with different speeds
 * Supports speed boosts from consumable resources
 */
export class WorkerManager {
  constructor(eventBus, currencyManager = null) {
    this.eventBus = eventBus
    this.currencyManager = currencyManager
    this.workerTypes = workerTypes
    this.speedBoosts = speedBoosts

    // { activityId: { workerTypeId: count } }
    this.assignments = {}

    // Active speed boosts { activityId: [boostIds] }
    this.activeBoosts = {}
  }

  /**
   * Get available workers of a specific type
   */
  getAvailableWorkers(workerTypeId) {
    if (!this.currencyManager) return 0

    const total = this.currencyManager.get(workerTypeId)
    const assigned = this.getAssignedWorkers(workerTypeId)
    return total - assigned
  }

  /**
   * Get total assigned workers of a specific type across all activities
   */
  getAssignedWorkers(workerTypeId) {
    let total = 0
    for (const activityAssignments of Object.values(this.assignments)) {
      total += activityAssignments[workerTypeId] || 0
    }
    return total
  }

  /**
   * Check if can assign workers to activity
   */
  canAssign(activityId, workerTypeId, count) {
    const currentAssignment = this.getAssignment(activityId, workerTypeId)
    const available = this.getAvailableWorkers(workerTypeId) + currentAssignment
    return available >= count
  }

  /**
   * Assign workers to activity
   */
  assign(activityId, workerTypeId, count) {
    if (count === 0) {
      // Unassign if count is 0
      this.unassign(activityId, workerTypeId)
      return
    }

    if (!this.canAssign(activityId, workerTypeId, count)) {
      throw new Error(`Not enough available workers of type ${workerTypeId}`)
    }

    if (!this.assignments[activityId]) {
      this.assignments[activityId] = {}
    }

    this.assignments[activityId][workerTypeId] = count

    if (this.eventBus) {
      this.eventBus.emit('worker:assigned', {
        activityId,
        workerTypeId,
        count
      })
    }
  }

  /**
   * Unassign workers from activity
   */
  unassign(activityId, workerTypeId) {
    if (!this.assignments[activityId]) return

    delete this.assignments[activityId][workerTypeId]

    // Clean up empty activity assignments
    if (Object.keys(this.assignments[activityId]).length === 0) {
      delete this.assignments[activityId]
    }

    if (this.eventBus) {
      this.eventBus.emit('worker:unassigned', {
        activityId,
        workerTypeId
      })
    }
  }

  /**
   * Unassign all workers from activity
   */
  unassignAll(activityId) {
    if (!this.assignments[activityId]) return

    const workerTypeIds = Object.keys(this.assignments[activityId])
    workerTypeIds.forEach(workerTypeId => {
      this.unassign(activityId, workerTypeId)
    })
  }

  /**
   * Get workers assigned to activity for a specific type
   */
  getAssignment(activityId, workerTypeId) {
    return this.assignments[activityId]?.[workerTypeId] || 0
  }

  /**
   * Get all assignments for an activity
   */
  getActivityAssignments(activityId) {
    return this.assignments[activityId] || {}
  }

  /**
   * Get speed multiplier for activity based on assigned workers and boosts
   * Returns the BEST speed among all assigned worker types (they work in parallel)
   */
  getSpeedMultiplier(activityId, activitySkillId = null) {
    const assignments = this.assignments[activityId]
    if (!assignments || Object.keys(assignments).length === 0) {
      return 0  // No workers = no speed (activity doesn't run)
    }

    // Calculate speed for each worker type and take the best
    let bestSpeed = 0

    for (const [workerTypeId, count] of Object.entries(assignments)) {
      const workerType = this.workerTypes.find(wt => wt.id === workerTypeId)
      if (!workerType || count === 0) continue

      // Base speed from worker type
      let speed = workerType.baseSpeed

      // Bonus for specific activities (e.g., tractor on farming)
      if (workerType.bonusActivities && activitySkillId) {
        if (workerType.bonusActivities.includes(activitySkillId)) {
          speed *= 1.5  // 50% bonus
        }
      }

      // Diminishing returns for multiple workers of same type
      // Formula: baseSpeed * (1 + scalingBonus)
      // Uses log10 with reduced scaling and caps out
      if (count > 1) {
        // Reduced scaling factor (0.15 instead of 0.3) for stronger diminishing returns
        // Examples with 0.2 baseSpeed:
        // 1 worker: 0.2 (baseline)
        // 5 workers: 0.2 * 1.105 = 0.221 (+10.5%)
        // 10 workers: 0.2 * 1.15 = 0.23 (+15%)
        // 50 workers: 0.2 * 1.255 = 0.251 (+25.5%)
        // 100 workers: 0.2 * 1.3 = 0.26 (+30%)
        const scalingBonus = Math.min(0.4, 0.15 * Math.log10(count))  // Cap at +40%
        speed *= (1 + scalingBonus)
      }

      // Apply active speed boosts
      speed *= this.getSpeedBoostMultiplier(activityId, workerTypeId)

      bestSpeed = Math.max(bestSpeed, speed)
    }

    // Cap at 1.0 (never faster than manual)
    return Math.min(1.0, bestSpeed)
  }

  /**
   * Get speed boost multiplier from active boosts
   */
  getSpeedBoostMultiplier(activityId, workerTypeId) {
    if (!this.currencyManager) return 1.0

    let multiplier = 1.0

    // Check each speed boost
    for (const boost of this.speedBoosts) {
      // Check if this boost affects this worker type
      if (!boost.workerTypes.includes(workerTypeId)) continue

      // Check if we have the resource
      if (this.currencyManager.get(boost.id) > 0) {
        multiplier += boost.speedBonus
      }
    }

    return multiplier
  }

  /**
   * Consume speed boost resources for an activity completion
   */
  consumeSpeedBoosts(activityId) {
    if (!this.currencyManager) return

    const assignments = this.assignments[activityId]
    if (!assignments) return

    // Find which boosts are active
    const activeBoosts = new Set()
    for (const workerTypeId of Object.keys(assignments)) {
      for (const boost of this.speedBoosts) {
        if (boost.workerTypes.includes(workerTypeId)) {
          if (this.currencyManager.get(boost.id) > 0) {
            activeBoosts.add(boost.id)
          }
        }
      }
    }

    // Consume each active boost
    for (const boostId of activeBoosts) {
      const boost = this.speedBoosts.find(b => b.id === boostId)
      if (boost) {
        const currentAmount = this.currencyManager.get(boostId)
        const consumeAmount = Math.min(boost.consumptionRate, currentAmount)
        this.currencyManager.subtract(boostId, consumeAmount)
      }
    }
  }

  /**
   * Check if activity is automated by workers
   */
  isAutomated(activityId) {
    const assignments = this.assignments[activityId]
    if (!assignments) return false
    return Object.values(assignments).some(count => count > 0)
  }

  /**
   * Get state for saving
   */
  getState() {
    return {
      assignments: JSON.parse(JSON.stringify(this.assignments))
    }
  }

  /**
   * Load state
   */
  loadState(state) {
    if (state.assignments) {
      this.assignments = JSON.parse(JSON.stringify(state.assignments))
    }
  }

  /**
   * Reset all workers
   */
  reset() {
    this.assignments = {}
    this.activeBoosts = {}
  }
}
