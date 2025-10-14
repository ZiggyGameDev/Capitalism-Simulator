import { xpForLevel, levelFromXP, calculateTotalLevel } from '../utils/calculations.js'

/**
 * Manages skill XP, levels, and unlocks
 */
export class SkillManager {
  constructor(skillDefinitions, activityDefinitions, eventBus) {
    this.skillDefinitions = skillDefinitions || []
    this.activityDefinitions = activityDefinitions || []
    this.eventBus = eventBus

    // Initialize skill states
    this.skills = {}
    this.skillDefinitions.forEach(skill => {
      this.skills[skill.id] = {
        xp: 0,
        level: 1
      }
    })
  }

  /**
   * Add XP to a skill
   * @param {string} skillId - Skill identifier
   * @param {number} amount - XP to add
   */
  addXP(skillId, amount) {
    if (!this.skills[skillId]) {
      return  // Skill doesn't exist
    }

    const oldLevel = this.skills[skillId].level
    this.skills[skillId].xp += amount
    const newLevel = levelFromXP(this.skills[skillId].xp)
    this.skills[skillId].level = newLevel

    // Emit XP gained event
    if (this.eventBus) {
      this.eventBus.emit('skill:xpGained', {
        skillId,
        xpGained: amount,
        totalXP: this.skills[skillId].xp
      })
    }

    // Emit level up event if leveled
    if (newLevel > oldLevel && this.eventBus) {
      this.eventBus.emit('skill:levelup', {
        skillId,
        newLevel,
        oldLevel
      })
    }
  }

  /**
   * Get current level of a skill
   * @param {string} skillId - Skill identifier
   * @returns {number} Current level
   */
  getLevel(skillId) {
    if (!this.skills[skillId]) return 1
    return this.skills[skillId].level
  }

  /**
   * Get current XP of a skill
   * @param {string} skillId - Skill identifier
   * @returns {number} Current XP
   */
  getXP(skillId) {
    if (!this.skills[skillId]) return 0
    return this.skills[skillId].xp
  }

  /**
   * Get XP progress to next level
   * @param {string} skillId - Skill identifier
   * @returns {Object} {current, needed, percent}
   */
  getXPProgress(skillId) {
    const currentXP = this.getXP(skillId)
    const currentLevel = this.getLevel(skillId)
    const xpForCurrentLevel = xpForLevel(currentLevel)
    const xpForNextLevel = xpForLevel(currentLevel + 1)

    const current = currentXP
    const needed = xpForNextLevel
    const xpIntoLevel = currentXP - xpForCurrentLevel
    const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel
    const percent = xpNeededForLevel > 0 ? xpIntoLevel / xpNeededForLevel : 0

    return {
      current,
      needed,
      percent: Math.max(0, Math.min(1, percent))
    }
  }

  /**
   * Check if an activity is unlocked
   * @param {string} activityId - Activity identifier
   * @returns {boolean} True if unlocked
   */
  isActivityUnlocked(activityId) {
    const activity = this.activityDefinitions.find(a => a.id === activityId)
    if (!activity) return false

    const skillLevel = this.getLevel(activity.skillId)
    return skillLevel >= activity.levelRequired
  }

  /**
   * Get overall player level (sum of all skill levels)
   * @returns {number} Total player level
   */
  getPlayerLevel() {
    return calculateTotalLevel(this.skills)
  }

  /**
   * Get all skill states
   * @returns {Object} All skills
   */
  getAllSkills() {
    return { ...this.skills }
  }

  /**
   * Reset all skills
   */
  reset() {
    this.skillDefinitions.forEach(skill => {
      this.skills[skill.id] = {
        xp: 0,
        level: 1
      }
    })
  }

  /**
   * Get complete skill information
   * @param {string} skillId - Skill identifier
   * @returns {Object} Skill info
   */
  getSkillInfo(skillId) {
    const skillDef = this.skillDefinitions.find(s => s.id === skillId)
    if (!skillDef) return null

    return {
      id: skillId,
      name: skillDef.name,
      xp: this.getXP(skillId),
      level: this.getLevel(skillId),
      xpProgress: this.getXPProgress(skillId)
    }
  }
}
