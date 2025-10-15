/**
 * Manages all resource amounts in the game
 * Resources are just numbers - no inventory complexity
 */
export class ResourceManager {
  constructor(eventBus = null) {
    this.resources = {}
    this.eventBus = eventBus
    this.baseStorageLimit = 100 // Default storage limit for all resources
    this.storageBonuses = {} // Additional storage from buildings
  }

  /**
   * Get storage limit for a resource
   * @param {string} resourceId - Resource identifier
   * @returns {number} Storage limit
   */
  getStorageLimit(resourceId) {
    const bonus = this.storageBonuses[resourceId] || 0
    return this.baseStorageLimit + bonus
  }

  /**
   * Add storage bonus for a resource
   * @param {string} resourceId - Resource identifier
   * @param {number} amount - Bonus amount to add
   */
  addStorageBonus(resourceId, amount) {
    this.storageBonuses[resourceId] = (this.storageBonuses[resourceId] || 0) + amount

    if (this.eventBus) {
      this.eventBus.emit('storage:changed', { resourceId, limit: this.getStorageLimit(resourceId) })
    }
  }

  /**
   * Check if resource is at storage limit
   * @param {string} resourceId - Resource identifier
   * @returns {boolean} True if at limit
   */
  isAtStorageLimit(resourceId) {
    return this.get(resourceId) >= this.getStorageLimit(resourceId)
  }

  /**
   * Get storage info for display
   * @param {string} resourceId - Resource identifier
   * @returns {Object} {current, max, percentage}
   */
  getStorageInfo(resourceId) {
    const current = this.get(resourceId)
    const max = this.getStorageLimit(resourceId)
    return {
      current,
      max,
      percentage: max > 0 ? (current / max) * 100 : 0
    }
  }

  /**
   * Add resource (can be negative to subtract)
   * @param {string} resourceId - Resource identifier
   * @param {number} amount - Amount to add
   * @returns {number} Amount actually added (may be less due to storage limit)
   */
  add(resourceId, amount) {
    const current = this.resources[resourceId] || 0
    const storageLimit = this.getStorageLimit(resourceId)
    const newAmount = current + amount

    // Cap at storage limit when adding positive amounts
    const cappedAmount = amount > 0
      ? Math.min(newAmount, storageLimit)
      : Math.max(0, newAmount)

    const actualAdded = cappedAmount - current
    this.resources[resourceId] = cappedAmount

    if (this.eventBus) {
      this.eventBus.emit('resource:changed', { resourceId, amount: this.resources[resourceId] })
    }

    return actualAdded
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
   * Get state for saving
   * @returns {Object} State object
   */
  getState() {
    return {
      resources: { ...this.resources },
      storageBonuses: { ...this.storageBonuses }
    }
  }

  /**
   * Load state from save
   * @param {Object} state - State object
   */
  loadState(state) {
    if (state.resources) {
      this.resources = { ...state.resources }
    }
    if (state.storageBonuses) {
      this.storageBonuses = { ...state.storageBonuses }
    }
  }

  /**
   * Reset all resources and storage bonuses
   */
  reset() {
    this.resources = {}
    this.storageBonuses = {}
  }
}
