/**
 * Simple event bus for pub/sub communication between game systems
 * Allows systems to communicate without tight coupling
 */
export class EventBus {
  constructor() {
    this.listeners = {}
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Listener function
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Listener function to remove
   */
  off(event, callback) {
    if (!this.listeners[event]) return

    this.listeners[event] = this.listeners[event].filter(
      listener => listener !== callback
    )
  }

  /**
   * Emit an event to all listeners
   * @param {string} event - Event name
   * @param {*} data - Data to pass to listeners
   */
  emit(event, data) {
    if (!this.listeners[event]) return

    this.listeners[event].forEach(listener => {
      listener(data)
    })
  }

  /**
   * Subscribe to an event that will only fire once
   * @param {string} event - Event name
   * @param {Function} callback - Listener function
   */
  once(event, callback) {
    const onceWrapper = (data) => {
      callback(data)
      this.off(event, onceWrapper)
    }
    this.on(event, onceWrapper)
  }

  /**
   * Clear all listeners for an event
   * @param {string} event - Event name
   */
  clear(event) {
    delete this.listeners[event]
  }
}
