/**
 * Calculate the XP required to reach a specific level
 * Simple exponential: 100 * 1.15^(level-2)
 * Level 2=100, Level 3=115, Level 5=152, Level 10=380, Level 50=94231
 * @param {number} level - The target level
 * @returns {number} XP required to reach that level
 */
export function xpForLevel(level) {
  if (level <= 1) return 0
  return Math.floor(100 * Math.pow(1.15, level - 2))
}

/**
 * Calculate the level from a given XP amount
 * @param {number} xp - The current XP
 * @returns {number} The current level
 */
export function levelFromXP(xp) {
  if (xp <= 0) return 1

  let level = 1
  let xpNeeded = xpForLevel(level + 1)

  while (xp >= xpNeeded) {
    level++
    xpNeeded = xpForLevel(level + 1)
  }

  return level
}

/**
 * Calculate the total player level (sum of all skill levels)
 * @param {Object} skills - Skills object with level properties
 * @returns {number} Sum of all skill levels
 */
export function calculateTotalLevel(skills) {
  return Object.values(skills).reduce((sum, skill) => {
    return sum + (skill.level || 0)
  }, 0)
}
