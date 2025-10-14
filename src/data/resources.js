/**
 * All resource definitions
 * Everything in the game is a resource - no complex inventory
 */

export const resources = {
  // Woodcutting
  wood: { id: 'wood', name: 'Wood', description: 'Basic wood from trees', icon: '🪵' },
  oakWood: { id: 'oakWood', name: 'Oak Wood', description: 'Strong oak wood', icon: '🪵' },

  // Mining
  copperOre: { id: 'copperOre', name: 'Copper Ore', description: 'Common copper ore', icon: '🔶' },
  tinOre: { id: 'tinOre', name: 'Tin Ore', description: 'Common tin ore', icon: '⚪' },
  ironOre: { id: 'ironOre', name: 'Iron Ore', description: 'Useful iron ore', icon: '⬛' },
  coal: { id: 'coal', name: 'Coal', description: 'Fuel for smelting', icon: '⚫' },

  // Fishing
  shrimp: { id: 'shrimp', name: 'Shrimp', description: 'Small crustacean', icon: '🦐' },
  sardine: { id: 'sardine', name: 'Sardine', description: 'Small fish', icon: '🐟' },
  trout: { id: 'trout', name: 'Trout', description: 'Freshwater fish', icon: '🐟' },

  // Cooking
  cookedShrimp: { id: 'cookedShrimp', name: 'Cooked Shrimp', description: 'Tasty shrimp', icon: '🍤' },
  cookedSardine: { id: 'cookedSardine', name: 'Cooked Sardine', description: 'Grilled sardine', icon: '🐟' },
  cookedTrout: { id: 'cookedTrout', name: 'Cooked Trout', description: 'Delicious trout', icon: '🐟' },

  // Dog Handling
  puppy: { id: 'puppy', name: 'Puppy', description: 'Cute stray puppy', icon: '🐕' },
  guardDog: { id: 'guardDog', name: 'Guard Dog', description: 'Trained guard dog', icon: '🐕‍🦺' },
  bones: { id: 'bones', name: 'Bones', description: 'Dog treats', icon: '🦴' },

  // Workers (automation)
  basicWorker: { id: 'basicWorker', name: 'Basic Worker', description: 'A regular human worker', icon: '👷' },
  tractorWorker: { id: 'tractorWorker', name: 'Tractor Worker', description: 'Worker with tractor', icon: '🚜' },
  droneWorker: { id: 'droneWorker', name: 'Drone Worker', description: 'Automated drone', icon: '🚁' },

  // Speed Boost Resources
  tv: { id: 'tv', name: 'TV', description: 'Entertainment for workers', icon: '📺' },
  phone: { id: 'phone', name: 'Phone', description: 'Communication device', icon: '📱' },
  fastFood: { id: 'fastFood', name: 'Fast Food', description: 'Quick meals', icon: '🍔' },
  fuel: { id: 'fuel', name: 'Fuel', description: 'Powers machines', icon: '⛽' }
}

export const resourceList = Object.values(resources)
