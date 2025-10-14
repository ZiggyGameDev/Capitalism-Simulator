/**
 * All currency definitions
 * Everything in the game is a currency - no complex inventory
 */

export const currencies = {
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
  bones: { id: 'bones', name: 'Bones', description: 'Dog treats', icon: '🦴' }
}

export const currencyList = Object.values(currencies)
