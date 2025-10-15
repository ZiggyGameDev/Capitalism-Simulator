/**
 * Building definitions for the city
 */

export const buildingTypes = [
  {
    id: 'house',
    name: 'House',
    emoji: '🏠',
    description: 'Generates workers over time',
    baseCost: { wood: 50, stone: 30 },
    costMultiplier: 1.5, // Each additional house costs 1.5x more
    constructionTime: 30, // seconds
    maxCount: 10, // Max houses in town
    unlockCondition: null, // Always unlocked

    // House-specific properties
    roomsPerHouse: 1, // Start with 1 room
    workersPerRoom: 5, // Max workers per room
    workerGenerationTime: 30, // seconds to generate 1 worker

    // Upgrades
    upgrades: [
      {
        id: 'house_extra_room',
        name: 'Extra Room',
        description: 'Add another room (5 more workers)',
        cost: { wood: 100, stone: 50 },
        effect: { roomsPerHouse: 1 },
        maxLevel: 3
      },
      {
        id: 'house_faster_generation',
        name: 'Better Beds',
        description: 'Workers rest faster (-5s generation time)',
        cost: { wood: 75, gold: 25 },
        effect: { workerGenerationTime: -5 },
        maxLevel: 4
      }
    ]
  },

  {
    id: 'warehouse',
    name: 'Warehouse',
    emoji: '📦',
    description: 'Increases storage capacity for all resources',
    baseCost: { wood: 30, stone: 20 },
    costMultiplier: 1.8,
    constructionTime: 45,
    maxCount: 10,
    unlockCondition: null, // Always unlocked

    // Warehouse-specific properties
    storageBonus: 50, // Adds +50 to all resource storage

    upgrades: [
      {
        id: 'warehouse_expansion',
        name: 'Warehouse Expansion',
        description: 'Adds +25 storage capacity',
        cost: { wood: 50, stone: 40 },
        effect: { storageBonus: 25 },
        maxLevel: 5
      },
      {
        id: 'warehouse_organization',
        name: 'Better Organization',
        description: 'Adds +50 storage capacity',
        cost: { wood: 100, stone: 80, iron: 20 },
        effect: { storageBonus: 50 },
        maxLevel: 3
      }
    ]
  },

  {
    id: 'tavern',
    name: 'Tavern',
    emoji: '🍺',
    description: 'Boosts worker morale and speed',
    baseCost: { wood: 100, stone: 75, gold: 50 },
    costMultiplier: 2.0,
    constructionTime: 90,
    maxCount: 3,
    unlockCondition: { type: 'resource_mined', resource: 'wood', amount: 500 },

    // Tavern effects
    effect: {
      workerSpeedBonus: 0.1 // 10% faster
    },

    upgrades: [
      {
        id: 'tavern_better_drinks',
        name: 'Premium Ale',
        description: 'Workers work 5% faster',
        cost: { gold: 100, wheat: 50 },
        effect: { workerSpeedBonus: 0.05 },
        maxLevel: 5
      },
      {
        id: 'tavern_entertainment',
        name: 'Entertainment',
        description: 'Attracts more workers (+1 worker per house room)',
        cost: { gold: 150 },
        effect: { workersPerRoom: 1 },
        maxLevel: 2
      }
    ]
  },

  {
    id: 'blacksmith',
    name: 'Blacksmith',
    emoji: '⚒️',
    description: 'Improves resource gathering efficiency',
    baseCost: { wood: 150, stone: 200, iron: 50 },
    costMultiplier: 2.5,
    constructionTime: 120,
    maxCount: 2,
    unlockCondition: { type: 'resource_mined', resource: 'iron', amount: 100 },

    effect: {
      resourceBonus: 0.15 // 15% more resources
    },

    upgrades: [
      {
        id: 'blacksmith_better_tools',
        name: 'Better Tools',
        description: 'Gather 10% more resources',
        cost: { iron: 100, coal: 50 },
        effect: { resourceBonus: 0.1 },
        maxLevel: 3
      },
      {
        id: 'blacksmith_master_craft',
        name: 'Master Craftsman',
        description: 'Reduces activity costs by 10%',
        cost: { iron: 200, gold: 100 },
        effect: { costReduction: 0.1 },
        maxLevel: 2
      }
    ]
  },

  {
    id: 'market',
    name: 'Market',
    emoji: '🏪',
    description: 'Unlocks resource trading',
    baseCost: { wood: 250, stone: 150, gold: 200 },
    costMultiplier: 4.0,
    constructionTime: 180,
    maxCount: 1,
    unlockCondition: { type: 'buildings_built', count: 5 },

    effect: {
      enableTrading: true
    },

    upgrades: [
      {
        id: 'market_better_deals',
        name: 'Merchant Connections',
        description: 'Better trading rates',
        cost: { gold: 500 },
        effect: { tradingBonus: 0.2 },
        maxLevel: 3
      }
    ]
  },

  {
    id: 'trainingHall',
    name: 'Training Hall',
    emoji: '🎓',
    description: 'Train workers into specialized roles',
    baseCost: { wood: 100, stone: 100 },
    costMultiplier: 2.0,
    constructionTime: 90,
    maxCount: 5,
    unlockCondition: null, // Always unlocked

    // Training hall properties
    trainingSlots: 3, // Can train up to 3 workers at once

    // Available training programs
    trainingPrograms: [
      {
        id: 'train_lumberjack',
        name: 'Lumberjack Training',
        emoji: '🪓',
        description: 'Convert workers to lumberjacks',
        inputWorker: 'basicWorker',
        outputWorker: 'lumberjack',
        workersRequired: 1,
        trainingTime: 30, // seconds
        cost: { wood: 20 }
      },
      {
        id: 'train_miner',
        name: 'Miner Training',
        emoji: '⛏️',
        description: 'Convert workers to miners',
        inputWorker: 'basicWorker',
        outputWorker: 'miner',
        workersRequired: 1,
        trainingTime: 30, // seconds
        cost: { stone: 20 }
      },
      {
        id: 'train_farmer',
        name: 'Farmer Training',
        emoji: '🌾',
        description: 'Convert workers to farmers',
        inputWorker: 'basicWorker',
        outputWorker: 'farmer',
        workersRequired: 1,
        trainingTime: 30, // seconds
        cost: { wheat: 20 }
      },
      {
        id: 'train_tractor',
        name: 'Tractor Operator Training',
        emoji: '🚜',
        description: 'Train workers to operate tractors',
        inputWorker: 'basicWorker',
        outputWorker: 'tractorWorker',
        workersRequired: 1,
        trainingTime: 60, // seconds - more advanced
        cost: { steel: 10, equipment: 5, machine: 2 }
      },
      {
        id: 'train_drone',
        name: 'Drone Operator Training',
        emoji: '🚁',
        description: 'Train workers to control drones',
        inputWorker: 'basicWorker',
        outputWorker: 'droneWorker',
        workersRequired: 1,
        trainingTime: 90, // seconds - very advanced
        cost: { electronics: 5, circuit: 3, plastic: 4 }
      }
    ],

    upgrades: [
      {
        id: 'training_faster',
        name: 'Efficient Training',
        description: 'Reduce training time by 5 seconds',
        cost: { wood: 150, stone: 150 },
        effect: { trainingTimeReduction: 5 },
        maxLevel: 3
      },
      {
        id: 'training_more_slots',
        name: 'More Training Slots',
        description: 'Add 2 more training slots',
        cost: { wood: 200, stone: 200, gold: 100 },
        effect: { trainingSlots: 2 },
        maxLevel: 2
      }
    ]
  }
]

export const townSettings = {
  maxBuildingSlots: 20, // Total slots for all buildings
  startingSlots: 5,     // Slots available at start
  slotUnlockCost: {     // Cost to unlock more slots
    wood: 100,
    stone: 100,
    gold: 50
  }
}
