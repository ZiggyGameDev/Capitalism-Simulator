/**
 * Resource Node Definitions
 * Defines all harvestable resource locations in the game world
 *
 * Canvas dimensions: 900x600
 * Home position (right): x: 850, y: 300
 * Resource nodes (left side): x: 50-250
 */

export const resourceNodeDefinitions = [
  // ========== FARMING (Early Game) ==========
  {
    id: 'wheat_field_1',
    type: 'wheat',
    name: 'Wheat Field',
    icon: '🌾',
    position: { x: 100, y: 150 },
    startingAmount: 5,
    baseCapacity: 20,
    baseSpawnRate: 0.5, // per second
    harvestTime: 2, // seconds
    outputs: { wheat: 1 },
    requiredSkillLevel: 1,
    requiredSkillId: 'farming',
    color: '#f39c12' // Golden yellow
  },

  // ========== WOODCUTTING ==========
  {
    id: 'oak_tree_1',
    type: 'wood',
    name: 'Oak Tree',
    icon: '🌳',
    position: { x: 150, y: 250 },
    startingAmount: 3,
    baseCapacity: 15,
    baseSpawnRate: 0.3, // per second
    harvestTime: 3, // seconds
    outputs: { wood: 1 },
    requiredSkillLevel: 1,
    requiredSkillId: 'woodcutting',
    color: '#27ae60' // Forest green
  },

  {
    id: 'pine_tree_1',
    type: 'wood',
    name: 'Pine Tree',
    icon: '🌲',
    position: { x: 200, y: 350 },
    startingAmount: 3,
    baseCapacity: 15,
    baseSpawnRate: 0.3,
    harvestTime: 3,
    outputs: { wood: 1 },
    requiredSkillLevel: 1,
    requiredSkillId: 'woodcutting',
    color: '#229954' // Dark green
  },

  // ========== MINING ==========
  {
    id: 'stone_deposit_1',
    type: 'stone',
    name: 'Stone Deposit',
    icon: '🪨',
    position: { x: 80, y: 400 },
    startingAmount: 2,
    baseCapacity: 12,
    baseSpawnRate: 0.25,
    harvestTime: 4, // seconds
    outputs: { stone: 1 },
    requiredSkillLevel: 1,
    requiredSkillId: 'mining',
    color: '#7f8c8d' // Gray
  },

  {
    id: 'iron_vein_1',
    type: 'iron',
    name: 'Iron Vein',
    icon: '⛏️',
    position: { x: 120, y: 500 },
    startingAmount: 1,
    baseCapacity: 10,
    baseSpawnRate: 0.2,
    harvestTime: 5,
    outputs: { iron: 1 },
    requiredSkillLevel: 5,
    requiredSkillId: 'mining',
    color: '#95a5a6' // Light gray
  },

  // ========== ADVANCED FARMING ==========
  {
    id: 'wheat_field_2',
    type: 'wheat',
    name: 'Large Wheat Field',
    icon: '🌾',
    position: { x: 180, y: 100 },
    startingAmount: 8,
    baseCapacity: 30,
    baseSpawnRate: 0.6,
    harvestTime: 2,
    outputs: { wheat: 1 },
    requiredSkillLevel: 10,
    requiredSkillId: 'farming',
    color: '#f39c12'
  },

  {
    id: 'carrot_patch_1',
    type: 'carrot',
    name: 'Carrot Patch',
    icon: '🥕',
    position: { x: 220, y: 180 },
    startingAmount: 4,
    baseCapacity: 15,
    baseSpawnRate: 0.4,
    harvestTime: 2.5,
    outputs: { carrot: 1 },
    requiredSkillLevel: 15,
    requiredSkillId: 'farming',
    color: '#e67e22' // Orange
  },

  // ========== ADVANCED WOODCUTTING ==========
  {
    id: 'mahogany_tree_1',
    type: 'wood',
    name: 'Mahogany Tree',
    icon: '🌴',
    position: { x: 140, y: 450 },
    startingAmount: 2,
    baseCapacity: 10,
    baseSpawnRate: 0.15,
    harvestTime: 6,
    outputs: { wood: 2 }, // Higher yield
    requiredSkillLevel: 20,
    requiredSkillId: 'woodcutting',
    color: '#a0522d' // Sienna brown
  },

  // ========== ADVANCED MINING ==========
  {
    id: 'coal_deposit_1',
    type: 'coal',
    name: 'Coal Deposit',
    icon: '🪨',
    position: { x: 60, y: 480 },
    startingAmount: 2,
    baseCapacity: 12,
    baseSpawnRate: 0.2,
    harvestTime: 5,
    outputs: { coal: 1 },
    requiredSkillLevel: 25,
    requiredSkillId: 'mining',
    color: '#2c3e50' // Dark slate
  },

  {
    id: 'gold_vein_1',
    type: 'gold',
    name: 'Gold Vein',
    icon: '💎',
    position: { x: 90, y: 550 },
    startingAmount: 1,
    baseCapacity: 8,
    baseSpawnRate: 0.1,
    harvestTime: 8,
    outputs: { gold: 1 },
    requiredSkillLevel: 30,
    requiredSkillId: 'mining',
    color: '#f1c40f' // Gold yellow
  },

  // ========== HIGH-LEVEL RESOURCES ==========
  {
    id: 'crystal_formation_1',
    type: 'crystal',
    name: 'Crystal Formation',
    icon: '💠',
    position: { x: 240, y: 520 },
    startingAmount: 1,
    baseCapacity: 6,
    baseSpawnRate: 0.08,
    harvestTime: 10,
    outputs: { crystal: 1 },
    requiredSkillLevel: 40,
    requiredSkillId: 'mining',
    color: '#8e44ad' // Purple
  },

  {
    id: 'ancient_tree_1',
    type: 'wood',
    name: 'Ancient Tree',
    icon: '🌳',
    position: { x: 190, y: 300 },
    startingAmount: 1,
    baseCapacity: 8,
    baseSpawnRate: 0.1,
    harvestTime: 8,
    outputs: { wood: 3 }, // Highest wood yield
    requiredSkillLevel: 50,
    requiredSkillId: 'woodcutting',
    color: '#16a085' // Teal
  }
]

/**
 * Get all nodes for a specific skill
 * @param {string} skillId
 * @returns {Array}
 */
export function getNodesForSkill(skillId) {
  return resourceNodeDefinitions.filter(node => node.requiredSkillId === skillId)
}

/**
 * Get nodes unlocked at or below a skill level
 * @param {string} skillId
 * @param {number} level
 * @returns {Array}
 */
export function getUnlockedNodesForSkill(skillId, level) {
  return resourceNodeDefinitions.filter(
    node => node.requiredSkillId === skillId && node.requiredSkillLevel <= level
  )
}

/**
 * Get node by ID
 * @param {string} nodeId
 * @returns {Object|undefined}
 */
export function getNodeDefinition(nodeId) {
  return resourceNodeDefinitions.find(node => node.id === nodeId)
}
