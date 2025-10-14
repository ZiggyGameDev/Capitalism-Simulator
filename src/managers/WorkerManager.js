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
   * Get speed multiplier for activity (workers run at half speed)
   */
  getSpeedMultiplier(activityId) {
    return this.isAutomated(activityId) ? 0.5 : 1
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
