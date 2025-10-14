/**
 * All activity definitions
 * Activities are time-based actions that consume/produce currencies and grant XP
 */

export const activities = [
  // ========== WOODCUTTING ==========
  {
    id: 'chopNormalTree',
    name: 'Chop Normal Tree',
    skillId: 'woodcutting',
    levelRequired: 1,
    inputs: {},  // FREE
    outputs: { wood: 1 },
    duration: 2,  // seconds
    xpGained: 5,
    description: 'Chop a basic tree for wood'
  },
  {
    id: 'chopOakTree',
    name: 'Chop Oak Tree',
    skillId: 'woodcutting',
    levelRequired: 5,
    inputs: {},  // FREE
    outputs: { oakWood: 1 },
    duration: 3,
    xpGained: 8,
    description: 'Chop an oak tree for stronger wood'
  },

  // ========== MINING ==========
  {
    id: 'mineCopperOre',
    name: 'Mine Copper Ore',
    skillId: 'mining',
    levelRequired: 1,
    inputs: {},  // FREE
    outputs: { copperOre: 1 },
    duration: 2,
    xpGained: 5,
    description: 'Mine common copper ore'
  },
  {
    id: 'mineTinOre',
    name: 'Mine Tin Ore',
    skillId: 'mining',
    levelRequired: 1,
    inputs: {},  // FREE
    outputs: { tinOre: 1 },
    duration: 2,
    xpGained: 5,
    description: 'Mine common tin ore'
  },
  {
    id: 'mineIronOre',
    name: 'Mine Iron Ore',
    skillId: 'mining',
    levelRequired: 10,
    inputs: {},  // FREE
    outputs: { ironOre: 1 },
    duration: 3,
    xpGained: 12,
    description: 'Mine useful iron ore'
  },
  {
    id: 'mineCoal',
    name: 'Mine Coal',
    skillId: 'mining',
    levelRequired: 20,
    inputs: {},  // FREE
    outputs: { coal: 1 },
    duration: 3,
    xpGained: 15,
    description: 'Mine coal for fuel'
  },

  // ========== FISHING ==========
  {
    id: 'catchShrimp',
    name: 'Catch Shrimp',
    skillId: 'fishing',
    levelRequired: 1,
    inputs: {},  // FREE
    outputs: { shrimp: 1 },
    duration: 2,
    xpGained: 5,
    description: 'Catch small shrimp'
  },
  {
    id: 'catchSardine',
    name: 'Catch Sardine',
    skillId: 'fishing',
    levelRequired: 5,
    inputs: {},  // FREE
    outputs: { sardine: 1 },
    duration: 2,
    xpGained: 8,
    description: 'Catch sardines'
  },
  {
    id: 'catchTrout',
    name: 'Catch Trout',
    skillId: 'fishing',
    levelRequired: 20,
    inputs: {},  // FREE
    outputs: { trout: 1 },
    duration: 3,
    xpGained: 18,
    description: 'Catch freshwater trout'
  },

  // ========== COOKING ==========
  {
    id: 'cookShrimp',
    name: 'Cook Shrimp',
    skillId: 'cooking',
    levelRequired: 1,
    inputs: { shrimp: 1 },
    outputs: { cookedShrimp: 1 },
    duration: 2,
    xpGained: 8,
    description: 'Cook raw shrimp'
  },
  {
    id: 'cookSardine',
    name: 'Cook Sardine',
    skillId: 'cooking',
    levelRequired: 10,
    inputs: { sardine: 1 },
    outputs: { cookedSardine: 1 },
    duration: 2,
    xpGained: 12,
    description: 'Cook sardines'
  },
  {
    id: 'cookTrout',
    name: 'Cook Trout',
    skillId: 'cooking',
    levelRequired: 25,
    inputs: { trout: 1 },
    outputs: { cookedTrout: 1 },
    duration: 3,
    xpGained: 25,
    description: 'Cook trout'
  },

  // ========== DOG HANDLING ==========
  {
    id: 'findPuppy',
    name: 'Find Stray Puppy',
    skillId: 'dogHandling',
    levelRequired: 1,
    inputs: {},  // FREE
    outputs: { puppy: 1 },
    duration: 3,
    xpGained: 8,
    description: 'Find a stray puppy'
  },
  {
    id: 'trainGuardDog',
    name: 'Train Guard Dog',
    skillId: 'dogHandling',
    levelRequired: 5,
    inputs: { puppy: 1, cookedShrimp: 3 },
    outputs: { guardDog: 1, bones: 2 },
    duration: 5,
    xpGained: 25,
    description: 'Train a puppy into a guard dog'
  }
]
