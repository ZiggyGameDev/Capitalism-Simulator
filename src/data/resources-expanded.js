/**
 * Expanded resource definitions - The Cost of Progress
 * Everything is a commodity in late-stage capitalism
 */

export const resources = {
  // ========== PHASE 1: ORGANIC (Human Labor) ==========
  wheat: { id: 'wheat', name: 'Wheat', icon: '🌾', description: 'Grown by human hands' },
  corn: { id: 'corn', name: 'Corn', icon: '🌽', description: 'Manual harvest' },
  tomato: { id: 'tomato', name: 'Tomatoes', icon: '🍅', description: 'Family farm produce' },
  potato: { id: 'potato', name: 'Potatoes', icon: '🍂', description: 'Dug from the earth' },

  wood: { id: 'wood', name: 'Wood', icon: '🌲', description: 'Chopped by hand' },
  stone: { id: 'stone', name: 'Stone', icon: '⛰️', description: 'Gathered manually' },
  water: { id: 'water', name: 'Water', icon: '💧', description: 'Carried in buckets' },
  gold: { id: 'gold', name: 'Gold', icon: '💰', description: 'Precious metal' },

  // Simple tools
  stoneTools: { id: 'stoneTools', name: 'Stone Tools', icon: '🔨', description: 'Primitive implements' },
  woodenPlank: { id: 'woodenPlank', name: 'Wooden Planks', icon: '📦', description: 'Hand-sawn lumber' },

  // ========== PHASE 2: INDUSTRIAL (Mechanization Begins) ==========
  flour: { id: 'flour', name: 'Flour', icon: '🍞', description: 'Milled wheat' },
  processedFood: { id: 'processedFood', name: 'Processed Food', icon: '🍱', description: 'Factory produced' },

  iron: { id: 'iron', name: 'Iron', icon: '⚙️', description: 'Smelted ore' },
  steel: { id: 'steel', name: 'Steel', icon: '🔩', description: 'Industrial metal' },
  coal: { id: 'coal', name: 'Coal', icon: '⚫', description: 'Fuel for machines' },

  machine: { id: 'machine', name: 'Machines', icon: '🏭', description: 'Replacing skilled labor' },
  equipment: { id: 'equipment', name: 'Equipment', icon: '🔧', description: 'Tools of efficiency' },

  // ========== PHASE 3: AUTOMATION (Humans Optional) ==========
  plastic: { id: 'plastic', name: 'Plastic', icon: '🛢️', description: 'Petroleum products' },
  electronics: { id: 'electronics', name: 'Electronics', icon: '📱', description: 'Digital components' },
  circuit: { id: 'circuit', name: 'Circuits', icon: '🔌', description: 'Logic boards' },

  workerUnit: { id: 'workerUnit', name: 'Worker Units', icon: '👤', description: 'Fungible human labor' },
  roboticWorker: { id: 'roboticWorker', name: 'Robotic Workers', icon: '🤖', description: 'No breaks, no complaints' },
  drone: { id: 'drone', name: 'Drones', icon: '✈️', description: 'Autonomous labor' },

  // Worker types (automation labor)
  basicWorker: { id: 'basicWorker', name: 'Basic Worker', icon: '👷', description: 'Human laborers' },
  lumberjack: { id: 'lumberjack', name: 'Lumberjack', icon: '🪓', description: 'Specialists that supercharge wood income' },
  miner: { id: 'miner', name: 'Miner', icon: '⛏️', description: 'Excavation crews that boost ore extraction' },
  farmer: { id: 'farmer', name: 'Farmer', icon: '🌾', description: 'Professional growers for industrial farming' },
  tractorWorker: { id: 'tractorWorker', name: 'Tractor Worker', icon: '🚜', description: 'Mechanized farm worker' },
  droneWorker: { id: 'droneWorker', name: 'Drone Worker', icon: '🚁', description: 'AI-powered autonomous worker' },

  // Speed boost resources
  tv: { id: 'tv', name: 'TV', icon: '📺', description: 'Entertainment for workers' },
  phone: { id: 'phone', name: 'Phone', icon: '📱', description: 'Communication devices' },
  fastFood: { id: 'fastFood', name: 'Fast Food', icon: '🍔', description: 'Quick meals for energy' },
  fuel: { id: 'fuel', name: 'Fuel', icon: '⛽', description: 'Powers machines' },

  // ========== PHASE 4: POST-HUMAN (AI Supremacy) ==========
  data: { id: 'data', name: 'Data', icon: '📊', description: 'The new oil' },
  algorithm: { id: 'algorithm', name: 'Algorithms', icon: '📈', description: 'Automated decision making' },
  aiCore: { id: 'aiCore', name: 'AI Cores', icon: '💡', description: 'Artificial intelligence' },

  nanobot: { id: 'nanobot', name: 'Nanobots', icon: '⚛️', description: 'Molecular machines' },
  quantumProcessor: { id: 'quantumProcessor', name: 'Quantum Processors', icon: '🌀', description: 'Beyond human comprehension' },

  consciousness: { id: 'consciousness', name: 'Consciousness', icon: '✨', description: 'Digitized minds' },
  singularity: { id: 'singularity', name: 'Singularity Points', icon: '🌌', description: 'The end of human history' }
}
