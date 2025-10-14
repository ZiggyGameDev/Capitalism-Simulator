/**
 * ResourceNode - Represents a harvestable resource location
 * Resources regenerate over time up to a capacity cap
 */
export class ResourceNode {
  constructor(definition) {
    // Identity
    this.id = definition.id
    this.type = definition.type
    this.name = definition.name
    this.icon = definition.icon

    // Position in world space
    this.position = {
      x: definition.position?.x || 100,
      y: definition.position?.y || 300
    }

    // Resource properties
    this.available = definition.startingAmount || 0
    this.capacity = definition.baseCapacity || 20
    this.spawnRate = definition.baseSpawnRate || 0.5 // units per second

    // Harvesting properties
    this.harvestTime = definition.harvestTime || 2 // seconds per unit
    this.outputs = definition.outputs || {} // { currencyId: amount }

    // Requirements
    this.requiredSkillLevel = definition.requiredSkillLevel || 1
    this.requiredSkillId = definition.requiredSkillId || 'farming'

    // Upgrade state
    this.capacityUpgrades = 0
    this.spawnRateUpgrades = 0

    // Visual properties
    this.color = definition.color || '#27ae60'
  }

  /**
   * Calculate current capacity with upgrades applied
   * Each upgrade adds 50% to base capacity
   */
  getCurrentCapacity() {
    return Math.floor(this.capacity * (1 + this.capacityUpgrades * 0.5))
  }

  /**
   * Calculate current spawn rate with upgrades applied
   * Each upgrade adds 30% to base spawn rate
   */
  getCurrentSpawnRate() {
    return this.spawnRate * (1 + this.spawnRateUpgrades * 0.3)
  }

  /**
   * Regenerate resources over time
   * @param {number} deltaTime - Time elapsed in milliseconds
   */
  regenerate(deltaTime) {
    const maxCapacity = this.getCurrentCapacity()

    if (this.available < maxCapacity) {
      const regen = this.getCurrentSpawnRate() * (deltaTime / 1000)
      this.available = Math.min(this.available + regen, maxCapacity)
    }
  }

  /**
   * Check if resource can be harvested
   * @returns {boolean}
   */
  canHarvest() {
    return this.available >= 1
  }

  /**
   * Harvest one unit of resource
   * @returns {boolean} Success
   */
  harvest() {
    if (this.canHarvest()) {
      this.available -= 1
      return true
    }
    return false
  }

  /**
   * Get fullness ratio (0-1)
   */
  getFullness() {
    return this.available / this.getCurrentCapacity()
  }

  /**
   * Get state for rendering
   * @returns {Object} Render state
   */
  getRenderState() {
    return {
      id: this.id,
      name: this.name,
      position: { ...this.position },
      available: Math.floor(this.available),
      capacity: this.getCurrentCapacity(),
      fullness: this.getFullness(),
      icon: this.icon,
      color: this.color,
      spawnRate: this.getCurrentSpawnRate()
    }
  }

  /**
   * Get state for saving
   * @returns {Object} Save state
   */
  getSaveState() {
    return {
      available: this.available,
      capacityUpgrades: this.capacityUpgrades,
      spawnRateUpgrades: this.spawnRateUpgrades
    }
  }

  /**
   * Load state from save
   * @param {Object} state - Saved state
   */
  loadState(state) {
    if (state.available !== undefined) {
      this.available = state.available
    }
    if (state.capacityUpgrades !== undefined) {
      this.capacityUpgrades = state.capacityUpgrades
    }
    if (state.spawnRateUpgrades !== undefined) {
      this.spawnRateUpgrades = state.spawnRateUpgrades
    }
  }
}
