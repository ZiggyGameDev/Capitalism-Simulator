/**
 * Upgrade definitions
 * Upgrades improve activities through speed boosts, output increases, or cost reduction
 */

export const upgrades = [
  // ========== WOODCUTTING UPGRADES ==========
  {
    id: 'chopNormalTreeSpeed1',
    name: 'Stone Axe',
    description: 'Chop normal trees 20% faster',
    activityId: 'chopNormalTree',
    type: 'speed',
    value: 0.2, // 20% faster
    cost: { wood: 20 },
    skillRequired: { woodcutting: 3 }
  },
  {
    id: 'chopNormalTreeSpeed2',
    name: 'Iron Axe',
    description: 'Chop normal trees 40% faster',
    activityId: 'chopNormalTree',
    type: 'speed',
    value: 0.4,
    cost: { wood: 50, ironOre: 10 },
    skillRequired: { woodcutting: 10 },
    prerequisite: 'chopNormalTreeSpeed1' // Must buy previous upgrade first
  },
  {
    id: 'chopNormalTreeOutput1',
    name: 'Efficient Chopping',
    description: 'Get 1 extra wood per chop',
    activityId: 'chopNormalTree',
    type: 'outputBonus',
    value: { wood: 1 },
    cost: { wood: 100 },
    skillRequired: { woodcutting: 15 }
  },

  // ========== MINING UPGRADES ==========
  {
    id: 'mineCopperSpeed1',
    name: 'Stone Pickaxe',
    description: 'Mine copper 25% faster',
    activityId: 'mineCopperOre',
    type: 'speed',
    value: 0.25,
    cost: { copperOre: 20 },
    skillRequired: { mining: 5 }
  },
  {
    id: 'mineCopperOutput1',
    name: 'Vein Detection',
    description: 'Get 1 extra copper ore per mine',
    activityId: 'mineCopperOre',
    type: 'outputBonus',
    value: { copperOre: 1 },
    cost: { copperOre: 50, tinOre: 25 },
    skillRequired: { mining: 10 }
  },

  // ========== FISHING UPGRADES ==========
  {
    id: 'catchShrimpSpeed1',
    name: 'Better Net',
    description: 'Catch shrimp 30% faster',
    activityId: 'catchShrimp',
    type: 'speed',
    value: 0.3,
    cost: { shrimp: 30 },
    skillRequired: { fishing: 5 }
  },
  {
    id: 'catchShrimpOutput1',
    name: 'Double Hook',
    description: 'Catch 1 extra shrimp',
    activityId: 'catchShrimp',
    type: 'outputBonus',
    value: { shrimp: 1 },
    cost: { shrimp: 100, copperOre: 20 },
    skillRequired: { fishing: 12 }
  },

  // ========== COOKING UPGRADES ==========
  {
    id: 'cookShrimpSpeed1',
    name: 'Hot Coals',
    description: 'Cook shrimp 25% faster',
    activityId: 'cookShrimp',
    type: 'speed',
    value: 0.25,
    cost: { coal: 10, shrimp: 20 },
    skillRequired: { cooking: 5 }
  },
  {
    id: 'cookShrimpCost1',
    name: 'Waste Reduction',
    description: 'Cook shrimp with 50% less ingredients (rounds down)',
    activityId: 'cookShrimp',
    type: 'costReduction',
    value: 0.5,
    cost: { cookedShrimp: 50 },
    skillRequired: { cooking: 15 }
  },

  // ========== DOG HANDLING UPGRADES ==========
  {
    id: 'trainGuardDogSpeed1',
    name: 'Training Manual',
    description: 'Train guard dogs 30% faster',
    activityId: 'trainGuardDog',
    type: 'speed',
    value: 0.3,
    cost: { guardDog: 5, wood: 50 },
    skillRequired: { dogHandling: 10 }
  },
  {
    id: 'trainGuardDogOutput1',
    name: 'Bonus Treats',
    description: 'Get 1 extra bone per training',
    activityId: 'trainGuardDog',
    type: 'outputBonus',
    value: { bones: 1 },
    cost: { guardDog: 10, cookedShrimp: 50 },
    skillRequired: { dogHandling: 15 }
  }
]
