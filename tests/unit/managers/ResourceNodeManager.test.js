import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ResourceNodeManager } from '../../../src/managers/ResourceNodeManager.js'
import { EventBus } from '../../../src/core/EventBus.js'

describe('ResourceNodeManager', () => {
  let manager
  let eventBus
  let emitSpy

  const testNodeDefs = [
    {
      id: 'wheat_field',
      type: 'wheat',
      name: 'Wheat Field',
      icon: '🌾',
      position: { x: 100, y: 200 },
      baseCapacity: 20,
      baseSpawnRate: 0.5,
      harvestTime: 2,
      outputs: { wheat: 1 },
      requiredSkillLevel: 1,
      requiredSkillId: 'farming'
    },
    {
      id: 'wood_tree',
      type: 'wood',
      name: 'Tree',
      icon: '🌳',
      position: { x: 200, y: 150 },
      baseCapacity: 15,
      baseSpawnRate: 0.3,
      harvestTime: 3,
      outputs: { wood: 1 },
      requiredSkillLevel: 1,
      requiredSkillId: 'woodcutting'
    }
  ]

  beforeEach(() => {
    eventBus = new EventBus()
    emitSpy = vi.spyOn(eventBus, 'emit')
    manager = new ResourceNodeManager(testNodeDefs, eventBus)
  })

  describe('initialization', () => {
    it('should create nodes from definitions', () => {
      expect(manager.nodes.size).toBe(2)
      expect(manager.getNode('wheat_field')).toBeDefined()
      expect(manager.getNode('wood_tree')).toBeDefined()
    })

    it('should initialize nodes with correct properties', () => {
      const wheat = manager.getNode('wheat_field')
      expect(wheat.name).toBe('Wheat Field')
      expect(wheat.capacity).toBe(20)
      expect(wheat.spawnRate).toBe(0.5)
    })
  })

  describe('getNode', () => {
    it('should return node by id', () => {
      const node = manager.getNode('wheat_field')
      expect(node.id).toBe('wheat_field')
    })

    it('should return undefined for invalid id', () => {
      expect(manager.getNode('invalid')).toBeUndefined()
    })
  })

  describe('getAllNodes', () => {
    it('should return all nodes as array', () => {
      const nodes = manager.getAllNodes()
      expect(nodes).toBeInstanceOf(Array)
      expect(nodes.length).toBe(2)
    })
  })

  describe('getNodesForSkill', () => {
    it('should filter nodes by skill', () => {
      const farmingNodes = manager.getNodesForSkill('farming')
      expect(farmingNodes.length).toBe(1)
      expect(farmingNodes[0].id).toBe('wheat_field')

      const woodcuttingNodes = manager.getNodesForSkill('woodcutting')
      expect(woodcuttingNodes.length).toBe(1)
      expect(woodcuttingNodes[0].id).toBe('wood_tree')
    })

    it('should return empty array for invalid skill', () => {
      const nodes = manager.getNodesForSkill('invalid')
      expect(nodes).toEqual([])
    })
  })

  describe('update - regeneration', () => {
    it('should regenerate all nodes', () => {
      const wheat = manager.getNode('wheat_field')
      const wood = manager.getNode('wood_tree')

      wheat.available = 10
      wood.available = 5

      manager.update(1000) // 1 second

      expect(wheat.available).toBe(10.5) // +0.5
      expect(wood.available).toBe(5.3) // +0.3
    })

    it('should emit regeneration events', () => {
      const wheat = manager.getNode('wheat_field')
      wheat.available = 10

      manager.update(1000)

      expect(emitSpy).toHaveBeenCalledWith('resource:regenerated', {
        nodeId: 'wheat_field',
        amount: 0.5,
        current: 10.5,
        capacity: 20
      })
    })

    it('should not emit event if no regeneration occurred', () => {
      const wheat = manager.getNode('wheat_field')
      const wood = manager.getNode('wood_tree')
      wheat.available = 20 // At capacity
      wood.available = 15 // At capacity

      emitSpy.mockClear()
      manager.update(1000)

      expect(emitSpy).not.toHaveBeenCalled()
    })
  })

  describe('canHarvest', () => {
    it('should return true if node has resources', () => {
      const wheat = manager.getNode('wheat_field')
      wheat.available = 5

      expect(manager.canHarvest('wheat_field')).toBe(true)
    })

    it('should return false if node is empty', () => {
      const wheat = manager.getNode('wheat_field')
      wheat.available = 0.5

      expect(manager.canHarvest('wheat_field')).toBe(false)
    })

    it('should return false for invalid node', () => {
      expect(manager.canHarvest('invalid')).toBe(false)
    })
  })

  describe('harvest', () => {
    it('should harvest from node successfully', () => {
      const wheat = manager.getNode('wheat_field')
      wheat.available = 10

      const success = manager.harvest('wheat_field')

      expect(success).toBe(true)
      expect(wheat.available).toBe(9)
    })

    it('should emit harvest event', () => {
      const wheat = manager.getNode('wheat_field')
      wheat.available = 10

      manager.harvest('wheat_field')

      expect(emitSpy).toHaveBeenCalledWith('resource:harvested', {
        nodeId: 'wheat_field',
        remaining: 9,
        outputs: { wheat: 1 }
      })
    })

    it('should fail if node is empty', () => {
      const wheat = manager.getNode('wheat_field')
      wheat.available = 0

      const success = manager.harvest('wheat_field')

      expect(success).toBe(false)
      expect(emitSpy).not.toHaveBeenCalled()
    })

    it('should return false for invalid node', () => {
      const success = manager.harvest('invalid')
      expect(success).toBe(false)
    })
  })

  describe('upgradeCapacity', () => {
    it('should upgrade node capacity', () => {
      const wheat = manager.getNode('wheat_field')
      expect(wheat.getCurrentCapacity()).toBe(20)

      manager.upgradeCapacity('wheat_field')

      expect(wheat.getCurrentCapacity()).toBe(30)
      expect(wheat.capacityUpgrades).toBe(1)
    })

    it('should emit upgrade event', () => {
      manager.upgradeCapacity('wheat_field')

      expect(emitSpy).toHaveBeenCalledWith('node:upgraded', {
        nodeId: 'wheat_field',
        type: 'capacity',
        level: 1,
        newCapacity: 30
      })
    })
  })

  describe('upgradeSpawnRate', () => {
    it('should upgrade spawn rate', () => {
      const wheat = manager.getNode('wheat_field')
      expect(wheat.getCurrentSpawnRate()).toBe(0.5)

      manager.upgradeSpawnRate('wheat_field')

      expect(wheat.getCurrentSpawnRate()).toBe(0.65)
      expect(wheat.spawnRateUpgrades).toBe(1)
    })

    it('should emit upgrade event', () => {
      manager.upgradeSpawnRate('wheat_field')

      expect(emitSpy).toHaveBeenCalledWith('node:upgraded', {
        nodeId: 'wheat_field',
        type: 'spawnRate',
        level: 1,
        newRate: 0.65
      })
    })
  })

  describe('isUnlocked', () => {
    let mockSkillManager

    beforeEach(() => {
      mockSkillManager = {
        getLevel: vi.fn((skillId) => {
          if (skillId === 'farming') return 1
          if (skillId === 'woodcutting') return 0
          return 0
        })
      }
    })

    it('should return true if skill requirement met', () => {
      expect(manager.isUnlocked('wheat_field', mockSkillManager)).toBe(true)
    })

    it('should return false if skill requirement not met', () => {
      expect(manager.isUnlocked('wood_tree', mockSkillManager)).toBe(false)
    })

    it('should return false for invalid node', () => {
      expect(manager.isUnlocked('invalid', mockSkillManager)).toBe(false)
    })
  })

  describe('getUnlockedNodes', () => {
    let mockSkillManager

    beforeEach(() => {
      mockSkillManager = {
        getLevel: vi.fn(() => 1) // All level 1
      }
    })

    it('should return only unlocked nodes', () => {
      const unlocked = manager.getUnlockedNodes(mockSkillManager)
      expect(unlocked.length).toBe(2)
    })

    it('should filter locked nodes', () => {
      mockSkillManager.getLevel = vi.fn((skillId) => {
        return skillId === 'farming' ? 1 : 0
      })

      const unlocked = manager.getUnlockedNodes(mockSkillManager)
      expect(unlocked.length).toBe(1)
      expect(unlocked[0].id).toBe('wheat_field')
    })
  })

  describe('save/load state', () => {
    it('should save state of all nodes', () => {
      const wheat = manager.getNode('wheat_field')
      const wood = manager.getNode('wood_tree')

      wheat.available = 15
      wheat.capacityUpgrades = 2
      wood.available = 8
      wood.spawnRateUpgrades = 1

      const state = manager.getState()

      expect(state.wheat_field).toEqual({
        available: 15,
        capacityUpgrades: 2,
        spawnRateUpgrades: 0
      })
      expect(state.wood_tree).toEqual({
        available: 8,
        capacityUpgrades: 0,
        spawnRateUpgrades: 1
      })
    })

    it('should load state to all nodes', () => {
      const state = {
        wheat_field: {
          available: 12,
          capacityUpgrades: 1,
          spawnRateUpgrades: 2
        },
        wood_tree: {
          available: 7,
          capacityUpgrades: 3,
          spawnRateUpgrades: 0
        }
      }

      manager.loadState(state)

      const wheat = manager.getNode('wheat_field')
      const wood = manager.getNode('wood_tree')

      expect(wheat.available).toBe(12)
      expect(wheat.capacityUpgrades).toBe(1)
      expect(wood.available).toBe(7)
      expect(wood.capacityUpgrades).toBe(3)
    })

    it('should handle empty state gracefully', () => {
      expect(() => manager.loadState(null)).not.toThrow()
      expect(() => manager.loadState({})).not.toThrow()
    })
  })

  describe('reset', () => {
    it('should reset all nodes to initial state', () => {
      const wheat = manager.getNode('wheat_field')
      wheat.available = 15
      wheat.capacityUpgrades = 2
      wheat.spawnRateUpgrades = 1

      manager.reset()

      expect(wheat.available).toBe(0)
      expect(wheat.capacityUpgrades).toBe(0)
      expect(wheat.spawnRateUpgrades).toBe(0)
    })
  })
})
