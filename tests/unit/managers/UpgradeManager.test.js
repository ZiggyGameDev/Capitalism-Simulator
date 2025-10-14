import { describe, it, expect, beforeEach } from 'vitest'
import { UpgradeManager } from '../../../src/managers/UpgradeManager.js'
import { EventBus } from '../../../src/core/EventBus.js'
import { CurrencyManager } from '../../../src/managers/CurrencyManager.js'
import { SkillManager } from '../../../src/managers/SkillManager.js'
import { skills } from '../../../src/data/skills.js'
import { activities } from '../../../src/data/activities.js'

describe('UpgradeManager', () => {
  let upgradeManager
  let currencyManager
  let skillManager
  let eventBus

  const testUpgrades = [
    {
      id: 'speedUpgrade1',
      name: 'Speed Boost',
      description: 'Test speed upgrade',
      activityId: 'chopNormalTree',
      type: 'speed',
      value: 0.2, // 20% faster
      cost: { wood: 10 },
      skillRequired: { woodcutting: 1 }
    },
    {
      id: 'outputUpgrade1',
      name: 'Output Boost',
      description: 'Test output upgrade',
      activityId: 'chopNormalTree',
      type: 'outputBonus',
      value: { wood: 1 },
      cost: { wood: 20 },
      skillRequired: { woodcutting: 5 }
    },
    {
      id: 'costUpgrade1',
      name: 'Cost Reduction',
      description: 'Test cost reduction',
      activityId: 'cookShrimp',
      type: 'costReduction',
      value: 0.5, // 50% reduction
      cost: { cookedShrimp: 30 },
      skillRequired: { cooking: 10 }
    },
    {
      id: 'prereqUpgrade',
      name: 'Requires Previous',
      description: 'Test prerequisite',
      activityId: 'chopNormalTree',
      type: 'speed',
      value: 0.4,
      cost: { wood: 50 },
      skillRequired: { woodcutting: 10 },
      prerequisite: 'speedUpgrade1'
    }
  ]

  beforeEach(() => {
    eventBus = new EventBus()
    currencyManager = new CurrencyManager()
    skillManager = new SkillManager(skills, activities, eventBus)
    upgradeManager = new UpgradeManager(testUpgrades, currencyManager, skillManager, eventBus)
  })

  describe('constructor', () => {
    it('should initialize with empty purchased upgrades', () => {
      expect(upgradeManager.purchased).toEqual([])
    })

    it('should store upgrade definitions', () => {
      expect(upgradeManager.upgradeDefinitions).toEqual(testUpgrades)
    })
  })

  describe('canPurchase', () => {
    it('should return false if already purchased', () => {
      upgradeManager.purchased.push('speedUpgrade1')
      expect(upgradeManager.canPurchase('speedUpgrade1')).toBe(false)
    })

    it('should return false if not enough currency', () => {
      currencyManager.set('wood', 5)
      expect(upgradeManager.canPurchase('speedUpgrade1')).toBe(false)
    })

    it('should return false if skill level too low', () => {
      currencyManager.set('wood', 20)
      // outputUpgrade1 requires woodcutting level 5, but we're at level 1
      expect(upgradeManager.canPurchase('outputUpgrade1')).toBe(false)
    })

    it('should return false if prerequisite not purchased', () => {
      currencyManager.set('wood', 100)
      skillManager.addXP('woodcutting', 305) // Level 10
      // prereqUpgrade requires speedUpgrade1 first
      expect(upgradeManager.canPurchase('prereqUpgrade')).toBe(false)
    })

    it('should return true if all requirements met', () => {
      currencyManager.set('wood', 20)
      expect(upgradeManager.canPurchase('speedUpgrade1')).toBe(true)
    })

    it('should return true if prerequisite is purchased', () => {
      currencyManager.set('wood', 100)
      skillManager.addXP('woodcutting', 305) // Level 10
      upgradeManager.purchased.push('speedUpgrade1')
      expect(upgradeManager.canPurchase('prereqUpgrade')).toBe(true)
    })
  })

  describe('purchase', () => {
    it('should throw error if cannot purchase', () => {
      expect(() => upgradeManager.purchase('speedUpgrade1')).toThrow('Cannot purchase upgrade')
    })

    it('should deduct currency costs', () => {
      currencyManager.set('wood', 20)
      upgradeManager.purchase('speedUpgrade1')
      expect(currencyManager.get('wood')).toBe(10)
    })

    it('should add upgrade to purchased list', () => {
      currencyManager.set('wood', 20)
      upgradeManager.purchase('speedUpgrade1')
      expect(upgradeManager.purchased).toContain('speedUpgrade1')
    })

    it('should emit upgrade:purchased event', () => {
      let eventEmitted = false
      let eventData = null

      eventBus.on('upgrade:purchased', (data) => {
        eventEmitted = true
        eventData = data
      })

      currencyManager.set('wood', 20)
      upgradeManager.purchase('speedUpgrade1')

      expect(eventEmitted).toBe(true)
      expect(eventData.upgradeId).toBe('speedUpgrade1')
    })

    it('should purchase multiple upgrades', () => {
      currencyManager.set('wood', 50)
      skillManager.addXP('woodcutting', 152) // Level 5

      upgradeManager.purchase('speedUpgrade1')
      upgradeManager.purchase('outputUpgrade1')

      expect(upgradeManager.purchased).toContain('speedUpgrade1')
      expect(upgradeManager.purchased).toContain('outputUpgrade1')
      expect(currencyManager.get('wood')).toBe(20) // 50 - 10 - 20
    })
  })

  describe('isPurchased', () => {
    it('should return false if not purchased', () => {
      expect(upgradeManager.isPurchased('speedUpgrade1')).toBe(false)
    })

    it('should return true if purchased', () => {
      upgradeManager.purchased.push('speedUpgrade1')
      expect(upgradeManager.isPurchased('speedUpgrade1')).toBe(true)
    })
  })

  describe('getUpgradesForActivity', () => {
    it('should return all upgrades for an activity', () => {
      const upgrades = upgradeManager.getUpgradesForActivity('chopNormalTree')
      expect(upgrades.length).toBe(3) // speedUpgrade1, outputUpgrade1, prereqUpgrade
    })

    it('should return empty array for activity with no upgrades', () => {
      const upgrades = upgradeManager.getUpgradesForActivity('nonExistent')
      expect(upgrades).toEqual([])
    })
  })

  describe('getSpeedMultiplier', () => {
    it('should return 1 if no speed upgrades purchased', () => {
      expect(upgradeManager.getSpeedMultiplier('chopNormalTree')).toBe(1)
    })

    it('should return speed multiplier for purchased upgrade', () => {
      currencyManager.set('wood', 20)
      upgradeManager.purchase('speedUpgrade1')
      // 20% faster = 0.8 multiplier (80% of original time)
      expect(upgradeManager.getSpeedMultiplier('chopNormalTree')).toBe(0.8)
    })

    it('should stack multiple speed upgrades', () => {
      currencyManager.set('wood', 100)
      skillManager.addXP('woodcutting', 305) // Level 10
      upgradeManager.purchase('speedUpgrade1') // 20% faster
      upgradeManager.purchase('prereqUpgrade') // 40% faster
      // 60% total faster = 0.4 multiplier
      expect(upgradeManager.getSpeedMultiplier('chopNormalTree')).toBeCloseTo(0.4)
    })
  })

  describe('getOutputBonus', () => {
    it('should return empty object if no output upgrades', () => {
      expect(upgradeManager.getOutputBonus('chopNormalTree')).toEqual({})
    })

    it('should return output bonus for purchased upgrade', () => {
      currencyManager.set('wood', 30)
      skillManager.addXP('woodcutting', 152) // Level 5
      upgradeManager.purchase('outputUpgrade1')
      expect(upgradeManager.getOutputBonus('chopNormalTree')).toEqual({ wood: 1 })
    })

    it('should stack multiple output bonuses', () => {
      // Create a second output upgrade
      upgradeManager.upgradeDefinitions.push({
        id: 'outputUpgrade2',
        activityId: 'chopNormalTree',
        type: 'outputBonus',
        value: { wood: 2, oakWood: 1 },
        cost: { wood: 50 },
        skillRequired: { woodcutting: 1 }
      })

      currencyManager.set('wood', 100)
      skillManager.addXP('woodcutting', 152) // Level 5
      upgradeManager.purchase('outputUpgrade1') // +1 wood
      upgradeManager.purchase('outputUpgrade2') // +2 wood, +1 oakWood

      const bonus = upgradeManager.getOutputBonus('chopNormalTree')
      expect(bonus.wood).toBe(3)
      expect(bonus.oakWood).toBe(1)
    })
  })

  describe('getCostReduction', () => {
    it('should return 0 if no cost reduction upgrades', () => {
      expect(upgradeManager.getCostReduction('cookShrimp')).toBe(0)
    })

    it('should return cost reduction for purchased upgrade', () => {
      currencyManager.set('cookedShrimp', 50)
      skillManager.addXP('cooking', 305) // Level 10
      upgradeManager.purchase('costUpgrade1')
      expect(upgradeManager.getCostReduction('cookShrimp')).toBe(0.5)
    })

    it('should cap cost reduction at 0.9 (90%)', () => {
      // Add multiple cost reduction upgrades
      upgradeManager.upgradeDefinitions.push({
        id: 'costUpgrade2',
        activityId: 'cookShrimp',
        type: 'costReduction',
        value: 0.6,
        cost: { cookedShrimp: 50 },
        skillRequired: { cooking: 1 }
      })

      currencyManager.set('cookedShrimp', 100)
      skillManager.addXP('cooking', 305) // Level 10
      upgradeManager.purchase('costUpgrade1') // 50% reduction
      upgradeManager.purchase('costUpgrade2') // 60% reduction
      // Total would be 110%, but should cap at 90%
      expect(upgradeManager.getCostReduction('cookShrimp')).toBe(0.9)
    })
  })

  describe('reset', () => {
    it('should clear all purchased upgrades', () => {
      currencyManager.set('wood', 50)
      upgradeManager.purchase('speedUpgrade1')
      upgradeManager.purchased = ['speedUpgrade1', 'outputUpgrade1']

      upgradeManager.reset()

      expect(upgradeManager.purchased).toEqual([])
    })
  })

  describe('getState and loadState', () => {
    it('should save and restore purchased upgrades', () => {
      currencyManager.set('wood', 50)
      upgradeManager.purchase('speedUpgrade1')

      const state = upgradeManager.getState()
      expect(state.purchased).toContain('speedUpgrade1')

      const newUpgradeManager = new UpgradeManager(testUpgrades, currencyManager, skillManager, eventBus)
      newUpgradeManager.loadState(state)

      expect(newUpgradeManager.isPurchased('speedUpgrade1')).toBe(true)
    })
  })
})
