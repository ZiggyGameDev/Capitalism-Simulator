/**
 * Achievement definitions
 * Achievements track player milestones and award rewards when completed
 */

export const achievements = [
  // ========== SKILL LEVEL ACHIEVEMENTS ==========
  {
    id: 'woodcutter',
    name: 'Woodcutter',
    description: 'Reach level 5 in Woodcutting',
    type: 'skillLevel',
    requirement: { skillId: 'woodcutting', level: 5 },
    reward: { wood: 50 },
    icon: '🪓'
  },
  {
    id: 'master_woodcutter',
    name: 'Master Woodcutter',
    description: 'Reach level 20 in Woodcutting',
    type: 'skillLevel',
    requirement: { skillId: 'woodcutting', level: 20 },
    reward: { oakWood: 100 },
    icon: '🪓'
  },
  {
    id: 'miner',
    name: 'Miner',
    description: 'Reach level 5 in Mining',
    type: 'skillLevel',
    requirement: { skillId: 'mining', level: 5 },
    reward: { copperOre: 50 },
    icon: '⛏️'
  },
  {
    id: 'master_miner',
    name: 'Master Miner',
    description: 'Reach level 20 in Mining',
    type: 'skillLevel',
    requirement: { skillId: 'mining', level: 20 },
    reward: { ironOre: 100 },
    icon: '⛏️'
  },
  {
    id: 'fisherman',
    name: 'Fisherman',
    description: 'Reach level 5 in Fishing',
    type: 'skillLevel',
    requirement: { skillId: 'fishing', level: 5 },
    reward: { shrimp: 50 },
    icon: '🎣'
  },
  {
    id: 'chef',
    name: 'Chef',
    description: 'Reach level 10 in Cooking',
    type: 'skillLevel',
    requirement: { skillId: 'cooking', level: 10 },
    reward: { cookedShrimp: 50 },
    icon: '🍳'
  },
  {
    id: 'dog_trainer',
    name: 'Dog Trainer',
    description: 'Reach level 10 in Dog Handling',
    type: 'skillLevel',
    requirement: { skillId: 'dogHandling', level: 10 },
    reward: { puppy: 10 },
    icon: '🐕'
  },

  // ========== ACTIVITY COMPLETION ACHIEVEMENTS ==========
  {
    id: 'lumber_jack',
    name: 'Lumber Jack',
    description: 'Complete 100 woodcutting activities',
    type: 'activityCount',
    requirement: { skillId: 'woodcutting', count: 100 },
    reward: { wood: 100, oakWood: 50 },
    icon: '🌲'
  },
  {
    id: 'ore_collector',
    name: 'Ore Collector',
    description: 'Complete 100 mining activities',
    type: 'activityCount',
    requirement: { skillId: 'mining', count: 100 },
    reward: { copperOre: 100, tinOre: 100 },
    icon: '⛰️'
  },
  {
    id: 'master_fisher',
    name: 'Master Fisher',
    description: 'Complete 200 fishing activities',
    type: 'activityCount',
    requirement: { skillId: 'fishing', count: 200 },
    reward: { shrimp: 200 },
    icon: '🐟'
  },

  // ========== CURRENCY ACHIEVEMENTS ==========
  {
    id: 'wood_hoarder',
    name: 'Wood Hoarder',
    description: 'Collect 1000 wood (total earned)',
    type: 'currencyEarned',
    requirement: { currencyId: 'wood', amount: 1000 },
    reward: { wood: 200 },
    icon: '🪵'
  },
  {
    id: 'ore_baron',
    name: 'Ore Baron',
    description: 'Collect 500 copper ore (total earned)',
    type: 'currencyEarned',
    requirement: { currencyId: 'copperOre', amount: 500 },
    reward: { ironOre: 100 },
    icon: '💎'
  },

  // ========== UPGRADE ACHIEVEMENTS ==========
  {
    id: 'first_upgrade',
    name: 'First Upgrade',
    description: 'Purchase your first upgrade',
    type: 'upgradeCount',
    requirement: { count: 1 },
    reward: { wood: 50, copperOre: 50 },
    icon: '⬆️'
  },
  {
    id: 'upgrade_enthusiast',
    name: 'Upgrade Enthusiast',
    description: 'Purchase 5 upgrades',
    type: 'upgradeCount',
    requirement: { count: 5 },
    reward: { wood: 200, copperOre: 200, shrimp: 100 },
    icon: '⬆️'
  },

  // ========== MILESTONE ACHIEVEMENTS ==========
  {
    id: 'getting_started',
    name: 'Getting Started',
    description: 'Reach total level 10',
    type: 'totalLevel',
    requirement: { level: 10 },
    reward: { wood: 100, copperOre: 100, shrimp: 100 },
    icon: '🌟'
  },
  {
    id: 'experienced_player',
    name: 'Experienced Player',
    description: 'Reach total level 50',
    type: 'totalLevel',
    requirement: { level: 50 },
    reward: { wood: 500, oakWood: 200, ironOre: 200, cookedShrimp: 200 },
    icon: '🌟'
  },
  {
    id: 'jack_of_all_trades',
    name: 'Jack of All Trades',
    description: 'Reach level 5 in all skills',
    type: 'allSkillsLevel',
    requirement: { level: 5 },
    reward: { wood: 200, copperOre: 200, shrimp: 200, cookedShrimp: 100, puppy: 5 },
    icon: '🎯'
  }
]
