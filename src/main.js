import { GameEngine } from './core/GameEngine.js'
import { skills } from './data/skills-expanded.js'
import { activities } from './data/activities-expanded.js'
import { currencies } from './data/currencies-expanded.js'
import { upgrades } from './data/upgrades.js'

// Initialize game
const game = new GameEngine(skills, activities, upgrades)

// Make game available globally for debugging
window.game = game

// Element caches for fast updates (no re-rendering!)
const activityElements = new Map() // activityId -> { root, progressBar, progressFill, status, ... }
const skillElements = new Map() // skillId -> { root, xpBar, xpFill, level }
const currencyElements = new Map() // currencyId -> element
const activeActivityElements = new Map() // activityId -> { root, progressFill, status }

// State
let selectedSkill = 'farming'  // First skill in expanded content
let lastUnlockState = new Map() // Track which activities are unlocked to detect changes
let autoSaveInterval = null

// Initialize UI
function init() {
  console.log('🎮 [Game] Initializing Automation Idle Game...')
  console.log('🚀 [Performance] Using high-performance direct DOM updates')

  // Clean up any existing listeners before adding new ones
  cleanupGameListeners()

  setupEventListeners()

  // Initial render - create all elements
  buildSkillList()
  buildActivityList(selectedSkill)
  buildCurrencyTicker()
  buildActiveActivitiesPanel()
  updateActiveActivitiesPanel() // Populate with initial content
  buildUpgradeList()
  buildWorkerPanel()
  updateWorkerPanel() // Populate with initial content

  // Subscribe to game events - now they just update, not rebuild
  game.on('activity:completed', handleActivityCompleted)
  game.on('activity:started', handleActivityStarted)
  game.on('activity:stopped', handleActivityStopped)
  game.on('skill:levelup', handleSkillLevelup)
  game.on('currency:changed', handleCurrencyChanged)
  game.on('game:tick', handleGameTick)
  game.on('game:offlineProgress', handleOfflineProgress)
  game.on('upgrade:purchased', handleUpgradePurchased)
  game.on('worker:assigned', handleWorkerChanged)
  game.on('worker:unassigned', handleWorkerChanged)

  // Start game
  game.start()
  console.log('✅ [Game] Started successfully')

  // Clear any existing auto-save interval
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval)
  }
  // Auto-save every 30 seconds
  autoSaveInterval = setInterval(saveGame, 30000)

  // Load saved game if exists
  loadGame()
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
  game.off('currency:changed', handleCurrencyChanged)
  game.off('game:tick', handleGameTick)
  game.off('game:offlineProgress', handleOfflineProgress)
  game.off('upgrade:purchased', handleUpgradePurchased)
  game.off('worker:assigned', handleWorkerChanged)
  game.off('worker:unassigned', handleWorkerChanged)
}

// Export cleanup function for testing and external use
window.cleanupGameListeners = cleanupGameListeners

function setupEventListeners() {
  document.getElementById('saveBtn').addEventListener('click', saveGame)
  document.getElementById('resetBtn').addEventListener('click', resetGame)

  // Event delegation for worker buttons (set up once)
  document.getElementById('activityList').addEventListener('click', handleActivityClick)
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

    skillDiv.innerHTML = `
      <div class="skill-icon">${skill.icon}</div>
      <div class="skill-info">
        <div class="skill-name">${skill.name}</div>
        <div class="skill-level">Level <span class="skill-level-value">${level}</span></div>
        <div class="skill-xp-bar">
          <div class="skill-xp-fill" style="width: ${xpProgress.percent * 100}%"></div>
        </div>
      </div>
    `

    skillDiv.addEventListener('click', () => {
      selectedSkill = skill.id
      updateSkillSelection()
      buildActivityList(skill.id)
      buildUpgradeList()
    })

    // Cache references for fast updates
    skillElements.set(skill.id, {
      root: skillDiv,
      levelValue: skillDiv.querySelector('.skill-level-value'),
      xpFill: skillDiv.querySelector('.skill-xp-fill')
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

  // Build inputs text
  const inputsHTML = Object.keys(activity.inputs).length === 0
    ? '<span class="free-label">FREE</span>'
    : Object.entries(activity.inputs).map(([id, amt]) => {
        const currency = currencies[id]
        return `<span class="input-${id}">${currency.icon} ${currency.name} × ${amt}</span>`
      }).join(', ')

  // Build outputs text
  const outputsHTML = Object.entries(activity.outputs).map(([id, amt]) => {
    const currency = currencies[id]
    return `${currency.icon} ${currency.name} × ${amt}`
  }).join(', ')

  // Build worker controls
  const workerHTML = createWorkerControlsHTML(activity, unlocked)

  activityDiv.innerHTML = `
    <div class="activity-header">
      <div class="activity-name-wrapper">
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
    <div class="activity-progress-bar">
      <div class="activity-progress-fill" style="width: 0%"></div>
    </div>
    <div class="activity-status"></div>
    ${workerHTML}
  `

  // Cache all the elements we'll need to update
  activityElements.set(activity.id, {
    root: activityDiv,
    progressFill: activityDiv.querySelector('.activity-progress-fill'),
    status: activityDiv.querySelector('.activity-status'),
    haltedWarning: activityDiv.querySelector('.activity-halted-warning'),
    duration: activityDiv.querySelector('.activity-duration'),
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
        minus: row.querySelector('.worker-btn-minus'),
        plus: row.querySelector('.worker-btn-plus')
      })
    }
  })

  cached.removeAllBtn = activityDiv.querySelector('.worker-btn-remove-all')

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
    const total = game.currencyManager.get(workerType.id) || 0
    const assigned = game.workerManager.getAssignment(activity.id, workerType.id)

    if (total > 0 || assigned > 0 || workerType.id === 'basicWorker') {
      html += `
        <div class="worker-assignment-row" data-worker-row="${workerType.id}">
          <span class="worker-type-name">${currencies[workerType.id].icon} ${currencies[workerType.id].name} (<span class="worker-total">${total}</span>)</span>
          <div class="worker-controls">
            <button class="worker-btn-minus" data-activity="${activity.id}" data-worker="${workerType.id}">-</button>
            <span class="worker-count">${assigned}</span>
            <button class="worker-btn-plus" data-activity="${activity.id}" data-worker="${workerType.id}">+</button>
          </div>
        </div>
      `
    }
  })

  html += '</div>'
  return html
}

function buildCurrencyTicker() {
  const container = document.getElementById('currencyTicker')
  container.innerHTML = ''
  currencyElements.clear()

  // Create elements for all currencies that exist
  const allCurrencies = game.currencyManager.getAll()
  Object.entries(allCurrencies).forEach(([id, amount]) => {
    if (amount > 0) {
      createCurrencyElement(id, amount)
    }
  })

  if (Object.keys(allCurrencies).filter(id => allCurrencies[id] > 0).length === 0) {
    container.innerHTML = '<div class="currency-item">No currencies yet - start gathering!</div>'
  }
}

function createCurrencyElement(currencyId, amount) {
  const container = document.getElementById('currencyTicker')
  const currency = currencies[currencyId]

  if (!currency) {
    console.error(`Currency ${currencyId} not found in currencies data`)
    return
  }

  const div = document.createElement('div')
  div.className = 'currency-item'
  div.dataset.currencyId = currencyId
  div.innerHTML = `${currency.icon} ${currency.name}: <span class="currency-amount">${Math.floor(amount)}</span>`

  currencyElements.set(currencyId, {
    root: div,
    amount: div.querySelector('.currency-amount')
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

    const costText = Object.entries(upgrade.cost).map(([id, amt]) => `${currencies[id].icon} ${amt}`).join(', ')

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
  container.innerHTML = '<h3>Workers</h3><div id="workerSummaryList"></div>'
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
  const progress = game.activityManager.getProgress(activityId)
  const isAutomated = game.workerManager.isAutomated(activityId)
  const canRun = game.activityManager.canRun(activityId)
  const isHalted = isAutomated && !canRun

  // Update classes
  cached.root.classList.toggle('running', isRunning)
  cached.root.classList.toggle('halted', isHalted)

  // Update progress
  cached.progressFill.style.width = isRunning ? `${progress * 100}%` : '0%'
  cached.status.textContent = isRunning ? `${Math.floor(progress * 100)}%` : ''

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
  Object.entries(cached.inputSpans).forEach(([currencyId, span]) => {
    if (!span) return
    const requiredAmount = activity.inputs[currencyId] || 0
    const currentAmount = game.currencyManager.get(currencyId)
    const canAfford = currentAmount >= requiredAmount
    span.classList.toggle('insufficient', !canAfford && isAutomated)
  })

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
    buttons.minus.disabled = assigned === 0
    buttons.plus.disabled = available === 0
  })
}

function updateActivityProgress(activityId) {
  const cached = activityElements.get(activityId)
  if (!cached) return

  const progress = game.activityManager.getProgress(activityId)
  cached.progressFill.style.width = `${progress * 100}%`
  cached.status.textContent = `${Math.floor(progress * 100)}%`
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

function updateCurrencyAmount(currencyId) {
  const amount = game.currencyManager.get(currencyId)

  // Create element if it doesn't exist and amount > 0
  if (!currencyElements.has(currencyId) && amount > 0) {
    // Clear "No currencies" message if it exists
    const container = document.getElementById('currencyTicker')
    const noCurrenciesMsg = container.querySelector('.currency-item:not([data-currency-id])')
    if (noCurrenciesMsg) {
      noCurrenciesMsg.remove()
    }

    createCurrencyElement(currencyId, amount)
  }

  const cached = currencyElements.get(currencyId)
  if (!cached) return

  // Update or remove
  if (amount > 0) {
    cached.amount.textContent = Math.floor(amount)
  } else {
    cached.root.remove()
    currencyElements.delete(currencyId)

    // Show "No currencies" message if no currencies left
    const container = document.getElementById('currencyTicker')
    if (currencyElements.size === 0) {
      container.innerHTML = '<div class="currency-item">No currencies yet - start gathering!</div>'
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
        const currency = currencies[id]
        return `${currency.icon}×${amt}`
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
    const total = game.currencyManager.get(workerType.id) || 0
    const assigned = game.workerManager.getAssignedWorkers(workerType.id)
    const available = total - assigned

    if (total > 0) {
      hasWorkers = true
      const availableClass = available === 0 ? 'worker-all-assigned' : ''
      container.innerHTML += `
        <div class="worker-summary-line ${availableClass}">
          ${currencies[workerType.id].icon} <span class="worker-available">${available}</span>/<span class="worker-total">${total}</span>
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
    const total = game.currencyManager.get(workerType.id) || 0
    const assigned = game.workerManager.getAssignedWorkers(workerType.id)
    const available = total - assigned

    if (total > 0) {
      hasWorkers = true
      container.innerHTML += `
        <div class="worker-summary-item">
          <span class="worker-summary-icon">${currencies[workerType.id].icon}</span>
          <span class="worker-summary-name">${currencies[workerType.id].name}</span>
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

  // Handle plus button
  if (target.classList.contains('worker-btn-plus')) {
    e.preventDefault()
    const activityId = target.dataset.activity
    const workerTypeId = target.dataset.worker
    const current = game.workerManager.getAssignment(activityId, workerTypeId)
    const available = game.workerManager.getAvailableWorkers(workerTypeId)

    if (available > 0 && !target.disabled) {
      target.disabled = true
      setTimeout(() => { target.disabled = false }, 150)
      game.workerManager.assign(activityId, workerTypeId, current + 1)
    }
  }

  // Handle minus button
  else if (target.classList.contains('worker-btn-minus')) {
    e.preventDefault()
    const activityId = target.dataset.activity
    const workerTypeId = target.dataset.worker
    const current = game.workerManager.getAssignment(activityId, workerTypeId)

    if (current > 0 && !target.disabled) {
      target.disabled = true
      setTimeout(() => { target.disabled = false }, 150)
      game.workerManager.assign(activityId, workerTypeId, current - 1)
    }
  }

  // Handle remove all
  else if (target.classList.contains('worker-btn-remove-all')) {
    e.preventDefault()
    const activityId = target.dataset.activity

    if (!target.disabled) {
      target.disabled = true
      setTimeout(() => { target.disabled = false }, 150)
      game.workerManager.unassignAll(activityId)
    }
  }
}

function handleActivityCompleted(data) {
  updateActivityState(data.activityId)
  updateActiveActivitiesPanel()
  checkForUnlocks()
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

function handleCurrencyChanged(data) {
  // Update all currencies efficiently
  const allCurrencies = game.currencyManager.getAll()
  Object.keys(allCurrencies).forEach(currencyId => {
    updateCurrencyAmount(currencyId)
  })

  updateWorkerSummary()
  updateWorkerPanel()

  // Update all activity states (for button enabling and input highlighting)
  activityElements.forEach((_, activityId) => {
    updateActivityState(activityId)
  })
}

function handleGameTick(data) {
  // Only update progress bars for active activities - super fast!
  const active = game.activityManager.getActiveActivities()

  active.forEach(state => {
    updateActivityProgress(state.activityId)

    // Update active panel progress
    const cached = activeActivityElements.get(state.activityId)
    if (cached) {
      const progress = game.activityManager.getProgress(state.activityId)
      cached.progressFill.style.width = `${progress * 100}%`
      cached.status.textContent = `${Math.floor(progress * 100)}%`
    }
  })
}

function handleWorkerChanged(data) {
  updateWorkerSummary()
  updateWorkerPanel()

  // Only update the specific activity that changed
  if (data.activityId) {
    updateActivityState(data.activityId)
  }
}

function handleOfflineProgress(data) {
  const timeInSeconds = Math.floor(data.totalTime / 1000)
  const minutes = Math.floor(timeInSeconds / 60)
  const seconds = timeInSeconds % 60

  const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
  const currencyCount = Object.keys(data.currenciesEarned).length
  const activitiesCount = data.activitiesCompleted.reduce((sum, a) => sum + a.completions, 0)

  showNotification(`⏰ Welcome back! While offline (${timeString}): ${activitiesCount} activities completed, ${currencyCount} currencies earned!`)
}

function handleUpgradePurchased(data) {
  buildUpgradeList()
  showNotification(`✨ Purchased: ${data.upgrade.name}!`)
}

function checkForUnlocks() {
  // Check if any unlocks changed - if so, rebuild activity list
  let unlockChanged = false

  lastUnlockState.forEach((wasUnlocked, activityId) => {
    const isUnlocked = game.skillManager.isActivityUnlocked(activityId)
    if (wasUnlocked !== isUnlocked) {
      unlockChanged = true
    }
  })

  if (unlockChanged) {
    buildActivityList(selectedSkill)
  }
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
      buildCurrencyTicker()
      buildActiveActivitiesPanel()
      updateActiveActivitiesPanel()
      buildUpgradeList()
      buildWorkerPanel()
      updateWorkerPanel()

      showNotification('📂 Game loaded!')
    } catch (e) {
      console.error('Failed to load game:', e)
    }
  }
}

function resetGame() {
  if (confirm('Are you sure you want to reset? This cannot be undone!')) {
    game.reset()
    localStorage.removeItem('incrementalGameSave')

    buildSkillList()
    buildActivityList(selectedSkill)
    buildCurrencyTicker()
    buildActiveActivitiesPanel()
    updateActiveActivitiesPanel()
    buildUpgradeList()
    buildWorkerPanel()
    updateWorkerPanel()

    showNotification('🔄 Game reset!')
  }
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
