/**
 * Manages workers - automation that replaces human labor
 * Workers run activities at half speed automatically
 */
export class WorkerManager {
  constructor(eventBus) {
    this.eventBus = eventBus
    this.totalWorkers = 0
    this.assignments = {} // { activityId: workerCount }
  }

  /**
   * Add workers to total pool
   */
  addWorkers(amount) {
    this.totalWorkers += amount

    if (this.eventBus) {
      this.eventBus.emit('worker:added', {
        amount,
        totalWorkers: this.totalWorkers
      })
    }
  }

  /**
   * Get available unassigned workers
   */
  getAvailableWorkers() {
    const assigned = Object.values(this.assignments).reduce((sum, count) => sum + count, 0)
    return this.totalWorkers - assigned
  }

  /**
   * Check if can assign workers to activity
   */
  canAssign(activityId, workers) {
    const currentAssignment = this.assignments[activityId] || 0
    const available = this.getAvailableWorkers() + currentAssignment
    return available >= workers
  }

  /**
   * Assign workers to activity
   */
  assign(activityId, workers) {
    if (!this.canAssign(activityId, workers)) {
      throw new Error('Not enough available workers')
    }

    this.assignments[activityId] = workers

    if (this.eventBus) {
      this.eventBus.emit('worker:assigned', {
        activityId,
        workers
      })
    }
  }

  /**
   * Unassign workers from activity
   */
  unassign(activityId) {
    delete this.assignments[activityId]

    if (this.eventBus) {
      this.eventBus.emit('worker:unassigned', {
        activityId
      })
    }
  }

  /**
   * Get workers assigned to activity
   */
  getAssignment(activityId) {
    return this.assignments[activityId] || 0
  }

  /**
   * Get speed multiplier for activity based on number of workers assigned
   * More workers = faster (but still slower than manual)
   * 1 worker = 0.2x speed (5x slower than manual)
   * 10 workers = 0.67x speed (1.5x slower than manual)
   * Formula: 0.2 + 0.5 * log10(workers), capped at 0.67
   */
  getSpeedMultiplier(activityId) {
    const workerCount = this.assignments[activityId] || 0

    if (workerCount === 0) {
      return 1  // No workers = normal manual speed
    }

    // Logarithmic scaling: starts at 0.2 (very slow) and increases to 0.67 (less slow)
    const speedMultiplier = Math.min(0.67, 0.2 + 0.5 * Math.log10(workerCount))
    return speedMultiplier
  }

  /**
   * Check if activity is automated by workers
   */
  isAutomated(activityId) {
    return (this.assignments[activityId] || 0) > 0
  }

  /**
   * Get state for saving
   */
  getState() {
    return {
      totalWorkers: this.totalWorkers,
      assignments: { ...this.assignments }
    }
  }

  /**
   * Load state
   */
  loadState(state) {
    if (state.totalWorkers !== undefined) {
      this.totalWorkers = state.totalWorkers
    }
    if (state.assignments) {
      this.assignments = { ...state.assignments }
    }
  }

  /**
   * Reset all workers
   */
  reset() {
    this.totalWorkers = 0
    this.assignments = {}
  }
}
