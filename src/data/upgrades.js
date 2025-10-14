/**
 * Upgrade definitions - The Efficiency Imperative
 * Upgrades improve activities through speed boosts, output increases, or cost reduction
 * Theme: Each upgrade represents the relentless drive toward optimization
 */

export const upgrades = [
  // ========== FARMING UPGRADES: Mechanizing Agriculture ==========
  {
    id: 'plantWheatSpeed1',
    name: 'Steel Plow',
    description: 'Plant wheat 25% faster',
    activityId: 'plantWheat',
    type: 'speed',
    value: 0.25,
    cost: { wheat: 50, steel: 5 },
    skillRequired: { farming: 5 }
  },
  {
    id: 'plantWheatOutput1',
    name: 'Fertilizer',
    description: 'Get 1 extra wheat per harvest',
    activityId: 'plantWheat',
    type: 'outputBonus',
    value: { wheat: 1 },
    cost: { wheat: 100, processedFood: 20 },
    skillRequired: { farming: 10 }
  },
  {
    id: 'plantCornSpeed1',
    name: 'Mechanical Planter',
    description: 'Plant corn 30% faster',
    activityId: 'plantCorn',
    type: 'speed',
    value: 0.3,
    cost: { corn: 50, equipment: 2 },
    skillRequired: { farming: 8 }
  },
  {
    id: 'growTomatoesOutput1',
    name: 'Irrigation System',
    description: 'Get 2 extra tomatoes per harvest',
    activityId: 'growTomatoes',
    type: 'outputBonus',
    value: { tomato: 2 },
    cost: { tomato: 50, steel: 5, water: 100 },
    skillRequired: { farming: 12 }
  },
  {
    id: 'harvestPotatoesSpeed1',
    name: 'Potato Digger',
    description: 'Harvest potatoes 35% faster',
    activityId: 'harvestPotatoes',
    type: 'speed',
    value: 0.35,
    cost: { potato: 100, equipment: 3 },
    skillRequired: { farming: 15 }
  },

  // ========== GATHERING UPGRADES: Extracting Resources ==========
  {
    id: 'chopWoodSpeed1',
    name: 'Iron Axe',
    description: 'Chop wood 30% faster',
    activityId: 'chopWood',
    type: 'speed',
    value: 0.3,
    cost: { wood: 50, iron: 5 },
    skillRequired: { gathering: 5 }
  },
  {
    id: 'chopWoodSpeed2',
    name: 'Steel Axe',
    description: 'Chop wood 50% faster',
    activityId: 'chopWood',
    type: 'speed',
    value: 0.5,
    cost: { wood: 100, steel: 10 },
    skillRequired: { gathering: 10 },
    prerequisite: 'chopWoodSpeed1'
  },
  {
    id: 'chopWoodOutput1',
    name: 'Efficient Logging',
    description: 'Get 2 extra wood per chop',
    activityId: 'chopWood',
    type: 'outputBonus',
    value: { wood: 2 },
    cost: { wood: 200, equipment: 5 },
    skillRequired: { gathering: 15 }
  },
  {
    id: 'mineStoneSpeed1',
    name: 'Iron Pickaxe',
    description: 'Mine stone 35% faster',
    activityId: 'mineStone',
    type: 'speed',
    value: 0.35,
    cost: { stone: 100, iron: 8 },
    skillRequired: { gathering: 8 }
  },
  {
    id: 'mineStoneOutput1',
    name: 'Quarry Techniques',
    description: 'Get 2 extra stone per mine',
    activityId: 'mineStone',
    type: 'outputBonus',
    value: { stone: 2 },
    cost: { stone: 200, steel: 10 },
    skillRequired: { gathering: 12 }
  },
  {
    id: 'fetchWaterSpeed1',
    name: 'Water Pump',
    description: 'Fetch water 40% faster',
    activityId: 'fetchWater',
    type: 'speed',
    value: 0.4,
    cost: { water: 100, iron: 5, steel: 3 },
    skillRequired: { gathering: 10 }
  },

  // ========== CRAFTING UPGRADES: Skilled Labor ==========
  {
    id: 'craftStoneToolsSpeed1',
    name: 'Tool Bench',
    description: 'Craft stone tools 25% faster',
    activityId: 'craftStoneTools',
    type: 'speed',
    value: 0.25,
    cost: { stoneTools: 10, wood: 50 },
    skillRequired: { crafting: 5 }
  },
  {
    id: 'craftStoneToolsCost1',
    name: 'Efficient Shaping',
    description: 'Craft stone tools with 30% less materials',
    activityId: 'craftStoneTools',
    type: 'costReduction',
    value: 0.3,
    cost: { stoneTools: 50, steel: 5 },
    skillRequired: { crafting: 10 }
  },
  {
    id: 'cookFoodSpeed1',
    name: 'Hot Oven',
    description: 'Cook fast food 30% faster',
    activityId: 'cookFood',
    type: 'speed',
    value: 0.3,
    cost: { fastFood: 20, coal: 20 },
    skillRequired: { crafting: 8 }
  },
  {
    id: 'sawPlanksSpeed1',
    name: 'Power Saw',
    description: 'Saw planks 35% faster',
    activityId: 'sawPlanks',
    type: 'speed',
    value: 0.35,
    cost: { woodenPlank: 50, steel: 10 },
    skillRequired: { crafting: 12 }
  },
  {
    id: 'smeltIronSpeed1',
    name: 'Blast Furnace',
    description: 'Smelt iron 30% faster',
    activityId: 'smeltIron',
    type: 'speed',
    value: 0.3,
    cost: { iron: 20, steel: 15 },
    skillRequired: { crafting: 15 }
  },
  {
    id: 'smeltIronOutput1',
    name: 'Efficient Smelting',
    description: 'Get 1 extra iron per smelt',
    activityId: 'smeltIron',
    type: 'outputBonus',
    value: { iron: 1 },
    cost: { iron: 50, coal: 50 },
    skillRequired: { crafting: 18 }
  },

  // ========== MANUFACTURING UPGRADES: Industrial Revolution ==========
  {
    id: 'millFlourSpeed1',
    name: 'Steam Mill',
    description: 'Mill flour 35% faster',
    activityId: 'millFlour',
    type: 'speed',
    value: 0.35,
    cost: { flour: 100, steel: 10 },
    skillRequired: { manufacturing: 5 }
  },
  {
    id: 'millFlourOutput1',
    name: 'Fine Grinding',
    description: 'Get 3 extra flour per mill',
    activityId: 'millFlour',
    type: 'outputBonus',
    value: { flour: 3 },
    cost: { flour: 200, machine: 2 },
    skillRequired: { manufacturing: 10 }
  },
  {
    id: 'processFoodSpeed1',
    name: 'Assembly Line',
    description: 'Process food 40% faster',
    activityId: 'processFood',
    type: 'speed',
    value: 0.4,
    cost: { processedFood: 100, equipment: 5 },
    skillRequired: { manufacturing: 8 }
  },
  {
    id: 'forgeSteelSpeed1',
    name: 'Industrial Forge',
    description: 'Forge steel 35% faster',
    activityId: 'forgeSteel',
    type: 'speed',
    value: 0.35,
    cost: { steel: 50, coal: 50 },
    skillRequired: { manufacturing: 12 }
  },
  {
    id: 'forgeSteelOutput1',
    name: 'Steel Mastery',
    description: 'Get 2 extra steel per forge',
    activityId: 'forgeSteel',
    type: 'outputBonus',
    value: { steel: 2 },
    cost: { steel: 100, machine: 3 },
    skillRequired: { manufacturing: 18 }
  },
  {
    id: 'assembleEquipmentSpeed1',
    name: 'Precision Tools',
    description: 'Assemble equipment 30% faster',
    activityId: 'assembleEquipment',
    type: 'speed',
    value: 0.3,
    cost: { equipment: 20, steel: 30 },
    skillRequired: { manufacturing: 20 }
  },

  // ========== ENGINEERING UPGRADES: Building the Machines ==========
  {
    id: 'buildMachineSpeed1',
    name: 'Automated Assembly',
    description: 'Build machines 30% faster',
    activityId: 'buildMachine',
    type: 'speed',
    value: 0.3,
    cost: { machine: 5, steel: 50 },
    skillRequired: { engineering: 5 }
  },
  {
    id: 'buildMachineCost1',
    name: 'Efficient Design',
    description: 'Build machines with 20% less materials',
    activityId: 'buildMachine',
    type: 'costReduction',
    value: 0.2,
    cost: { machine: 10, electronics: 5 },
    skillRequired: { engineering: 10 }
  },
  {
    id: 'refineSteelSpeed1',
    name: 'High-Temperature Refining',
    description: 'Refine steel 40% faster',
    activityId: 'refineSteel',
    type: 'speed',
    value: 0.4,
    cost: { steel: 100, machine: 5 },
    skillRequired: { engineering: 15 }
  },
  {
    id: 'produceCircuitsSpeed1',
    name: 'Photolithography',
    description: 'Produce circuits 35% faster',
    activityId: 'produceCircuits',
    type: 'speed',
    value: 0.35,
    cost: { circuit: 20, electronics: 10 },
    skillRequired: { engineering: 25 }
  },
  {
    id: 'produceCircuitsOutput1',
    name: 'Chip Fabrication',
    description: 'Get 2 extra circuits per production',
    activityId: 'produceCircuits',
    type: 'outputBonus',
    value: { circuit: 2 },
    cost: { circuit: 50, electronics: 20 },
    skillRequired: { engineering: 30 }
  },

  // ========== AUTOMATION UPGRADES: Humans Need Not Apply ==========
  {
    id: 'extractPlasticSpeed1',
    name: 'Chemical Reactor',
    description: 'Extract plastic 40% faster',
    activityId: 'extractPlastic',
    type: 'speed',
    value: 0.4,
    cost: { plastic: 50, steel: 20 },
    skillRequired: { automation: 5 }
  },
  {
    id: 'extractPlasticOutput1',
    name: 'Polymerization',
    description: 'Get 2 extra plastic per extraction',
    activityId: 'extractPlastic',
    type: 'outputBonus',
    value: { plastic: 2 },
    cost: { plastic: 100, electronics: 10 },
    skillRequired: { automation: 10 }
  },
  {
    id: 'refineFuelSpeed1',
    name: 'Catalytic Cracking',
    description: 'Refine fuel 45% faster',
    activityId: 'refineFuel',
    type: 'speed',
    value: 0.45,
    cost: { fuel: 50, steel: 20 },
    skillRequired: { automation: 8 }
  },
  {
    id: 'manufactureElectronicsSpeed1',
    name: 'Robotic Assembly',
    description: 'Manufacture electronics 40% faster',
    activityId: 'manufactureElectronics',
    type: 'speed',
    value: 0.4,
    cost: { electronics: 50, roboticWorker: 2 },
    skillRequired: { automation: 12 }
  },
  {
    id: 'buildRoboticWorkerSpeed1',
    name: 'Worker Production Line',
    description: 'Build robotic workers 35% faster',
    activityId: 'buildRoboticWorker',
    type: 'speed',
    value: 0.35,
    cost: { roboticWorker: 5, electronics: 50 },
    skillRequired: { automation: 20 }
  },
  {
    id: 'buildDroneWorkerSpeed1',
    name: 'AI-Assisted Manufacturing',
    description: 'Build drone workers 40% faster',
    activityId: 'buildDroneWorker',
    type: 'speed',
    value: 0.4,
    cost: { droneWorker: 3, aiCore: 5 },
    skillRequired: { automation: 30 }
  },

  // ========== COMPUTING UPGRADES: Digital Supremacy ==========
  {
    id: 'collectDataSpeed1',
    name: 'High-Speed Networks',
    description: 'Harvest data 45% faster',
    activityId: 'collectData',
    type: 'speed',
    value: 0.45,
    cost: { data: 200, electronics: 20 },
    skillRequired: { computing: 5 }
  },
  {
    id: 'collectDataOutput1',
    name: 'Mass Surveillance',
    description: 'Get 20 extra data per harvest',
    activityId: 'collectData',
    type: 'outputBonus',
    value: { data: 20 },
    cost: { data: 500, circuit: 20 },
    skillRequired: { computing: 10 }
  },
  {
    id: 'developAlgorithmSpeed1',
    name: 'Machine Learning',
    description: 'Develop algorithms 40% faster',
    activityId: 'developAlgorithm',
    type: 'speed',
    value: 0.4,
    cost: { algorithm: 5, data: 500 },
    skillRequired: { computing: 15 }
  },
  {
    id: 'trainAISpeed1',
    name: 'Distributed Computing',
    description: 'Train AI cores 35% faster',
    activityId: 'trainAI',
    type: 'speed',
    value: 0.35,
    cost: { aiCore: 3, data: 1000 },
    skillRequired: { computing: 25 }
  },

  // ========== RESEARCH UPGRADES: Even Innovation is Automated ==========
  {
    id: 'developNanobotsSpeed1',
    name: 'Molecular Assembly',
    description: 'Develop nanobots 40% faster',
    activityId: 'developNanobots',
    type: 'speed',
    value: 0.4,
    cost: { nanobot: 50, aiCore: 5 },
    skillRequired: { research: 5 }
  },
  {
    id: 'developNanobotsOutput1',
    name: 'Self-Replication',
    description: 'Get 5 extra nanobots per development',
    activityId: 'developNanobots',
    type: 'outputBonus',
    value: { nanobot: 5 },
    cost: { nanobot: 100, algorithm: 10 },
    skillRequired: { research: 10 }
  },
  {
    id: 'buildQuantumProcessorSpeed1',
    name: 'Quantum Entanglement',
    description: 'Build quantum processors 35% faster',
    activityId: 'buildQuantumProcessor',
    type: 'speed',
    value: 0.35,
    cost: { quantumProcessor: 2, aiCore: 10 },
    skillRequired: { research: 20 }
  },
  {
    id: 'digitizeConsciousnessSpeed1',
    name: 'Neural Mapping',
    description: 'Digitize consciousness 30% faster',
    activityId: 'digitizeConsciousness',
    type: 'speed',
    value: 0.3,
    cost: { consciousness: 5, quantumProcessor: 10 },
    skillRequired: { research: 30 }
  },

  // ========== SINGULARITY UPGRADES: The End Game ==========
  {
    id: 'achieveSingularitySpeed1',
    name: 'Recursive Self-Improvement',
    description: 'Achieve singularity 40% faster',
    activityId: 'achieveSingularity',
    type: 'speed',
    value: 0.4,
    cost: { singularity: 5, consciousness: 100 },
    skillRequired: { singularity: 5 }
  },
  {
    id: 'achieveSingularityOutput1',
    name: 'Exponential Growth',
    description: 'Get 2 extra singularity points per achievement',
    activityId: 'achieveSingularity',
    type: 'outputBonus',
    value: { singularity: 2 },
    cost: { singularity: 10, quantumProcessor: 50 },
    skillRequired: { singularity: 8 }
  },
  {
    id: 'transcendSpeed1',
    name: 'Post-Material Existence',
    description: 'Transcend 35% faster',
    activityId: 'transcend',
    type: 'speed',
    value: 0.35,
    cost: { singularity: 20, consciousness: 500 },
    skillRequired: { singularity: 15 }
  },
  {
    id: 'transcendOutput1',
    name: 'Infinite Recursion',
    description: 'Get 5 extra singularity points per transcendence',
    activityId: 'transcend',
    type: 'outputBonus',
    value: { singularity: 5 },
    cost: { singularity: 50, quantumProcessor: 100 },
    skillRequired: { singularity: 20 }
  }
]
