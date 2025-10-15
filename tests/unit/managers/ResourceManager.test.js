import { describe, it, expect, beforeEach } from 'vitest'
import { ResourceManager } from '../../../src/managers/ResourceManager.js'

describe('ResourceManager', () => {
  let rm

  beforeEach(() => {
    rm = new ResourceManager()
  })

  describe('add()', () => {
    it('should add resource to empty manager', () => {
      rm.add('wood', 10)
      expect(rm.get('wood')).toBe(10)
    })

    it('should accumulate resources', () => {
      rm.add('wood', 10)
      rm.add('wood', 5)
      expect(rm.get('wood')).toBe(15)
    })

    it('should handle multiple resource types', () => {
      rm.add('wood', 10)
      rm.add('stone', 5)
      expect(rm.get('wood')).toBe(10)
      expect(rm.get('stone')).toBe(5)
    })

    it('should handle decimal amounts', () => {
      rm.add('wood', 10.5)
      rm.add('wood', 2.3)
      expect(rm.get('wood')).toBeCloseTo(12.8, 1)
    })

    it('should handle negative amounts (subtract)', () => {
      rm.add('wood', 10)
      rm.add('wood', -3)
      expect(rm.get('wood')).toBe(7)
    })

    it('should not allow negative totals', () => {
      rm.add('wood', 10)
      rm.add('wood', -15)
      expect(rm.get('wood')).toBe(0)
    })
  })

  describe('subtract()', () => {
    it('should subtract resource', () => {
      rm.add('wood', 10)
      const success = rm.subtract('wood', 3)
      expect(success).toBe(true)
      expect(rm.get('wood')).toBe(7)
    })

    it('should fail if insufficient resources', () => {
      rm.add('wood', 5)
      const success = rm.subtract('wood', 10)
      expect(success).toBe(false)
      expect(rm.get('wood')).toBe(5)  // Unchanged
    })

    it('should handle subtracting non-existent resource', () => {
      const success = rm.subtract('wood', 5)
      expect(success).toBe(false)
    })

    it('should handle subtracting exact amount', () => {
      rm.add('wood', 10)
      const success = rm.subtract('wood', 10)
      expect(success).toBe(true)
      expect(rm.get('wood')).toBe(0)
    })
  })

  describe('set()', () => {
    it('should set resource to exact amount', () => {
      rm.set('wood', 100)
      expect(rm.get('wood')).toBe(100)
    })

    it('should overwrite existing amount', () => {
      rm.add('wood', 50)
      rm.set('wood', 100)
      expect(rm.get('wood')).toBe(100)
    })

    it('should not allow negative amounts', () => {
      rm.set('wood', -10)
      expect(rm.get('wood')).toBe(0)
    })
  })

  describe('get()', () => {
    it('should return 0 for non-existent resource', () => {
      expect(rm.get('wood')).toBe(0)
    })

    it('should return current amount', () => {
      rm.add('wood', 25)
      expect(rm.get('wood')).toBe(25)
    })
  })

  describe('has()', () => {
    it('should return true if sufficient resources', () => {
      rm.add('wood', 10)
      expect(rm.has('wood', 5)).toBe(true)
      expect(rm.has('wood', 10)).toBe(true)
    })

    it('should return false if insufficient', () => {
      rm.add('wood', 5)
      expect(rm.has('wood', 10)).toBe(false)
    })

    it('should return false for non-existent resource', () => {
      expect(rm.has('wood', 1)).toBe(false)
    })

    it('should return true for zero amount check', () => {
      expect(rm.has('wood', 0)).toBe(true)
    })
  })

  describe('canAfford()', () => {
    it('should return true if can afford all costs', () => {
      rm.add('wood', 10)
      rm.add('stone', 5)
      expect(rm.canAfford({ wood: 5, stone: 2 })).toBe(true)
    })

    it('should return false if missing any resources', () => {
      rm.add('wood', 10)
      rm.add('stone', 5)
      expect(rm.canAfford({ wood: 5, stone: 10 })).toBe(false)
    })

    it('should handle empty cost object', () => {
      expect(rm.canAfford({})).toBe(true)
    })

    it('should handle single resource cost', () => {
      rm.add('wood', 10)
      expect(rm.canAfford({ wood: 5 })).toBe(true)
      expect(rm.canAfford({ wood: 15 })).toBe(false)
    })
  })

  describe('spendCosts()', () => {
    it('should spend multiple resources if affordable', () => {
      rm.add('wood', 10)
      rm.add('stone', 5)
      const success = rm.spendCosts({ wood: 3, stone: 2 })

      expect(success).toBe(true)
      expect(rm.get('wood')).toBe(7)
      expect(rm.get('stone')).toBe(3)
    })

    it('should not spend if cannot afford', () => {
      rm.add('wood', 10)
      rm.add('stone', 5)
      const success = rm.spendCosts({ wood: 15, stone: 2 })

      expect(success).toBe(false)
      expect(rm.get('wood')).toBe(10)  // Unchanged
      expect(rm.get('stone')).toBe(5)   // Unchanged
    })

    it('should handle empty costs', () => {
      const success = rm.spendCosts({})
      expect(success).toBe(true)
    })
  })

  describe('getAll()', () => {
    it('should return all resources', () => {
      rm.add('wood', 10)
      rm.add('stone', 5)
      expect(rm.getAll()).toEqual({ wood: 10, stone: 5 })
    })

    it('should return empty object if no resources', () => {
      expect(rm.getAll()).toEqual({})
    })
  })

  describe('reset()', () => {
    it('should clear all resources', () => {
      rm.add('wood', 10)
      rm.add('stone', 5)
      rm.reset()
      expect(rm.getAll()).toEqual({})
    })

    it('should clear storage bonuses', () => {
      rm.addStorageBonus('wood', 50)
      rm.reset()
      expect(rm.getStorageLimit('wood')).toBe(100) // Back to base limit
    })
  })

  describe('Storage System', () => {
    describe('getStorageLimit()', () => {
      it('should return base storage limit for new resource', () => {
        expect(rm.getStorageLimit('wood')).toBe(100)
      })

      it('should include storage bonuses', () => {
        rm.addStorageBonus('wood', 50)
        expect(rm.getStorageLimit('wood')).toBe(150)
      })

      it('should accumulate multiple bonuses', () => {
        rm.addStorageBonus('wood', 50)
        rm.addStorageBonus('wood', 30)
        expect(rm.getStorageLimit('wood')).toBe(180)
      })
    })

    describe('addStorageBonus()', () => {
      it('should add storage bonus', () => {
        rm.addStorageBonus('wood', 50)
        expect(rm.getStorageLimit('wood')).toBe(150)
      })

      it('should handle multiple resources independently', () => {
        rm.addStorageBonus('wood', 50)
        rm.addStorageBonus('stone', 100)
        expect(rm.getStorageLimit('wood')).toBe(150)
        expect(rm.getStorageLimit('stone')).toBe(200)
      })

      it('should accumulate bonuses for same resource', () => {
        rm.addStorageBonus('wood', 50)
        rm.addStorageBonus('wood', 25)
        expect(rm.getStorageLimit('wood')).toBe(175)
      })
    })

    describe('add() with storage limits', () => {
      it('should cap resources at storage limit', () => {
        rm.add('wood', 150) // Over limit of 100
        expect(rm.get('wood')).toBe(100)
      })

      it('should allow filling up to storage limit', () => {
        rm.add('wood', 100)
        expect(rm.get('wood')).toBe(100)
      })

      it('should cap when adding to existing amount', () => {
        rm.add('wood', 80)
        rm.add('wood', 50) // Would be 130, but capped at 100
        expect(rm.get('wood')).toBe(100)
      })

      it('should respect increased storage limit', () => {
        rm.addStorageBonus('wood', 50)
        rm.add('wood', 120)
        expect(rm.get('wood')).toBe(120) // Under new limit of 150
      })

      it('should return actual amount added', () => {
        rm.add('wood', 80)
        const added = rm.add('wood', 50) // Can only add 20 more
        expect(added).toBe(20)
        expect(rm.get('wood')).toBe(100)
      })

      it('should not cap negative amounts (subtracting)', () => {
        rm.add('wood', 100)
        rm.add('wood', -30)
        expect(rm.get('wood')).toBe(70)
      })
    })

    describe('isAtStorageLimit()', () => {
      it('should return true when at limit', () => {
        rm.add('wood', 100)
        expect(rm.isAtStorageLimit('wood')).toBe(true)
      })

      it('should return false when below limit', () => {
        rm.add('wood', 50)
        expect(rm.isAtStorageLimit('wood')).toBe(false)
      })

      it('should return false for empty resource', () => {
        expect(rm.isAtStorageLimit('wood')).toBe(false)
      })

      it('should account for increased storage', () => {
        rm.addStorageBonus('wood', 50)
        rm.add('wood', 120)
        expect(rm.isAtStorageLimit('wood')).toBe(false) // 120 < 150
        rm.add('wood', 30)
        expect(rm.isAtStorageLimit('wood')).toBe(true) // 150 = 150
      })
    })

    describe('getStorageInfo()', () => {
      it('should return current and max storage', () => {
        rm.add('wood', 50)
        const info = rm.getStorageInfo('wood')
        expect(info.current).toBe(50)
        expect(info.max).toBe(100)
        expect(info.percentage).toBe(50)
      })

      it('should return correct percentage', () => {
        rm.add('wood', 75)
        const info = rm.getStorageInfo('wood')
        expect(info.percentage).toBe(75)
      })

      it('should handle empty resource', () => {
        const info = rm.getStorageInfo('wood')
        expect(info.current).toBe(0)
        expect(info.max).toBe(100)
        expect(info.percentage).toBe(0)
      })

      it('should handle increased storage limit', () => {
        rm.addStorageBonus('wood', 100)
        rm.add('wood', 150)
        const info = rm.getStorageInfo('wood')
        expect(info.current).toBe(150)
        expect(info.max).toBe(200)
        expect(info.percentage).toBe(75)
      })
    })

    describe('getState() and loadState()', () => {
      it('should save and restore storage bonuses', () => {
        rm.addStorageBonus('wood', 50)
        rm.addStorageBonus('stone', 100)
        rm.add('wood', 120)

        const state = rm.getState()
        const newRm = new ResourceManager()
        newRm.loadState(state)

        expect(newRm.getStorageLimit('wood')).toBe(150)
        expect(newRm.getStorageLimit('stone')).toBe(200)
        expect(newRm.get('wood')).toBe(120)
      })

      it('should handle empty state', () => {
        const newRm = new ResourceManager()
        newRm.loadState({})
        expect(newRm.getStorageLimit('wood')).toBe(100)
      })

      it('should preserve storage bonuses across save/load cycles', () => {
        rm.addStorageBonus('wood', 50)
        const state1 = rm.getState()
        rm.loadState(state1)
        expect(rm.getStorageLimit('wood')).toBe(150)

        const state2 = rm.getState()
        rm.loadState(state2)
        expect(rm.getStorageLimit('wood')).toBe(150)
      })
    })
  })
})
