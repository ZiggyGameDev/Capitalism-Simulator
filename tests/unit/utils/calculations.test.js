import { describe, it, expect } from 'vitest'
import { xpForLevel, levelFromXP, calculateTotalLevel } from '../../../src/utils/calculations.js'

describe('XP Calculations', () => {
  describe('xpForLevel()', () => {
    it('should return 0 for level 1', () => {
      expect(xpForLevel(1)).toBe(0)
    })

    it('should return 100 for level 2', () => {
      expect(xpForLevel(2)).toBe(100)
    })

    it('should return 114 for level 3', () => {
      expect(xpForLevel(3)).toBe(114)
    })

    it('should use exponential growth', () => {
      expect(xpForLevel(5)).toBe(152)
      expect(xpForLevel(10)).toBe(305)
    })

    it('should handle high levels', () => {
      const xp50 = xpForLevel(50)
      expect(xp50).toBeGreaterThan(81000)
      expect(xp50).toBeLessThan(82000)
    })

    it('should return 0 for level 0 or below', () => {
      expect(xpForLevel(0)).toBe(0)
      expect(xpForLevel(-5)).toBe(0)
    })
  })

  describe('levelFromXP()', () => {
    it('should return 1 for 0 XP', () => {
      expect(levelFromXP(0)).toBe(1)
    })

    it('should return 1 for XP less than level 2 threshold', () => {
      expect(levelFromXP(50)).toBe(1)
      expect(levelFromXP(99)).toBe(1)
    })

    it('should return 2 for 100 XP', () => {
      expect(levelFromXP(100)).toBe(2)
    })

    it('should return correct level for XP thresholds', () => {
      expect(levelFromXP(100)).toBe(2)  // Exactly at threshold
      expect(levelFromXP(152)).toBe(5)
      expect(levelFromXP(305)).toBe(10)
    })

    it('should handle XP between levels', () => {
      expect(levelFromXP(120)).toBe(3)  // 114 < 120 < 131
      expect(levelFromXP(250)).toBe(8)  // Between levels
    })

    it('should handle high XP values', () => {
      const level = levelFromXP(50000)
      expect(level).toBeGreaterThan(30)
      expect(level).toBeLessThan(60)
    })

    it('should return 1 for negative XP', () => {
      expect(levelFromXP(-100)).toBe(1)
    })
  })

  describe('calculateTotalLevel()', () => {
    it('should return 0 for empty skills object', () => {
      expect(calculateTotalLevel({})).toBe(0)
    })

    it('should return sum of all skill levels', () => {
      const skills = {
        woodcutting: { level: 5, xp: 250 },
        mining: { level: 3, xp: 130 },
        fishing: { level: 8, xp: 500 }
      }
      expect(calculateTotalLevel(skills)).toBe(16)  // 5 + 3 + 8
    })

    it('should handle single skill', () => {
      const skills = {
        woodcutting: { level: 10, xp: 404 }
      }
      expect(calculateTotalLevel(skills)).toBe(10)
    })

    it('should ignore skills with no level property', () => {
      const skills = {
        woodcutting: { level: 5, xp: 250 },
        invalid: { xp: 100 }  // No level property
      }
      expect(calculateTotalLevel(skills)).toBe(5)
    })
  })
})
