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
  })
})
