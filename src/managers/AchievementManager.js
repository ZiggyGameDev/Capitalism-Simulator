/**
 * Manages achievement tracking and unlocking
 */
export class AchievementManager {
  constructor(achievementDefinitions, eventBus) {
    this.achievementDefinitions = achievementDefinitions || []
    this.eventBus = eventBus
    this.unlocked = []
    this.stats = {
      resourcesEarned: {},
      activitiesCompleted: {}
    }
  }

  /**
   * Check if an achievement is unlocked
   */
  isUnlocked(achievementId) {
    return this.unlocked.includes(achievementId)
  }

  /**
   * Track resource earned
   */
  trackResource(resourceId, amount) {
    this.stats.resourcesEarned[resourceId] = (this.stats.resourcesEarned[resourceId] || 0) + amount
  }

  /**
   * Track activity completed
   */
  trackActivity(skillId) {
    this.stats.activitiesCompleted[skillId] = (this.stats.activitiesCompleted[skillId] || 0) + 1
  }

  /**
   * Check specific achievement
   */
  checkAchievement(achievementId, gameState) {
    if (this.isUnlocked(achievementId)) return false

    const achievement = this.achievementDefinitions.find(a => a.id === achievementId)
    if (!achievement) return false

    let requirementMet = false

    switch (achievement.type) {
      case 'skillLevel':
        const skill = gameState.skills[achievement.requirement.skillId]
        requirementMet = skill && skill.level >= achievement.requirement.level
        break

      case 'resourceEarned':
        const earned = this.stats.resourcesEarned[achievement.requirement.resourceId] || 0
        requirementMet = earned >= achievement.requirement.amount
        break

      case 'activityCount':
        const count = this.stats.activitiesCompleted[achievement.requirement.skillId] || 0
        requirementMet = count >= achievement.requirement.count
        break

      case 'upgradeCount':
        const upgrades = gameState.upgrades?.purchased || []
        requirementMet = upgrades.length >= achievement.requirement.count
        break

      case 'totalLevel':
        let totalLevel = 0
        Object.values(gameState.skills).forEach(skill => {
          totalLevel += skill.level || 1
        })
        requirementMet = totalLevel >= achievement.requirement.level
        break

      case 'allSkillsLevel':
        requirementMet = Object.values(gameState.skills).every(skill =>
          (skill.level || 1) >= achievement.requirement.level
        )
        break
    }

    if (requirementMet) {
      this.unlocked.push(achievementId)
      if (this.eventBus) {
        this.eventBus.emit('achievement:unlocked', {
          achievementId,
          achievement,
          reward: achievement.reward
        })
      }
      return true
    }

    return false
  }

  /**
   * Check all achievements
   */
  checkAll(gameState) {
    const newlyUnlocked = []
    for (const achievement of this.achievementDefinitions) {
      if (this.checkAchievement(achievement.id, gameState)) {
        newlyUnlocked.push(achievement)
      }
    }
    return newlyUnlocked
  }

  /**
   * Get state for saving
   */
  getState() {
    return {
      unlocked: [...this.unlocked],
      stats: {
        resourcesEarned: { ...this.stats.resourcesEarned },
        activitiesCompleted: { ...this.stats.activitiesCompleted }
      }
    }
  }

  /**
   * Load state
   */
  loadState(state) {
    if (state.unlocked) {
      this.unlocked = [...state.unlocked]
    }
    if (state.stats) {
      this.stats = {
        resourcesEarned: { ...(state.stats.resourcesEarned || state.stats.currenciesEarned || {}) },
        activitiesCompleted: { ...state.stats.activitiesCompleted }
      }
    }
  }

  /**
   * Reset all achievements
   */
  reset() {
    this.unlocked = []
    this.stats = {
      resourcesEarned: {},
      activitiesCompleted: {}
    }
  }
}
