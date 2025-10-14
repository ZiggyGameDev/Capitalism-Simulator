import { describe, it, expect, beforeEach } from 'vitest'
import { CurrencyManager } from '../../../src/managers/CurrencyManager.js'

describe('CurrencyManager', () => {
  let cm

  beforeEach(() => {
    cm = new CurrencyManager()
  })

  describe('add()', () => {
    it('should add currency to empty manager', () => {
      cm.add('wood', 10)
      expect(cm.get('wood')).toBe(10)
    })

    it('should accumulate currency', () => {
      cm.add('wood', 10)
      cm.add('wood', 5)
      expect(cm.get('wood')).toBe(15)
    })

    it('should handle multiple currency types', () => {
      cm.add('wood', 10)
      cm.add('stone', 5)
      expect(cm.get('wood')).toBe(10)
      expect(cm.get('stone')).toBe(5)
    })

    it('should handle decimal amounts', () => {
      cm.add('wood', 10.5)
      cm.add('wood', 2.3)
      expect(cm.get('wood')).toBeCloseTo(12.8, 1)
    })

    it('should handle negative amounts (subtract)', () => {
      cm.add('wood', 10)
      cm.add('wood', -3)
      expect(cm.get('wood')).toBe(7)
    })

    it('should not allow negative totals', () => {
      cm.add('wood', 10)
      cm.add('wood', -15)
      expect(cm.get('wood')).toBe(0)
    })
  })

  describe('subtract()', () => {
    it('should subtract currency', () => {
      cm.add('wood', 10)
      const success = cm.subtract('wood', 3)
      expect(success).toBe(true)
      expect(cm.get('wood')).toBe(7)
    })

    it('should fail if insufficient currency', () => {
      cm.add('wood', 5)
      const success = cm.subtract('wood', 10)
      expect(success).toBe(false)
      expect(cm.get('wood')).toBe(5)  // Unchanged
    })

    it('should handle subtracting non-existent currency', () => {
      const success = cm.subtract('wood', 5)
      expect(success).toBe(false)
    })

    it('should handle subtracting exact amount', () => {
      cm.add('wood', 10)
      const success = cm.subtract('wood', 10)
      expect(success).toBe(true)
      expect(cm.get('wood')).toBe(0)
    })
  })

  describe('set()', () => {
    it('should set currency to exact amount', () => {
      cm.set('wood', 100)
      expect(cm.get('wood')).toBe(100)
    })

    it('should overwrite existing amount', () => {
      cm.add('wood', 50)
      cm.set('wood', 100)
      expect(cm.get('wood')).toBe(100)
    })

    it('should not allow negative amounts', () => {
      cm.set('wood', -10)
      expect(cm.get('wood')).toBe(0)
    })
  })

  describe('get()', () => {
    it('should return 0 for non-existent currency', () => {
      expect(cm.get('wood')).toBe(0)
    })

    it('should return current amount', () => {
      cm.add('wood', 25)
      expect(cm.get('wood')).toBe(25)
    })
  })

  describe('has()', () => {
    it('should return true if sufficient currency', () => {
      cm.add('wood', 10)
      expect(cm.has('wood', 5)).toBe(true)
      expect(cm.has('wood', 10)).toBe(true)
    })

    it('should return false if insufficient', () => {
      cm.add('wood', 5)
      expect(cm.has('wood', 10)).toBe(false)
    })

    it('should return false for non-existent currency', () => {
      expect(cm.has('wood', 1)).toBe(false)
    })

    it('should return true for zero amount check', () => {
      expect(cm.has('wood', 0)).toBe(true)
    })
  })

  describe('canAfford()', () => {
    it('should return true if can afford all costs', () => {
      cm.add('wood', 10)
      cm.add('stone', 5)
      expect(cm.canAfford({ wood: 5, stone: 2 })).toBe(true)
    })

    it('should return false if missing any currency', () => {
      cm.add('wood', 10)
      cm.add('stone', 5)
      expect(cm.canAfford({ wood: 5, stone: 10 })).toBe(false)
    })

    it('should handle empty cost object', () => {
      expect(cm.canAfford({})).toBe(true)
    })

    it('should handle single currency cost', () => {
      cm.add('wood', 10)
      expect(cm.canAfford({ wood: 5 })).toBe(true)
      expect(cm.canAfford({ wood: 15 })).toBe(false)
    })
  })

  describe('spendCosts()', () => {
    it('should spend multiple currencies if affordable', () => {
      cm.add('wood', 10)
      cm.add('stone', 5)
      const success = cm.spendCosts({ wood: 3, stone: 2 })

      expect(success).toBe(true)
      expect(cm.get('wood')).toBe(7)
      expect(cm.get('stone')).toBe(3)
    })

    it('should not spend if cannot afford', () => {
      cm.add('wood', 10)
      cm.add('stone', 5)
      const success = cm.spendCosts({ wood: 15, stone: 2 })

      expect(success).toBe(false)
      expect(cm.get('wood')).toBe(10)  // Unchanged
      expect(cm.get('stone')).toBe(5)   // Unchanged
    })

    it('should handle empty costs', () => {
      const success = cm.spendCosts({})
      expect(success).toBe(true)
    })
  })

  describe('getAll()', () => {
    it('should return all currencies', () => {
      cm.add('wood', 10)
      cm.add('stone', 5)
      expect(cm.getAll()).toEqual({ wood: 10, stone: 5 })
    })

    it('should return empty object if no currencies', () => {
      expect(cm.getAll()).toEqual({})
    })
  })

  describe('reset()', () => {
    it('should clear all currencies', () => {
      cm.add('wood', 10)
      cm.add('stone', 5)
      cm.reset()
      expect(cm.getAll()).toEqual({})
    })
  })
})
