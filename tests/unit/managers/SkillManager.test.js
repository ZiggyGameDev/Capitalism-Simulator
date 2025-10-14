import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SkillManager } from '../../../src/managers/SkillManager.js'
import { EventBus } from '../../../src/core/EventBus.js'

describe('SkillManager', () => {
  let sm, eventBus
  const skills = [
    { id: 'woodcutting', name: 'Woodcutting' },
    { id: 'mining', name: 'Mining' },
    { id: 'fishing', name: 'Fishing' }
  ]
  const activities = [
    { id: 'chopTree', skillId: 'woodcutting', levelRequired: 1 },
    { id: 'chopOak', skillId: 'woodcutting', levelRequired: 5 },
    { id: 'mineCopperOre', skillId: 'mining', levelRequired: 1 },
    { id: 'mineIronOre', skillId: 'mining', levelRequired: 10 }
  ]

  beforeEach(() => {
    eventBus = new EventBus()
    sm = new SkillManager(skills, activities, eventBus)
  })

  describe('addXP()', () => {
    it('should add XP to skill', () => {
      sm.addXP('woodcutting', 50)
      expect(sm.getXP('woodcutting')).toBe(50)
    })

    it('should accumulate XP', () => {
      sm.addXP('woodcutting', 50)
      sm.addXP('woodcutting', 30)
      expect(sm.getXP('woodcutting')).toBe(80)
    })

    it('should level up when XP threshold reached', () => {
      sm.addXP('woodcutting', 100)  // Level 2 threshold
      expect(sm.getLevel('woodcutting')).toBe(2)
    })

    it('should emit levelup event', () => {
      const levelupSpy = vi.fn()
      eventBus.on('skill:levelup', levelupSpy)
      sm.addXP('woodcutting', 100)

      expect(levelupSpy).toHaveBeenCalledWith({
        skillId: 'woodcutting',
        newLevel: 2,
        oldLevel: 1
      })
    })

    it('should emit xpGained event', () => {
      const xpSpy = vi.fn()
      eventBus.on('skill:xpGained', xpSpy)
      sm.addXP('woodcutting', 50)

      expect(xpSpy).toHaveBeenCalledWith({
        skillId: 'woodcutting',
        xpGained: 50,
        totalXP: 50
      })
    })

    it('should level up multiple times if enough XP', () => {
      sm.addXP('woodcutting', 500)
      expect(sm.getLevel('woodcutting')).toBeGreaterThan(3)
    })

    it('should handle adding XP to non-existent skill', () => {
      sm.addXP('invalid', 100)
      expect(sm.getXP('invalid')).toBe(0)
    })
  })

  describe('getLevel()', () => {
    it('should return 1 for new skill', () => {
      expect(sm.getLevel('woodcutting')).toBe(1)
    })

    it('should calculate level from XP', () => {
      sm.addXP('woodcutting', 100)
      expect(sm.getLevel('woodcutting')).toBe(2)
    })

    it('should return 1 for non-existent skill', () => {
      expect(sm.getLevel('invalid')).toBe(1)
    })
  })

  describe('getXP()', () => {
    it('should return 0 for new skill', () => {
      expect(sm.getXP('woodcutting')).toBe(0)
    })

    it('should return current XP', () => {
      sm.addXP('woodcutting', 150)
      expect(sm.getXP('woodcutting')).toBe(150)
    })

    it('should return 0 for non-existent skill', () => {
      expect(sm.getXP('invalid')).toBe(0)
    })
  })

  describe('getXPProgress()', () => {
    it('should return progress to next level', () => {
      sm.addXP('woodcutting', 50)
      const progress = sm.getXPProgress('woodcutting')

      expect(progress.current).toBe(50)
      expect(progress.needed).toBe(100)  // Level 2 requires 100 XP
      expect(progress.percent).toBeCloseTo(0.5, 2)
    })

    it('should handle level thresholds correctly', () => {
      sm.addXP('woodcutting', 100)  // Exactly at level 2
      const progress = sm.getXPProgress('woodcutting')

      expect(progress.current).toBe(100)
      expect(progress.percent).toBe(0)  // 0% progress to next level
    })

    it('should handle high levels', () => {
      sm.addXP('woodcutting', 500)
      const progress = sm.getXPProgress('woodcutting')

      expect(progress.current).toBe(500)
      expect(progress.needed).toBeGreaterThan(500)
      expect(progress.percent).toBeGreaterThan(0)
      expect(progress.percent).toBeLessThan(1)
    })
  })

  describe('isActivityUnlocked()', () => {
    it('should return true if level requirement met', () => {
      sm.addXP('woodcutting', 500)  // Get to level 5+
      expect(sm.isActivityUnlocked('chopTree')).toBe(true)
      expect(sm.isActivityUnlocked('chopOak')).toBe(true)
    })

    it('should return false if level too low', () => {
      expect(sm.isActivityUnlocked('chopOak')).toBe(false)  // Requires level 5
    })

    it('should return true for level 1 activities', () => {
      expect(sm.isActivityUnlocked('chopTree')).toBe(true)
    })

    it('should handle non-existent activity', () => {
      expect(sm.isActivityUnlocked('invalid')).toBe(false)
    })
  })

  describe('getPlayerLevel()', () => {
    it('should return 0 initially', () => {
      expect(sm.getPlayerLevel()).toBe(3)  // 3 skills at level 1 each
    })

    it('should return sum of all skill levels', () => {
      sm.addXP('woodcutting', 100)  // Level 2
      sm.addXP('mining', 100)       // Level 2
      expect(sm.getPlayerLevel()).toBe(5)  // 2 + 2 + 1 (fishing)
    })
  })

  describe('getAllSkills()', () => {
    it('should return all skill states', () => {
      sm.addXP('woodcutting', 150)
      const allSkills = sm.getAllSkills()

      expect(allSkills.woodcutting).toEqual({
        xp: 150,
        level: expect.any(Number)
      })
      expect(allSkills.mining).toBeDefined()
      expect(allSkills.fishing).toBeDefined()
    })
  })

  describe('reset()', () => {
    it('should reset all skills', () => {
      sm.addXP('woodcutting', 500)
      sm.addXP('mining', 300)
      sm.reset()

      expect(sm.getXP('woodcutting')).toBe(0)
      expect(sm.getXP('mining')).toBe(0)
      expect(sm.getLevel('woodcutting')).toBe(1)
      expect(sm.getLevel('mining')).toBe(1)
    })
  })

  describe('getSkillInfo()', () => {
    it('should return complete skill information', () => {
      sm.addXP('woodcutting', 150)
      const info = sm.getSkillInfo('woodcutting')

      expect(info).toEqual({
        id: 'woodcutting',
        name: 'Woodcutting',
        xp: 150,
        level: expect.any(Number),
        xpProgress: expect.objectContaining({
          current: expect.any(Number),
          needed: expect.any(Number),
          percent: expect.any(Number)
        })
      })
    })
  })
})
