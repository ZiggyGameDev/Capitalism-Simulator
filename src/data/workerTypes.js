/**
 * Worker type definitions
 * Each worker type has different properties and can be assigned to activities
 */
export const workerTypes = [
  {
    id: 'basicWorker',
    name: 'Basic Worker',
    description: 'A regular human worker',
    baseSpeed: 0.2,  // Speed multiplier (0.2 = 5x slower than manual)
    category: 'human'
  },
  {
    id: 'tractorWorker',
    name: 'Tractor Worker',
    description: 'A worker operating a tractor - faster for farming tasks',
    baseSpeed: 0.5,  // 2x slower than manual
    category: 'machine',
    bonusActivities: ['farming']  // Gets bonus speed on farming activities
  },
  {
    id: 'droneWorker',
    name: 'Drone Worker',
    description: 'An automated drone - fast and efficient',
    baseSpeed: 0.8,  // 1.25x slower than manual
    category: 'machine'
  }
]

/**
 * Speed boost definitions
 * Resources that can be consumed to make workers faster
 */
export const speedBoosts = [
  {
    id: 'tv',
    name: 'TV',
    description: 'Entertainment boosts worker morale',
    speedBonus: 0.1,  // +10% speed
    workerTypes: ['basicWorker'],  // Only affects basic workers
    consumptionRate: 0.1  // Consumed per completion
  },
  {
    id: 'phone',
    name: 'Phone',
    description: 'Communication improves coordination',
    speedBonus: 0.15,  // +15% speed
    workerTypes: ['basicWorker'],
    consumptionRate: 0.1
  },
  {
    id: 'fastFood',
    name: 'Fast Food',
    description: 'Quick meals keep workers energized',
    speedBonus: 0.2,  // +20% speed
    workerTypes: ['basicWorker', 'tractorWorker'],
    consumptionRate: 0.2
  },
  {
    id: 'fuel',
    name: 'Fuel',
    description: 'Powers machines',
    speedBonus: 0.3,  // +30% speed
    workerTypes: ['tractorWorker', 'droneWorker'],
    consumptionRate: 0.5
  }
]
