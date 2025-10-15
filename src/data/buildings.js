/**
 * Building definitions for the city
 */

export const buildingTypes = [
  {
    id: 'house',
    name: 'House',
    emoji: '🏠',
    description: 'Houses produce basic workers',
    baseCost: { wood: 50, stone: 30 },
    costMultiplier: 1.5, // Each additional house costs 1.5x more
    constructionTime: 30, // seconds
    maxCount: 10, // Max houses in town
    unlockCondition: null, // Always unlocked

    // House-specific properties
    roomsPerHouse: 1, // Start with 1 room
    workersPerRoom: 5, // Max workers per room
    workerGenerationTime: 30, // seconds to produce 1 worker
    workerType: 'basicWorker', // Produces basic workers

    // Upgrades
    upgrades: [
      {
        id: 'house_extra_room',
        name: 'Extra Room',
        description: 'Add another room (5 more workers)',
        cost: { wood: 100, stone: 75 },
        effect: { roomsPerHouse: 1 },
        maxLevel: 3
      },
      {
        id: 'house_faster_generation',
        name: 'Better Living Conditions',
        description: 'Faster worker generation (-5s generation time)',
        cost: { wood: 75, stone: 50 },
        effect: { workerGenerationTime: -5 },
        maxLevel: 3
      }
    ]
  },

  {
    id: 'garage',
    name: 'Garage',
    emoji: '🚗',
    description: 'Produces tractors for mechanized work',
    baseCost: { steel: 50, equipment: 20, machine: 5 },
    costMultiplier: 1.5, // Each additional garage costs 1.5x more
    constructionTime: 60, // seconds - more complex than houses
    maxCount: 10, // Max garages in town
    unlockCondition: { type: 'resource_mined', resource: 'steel', amount: 25 }, // Unlocks after producing some steel

    // Garage-specific properties
    roomsPerHouse: 1, // Start with 1 bay
    workersPerRoom: 3, // Max tractors per bay (fewer than manual workers)
    workerGenerationTime: 45, // seconds to produce 1 tractor (slower than workers)
    workerType: 'tractorWorker', // Produces tractors instead of basic workers

    // Upgrades
    upgrades: [
      {
        id: 'garage_extra_bay',
        name: 'Extra Bay',
        description: 'Add another bay (3 more tractors)',
        cost: { steel: 150, equipment: 100 },
        effect: { roomsPerHouse: 1 },
        maxLevel: 3
      },
      {
        id: 'garage_faster_production',
        name: 'Assembly Line',
        description: 'Faster tractor production (-10s production time)',
        cost: { steel: 100, machine: 20 },
        effect: { workerGenerationTime: -10 },
        maxLevel: 3
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
  },

  {
    id: 'droneServer',
    name: 'Drone Server',
    emoji: '🖥️',
    description: 'AI-controlled drone production facility',
    baseCost: { electronics: 100, circuit: 60, plastic: 50 },
    costMultiplier: 2.0, // Each additional drone server costs 2x more
    constructionTime: 120, // seconds - highly advanced
    maxCount: 5, // Max drone servers in town
    unlockCondition: { type: 'resource_mined', resource: 'electronics', amount: 100 }, // Unlocks after producing electronics

    // Drone server-specific properties
    roomsPerHouse: 1, // Start with 1 server rack
    workersPerRoom: 2, // Max drones per rack (very efficient)
    workerGenerationTime: 60, // seconds to deploy 1 drone
    workerType: 'droneWorker', // Produces drones

    // Upgrades
    upgrades: [
      {
        id: 'drone_extra_rack',
        name: 'Extra Server Rack',
        description: 'Add another rack (2 more drones)',
        cost: { electronics: 400, circuit: 200, plastic: 150 },
        effect: { roomsPerHouse: 1 },
        maxLevel: 3
      },
      {
        id: 'drone_faster_deployment',
        name: 'Software Optimization',
        description: 'Faster drone deployment (-15s deployment time)',
        cost: { electronics: 200, circuit: 100 },
        effect: { workerGenerationTime: -15 },
        maxLevel: 3
      }
    ]
  }
]

export const townSettings = {
  maxBuildingSlots: 32, // Total slots for all buildings
  startingSlots: 16,    // Slots available at start (4x4 grid)
  slotUnlockCost: {     // Cost to unlock more slots
    wood: 100,
    stone: 100,
    gold: 50
  }
}
