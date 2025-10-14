import { describe, it, expect, beforeEach } from 'vitest'
import { ResourceNode } from '../../../src/entities/ResourceNode.js'

describe('ResourceNode', () => {
  let node

  beforeEach(() => {
    node = new ResourceNode({
      id: 'wheat_field',
      type: 'wheat',
      name: 'Wheat Field',
      icon: '🌾',
      position: { x: 100, y: 200 },
      startingAmount: 5,
      baseCapacity: 20,
      baseSpawnRate: 0.5, // 0.5 per second
      harvestTime: 2,
      outputs: { wheat: 1 },
      requiredSkillLevel: 1,
      requiredSkillId: 'farming',
      color: '#f39c12'
    })
  })

  describe('initialization', () => {
    it('should initialize with correct properties', () => {
      expect(node.id).toBe('wheat_field')
      expect(node.type).toBe('wheat')
      expect(node.name).toBe('Wheat Field')
      expect(node.icon).toBe('🌾')
      expect(node.available).toBe(5)
      expect(node.capacity).toBe(20)
      expect(node.spawnRate).toBe(0.5)
    })

    it('should start with no upgrades', () => {
      expect(node.capacityUpgrades).toBe(0)
      expect(node.spawnRateUpgrades).toBe(0)
    })

    it('should use defaults for missing properties', () => {
      const minimalNode = new ResourceNode({
        id: 'test',
        type: 'test',
        name: 'Test',
        icon: '🧪'
      })

      expect(minimalNode.available).toBe(0)
      expect(minimalNode.capacity).toBe(20)
      expect(minimalNode.spawnRate).toBe(0.5)
      expect(minimalNode.harvestTime).toBe(2)
    })
  })

  describe('regeneration', () => {
    it('should regenerate resources over time', () => {
      node.available = 10

      // Regenerate for 2 seconds (2000ms)
      node.regenerate(2000)

      // Should gain 0.5 per second * 2 seconds = 1 unit
      expect(node.available).toBe(11)
    })

    it('should not exceed capacity', () => {
      node.available = 19.5

      node.regenerate(2000) // Would add 1.0

      expect(node.available).toBe(20) // Capped at capacity
    })

    it('should not regenerate if at capacity', () => {
      node.available = 20

      node.regenerate(5000)

      expect(node.available).toBe(20)
    })

    it('should handle fractional regeneration', () => {
      node.available = 0

      // 500ms = 0.5 seconds * 0.5 rate = 0.25 units
      node.regenerate(500)

      expect(node.available).toBe(0.25)
    })
  })

  describe('harvesting', () => {
    it('should allow harvesting when available >= 1', () => {
      node.available = 5

      expect(node.canHarvest()).toBe(true)
    })

    it('should not allow harvesting when available < 1', () => {
      node.available = 0.5

      expect(node.canHarvest()).toBe(false)
    })

    it('should decrease available by 1 when harvested', () => {
      node.available = 10

      const success = node.harvest()

      expect(success).toBe(true)
      expect(node.available).toBe(9)
    })

    it('should return false if harvest fails', () => {
      node.available = 0.5

      const success = node.harvest()

      expect(success).toBe(false)
      expect(node.available).toBe(0.5)
    })

    it('should handle multiple harvests', () => {
      node.available = 3

      expect(node.harvest()).toBe(true) // 2 left
      expect(node.harvest()).toBe(true) // 1 left
      expect(node.harvest()).toBe(true) // 0 left
      expect(node.harvest()).toBe(false) // Can't harvest
    })
  })

  describe('upgrades', () => {
    it('should increase capacity with upgrades', () => {
      expect(node.getCurrentCapacity()).toBe(20)

      node.capacityUpgrades = 1
      expect(node.getCurrentCapacity()).toBe(30) // 20 * 1.5

      node.capacityUpgrades = 2
      expect(node.getCurrentCapacity()).toBe(40) // 20 * 2.0
    })

    it('should increase spawn rate with upgrades', () => {
      expect(node.getCurrentSpawnRate()).toBe(0.5)

      node.spawnRateUpgrades = 1
      expect(node.getCurrentSpawnRate()).toBe(0.65) // 0.5 * 1.3

      node.spawnRateUpgrades = 2
      expect(node.getCurrentSpawnRate()).toBe(0.8) // 0.5 * 1.6
    })

    it('should regenerate faster with spawn rate upgrades', () => {
      node.available = 0
      node.spawnRateUpgrades = 1 // 0.65/s

      node.regenerate(1000) // 1 second

      expect(node.available).toBe(0.65)
    })

    it('should respect upgraded capacity cap', () => {
      node.available = 0
      node.capacityUpgrades = 1 // capacity = 30

      node.regenerate(100000) // Way more than needed

      expect(node.available).toBe(30)
    })
  })

  describe('fullness calculation', () => {
    it('should calculate fullness ratio correctly', () => {
      node.available = 10
      expect(node.getFullness()).toBe(0.5) // 10/20

      node.available = 20
      expect(node.getFullness()).toBe(1.0) // 20/20

      node.available = 0
      expect(node.getFullness()).toBe(0) // 0/20
    })

    it('should account for capacity upgrades in fullness', () => {
      node.available = 20
      node.capacityUpgrades = 1 // capacity = 30

      expect(node.getFullness()).toBeCloseTo(0.667, 2) // 20/30
    })
  })

  describe('save/load state', () => {
    it('should save state correctly', () => {
      node.available = 15
      node.capacityUpgrades = 2
      node.spawnRateUpgrades = 1

      const state = node.getSaveState()

      expect(state).toEqual({
        available: 15,
        capacityUpgrades: 2,
        spawnRateUpgrades: 1
      })
    })

    it('should load state correctly', () => {
      const state = {
        available: 12,
        capacityUpgrades: 3,
        spawnRateUpgrades: 2
      }

      node.loadState(state)

      expect(node.available).toBe(12)
      expect(node.capacityUpgrades).toBe(3)
      expect(node.spawnRateUpgrades).toBe(2)
    })

    it('should handle partial state loading', () => {
      node.available = 10
      node.capacityUpgrades = 1

      node.loadState({ available: 15 })

      expect(node.available).toBe(15)
      expect(node.capacityUpgrades).toBe(1) // Unchanged
    })
  })

  describe('render state', () => {
    it('should provide render state', () => {
      node.available = 15.7
      node.capacityUpgrades = 1

      const state = node.getRenderState()

      expect(state.id).toBe('wheat_field')
      expect(state.name).toBe('Wheat Field')
      expect(state.position).toEqual({ x: 100, y: 200 })
      expect(state.available).toBe(15) // Floored
      expect(state.capacity).toBe(30)
      expect(state.fullness).toBeCloseTo(0.523, 2)
      expect(state.icon).toBe('🌾')
      expect(state.color).toBe('#f39c12')
    })
  })
})
