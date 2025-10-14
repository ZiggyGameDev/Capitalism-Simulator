import { ResourceNode } from '../entities/ResourceNode.js'

/**
 * ResourceNodeManager - Manages all resource nodes in the game
 * Handles regeneration, harvesting, and upgrades
 */
export class ResourceNodeManager {
  constructor(nodeDefinitions, eventBus) {
    this.nodes = new Map()
    this.eventBus = eventBus

    // Create resource nodes from definitions
    nodeDefinitions.forEach(def => {
      const node = new ResourceNode(def)
      this.nodes.set(def.id, node)
    })

    console.log(`✅ [ResourceNodeManager] Initialized with ${this.nodes.size} nodes`)
  }

  /**
   * Update all nodes - handle regeneration
   * @param {number} deltaTime - Time elapsed in milliseconds
   */
  update(deltaTime) {
    this.nodes.forEach(node => {
      const beforeRegen = node.available

      node.regenerate(deltaTime)

      // Emit event if resources regenerated
      if (node.available > beforeRegen) {
        const amount = node.available - beforeRegen

        this.eventBus.emit('resource:regenerated', {
          nodeId: node.id,
          amount,
          current: node.available,
          capacity: node.getCurrentCapacity()
        })
      }
    })
  }

  /**
   * Get a specific node
   * @param {string} nodeId
   * @returns {ResourceNode|undefined}
   */
  getNode(nodeId) {
    return this.nodes.get(nodeId)
  }

  /**
   * Get all nodes
   * @returns {ResourceNode[]}
   */
  getAllNodes() {
    return Array.from(this.nodes.values())
  }

  /**
   * Get nodes for a specific skill
   * @param {string} skillId
   * @returns {ResourceNode[]}
   */
  getNodesForSkill(skillId) {
    return this.getAllNodes().filter(node => node.requiredSkillId === skillId)
  }

  /**
   * Check if a node can be harvested
   * @param {string} nodeId
   * @returns {boolean}
   */
  canHarvest(nodeId) {
    const node = this.nodes.get(nodeId)
    return node ? node.canHarvest() : false
  }

  /**
   * Harvest from a node
   * @param {string} nodeId
   * @returns {boolean} Success
   */
  harvest(nodeId) {
    const node = this.nodes.get(nodeId)

    if (node && node.harvest()) {
      this.eventBus.emit('resource:harvested', {
        nodeId,
        remaining: node.available,
        outputs: node.outputs
      })
      return true
    }

    return false
  }

  /**
   * Upgrade node capacity
   * @param {string} nodeId
   */
  upgradeCapacity(nodeId) {
    const node = this.nodes.get(nodeId)

    if (node) {
      node.capacityUpgrades++

      this.eventBus.emit('node:upgraded', {
        nodeId,
        type: 'capacity',
        level: node.capacityUpgrades,
        newCapacity: node.getCurrentCapacity()
      })

      console.log(`⬆️ [ResourceNode] ${nodeId} capacity upgraded to ${node.getCurrentCapacity()}`)
    }
  }

  /**
   * Upgrade spawn rate
   * @param {string} nodeId
   */
  upgradeSpawnRate(nodeId) {
    const node = this.nodes.get(nodeId)

    if (node) {
      node.spawnRateUpgrades++

      this.eventBus.emit('node:upgraded', {
        nodeId,
        type: 'spawnRate',
        level: node.spawnRateUpgrades,
        newRate: node.getCurrentSpawnRate()
      })

      console.log(`⬆️ [ResourceNode] ${nodeId} spawn rate upgraded to ${node.getCurrentSpawnRate()}/s`)
    }
  }

  /**
   * Check if node is unlocked for player
   * @param {string} nodeId
   * @param {SkillManager} skillManager
   * @returns {boolean}
   */
  isUnlocked(nodeId, skillManager) {
    const node = this.nodes.get(nodeId)

    if (!node) return false

    const skillLevel = skillManager.getLevel(node.requiredSkillId)
    return skillLevel >= node.requiredSkillLevel
  }

  /**
   * Get unlocked nodes for player
   * @param {SkillManager} skillManager
   * @returns {ResourceNode[]}
   */
  getUnlockedNodes(skillManager) {
    return this.getAllNodes().filter(node => {
      const skillLevel = skillManager.getLevel(node.requiredSkillId)
      return skillLevel >= node.requiredSkillLevel
    })
  }

  /**
   * Get state for saving
   * @returns {Object}
   */
  getState() {
    const state = {}

    this.nodes.forEach((node, id) => {
      state[id] = node.getSaveState()
    })

    return state
  }

  /**
   * Load state from save
   * @param {Object} state
   */
  loadState(state) {
    if (!state) return

    Object.entries(state).forEach(([nodeId, nodeState]) => {
      const node = this.nodes.get(nodeId)
      if (node) {
        node.loadState(nodeState)
      }
    })

    console.log(`📂 [ResourceNodeManager] State loaded for ${Object.keys(state).length} nodes`)
  }

  /**
   * Reset all nodes to initial state
   */
  reset() {
    this.nodes.forEach(node => {
      node.available = 0
      node.capacityUpgrades = 0
      node.spawnRateUpgrades = 0
    })

    console.log(`🔄 [ResourceNodeManager] Reset all nodes`)
  }
}
