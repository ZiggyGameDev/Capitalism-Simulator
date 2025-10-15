import { GameEngine } from './core/GameEngine.js'
import { ActivitySimulation } from './simulation/ActivitySimulation.js'
import { TownRenderer } from './rendering/TownRenderer.js'
import { skills } from './data/skills-expanded.js'
import { activities } from './data/activities-expanded.js'
import { resources } from './data/resources-expanded.js'
import { upgrades } from './data/upgrades.js'

// Initialize game
const game = new GameEngine(skills, activities, upgrades)

// Make game available globally for debugging
window.game = game

// Element caches for fast updates (no re-rendering!)
const activityElements = new Map() // activityId -> { root, progressBar, progressFill, status, ... }
const activitySimulations = new Map() // activityId -> ActivitySimulation instance

// Expose for testing
window.activitySimulations = activitySimulations
const skillElements = new Map() // skillId -> { root, xpBar, xpFill, level }
const resourceElements = new Map() // resourceId -> element
const activeActivityElements = new Map() // activityId -> { root, progressFill, status }

// Town renderer
let townRenderer = null

// State
let selectedSkill = 'farming'  // First skill in expanded content
let lastUnlockState = new Map() // Track which activities are unlocked to detect changes
let lastBuildingUnlockState = new Map() // Track which buildings are unlocked to detect changes
let autoSaveInterval = null
let currentTab = 'activities' // 'activities' or 'city'

// Mapping of skills to their primary output resources (top 4 per skill)
const skillResourceMapping = {
  farming: ['wheat', 'corn', 'tomato', 'potato'],
  gathering: ['wood', 'stone', 'water'],
  crafting: ['stoneTools', 'fastFood', 'woodenPlank', 'iron'],
  manufacturing: ['flour', 'processedFood', 'steel', 'equipment'],
  engineering: ['machine', 'circuit', 'tv', 'phone'],
  automation: ['plastic', 'fuel', 'electronics', 'roboticWorker'],
  computing: ['data', 'algorithm', 'aiCore'],
  research: ['nanobot', 'quantumProcessor', 'consciousness'],
  singularity: ['singularity']
}

// Initialize UI
function init() {
  console.log('🎮 [Game] Initializing Automation Idle Game...')
  console.log('🚀 [Performance] Using high-performance direct DOM updates')

  // Clean up any existing listeners before adding new ones
  cleanupGameListeners()

  setupEventListeners()

  // Give new players 2 basic workers to start
  if (!localStorage.getItem('incrementalGameSave')) {
    game.resourceManager.add('basicWorker', 2)
  }

  // Initial render - create all elements
  buildSkillList()
  buildActivityList(selectedSkill)
  buildResourceTicker()
  buildActiveActivitiesPanel()
  updateActiveActivitiesPanel() // Populate with initial content
  buildUpgradeList()
  buildWorkerPanel()
  updateWorkerPanel() // Populate with initial content
  buildBuildingMenu() // Build city building menu

  // Initialize town renderer
  const townCanvas = document.getElementById('townCanvas')
  if (townCanvas) {
    townRenderer = new TownRenderer(townCanvas, game)
    townRenderer.render() // Initial render
  }

  // Subscribe to game events - now they just update, not rebuild
  game.on('activity:completed', handleActivityCompleted)
  game.on('activity:started', handleActivityStarted)
  game.on('activity:stopped', handleActivityStopped)
  game.on('skill:levelup', handleSkillLevelup)
  game.on('resource:changed', handleResourceChanged)
  game.on('game:tick', handleGameTick)
  game.on('game:offlineProgress', handleOfflineProgress)
  game.on('upgrade:purchased', handleUpgradePurchased)
  game.on('worker:assigned', handleWorkerChanged)
  game.on('worker:unassigned', handleWorkerChanged)
  game.on('building:construction_started', handleBuildingEvent)
  game.on('building:construction_complete', handleBuildingEvent)
  game.on('building:worker_generated', handleBuildingEvent)
  game.on('building:training_started', handleBuildingEvent)
  game.on('building:training_complete', handleBuildingEvent)

  // Restart button
  const restartBtn = document.getElementById('restartBtn')
  if (restartBtn) {
    restartBtn.addEventListener('click', restartGame)
  }

  // Initialize audio on first user interaction
  document.addEventListener('click', () => {
    if (!game.audioManager.audioContext) {
      game.audioManager.init()
      game.audioManager.startMusic()
      console.log('🎵 [Audio] Initialized and started')
    }
  }, { once: true })

  // Start game
  game.start()
  console.log('✅ [Game] Started successfully')

  // Start activity simulation render loop
  startSimulationRenderLoop()
  console.log('🎨 [Renderer] Activity simulations initialized')

  // Clear any existing auto-save interval
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval)
  }
  // Auto-save every 30 seconds
  autoSaveInterval = setInterval(saveGame, 30000)

  // Load saved game if exists
  loadGame()

  // Update skill resource indicators after initial load
  updateSkillResourceIndicators()
}

/**
 * Clean up all game event listeners to prevent memory leaks
 * Call this before re-initializing or during teardown
 */
function cleanupGameListeners() {
  game.off('activity:completed', handleActivityCompleted)
  game.off('activity:started', handleActivityStarted)
  game.off('activity:stopped', handleActivityStopped)
  game.off('skill:levelup', handleSkillLevelup)
  game.off('resource:changed', handleResourceChanged)
  game.off('game:tick', handleGameTick)
  game.off('game:offlineProgress', handleOfflineProgress)
  game.off('upgrade:purchased', handleUpgradePurchased)
  game.off('worker:assigned', handleWorkerChanged)
  game.off('worker:unassigned', handleWorkerChanged)
  game.off('building:construction_started', handleBuildingEvent)
  game.off('building:construction_complete', handleBuildingEvent)
  game.off('building:worker_generated', handleBuildingEvent)
  game.off('building:training_started', handleBuildingEvent)
  game.off('building:training_complete', handleBuildingEvent)
}

// Export cleanup function for testing and external use
window.cleanupGameListeners = cleanupGameListeners

function setupEventListeners() {
  // Add appropriate click sounds to buttons based on their function
  document.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      // Plus buttons (adding/building/incrementing)
      if (e.target.classList.contains('worker-btn-plus') ||
          e.target.classList.contains('btn-build') ||
          e.target.classList.contains('btn-upgrade') ||
          e.target.textContent.includes('+')) {
        game.audioManager.playPlusButtonSound()
      }
      // Minus buttons (removing/decrementing)
      else if (e.target.classList.contains('worker-btn-minus') ||
               e.target.textContent.includes('-')) {
        game.audioManager.playMinusButtonSound()
      }
      // All other buttons
      else {
        game.audioManager.playClickSound()
      }
    }
  })

  document.getElementById('saveBtn').addEventListener('click', saveGame)
  document.getElementById('resetBtn').addEventListener('click', resetGame)

  // Event delegation for worker buttons (set up once)
  document.getElementById('activityList').addEventListener('click', handleActivityClick)

  // Tab switching
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab
      switchTab(tab)
    })
  })

  // Back to activities button
  const backToActivitiesBtn = document.getElementById('backToActivitiesBtn')
  if (backToActivitiesBtn) {
    backToActivitiesBtn.addEventListener('click', () => {
      switchTab('activities')
    })
  }

  // Mute button
  const muteBtn = document.getElementById('muteBtn')
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      const isMuted = game.audioManager.toggleMute()
      muteBtn.textContent = isMuted ? '🔇' : '🔊'
      showNotification(isMuted ? '🔇 Muted' : '🔊 Unmuted')
    })
  }

  // Volume slider
  const volumeSlider = document.getElementById('volumeSlider')
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      const volume = parseInt(e.target.value) / 100 // Convert 0-100 to 0-1
      game.audioManager.setMusicVolume(volume)
    })
  }

  // Debug button
  const debugBtn = document.getElementById('debugBtn')
  const debugPanel = document.getElementById('debugPanel')
  if (debugBtn && debugPanel) {
    debugBtn.addEventListener('click', () => {
      const isVisible = debugPanel.style.display !== 'none'
      debugPanel.style.display = isVisible ? 'none' : 'block'
    })
  }

  // Debug panel actions
  const debugAddResources = document.getElementById('debugAddResources')
  if (debugAddResources) {
    debugAddResources.addEventListener('click', () => {
      Object.keys(resources).forEach(resourceId => {
        game.resourceManager.add(resourceId, 50)
      })
      showNotification('🎁 Added +50 to all resources!')
    })
  }

  const debugSkipTime = document.getElementById('debugSkipTime')
  if (debugSkipTime) {
    debugSkipTime.addEventListener('click', () => {
      // Simulate 5 minutes (300000ms) of gameplay
      for (let i = 0; i < 30; i++) {
        game.update(10000) // 10 seconds per iteration = 5 minutes total
      }
      showNotification('⏩ Skipped 5 minutes!')
    })
  }

  const debugAddWorkers = document.getElementById('debugAddWorkers')
  if (debugAddWorkers) {
    debugAddWorkers.addEventListener('click', () => {
      game.workerManager.workerTypes.forEach(workerType => {
        game.resourceManager.add(workerType.id, 10)
      })
      showNotification('👷 Added +10 to all worker types!')
    })
  }

  const debugAddXP = document.getElementById('debugAddXP')
  if (debugAddXP) {
    debugAddXP.addEventListener('click', () => {
      skills.forEach(skill => {
        game.skillManager.addXP(skill.id, 1000)
      })
      showNotification('⭐ Added +1000 XP to all skills!')
    })
  }
}

/**
 * Switch between activities and city tabs
 */
function switchTab(tabName) {
  currentTab = tabName

  // Update tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName)
  })

  // Update tab content visibility
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.dataset.view === tabName)
  })

  // On mobile, resize canvas when switching to activities tab (where town is visible)
  if (tabName === 'activities' && townRenderer) {
    // Wait for layout to complete
    setTimeout(() => {
      const townCanvas = document.getElementById('townCanvas')
      if (townCanvas && townCanvas.offsetParent !== null) { // Only if visible
        const newWidth = townCanvas.clientWidth || 800
        const newHeight = townCanvas.clientHeight || 600
        townRenderer.resize(newWidth, newHeight)
        // Force worker respawn by resetting timer
        townRenderer.lastWorkerUpdate = 0
        townRenderer.cachedWorkerCount = 0
        townRenderer.render() // Force a render after resize
        console.log(`[TownRenderer] Switched to activities tab - Canvas: ${newWidth}x${newHeight}, Workers should respawn`)
      }
    }, 50)
  }
}

// ============================================================================
// BUILD FUNCTIONS - Create DOM structure once
// ============================================================================

function buildSkillList() {
  const container = document.getElementById('skillList')
  container.innerHTML = ''
  skillElements.clear()

  // Worker summary at top
  const workerSummary = document.createElement('div')
  workerSummary.id = 'workerSummaryCompact'
  workerSummary.className = 'worker-summary-compact'
  container.appendChild(workerSummary)
  updateWorkerSummary()

  // Create skill elements
  skills.forEach(skill => {
    const skillDiv = document.createElement('div')
    skillDiv.className = 'skill-item'
    skillDiv.dataset.skillId = skill.id

    const level = game.skillManager.getLevel(skill.id)
    const xpProgress = game.skillManager.getXPProgress(skill.id)

    // Get resource emojis for this skill
    const skillResources = skillResourceMapping[skill.id] || []
    const resourceEmojisHTML = skillResources
      .map((resourceId, index) => {
        const resource = resources[resourceId]
        if (!resource) return ''
        return `<span class="skill-resource-emoji" data-resource-id="${resourceId}" data-skill-id="${skill.id}">${resource.icon}</span>`
      })
      .join('')

    skillDiv.innerHTML = `
      <div class="skill-icon">${skill.icon}</div>
      <div class="skill-info">
        <div class="skill-name">${skill.name}</div>
        <div class="skill-level">Level <span class="skill-level-value">${level}</span></div>
        <div class="skill-xp-bar">
          <div class="skill-xp-fill" style="width: ${xpProgress.percent * 100}%"></div>
        </div>
        ${resourceEmojisHTML ? `<div class="skill-resources">${resourceEmojisHTML}</div>` : ''}
      </div>
    `

    skillDiv.addEventListener('click', () => {
      selectedSkill = skill.id
      updateSkillSelection()
      buildActivityList(skill.id)
      buildUpgradeList()
    })

    // Cache references for fast updates
    const resourceEmojiElements = {}
    skillResources.forEach(resourceId => {
      const elem = skillDiv.querySelector(`[data-resource-id="${resourceId}"]`)
      if (elem) {
        resourceEmojiElements[resourceId] = elem
      }
    })

    skillElements.set(skill.id, {
      root: skillDiv,
      levelValue: skillDiv.querySelector('.skill-level-value'),
      xpFill: skillDiv.querySelector('.skill-xp-fill'),
      resourceEmojis: resourceEmojiElements
    })

    container.appendChild(skillDiv)
  })

  updateSkillSelection()
}

function buildActivityList(skillId) {
  const container = document.getElementById('activityList')
  const skill = skills.find(s => s.id === skillId)

  if (!skill) return

  const skillActivities = activities.filter(a => a.skillId === skillId)

  // Clean up old simulations
  activitySimulations.forEach(simulation => {
    simulation.destroy()
  })
  activitySimulations.clear()

  // Clear and rebuild
  container.innerHTML = `<h2>${skill.icon} ${skill.name}</h2>`
  activityElements.clear()
  lastUnlockState.clear()

  skillActivities.forEach(activity => {
    const activityDiv = createActivityElement(activity)
    container.appendChild(activityDiv)

    // Track unlock state
    lastUnlockState.set(activity.id, game.skillManager.isActivityUnlocked(activity.id))
  })
}

function createActivityElement(activity) {
  const unlocked = game.skillManager.isActivityUnlocked(activity.id)

  const activityDiv = document.createElement('div')
  activityDiv.className = 'activity-item'
  activityDiv.dataset.activityId = activity.id
  if (!unlocked) activityDiv.classList.add('locked')

  // Get primary output resource for emoji and color theming
  const primaryOutputId = Object.keys(activity.outputs)[0]
  const primaryOutput = primaryOutputId ? resources[primaryOutputId] : null
  const outputEmoji = primaryOutput ? primaryOutput.icon : '⚙️'

  // Add color class based on primary output resource type
  if (primaryOutputId) {
    activityDiv.classList.add(`activity-produces-${primaryOutputId}`)
    // Add generic category classes for broader theming
    if (primaryOutputId.includes('Worker') || primaryOutputId === 'basicWorker') {
      activityDiv.classList.add('activity-produces-worker')
    } else if (['wood', 'stone', 'coal', 'iron'].includes(primaryOutputId)) {
      activityDiv.classList.add('activity-produces-raw')
    } else if (['wheat', 'corn', 'tomato', 'potato'].includes(primaryOutputId)) {
      activityDiv.classList.add('activity-produces-food')
    } else if (['steel', 'equipment', 'machine', 'electronics'].includes(primaryOutputId)) {
      activityDiv.classList.add('activity-produces-industrial')
    }
  }

  // Build inputs text
  const inputsHTML = Object.keys(activity.inputs).length === 0
    ? '<span class="free-label">FREE</span>'
    : Object.entries(activity.inputs).map(([id, amt]) => {
        const resource = resources[id]
        return `<span class="input-${id}">${resource.icon} ${resource.name} × ${amt}</span>`
      }).join(', ')

  // Build outputs text
  const outputsHTML = Object.entries(activity.outputs).map(([id, amt]) => {
    const resource = resources[id]
    return `${resource.icon} ${resource.name} × ${amt}`
  }).join(', ')

  // Build worker controls
  const workerHTML = createWorkerControlsHTML(activity, unlocked)

  activityDiv.innerHTML = `
    <div class="activity-header">
      <div class="activity-name-wrapper">
        <span class="activity-emoji">${outputEmoji}</span>
        <span class="activity-name-text">${activity.name}</span>
      </div>
      <div class="activity-level">${unlocked ? '' : `🔒 Level ${activity.levelRequired}`}</div>
    </div>
    <div class="activity-info">
      ${inputsHTML} → ${outputsHTML}
    </div>
    <div class="activity-halted-warning"></div>
    <div class="activity-meta">
      <span class="activity-duration"></span> | +${activity.xpGained} XP
    </div>
    <div class="activity-resources-info">
      <span class="activity-current-resources"></span>
      <span class="activity-resources-per-min"></span>
    </div>
    <canvas class="activity-simulation-canvas" data-activity="${activity.id}" style="width: 100%; height: 80px; border-radius: 4px;"></canvas>
    ${workerHTML}
  `

  // Cache all the elements we'll need to update
  activityElements.set(activity.id, {
    root: activityDiv,
    haltedWarning: activityDiv.querySelector('.activity-halted-warning'),
    duration: activityDiv.querySelector('.activity-duration'),
    currentResources: activityDiv.querySelector('.activity-current-resources'),
    resourcesPerMin: activityDiv.querySelector('.activity-resources-per-min'),
    inputSpans: Object.keys(activity.inputs).reduce((acc, id) => {
      acc[id] = activityDiv.querySelector(`.input-${id}`)
      return acc
    }, {}),
    workerCounts: new Map(),
    workerButtons: new Map()
  })

  // Cache worker control elements
  const cached = activityElements.get(activity.id)
  game.workerManager.workerTypes.forEach(workerType => {
    const row = activityDiv.querySelector(`[data-worker-row="${workerType.id}"]`)
    if (row) {
      cached.workerCounts.set(workerType.id, row.querySelector('.worker-count'))
      cached.workerButtons.set(workerType.id, {
        minus10: row.querySelector('.worker-btn-minus-10'),
        minus: row.querySelector('.worker-btn-minus'),
        plus: row.querySelector('.worker-btn-plus'),
        plus10: row.querySelector('.worker-btn-plus-10')
      })
    }
  })

  cached.removeAllBtn = activityDiv.querySelector('.worker-btn-remove-all')

  // Create activity simulation if unlocked
  if (unlocked) {
    const canvas = activityDiv.querySelector('.activity-simulation-canvas')
    if (canvas) {
      const simulation = new ActivitySimulation(canvas, activity, game.workerManager, game.resourceManager)
      activitySimulations.set(activity.id, simulation)
      cached.simulation = simulation
    }
  }

  // Initial update
  updateActivityState(activity.id)

  return activityDiv
}

function createWorkerControlsHTML(activity, unlocked) {
  if (!unlocked) return ''

  let html = '<div class="activity-worker-assignments">'
  html += `
    <div class="worker-assignment-header">
      <span class="worker-assignment-title">Assign Workers:</span>
      <button class="worker-btn-remove-all hidden" data-activity="${activity.id}">Remove All</button>
    </div>
  `

  game.workerManager.workerTypes.forEach(workerType => {
    const total = game.resourceManager.get(workerType.id) || 0
    const assigned = game.workerManager.getAssignment(activity.id, workerType.id)

    if (total > 0 || assigned > 0 || workerType.id === 'basicWorker') {
      html += `
        <div class="worker-assignment-row" data-worker-row="${workerType.id}">
          <span class="worker-type-name">${resources[workerType.id].icon} ${resources[workerType.id].name} (<span class="worker-total">${total}</span>)</span>
          <div class="worker-controls">
            <button class="worker-btn-minus-10" data-activity="${activity.id}" data-worker="${workerType.id}">--</button>
            <button class="worker-btn-minus" data-activity="${activity.id}" data-worker="${workerType.id}">-</button>
            <span class="worker-count">${assigned}</span>
            <button class="worker-btn-plus" data-activity="${activity.id}" data-worker="${workerType.id}">+</button>
            <button class="worker-btn-plus-10" data-activity="${activity.id}" data-worker="${workerType.id}">++</button>
          </div>
        </div>
      `
    }
  })

  html += '</div>'
  return html
}

function buildResourceTicker() {
  const container = document.getElementById('currencyTicker')
  container.innerHTML = ''
  resourceElements.clear()

  // Create elements for all resources that exist
  const allResources = game.resourceManager.getAll()
  Object.entries(allResources).forEach(([id, amount]) => {
    if (amount > 0) {
      createResourceElement(id, amount)
    }
  })

  if (Object.keys(allResources).filter(id => allResources[id] > 0).length === 0) {
    container.innerHTML = '<div class="currency-item">No resources yet - start gathering!</div>'
  }
}

function createResourceElement(resourceId, amount) {
  const container = document.getElementById('currencyTicker')
  const resource = resources[resourceId]

  if (!resource) {
    console.error(`Resource ${resourceId} not found in resources data`)
    return
  }

  const storageInfo = game.resourceManager.getStorageInfo(resourceId)

  const div = document.createElement('div')
  div.className = 'currency-item'
  div.dataset.currencyId = resourceId
  div.innerHTML = `${resource.icon} ${resource.name}: <span class="currency-amount">${Math.floor(amount)}</span>/<span class="currency-max">${storageInfo.max}</span> <span class="currency-rate"></span>`

  resourceElements.set(resourceId, {
    root: div,
    amount: div.querySelector('.currency-amount'),
    max: div.querySelector('.currency-max'),
    rate: div.querySelector('.currency-rate')
  })

  container.appendChild(div)
}

function buildActiveActivitiesPanel() {
  const container = document.getElementById('activeActivities')
  container.innerHTML = '<h3>Active Activities</h3><div id="activeActivitiesList"></div>'
  activeActivityElements.clear()
}

function buildUpgradeList() {
  const container = document.getElementById('upgradeList')
  container.innerHTML = ''

  const skillActivities = activities.filter(a => a.skillId === selectedSkill)
  const relevantUpgrades = []

  skillActivities.forEach(activity => {
    const activityUpgrades = game.upgradeManager.getUpgradesForActivity(activity.id)
    relevantUpgrades.push(...activityUpgrades)
  })

  if (relevantUpgrades.length === 0) {
    container.innerHTML = '<div class="no-activities">No upgrades available for this skill</div>'
    return
  }

  relevantUpgrades.forEach(upgrade => {
    const isPurchased = game.upgradeManager.isPurchased(upgrade.id)
    const canPurchase = game.upgradeManager.canPurchase(upgrade.id)

    const upgradeDiv = document.createElement('div')
    upgradeDiv.className = `upgrade-item ${isPurchased ? 'purchased' : ''} ${!canPurchase && !isPurchased ? 'locked' : ''}`

    const costText = Object.entries(upgrade.cost).map(([id, amt]) => `${resources[id].icon} ${amt}`).join(', ')

    let typeLabel = 'Other'
    let typeClass = ''
    if (upgrade.type === 'speed') {
      typeLabel = 'Speed'
      typeClass = 'speed'
    } else if (upgrade.type === 'outputBonus') {
      typeLabel = 'Output'
      typeClass = 'output'
    } else if (upgrade.type === 'costReduction') {
      typeLabel = 'Cost'
      typeClass = 'cost'
    }

    upgradeDiv.innerHTML = `
      <div class="upgrade-header">
        <div class="upgrade-name">${upgrade.name}</div>
        <div class="upgrade-type ${typeClass}">${typeLabel}</div>
      </div>
      <div class="upgrade-description">${upgrade.description}</div>
      <div class="upgrade-cost">Cost: ${costText}</div>
      ${isPurchased ? '<div style="color: #28a745; font-size: 12px; font-weight: 600;">✓ Purchased</div>' : `
        <button class="upgrade-buy-btn" ${!canPurchase ? 'disabled' : ''} data-upgrade="${upgrade.id}">
          ${canPurchase ? 'Buy Upgrade' : 'Locked'}
        </button>
      `}
    `

    const buyBtn = upgradeDiv.querySelector('.upgrade-buy-btn')
    if (buyBtn) {
      buyBtn.addEventListener('click', () => {
        try {
          game.upgradeManager.purchase(upgrade.id)
        } catch (e) {
          console.error(e)
        }
      })
    }

    container.appendChild(upgradeDiv)
  })
}

function buildWorkerPanel() {
  const container = document.getElementById('workerPanel')
  if (!container) {
    console.warn('⚠️ [UI] workerPanel element not found in HTML')
    return
  }
  container.innerHTML = '<h3>Workers</h3><div id="workerSummaryList"></div>'
}

function buildBuildingMenu() {
  const containerDesktop = document.getElementById('buildingMenu')
  const containerMobile = document.getElementById('buildingMenuMobile')
  const slotsInfoDesktop = document.getElementById('buildingSlots')
  const slotsInfoMobile = document.getElementById('buildingSlotsMobile')

  if (!containerDesktop && !containerMobile) return

  // Update slots display for both desktop and mobile
  const usedSlots = game.buildingManager.usedSlots
  const availableSlots = game.buildingManager.availableSlots
  const slotsText = `${usedSlots}/${availableSlots} Slots Used`

  if (slotsInfoDesktop) {
    slotsInfoDesktop.textContent = slotsText
  }
  if (slotsInfoMobile) {
    slotsInfoMobile.textContent = slotsText
  }

  // Track newly unlocked buildings
  const newlyUnlockedBuildings = []

  // Get all building types
  const buildingTypes = game.buildingManager.buildingTypes

  buildingTypes.forEach(buildingType => {
    const isUnlocked = game.buildingManager.isUnlocked(buildingType)
    const wasUnlocked = lastBuildingUnlockState.get(buildingType.id)

    // Track newly unlocked buildings
    if (wasUnlocked === false && isUnlocked) {
      newlyUnlockedBuildings.push(buildingType.id)
    }

    // Update unlock state tracking
    lastBuildingUnlockState.set(buildingType.id, isUnlocked)
  })

  // Clear both containers
  if (containerDesktop) {
    containerDesktop.innerHTML = ''
  }
  if (containerMobile) {
    containerMobile.innerHTML = ''
  }

  buildingTypes.forEach(buildingType => {
    // Create cards for both desktop and mobile
    if (containerDesktop) {
      const cardDesktop = createBuildingCard(buildingType)
      containerDesktop.appendChild(cardDesktop)

      // Apply sparkle effect to newly unlocked buildings
      if (newlyUnlockedBuildings.includes(buildingType.id)) {
        cardDesktop.classList.add('newly-unlocked')

        // Remove sparkle on first hover
        const removeSparkle = () => {
          cardDesktop.classList.remove('newly-unlocked')
          cardDesktop.removeEventListener('mouseenter', removeSparkle)
        }
        cardDesktop.addEventListener('mouseenter', removeSparkle)
      }
    }

    if (containerMobile) {
      const cardMobile = createBuildingCard(buildingType)
      containerMobile.appendChild(cardMobile)

      // Apply sparkle effect to newly unlocked buildings
      if (newlyUnlockedBuildings.includes(buildingType.id)) {
        cardMobile.classList.add('newly-unlocked')

        // Remove sparkle on first hover
        const removeSparkle = () => {
          cardMobile.classList.remove('newly-unlocked')
          cardMobile.removeEventListener('mouseenter', removeSparkle)
        }
        cardMobile.addEventListener('mouseenter', removeSparkle)
      }
    }
  })
}

function createBuildingCard(buildingType) {
  const card = document.createElement('div')
  card.className = 'building-card'
  card.dataset.buildingId = buildingType.id

  // Check if unlocked
  const isUnlocked = game.buildingManager.isUnlocked(buildingType)
  if (!isUnlocked) {
    card.classList.add('locked')
  }

  // Get current buildings and cost
  const builtBuildings = game.buildingManager.getBuildings(buildingType.id).filter(b => b.constructionComplete)
  const currentCount = game.buildingManager.getBuildings(buildingType.id).length
  const cost = game.buildingManager.getBuildingCost(buildingType.id)
  const canBuildResult = game.buildingManager.canBuild(buildingType.id)

  // Build cost HTML with current amounts
  const costHTML = Object.entries(cost).map(([resourceId, amount]) => {
    const current = game.resourceManager.get(resourceId) || 0
    const canAfford = current >= amount
    const resource = resources[resourceId]
    return `<div class="cost-item ${canAfford ? '' : 'insufficient'}">
      ${resource.icon} ${resource.name}: ${Math.floor(current)}/${amount}
    </div>`
  }).join('')

  // Unlock condition text
  let unlockText = ''
  if (!isUnlocked && buildingType.unlockCondition) {
    const condition = buildingType.unlockCondition
    if (condition.type === 'resource_mined') {
      const mined = game.buildingManager.resourcesMined[condition.resource] || 0
      unlockText = `<div class="unlock-condition">🔒 Mine ${condition.amount} ${condition.resource} (${Math.floor(mined)}/${condition.amount})</div>`
    } else if (condition.type === 'buildings_built') {
      const built = game.buildingManager.getTotalBuildingCount()
      unlockText = `<div class="unlock-condition">🔒 Build ${condition.count} buildings (${built}/${condition.count})</div>`
    }
  }

  // Built buildings HTML
  let builtBuildingsHTML = ''
  builtBuildings.forEach((building, index) => {
    const upgradesHTML = buildingType.upgrades ? buildingType.upgrades.map(upgrade => {
      const currentLevel = building.upgrades[upgrade.id] || 0
      const canUpgrade = game.buildingManager.canUpgradeBuilding(building.instanceId, upgrade.id)
      const costText = Object.entries(upgrade.cost).map(([id, amt]) => `${resources[id].icon}${amt}`).join(' ')

      return `
        <div class="building-upgrade-item">
          <div class="upgrade-info">
            <strong>${upgrade.name}</strong> (${currentLevel}/${upgrade.maxLevel})
            <div class="upgrade-desc">${upgrade.description}</div>
            <div class="upgrade-cost-small">Cost: ${costText}</div>
          </div>
          <button class="btn-upgrade-building ${!canUpgrade.canUpgrade ? 'disabled' : ''}"
                  data-instance="${building.instanceId}"
                  data-upgrade="${upgrade.id}"
                  ${!canUpgrade.canUpgrade ? 'disabled' : ''}>
            ${canUpgrade.canUpgrade ? 'Upgrade' : canUpgrade.reason}
          </button>
        </div>
      `
    }).join('') : '<div class="no-upgrades">No upgrades available</div>'

    builtBuildingsHTML += `
      <div class="built-building-instance">
        <div class="instance-header-row">
          <span class="instance-label">${buildingType.emoji} ${buildingType.name} #${index + 1}</span>
          <button class="btn-demolish" data-instance="${building.instanceId}">🗑️ Demolish</button>
        </div>
        <div class="building-upgrades">
          ${upgradesHTML}
        </div>
      </div>
    `
  })

  card.innerHTML = `
    <div class="building-header">
      <div class="building-emoji">${buildingType.emoji}</div>
      <div class="building-info">
        <h3>${buildingType.name}</h3>
        <p>${buildingType.description}</p>
      </div>
    </div>
    <div class="building-count">Built: ${currentCount}/${buildingType.maxCount}</div>
    ${unlockText}
    ${builtBuildingsHTML ? `<div class="built-buildings-list">${builtBuildingsHTML}</div>` : ''}
    <div class="building-cost">
      ${costHTML}
    </div>
    <div class="building-construction-time">⏱️ ${buildingType.constructionTime}s to build</div>
    <div class="building-actions">
      <button class="btn-build" data-building="${buildingType.id}" ${!canBuildResult.canBuild ? 'disabled' : ''}>
        ${canBuildResult.canBuild ? 'Build' : canBuildResult.reason}
      </button>
    </div>
  `

  // Add event listener to build button
  const buildBtn = card.querySelector('.btn-build')
  if (buildBtn && canBuildResult.canBuild) {
    buildBtn.addEventListener('click', () => {
      try {
        game.buildingManager.startConstruction(buildingType.id)
        showNotification(`🏗️ Started building ${buildingType.name}!`)
        buildBuildingMenu() // Rebuild to update UI
      } catch (e) {
        showNotification(`❌ ${e.message}`)
      }
    })
  }

  // Add event listeners to demolish buttons
  card.querySelectorAll('.btn-demolish').forEach(btn => {
    btn.addEventListener('click', () => {
      const instanceId = btn.dataset.instance
      if (confirm(`Demolish this ${buildingType.name}? You'll get 50% resources back.`)) {
        try {
          const refund = game.buildingManager.demolishBuilding(instanceId)
          const refundText = Object.entries(refund).map(([id, amt]) => `${resources[id].icon}${amt}`).join(' ')
          showNotification(`🗑️ Demolished! Refund: ${refundText}`)
          buildBuildingMenu() // Rebuild to update UI
        } catch (e) {
          showNotification(`❌ ${e.message}`)
        }
      }
    })
  })

  // Add event listeners to upgrade buttons
  card.querySelectorAll('.btn-upgrade-building').forEach(btn => {
    btn.addEventListener('click', () => {
      const instanceId = btn.dataset.instance
      const upgradeId = btn.dataset.upgrade
      try {
        const newLevel = game.buildingManager.upgradeBuilding(instanceId, upgradeId)
        const upgrade = buildingType.upgrades.find(u => u.id === upgradeId)
        showNotification(`✨ Upgraded ${upgrade.name} to level ${newLevel}!`)
        buildBuildingMenu() // Rebuild to update UI
      } catch (e) {
        showNotification(`❌ ${e.message}`)
      }
    })
  })

  return card
}

// ============================================================================
// UPDATE FUNCTIONS - Fast property updates only
// ============================================================================

function updateActivityState(activityId) {
  const cached = activityElements.get(activityId)
  if (!cached) return

  const activity = activities.find(a => a.id === activityId)
  if (!activity) return

  const isRunning = game.activityManager.getActiveActivities().some(a => a.activityId === activityId)
  const isAutomated = game.workerManager.isAutomated(activityId)
  const canRun = game.activityManager.canRun(activityId)
  const isHalted = isAutomated && !canRun

  // Update classes
  cached.root.classList.toggle('running', isRunning)
  cached.root.classList.toggle('halted', isHalted)

  // Update halted warning
  cached.haltedWarning.textContent = isHalted ? '⚠️ Production halted - insufficient resources' : ''

  // Update duration display
  const effectiveDuration = game.activityManager.getEffectiveDuration(activityId)
  if (!isFinite(effectiveDuration)) {
    cached.duration.textContent = `${activity.duration}s ⏸️ (needs workers)`
  } else {
    const roundedDuration = Math.round(effectiveDuration * 10) / 10
    if (Math.abs(effectiveDuration - activity.duration) > 0.1) {
      const speedPercent = Math.round((activity.duration / effectiveDuration) * 100)
      cached.duration.textContent = `${roundedDuration}s ⚡${speedPercent}%`
    } else {
      cached.duration.textContent = `${roundedDuration}s`
    }
  }

  // Update input highlighting
  Object.entries(cached.inputSpans).forEach(([resourceId, span]) => {
    if (!span) return
    const requiredAmount = activity.inputs[resourceId] || 0
    const currentAmount = game.resourceManager.get(resourceId)
    const canAfford = currentAmount >= requiredAmount
    span.classList.toggle('insufficient', !canAfford && isAutomated)
  })

  // Update resource information
  if (cached.currentResources && cached.resourcesPerMin) {
    // Show current count of output resources
    const outputResourceTexts = Object.entries(activity.outputs).map(([resourceId, amount]) => {
      const current = game.resourceManager.get(resourceId)
      const resource = resources[resourceId]
      return `${resource.icon} ${Math.floor(current)}`
    }).join(' ')
    cached.currentResources.textContent = outputResourceTexts ? `Have: ${outputResourceTexts}` : ''

    // Calculate resources per minute
    if (isAutomated && isFinite(effectiveDuration) && effectiveDuration > 0) {
      const cyclesPerMinute = 60 / effectiveDuration
      const resourcesPerMin = Object.entries(activity.outputs).map(([resourceId, amount]) => {
        const perMin = Math.round(amount * cyclesPerMinute * 10) / 10
        const resource = resources[resourceId]
        return `${resource.icon} ${perMin}/min`
      }).join(' ')
      cached.resourcesPerMin.textContent = resourcesPerMin
    } else {
      cached.resourcesPerMin.textContent = ''
    }
  }

  // Update worker controls
  const workerAssignments = game.workerManager.getActivityAssignments(activityId)
  const hasWorkersAssigned = Object.values(workerAssignments).some(count => count > 0)

  if (cached.removeAllBtn) {
    cached.removeAllBtn.classList.toggle('hidden', !hasWorkersAssigned)
  }

  cached.workerCounts.forEach((countSpan, workerTypeId) => {
    const assigned = workerAssignments[workerTypeId] || 0
    countSpan.textContent = assigned
  })

  cached.workerButtons.forEach((buttons, workerTypeId) => {
    const assigned = workerAssignments[workerTypeId] || 0
    const available = game.workerManager.getAvailableWorkers(workerTypeId)

    // Update all button states
    if (buttons.minus10) buttons.minus10.disabled = assigned === 0
    if (buttons.minus) buttons.minus.disabled = assigned === 0
    if (buttons.plus) buttons.plus.disabled = available === 0
    if (buttons.plus10) buttons.plus10.disabled = available === 0
  })
}

function updateSkillXP(skillId) {
  const cached = skillElements.get(skillId)
  if (!cached) return

  const level = game.skillManager.getLevel(skillId)
  const xpProgress = game.skillManager.getXPProgress(skillId)

  cached.levelValue.textContent = level
  cached.xpFill.style.width = `${xpProgress.percent * 100}%`
}

function updateSkillSelection() {
  skillElements.forEach((cached, skillId) => {
    cached.root.classList.toggle('selected', skillId === selectedSkill)
  })
}

/**
 * Update skill resource emoji indicators based on worker activity
 * Makes emojis pulse slow/medium/fast based on workers assigned to activities that produce them
 */
function updateSkillResourceIndicators() {
  skillElements.forEach((cached, skillId) => {
    if (!cached.resourceEmojis) return

    // Count workers assigned to activities that produce each resource for this skill
    const resourceWorkerCounts = {}

    // Get all activities for this skill
    const skillActivities = activities.filter(a => a.skillId === skillId)

    skillActivities.forEach(activity => {
      // Get total workers assigned to this activity
      const workerAssignments = game.workerManager.getActivityAssignments(activity.id)
      const totalWorkersOnActivity = Object.values(workerAssignments).reduce((sum, count) => sum + count, 0)

      // Add worker count to each output resource
      Object.keys(activity.outputs).forEach(resourceId => {
        resourceWorkerCounts[resourceId] = (resourceWorkerCounts[resourceId] || 0) + totalWorkersOnActivity
      })
    })

    // Update each resource emoji with appropriate pulse class
    Object.entries(cached.resourceEmojis).forEach(([resourceId, elem]) => {
      const workerCount = resourceWorkerCounts[resourceId] || 0

      // Remove all pulse classes
      elem.classList.remove('pulse-slow', 'pulse-medium', 'pulse-fast', 'active')

      // Add appropriate pulse class based on worker count
      if (workerCount > 0) {
        elem.classList.add('active')

        if (workerCount >= 8) {
          elem.classList.add('pulse-fast')
        } else if (workerCount >= 4) {
          elem.classList.add('pulse-medium')
        } else {
          elem.classList.add('pulse-slow')
        }
      }
    })
  })
}

function calculateResourceProductionRate(resourceId) {
  let totalPerSecond = 0

  // Go through all activities to find production rates
  activities.forEach(activity => {
    const outputs = activity.outputs
    if (outputs[resourceId]) {
      const outputAmount = outputs[resourceId]
      const effectiveDuration = game.activityManager.getEffectiveDuration(activity.id)
      const isAutomated = game.workerManager.isAutomated(activity.id)
      const canRun = game.activityManager.canRun(activity.id)

      // Only count if activity is automated, has finite duration, and can run
      if (isAutomated && isFinite(effectiveDuration) && effectiveDuration > 0 && canRun) {
        const perSecond = outputAmount / effectiveDuration
        totalPerSecond += perSecond
      }
    }
  })

  return totalPerSecond
}

function updateResourceAmount(resourceId) {
  const amount = game.resourceManager.get(resourceId)

  // Create element if it doesn't exist and amount > 0
  if (!resourceElements.has(resourceId) && amount > 0) {
    // Clear "No resources" message if it exists
    const container = document.getElementById('currencyTicker')
    const noResourcesMsg = container.querySelector('.currency-item:not([data-currency-id])')
    if (noResourcesMsg) {
      noResourcesMsg.remove()
    }

    createResourceElement(resourceId, amount)
  }

  const cached = resourceElements.get(resourceId)
  if (!cached) return

  // Update or remove
  if (amount > 0) {
    cached.amount.textContent = Math.floor(amount)

    // Update storage limit display
    const storageInfo = game.resourceManager.getStorageInfo(resourceId)
    if (cached.max) {
      cached.max.textContent = storageInfo.max
    }

    // Update production rate
    const ratePerSecond = calculateResourceProductionRate(resourceId)
    if (ratePerSecond > 0) {
      const ratePerMinute = Math.round(ratePerSecond * 60 * 10) / 10
      cached.rate.textContent = `(+${ratePerMinute}/min)`
      cached.rate.style.color = '#4ade80' // Green color for positive rate
    } else {
      cached.rate.textContent = ''
    }
  } else {
    cached.root.remove()
    resourceElements.delete(resourceId)

    // Show "No resources" message if no resources left
    const container = document.getElementById('currencyTicker')
    if (resourceElements.size === 0) {
      container.innerHTML = '<div class="currency-item">No resources yet - start gathering!</div>'
    }
  }
}

function updateActiveActivitiesPanel() {
  const container = document.getElementById('activeActivitiesList')
  const active = game.activityManager.getActiveActivities()

  if (active.length === 0) {
    container.innerHTML = '<div class="no-activities">Assign workers to activities to start automation</div>'
    activeActivityElements.clear()
    return
  }

  // Update existing, add new, remove old
  const currentIds = new Set(active.map(a => a.activityId))

  // Remove old ones
  activeActivityElements.forEach((cached, activityId) => {
    if (!currentIds.has(activityId)) {
      cached.root.remove()
      activeActivityElements.delete(activityId)
    }
  })

  // Add or update
  active.forEach(state => {
    const activityId = state.activityId
    const activity = activities.find(a => a.id === activityId)
    const progress = game.activityManager.getProgress(activityId)

    if (activeActivityElements.has(activityId)) {
      // Update existing
      const cached = activeActivityElements.get(activityId)
      cached.progressFill.style.width = `${progress * 100}%`
      cached.status.textContent = `${Math.floor(progress * 100)}%`
    } else {
      // Create new
      const outputsText = Object.entries(activity.outputs).map(([id, amt]) => {
        const resource = resources[id]
        return `${resource.icon}×${amt}`
      }).join(' ')

      const div = document.createElement('div')
      div.className = 'active-activity-item'
      div.innerHTML = `
        <div class="active-activity-name">
          ${activity.name}
          <span class="active-activity-outputs">${outputsText}</span>
        </div>
        <div class="active-activity-progress-bar">
          <div class="active-activity-progress-fill" style="width: ${progress * 100}%"></div>
        </div>
        <div class="active-activity-status">${Math.floor(progress * 100)}%</div>
      `

      activeActivityElements.set(activityId, {
        root: div,
        progressFill: div.querySelector('.active-activity-progress-fill'),
        status: div.querySelector('.active-activity-status')
      })

      container.appendChild(div)
    }
  })
}

function updateWorkerSummary() {
  const container = document.getElementById('workerSummaryCompact')
  if (!container) return

  container.innerHTML = '<div class="worker-summary-title">👷 Workers</div>'

  let hasWorkers = false
  game.workerManager.workerTypes.forEach(workerType => {
    const total = game.resourceManager.get(workerType.id) || 0
    const assigned = game.workerManager.getAssignedWorkers(workerType.id)
    const available = total - assigned

    if (total > 0) {
      hasWorkers = true
      const availableClass = available === 0 ? 'worker-all-assigned' : ''
      container.innerHTML += `
        <div class="worker-summary-line ${availableClass}">
          ${resources[workerType.id].icon} <span class="worker-available">${available}</span>/<span class="worker-total">${total}</span>
        </div>
      `
    }
  })

  if (!hasWorkers) {
    container.innerHTML += '<div class="worker-summary-none">No workers yet</div>'
  }
}

function updateWorkerPanel() {
  const container = document.getElementById('workerSummaryList')
  if (!container) return

  container.innerHTML = ''

  let hasWorkers = false
  game.workerManager.workerTypes.forEach(workerType => {
    const total = game.resourceManager.get(workerType.id) || 0
    const assigned = game.workerManager.getAssignedWorkers(workerType.id)
    const available = total - assigned

    if (total > 0) {
      hasWorkers = true
      container.innerHTML += `
        <div class="worker-summary-item">
          <span class="worker-summary-icon">${resources[workerType.id].icon}</span>
          <span class="worker-summary-name">${resources[workerType.id].name}</span>
          <span class="worker-summary-stats">${total} total (${assigned} assigned, ${available} available)</span>
        </div>
      `
    }
  })

  if (!hasWorkers) {
    container.innerHTML = '<div class="no-activities">No workers yet - produce worker currencies to unlock automation!</div>'
  }
}

// ============================================================================
// EVENT HANDLERS - Minimal updates only
// ============================================================================

function handleActivityClick(e) {
  const target = e.target

  // Handle plus 10 button
  if (target.classList.contains('worker-btn-plus-10')) {
    e.preventDefault()
    const activityId = target.dataset.activity
    const workerTypeId = target.dataset.worker
    const current = game.workerManager.getAssignment(activityId, workerTypeId)
    const available = game.workerManager.getAvailableWorkers(workerTypeId)
    const toAdd = Math.min(10, available)

    if (toAdd > 0 && !target.disabled) {
      // Temporarily disable to prevent double-clicks
      target.disabled = true
      game.workerManager.assign(activityId, workerTypeId, current + toAdd)
      // Note: Button state will be properly updated by updateActivityState() via worker:assigned event
    }
  }

  // Handle plus button
  else if (target.classList.contains('worker-btn-plus')) {
    e.preventDefault()
    const activityId = target.dataset.activity
    const workerTypeId = target.dataset.worker
    const current = game.workerManager.getAssignment(activityId, workerTypeId)
    const available = game.workerManager.getAvailableWorkers(workerTypeId)

    if (available > 0 && !target.disabled) {
      // Temporarily disable to prevent double-clicks
      target.disabled = true
      game.workerManager.assign(activityId, workerTypeId, current + 1)
      // Note: Button state will be properly updated by updateActivityState() via worker:assigned event
    }
  }

  // Handle minus 10 button
  else if (target.classList.contains('worker-btn-minus-10')) {
    e.preventDefault()
    const activityId = target.dataset.activity
    const workerTypeId = target.dataset.worker
    const current = game.workerManager.getAssignment(activityId, workerTypeId)
    const toRemove = Math.min(10, current)

    if (toRemove > 0 && !target.disabled) {
      // Temporarily disable to prevent double-clicks
      target.disabled = true
      game.workerManager.assign(activityId, workerTypeId, current - toRemove)
      // Note: Button state will be properly updated by updateActivityState() via worker:unassigned event
    }
  }

  // Handle minus button
  else if (target.classList.contains('worker-btn-minus')) {
    e.preventDefault()
    const activityId = target.dataset.activity
    const workerTypeId = target.dataset.worker
    const current = game.workerManager.getAssignment(activityId, workerTypeId)

    if (current > 0 && !target.disabled) {
      // Temporarily disable to prevent double-clicks
      target.disabled = true
      game.workerManager.assign(activityId, workerTypeId, current - 1)
      // Note: Button state will be properly updated by updateActivityState() via worker:unassigned event
    }
  }

  // Handle remove all
  else if (target.classList.contains('worker-btn-remove-all')) {
    e.preventDefault()
    const activityId = target.dataset.activity

    if (!target.disabled) {
      // Temporarily disable to prevent double-clicks
      target.disabled = true
      game.workerManager.unassignAll(activityId)
      // Note: Button state will be properly updated by updateActivityState() via worker:unassigned event
    }
  }
}

function handleActivityCompleted(data) {
  updateActivityState(data.activityId)
  updateActiveActivitiesPanel()
  checkForUnlocks()

  // Spawn particle effects
  if (data.outputs) {
    Object.entries(data.outputs).forEach(([resourceId, amount]) => {
      const resource = resources[resourceId]
      if (resource) {
        spawnParticle(resource.icon)
      }
    })
  }
}

function handleActivityStarted(data) {
  updateActivityState(data.activityId)
  updateActiveActivitiesPanel()
}

function handleActivityStopped(data) {
  updateActivityState(data.activityId)
  updateActiveActivitiesPanel()
}

function handleSkillLevelup(data) {
  updateSkillXP(data.skillId)
  checkForUnlocks()
  showNotification(`🎉 ${data.skillId.toUpperCase()} reached level ${data.newLevel}!`)
}

function handleResourceChanged(data) {
  // Update all resources efficiently
  const allResources = game.resourceManager.getAll()
  Object.keys(allResources).forEach(resourceId => {
    updateResourceAmount(resourceId)
  })

  updateWorkerSummary()
  updateWorkerPanel()

  // Update all activity states (for button enabling and input highlighting)
  activityElements.forEach((_, activityId) => {
    updateActivityState(activityId)
  })

  // Update building menu to show updated resource costs
  buildBuildingMenu()

  // NOTE: Don't manually render town canvas here - let the animation loop handle it smoothly
  // Calling render() outside the requestAnimationFrame loop causes stuttering
}

function handleGameTick(data) {
  // Game tick event - currently no UI updates needed for continuous gameplay
  // Activity simulations update via their own render loop
}

function handleWorkerChanged(data) {
  updateWorkerSummary()
  updateWorkerPanel()

  // Update ALL activities on the current skill since worker availability has changed
  // This ensures buttons on all activities reflect the new worker availability
  // (e.g., when you remove a worker from Activity A, Activity B's plus button should enable)
  activityElements.forEach((_, activityId) => {
    updateActivityState(activityId)
  })

  // Update skill resource indicators (pulsing emojis)
  updateSkillResourceIndicators()
}

function handleOfflineProgress(data) {
  const timeInSeconds = Math.floor(data.totalTime / 1000)
  const minutes = Math.floor(timeInSeconds / 60)
  const seconds = timeInSeconds % 60

  const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
  const resourceCount = Object.keys(data.resourcesEarned || data.currenciesEarned || {}).length
  const activitiesCount = data.activitiesCompleted.reduce((sum, a) => sum + a.completions, 0)

  showNotification(`⏰ Welcome back! While offline (${timeString}): ${activitiesCount} activities completed, ${resourceCount} resources earned!`)
}

function handleUpgradePurchased(data) {
  buildUpgradeList()
  showNotification(`✨ Purchased: ${data.upgrade.name}!`)
}

function handleBuildingEvent(data) {
  // Rebuild building menu when anything changes
  buildBuildingMenu()

  // NOTE: Don't manually render town canvas here - let the animation loop handle it smoothly
  // The requestAnimationFrame loop will pick up changes automatically on the next frame
}

function checkForUnlocks() {
  // Check if any unlocks changed - if so, rebuild activity list
  let unlockChanged = false
  const newlyUnlockedActivities = []

  lastUnlockState.forEach((wasUnlocked, activityId) => {
    const isUnlocked = game.skillManager.isActivityUnlocked(activityId)
    if (wasUnlocked !== isUnlocked) {
      unlockChanged = true
      // Track activities that just became unlocked
      if (!wasUnlocked && isUnlocked) {
        newlyUnlockedActivities.push(activityId)
      }
    }
  })

  if (unlockChanged) {
    buildActivityList(selectedSkill)

    // Apply sparkle effect to newly unlocked activities
    newlyUnlockedActivities.forEach(activityId => {
      const cached = activityElements.get(activityId)
      if (cached && cached.root) {
        cached.root.classList.add('newly-unlocked')

        // Remove sparkle on first hover
        const removeSparkle = () => {
          cached.root.classList.remove('newly-unlocked')
          cached.root.removeEventListener('mouseenter', removeSparkle)
        }
        cached.root.addEventListener('mouseenter', removeSparkle)
      }
    })
  }
}

// ============================================================================
// RENDER LOOP - 60fps activity simulation rendering
// ============================================================================

/**
 * Start the render loop for activity simulations
 * Runs independently from game logic at ~60fps
 */
function startSimulationRenderLoop() {
  let lastFrameTime = performance.now()

  function renderFrame(currentTime) {
    // Calculate delta time for smooth animations
    const deltaTime = currentTime - lastFrameTime
    lastFrameTime = currentTime

    // Render all activity simulations
    activitySimulations.forEach(simulation => {
      simulation.render(deltaTime)
    })

    // Render town canvas with animation (always render - it's visible in main view)
    if (townRenderer) {
      townRenderer.render(deltaTime)
    }

    // Continue loop
    requestAnimationFrame(renderFrame)
  }

  // Start the loop
  requestAnimationFrame(renderFrame)
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showNotification(message) {
  const notification = document.createElement('div')
  notification.className = 'notification'
  notification.textContent = message
  document.body.appendChild(notification)

  setTimeout(() => {
    notification.classList.add('fade-out')
    setTimeout(() => notification.remove(), 500)
  }, 3000)
}

function spawnParticle(icon) {
  const particle = document.createElement('div')
  particle.className = 'particle'
  particle.textContent = icon

  // Random position near center of screen
  const x = window.innerWidth / 2 + (Math.random() - 0.5) * 200
  const y = window.innerHeight / 2 + (Math.random() - 0.5) * 200

  particle.style.left = `${x}px`
  particle.style.top = `${y}px`

  document.body.appendChild(particle)

  // Remove after animation
  setTimeout(() => particle.remove(), 1500)
}

function saveGame() {
  const state = game.getState()
  localStorage.setItem('incrementalGameSave', JSON.stringify(state))
  showNotification('💾 Game saved!')
}

function loadGame() {
  const saved = localStorage.getItem('incrementalGameSave')
  if (saved) {
    try {
      const state = JSON.parse(saved)
      game.loadState(state)

      // Rebuild all UI
      buildSkillList()
      buildActivityList(selectedSkill)
      buildResourceTicker()
      buildActiveActivitiesPanel()
      updateActiveActivitiesPanel()
      buildUpgradeList()
      buildWorkerPanel()
      updateWorkerPanel()
      buildBuildingMenu()

      showNotification('📂 Game loaded!')
    } catch (e) {
      console.error('Failed to load game:', e)
    }
  }
}

function restartGame() {
  // Reset game
  game.reset()
  localStorage.removeItem('incrementalGameSave')

  buildSkillList()
  buildActivityList(selectedSkill)
  buildResourceTicker()
  buildActiveActivitiesPanel()
  updateActiveActivitiesPanel()
  buildUpgradeList()
  buildWorkerPanel()
  updateWorkerPanel()
  buildBuildingMenu()

  // Switch to activities tab
  switchTab('activities')

  showNotification('🔄 Game reset! Good luck!')
}

function resetGame() {
  if (confirm('Are you sure you want to reset? This cannot be undone!')) {
    restartGame()
  }
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
