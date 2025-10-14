/**
 * Manages all currency amounts in the game
 * Currencies are just numbers - no inventory complexity
 */
export class CurrencyManager {
  constructor(eventBus = null) {
    this.currencies = {}
    this.eventBus = eventBus
  }

  /**
   * Add currency (can be negative to subtract)
   * @param {string} currencyId - Currency identifier
   * @param {number} amount - Amount to add
   */
  add(currencyId, amount) {
    const current = this.currencies[currencyId] || 0
    const newAmount = current + amount
    this.currencies[currencyId] = Math.max(0, newAmount)  // Never go below 0

    if (this.eventBus) {
      this.eventBus.emit('currency:changed', { currencyId, amount: this.currencies[currencyId] })
    }
  }

  /**
   * Subtract currency (returns success)
   * @param {string} currencyId - Currency identifier
   * @param {number} amount - Amount to subtract
   * @returns {boolean} True if successful, false if insufficient funds
   */
  subtract(currencyId, amount) {
    if (!this.has(currencyId, amount)) {
      return false
    }
    this.currencies[currencyId] -= amount

    if (this.eventBus) {
      this.eventBus.emit('currency:changed', { currencyId, amount: this.currencies[currencyId] })
    }
    return true
  }

  /**
   * Set currency to exact amount
   * @param {string} currencyId - Currency identifier
   * @param {number} amount - Exact amount
   */
  set(currencyId, amount) {
    this.currencies[currencyId] = Math.max(0, amount)

    if (this.eventBus) {
      this.eventBus.emit('currency:changed', { currencyId, amount: this.currencies[currencyId] })
    }
  }

  /**
   * Get current amount of currency
   * @param {string} currencyId - Currency identifier
   * @returns {number} Current amount (0 if doesn't exist)
   */
  get(currencyId) {
    return this.currencies[currencyId] || 0
  }

  /**
   * Check if player has enough of a currency
   * @param {string} currencyId - Currency identifier
   * @param {number} amount - Amount needed
   * @returns {boolean} True if player has enough
   */
  has(currencyId, amount) {
    return this.get(currencyId) >= amount
  }

  /**
   * Check if player can afford multiple currency costs
   * @param {Object} costs - Object like {wood: 5, stone: 2}
   * @returns {boolean} True if can afford all costs
   */
  canAfford(costs) {
    return Object.entries(costs).every(([currencyId, amount]) => {
      return this.has(currencyId, amount)
    })
  }

  /**
   * Spend multiple currencies at once (atomic operation)
   * @param {Object} costs - Object like {wood: 5, stone: 2}
   * @returns {boolean} True if successful, false if couldn't afford
   */
  spendCosts(costs) {
    if (!this.canAfford(costs)) {
      return false
    }

    Object.entries(costs).forEach(([currencyId, amount]) => {
      this.subtract(currencyId, amount)
    })

    return true
  }

  /**
   * Get all currencies
   * @returns {Object} All currencies
   */
  getAll() {
    return { ...this.currencies }
  }

  /**
   * Reset all currencies
   */
  reset() {
    this.currencies = {}
  }
}
