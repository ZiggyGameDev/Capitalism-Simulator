/**
 * Manages upgrade purchases and effects
 */
export class UpgradeManager {
  constructor(upgradeDefinitions, resourceManager, skillManager, eventBus) {
    this.upgradeDefinitions = upgradeDefinitions || []
    this.resourceManager = resourceManager
    this.skillManager = skillManager
    this.eventBus = eventBus
    this.purchased = []
  }

  /**
   * Check if an upgrade can be purchased
   * @param {string} upgradeId - Upgrade identifier
   * @returns {boolean} True if can purchase
   */
  canPurchase(upgradeId) {
    const upgrade = this.upgradeDefinitions.find(u => u.id === upgradeId)
    if (!upgrade) return false

    // Check if already purchased
    if (this.purchased.includes(upgradeId)) return false

    // Check prerequisite
    if (upgrade.prerequisite && !this.purchased.includes(upgrade.prerequisite)) {
      return false
    }

    // Check resource costs
    for (const [resourceId, amount] of Object.entries(upgrade.cost)) {
      if (this.resourceManager.get(resourceId) < amount) {
        return false
      }
    }

    // Check skill requirements
    for (const [skillId, levelRequired] of Object.entries(upgrade.skillRequired)) {
      const currentLevel = this.skillManager.getLevel(skillId)
      if (currentLevel < levelRequired) {
        return false
      }
    }

    return true
  }

  /**
   * Purchase an upgrade
   * @param {string} upgradeId - Upgrade identifier
   */
  purchase(upgradeId) {
    if (!this.canPurchase(upgradeId)) {
      throw new Error('Cannot purchase upgrade')
    }

    const upgrade = this.upgradeDefinitions.find(u => u.id === upgradeId)

    // Deduct costs
    for (const [resourceId, amount] of Object.entries(upgrade.cost)) {
      this.resourceManager.subtract(resourceId, amount)
    }

    // Add to purchased list
    this.purchased.push(upgradeId)

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('upgrade:purchased', {
        upgradeId,
        upgrade
      })
    }
  }

  /**
   * Check if an upgrade is purchased
   * @param {string} upgradeId - Upgrade identifier
   * @returns {boolean} True if purchased
   */
  isPurchased(upgradeId) {
    return this.purchased.includes(upgradeId)
  }

  /**
   * Get all upgrades for a specific activity
   * @param {string} activityId - Activity identifier
   * @returns {Array} Array of upgrade definitions
   */
  getUpgradesForActivity(activityId) {
    return this.upgradeDefinitions.filter(u => u.activityId === activityId)
  }

  /**
   * Get the speed multiplier for an activity
   * @param {string} activityId - Activity identifier
   * @returns {number} Speed multiplier (1 = normal, 0.5 = 50% faster)
   */
  getSpeedMultiplier(activityId) {
    const speedUpgrades = this.upgradeDefinitions.filter(u =>
      u.activityId === activityId &&
      u.type === 'speed' &&
      this.purchased.includes(u.id)
    )

    if (speedUpgrades.length === 0) return 1

    // Sum all speed bonuses
    const totalSpeedBonus = speedUpgrades.reduce((sum, upgrade) => sum + upgrade.value, 0)

    // Convert to multiplier: 20% faster = 0.8x duration, 40% faster = 0.6x duration
    return 1 - totalSpeedBonus
  }

  /**
   * Get output bonuses for an activity
   * @param {string} activityId - Activity identifier
   * @returns {Object} Output bonuses {resourceId: amount}
   */
  getOutputBonus(activityId) {
    const outputUpgrades = this.upgradeDefinitions.filter(u =>
      u.activityId === activityId &&
      u.type === 'outputBonus' &&
      this.purchased.includes(u.id)
    )

    const bonus = {}

    for (const upgrade of outputUpgrades) {
      for (const [resourceId, amount] of Object.entries(upgrade.value)) {
        bonus[resourceId] = (bonus[resourceId] || 0) + amount
      }
    }

    return bonus
  }

  /**
   * Get cost reduction for an activity
   * @param {string} activityId - Activity identifier
   * @returns {number} Cost reduction (0 to 0.9)
   */
  getCostReduction(activityId) {
    const costUpgrades = this.upgradeDefinitions.filter(u =>
      u.activityId === activityId &&
      u.type === 'costReduction' &&
      this.purchased.includes(u.id)
    )

    if (costUpgrades.length === 0) return 0

    // Sum all cost reductions
    const totalReduction = costUpgrades.reduce((sum, upgrade) => sum + upgrade.value, 0)

    // Cap at 90% reduction
    return Math.min(totalReduction, 0.9)
  }

  /**
   * Reset all purchased upgrades
   */
  reset() {
    this.purchased = []
  }

  /**
   * Get state for saving
   * @returns {Object} State
   */
  getState() {
    return {
      purchased: [...this.purchased]
    }
  }

  /**
   * Load state
   * @param {Object} state - State to load
   */
  loadState(state) {
    if (state.purchased) {
      this.purchased = [...state.purchased]
    }
  }
}
