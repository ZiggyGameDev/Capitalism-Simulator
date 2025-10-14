/**
 * Manages all resource amounts in the game
 * Resources are just numbers - no inventory complexity
 */
export class ResourceManager {
  constructor(eventBus = null) {
    this.resources = {}
    this.eventBus = eventBus
  }

  /**
   * Add resource (can be negative to subtract)
   * @param {string} resourceId - Resource identifier
   * @param {number} amount - Amount to add
   */
  add(resourceId, amount) {
    const current = this.resources[resourceId] || 0
    const newAmount = current + amount
    this.resources[resourceId] = Math.max(0, newAmount)  // Never go below 0

    if (this.eventBus) {
      this.eventBus.emit('resource:changed', { resourceId, amount: this.resources[resourceId] })
    }
  }

  /**
   * Subtract resource (returns success)
   * @param {string} resourceId - Resource identifier
   * @param {number} amount - Amount to subtract
   * @returns {boolean} True if successful, false if insufficient funds
   */
  subtract(resourceId, amount) {
    if (!this.has(resourceId, amount)) {
      return false
    }
    this.resources[resourceId] -= amount

    if (this.eventBus) {
      this.eventBus.emit('resource:changed', { resourceId, amount: this.resources[resourceId] })
    }
    return true
  }

  /**
   * Set resource to exact amount
   * @param {string} resourceId - Resource identifier
   * @param {number} amount - Exact amount
   */
  set(resourceId, amount) {
    this.resources[resourceId] = Math.max(0, amount)

    if (this.eventBus) {
      this.eventBus.emit('resource:changed', { resourceId, amount: this.resources[resourceId] })
    }
  }

  /**
   * Get current amount of resource
   * @param {string} resourceId - Resource identifier
   * @returns {number} Current amount (0 if doesn't exist)
   */
  get(resourceId) {
    return this.resources[resourceId] || 0
  }

  /**
   * Check if player has enough of a resource
   * @param {string} resourceId - Resource identifier
   * @param {number} amount - Amount needed
   * @returns {boolean} True if player has enough
   */
  has(resourceId, amount) {
    return this.get(resourceId) >= amount
  }

  /**
   * Check if player can afford multiple resource costs
   * @param {Object} costs - Object like {wood: 5, stone: 2}
   * @returns {boolean} True if can afford all costs
   */
  canAfford(costs) {
    return Object.entries(costs).every(([resourceId, amount]) => {
      return this.has(resourceId, amount)
    })
  }

  /**
   * Spend multiple resources at once (atomic operation)
   * @param {Object} costs - Object like {wood: 5, stone: 2}
   * @returns {boolean} True if successful, false if couldn't afford
   */
  spendCosts(costs) {
    if (!this.canAfford(costs)) {
      return false
    }

    Object.entries(costs).forEach(([resourceId, amount]) => {
      this.subtract(resourceId, amount)
    })

    return true
  }

  /**
   * Get all resources
   * @returns {Object} All resources
   */
  getAll() {
    return { ...this.resources }
  }

  /**
   * Reset all resources
   */
  reset() {
    this.resources = {}
  }
}
