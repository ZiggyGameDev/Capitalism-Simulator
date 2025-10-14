import { GameEngine } from './core/GameEngine.js'
import { skills } from './data/skills-expanded.js'
import { activities } from './data/activities-expanded.js'
import { currencies } from './data/currencies-expanded.js'
import { upgrades } from './data/upgrades.js'

// Initialize game
const game = new GameEngine(skills, activities, upgrades)

// Make game available globally for debugging
window.game = game

// DOM elements
let selectedSkill = 'farming'  // First skill in expanded content

// Initialize UI
function init() {
  console.log('🎮 [Game] Initializing Automation Idle Game...')
  console.log('🔧 [Debug] Console logging enabled for worker actions')

  setupEventListeners()
  renderSkillList()
  renderActivityList(selectedSkill)
  renderCurrencyTicker()
  renderActiveActivities()
  renderUpgrades()
  renderWorkerPanel()

  // Subscribe to game events
  game.on('activity:completed', handleActivityCompleted)
  game.on('activity:started', handleActivityStarted)
  game.on('activity:stopped', handleActivityStopped)
  game.on('skill:levelup', handleSkillLevelup)
  game.on('currency:changed', updateCurrencyTicker)
  game.on('game:tick', handleGameTick)
  game.on('game:offlineProgress', handleOfflineProgress)
  game.on('upgrade:purchased', handleUpgradePurchased)
  game.on('worker:added', handleWorkerChanged)
  game.on('worker:assigned', handleWorkerChanged)
  game.on('worker:unassigned', handleWorkerChanged)

  // Start game
  game.start()
  console.log('✅ [Game] Started successfully')

  // Auto-save every 30 seconds
  setInterval(saveGame, 30000)

  // Load saved game if exists
  loadGame()
}

function setupEventListeners() {
  document.getElementById('saveBtn').addEventListener('click', saveGame)
  document.getElementById('resetBtn').addEventListener('click', resetGame)
}

function renderSkillList() {
  const container = document.getElementById('skillList')
  container.innerHTML = ''

  skills.forEach(skill => {
    const level = game.skillManager.getLevel(skill.id)
    const xpProgress = game.skillManager.getXPProgress(skill.id)

    const skillDiv = document.createElement('div')
    skillDiv.className = `skill-item ${selectedSkill === skill.id ? 'selected' : ''}`
    skillDiv.innerHTML = `
      <div class="skill-icon">${skill.icon}</div>
      <div class="skill-info">
        <div class="skill-name">${skill.name}</div>
        <div class="skill-level">Level ${level}</div>
        <div class="skill-xp-bar">
          <div class="skill-xp-fill" style="width: ${xpProgress.percent * 100}%"></div>
        </div>
      </div>
    `
    skillDiv.addEventListener('click', () => {
      selectedSkill = skill.id
      renderSkillList()
      renderActivityList(skill.id)
      renderUpgrades()
    })

    container.appendChild(skillDiv)
  })
}

// Set up event delegation for worker buttons (only once)
let workerButtonDelegationSetup = false
function setupWorkerButtonDelegation() {
  if (workerButtonDelegationSetup) return
  workerButtonDelegationSetup = true

  const container = document.getElementById('activityList')

  container.addEventListener('click', (e) => {
    const target = e.target

    // Handle plus button clicks
    if (target.classList.contains('worker-btn-plus')) {
      e.preventDefault()
      e.stopPropagation()

      const activityId = target.dataset.activity
      const workerTypeId = target.dataset.worker
      const current = game.workerManager.getAssignment(activityId, workerTypeId)
      const available = game.workerManager.getAvailableWorkers(workerTypeId)

      console.log(`[Worker] Plus clicked: ${workerTypeId} on ${activityId}, current: ${current}, available: ${available}`)

      if (available > 0 && !target.disabled) {
        const newCount = current + 1

        // Disable temporarily
        target.disabled = true
        setTimeout(() => { target.disabled = false }, 150)

        game.workerManager.assign(activityId, workerTypeId, newCount)
        console.log(`[Worker] Assigned ${newCount} ${workerTypeId} to ${activityId}`)
      } else {
        console.log(`[Worker] Cannot increase - no available workers or button disabled`)
      }
    }

    // Handle minus button clicks
    else if (target.classList.contains('worker-btn-minus')) {
      e.preventDefault()
      e.stopPropagation()

      const activityId = target.dataset.activity
      const workerTypeId = target.dataset.worker
      const current = game.workerManager.getAssignment(activityId, workerTypeId)

      console.log(`[Worker] Minus clicked: ${workerTypeId} on ${activityId}, current: ${current}`)

      if (current > 0 && !target.disabled) {
        const newCount = current - 1

        // Disable temporarily
        target.disabled = true
        setTimeout(() => { target.disabled = false }, 150)

        game.workerManager.assign(activityId, workerTypeId, newCount)
        console.log(`[Worker] Assigned ${newCount} ${workerTypeId} to ${activityId}`)
      } else {
        console.log(`[Worker] Cannot decrease - already at 0 or button disabled`)
      }
    }

    // Handle remove all button clicks
    else if (target.classList.contains('worker-btn-remove-all')) {
      e.preventDefault()
      e.stopPropagation()

      const activityId = target.dataset.activity
      console.log(`[Worker] Remove All clicked for ${activityId}`)

      if (!target.disabled) {
        // Disable temporarily
        target.disabled = true
        setTimeout(() => { target.disabled = false }, 150)

        game.workerManager.unassignAll(activityId)
        console.log(`[Worker] Removed all workers from ${activityId}`)
      }
    }
  })

  console.log('✅ [Setup] Worker button event delegation enabled')
}

function renderActivityList(skillId) {
  const container = document.getElementById('activityList')
  const skill = skills.find(s => s.id === skillId)

  if (!skill) return

  // Set up event delegation on first render
  setupWorkerButtonDelegation()

  const skillActivities = activities.filter(a => a.skillId === skillId)

  container.innerHTML = `<h2>${skill.icon} ${skill.name}</h2>`

  skillActivities.forEach(activity => {
    const unlocked = game.skillManager.isActivityUnlocked(activity.id)
    const isRunning = game.activityManager.getActiveActivities().some(a => a.activityId === activity.id)
    const progress = game.activityManager.getProgress(activity.id)
    const isAutomated = game.workerManager.isAutomated(activity.id)
    const workerAssignments = game.workerManager.getActivityAssignments(activity.id)

    // Check if production is halted
    const canRun = game.activityManager.canRun(activity.id)
    const isHalted = isAutomated && !canRun

    const activityDiv = document.createElement('div')
    activityDiv.className = `activity-item ${!unlocked ? 'locked' : ''} ${isRunning ? 'running' : ''} ${isHalted ? 'halted' : ''}`
    activityDiv.setAttribute('data-activity-id', activity.id)

    // Build inputs text with emojis and check if we can afford them
    const inputsText = Object.keys(activity.inputs).length === 0
      ? '<span class="free-label">FREE</span>'
      : Object.entries(activity.inputs).map(([id, amt]) => {
          const currency = currencies[id]
          const currentAmount = game.currencyManager.get(id)
          const canAfford = currentAmount >= amt
          const className = !canAfford && isAutomated ? 'insufficient' : ''
          return `<span class="${className}">${currency.icon} ${currency.name} × ${amt}</span>`
        }).join(', ')

    // Build outputs text with emojis
    const outputsText = Object.entries(activity.outputs).map(([id, amt]) => {
      const currency = currencies[id]
      return `${currency.icon} ${currency.name} × ${amt}`
    }).join(', ')

    // Build worker assignment HTML
    let workerAssignmentHTML = ''
    if (unlocked) {
      workerAssignmentHTML = '<div class="activity-worker-assignments">'

      // Always show header with "Remove All" button (hide when no workers to prevent layout shift)
      const hasWorkersAssigned = Object.values(workerAssignments).some(count => count > 0)
      workerAssignmentHTML += `
        <div class="worker-assignment-header">
          <span class="worker-assignment-title">Assign Workers:</span>
          <button class="worker-btn-remove-all ${!hasWorkersAssigned ? 'hidden' : ''}" data-activity="${activity.id}" title="Remove all workers from this activity">Remove All</button>
        </div>
      `

      // Show assignments for each worker type that exists
      let hasAnyWorkerControls = false
      game.workerManager.workerTypes.forEach(workerType => {
        const assigned = workerAssignments[workerType.id] || 0
        const available = game.workerManager.getAvailableWorkers(workerType.id)
        const total = game.currencyManager.get(workerType.id) || 0

        // Show controls if you have this worker type OR if it's basic worker (always show for tutorial)
        if (total > 0 || assigned > 0 || workerType.id === 'basicWorker') {
          hasAnyWorkerControls = true
          const canDecrease = assigned > 0
          const canIncrease = available > 0

          workerAssignmentHTML += `
            <div class="worker-assignment-row">
              <span class="worker-type-name">${currencies[workerType.id].icon} ${currencies[workerType.id].name} (${total})</span>
              <div class="worker-controls">
                <button class="worker-btn-minus" data-activity="${activity.id}" data-worker="${workerType.id}" ${!canDecrease ? 'disabled' : ''}>-</button>
                <span class="worker-count">${assigned}</span>
                <button class="worker-btn-plus" data-activity="${activity.id}" data-worker="${workerType.id}" ${!canIncrease ? 'disabled' : ''}>+</button>
              </div>
            </div>
          `
        }
      })

      if (!hasAnyWorkerControls) {
        workerAssignmentHTML += '<div class="no-workers-hint">No workers available yet</div>'
      }

      workerAssignmentHTML += '</div>'
    }

    activityDiv.innerHTML = `
      <div class="activity-header">
        <div class="activity-name">${activity.name} ${isAutomated ? '🤖' : ''}</div>
        <div class="activity-level">${unlocked ? '' : `🔒 Level ${activity.levelRequired}`}</div>
      </div>
      <div class="activity-info">
        ${inputsText} → ${outputsText}
      </div>
      ${isHalted ? '<div class="activity-halted-warning">⚠️ Production halted - insufficient resources</div>' : ''}
      <div class="activity-meta">
        ${activity.duration}s | +${activity.xpGained} XP
      </div>
      ${isRunning ? `
        <div class="activity-progress-bar">
          <div class="activity-progress-fill" style="width: ${progress * 100}%"></div>
        </div>
        <div class="activity-status">${Math.floor(progress * 100)}%</div>
      ` : ''}
      ${workerAssignmentHTML}
    `

    // Event listeners are handled by event delegation (see setupWorkerButtonDelegation)
    // No need to attach listeners to individual buttons anymore!

    container.appendChild(activityDiv)
  })
}

function renderCurrencyTicker() {
  const container = document.getElementById('currencyTicker')
  const allCurrencies = game.currencyManager.getAll()

  container.innerHTML = Object.entries(allCurrencies)
    .filter(([id, amount]) => amount > 0)
    .map(([id, amount]) => {
      const currency = currencies[id]
      return `<div class="currency-item">${currency.icon} ${currency.name}: ${Math.floor(amount)}</div>`
    }).join('')

  if (Object.keys(allCurrencies).length === 0) {
    container.innerHTML = '<div class="currency-item">No currencies yet - start gathering!</div>'
  }
}

function renderActiveActivities() {
  const container = document.getElementById('activeActivities')
  const active = game.activityManager.getActiveActivities()

  container.innerHTML = '<h3>Active Activities</h3>'

  if (active.length === 0) {
    container.innerHTML += '<div class="no-activities">Assign workers to activities to start automation</div>'
    return
  }

  active.forEach(state => {
    const activity = activities.find(a => a.id === state.activityId)
    const progress = game.activityManager.getProgress(state.activityId)

    const div = document.createElement('div')
    div.className = 'active-activity-item'
    div.innerHTML = `
      <div class="active-activity-name">🤖 ${activity.name}</div>
      <div class="active-activity-progress-bar">
        <div class="active-activity-progress-fill" style="width: ${progress * 100}%"></div>
      </div>
      <div class="active-activity-status">
        ${Math.floor(progress * 100)}%
      </div>
    `

    container.appendChild(div)
  })
}

function updateCurrencyTicker() {
  renderCurrencyTicker()
  renderWorkerPanel()  // Update worker counts immediately when currencies change
  console.log('[Render] Currency changed - updated ticker and worker panel')
}

function handleActivityCompleted(data) {
  renderActivityList(selectedSkill)
  renderCurrencyTicker()
  renderActiveActivities()
  renderWorkerPanel()  // Update worker panel when activities complete
  console.log('[Activity] Completed:', data.activityId)
}

function handleActivityStarted(data) {
  renderActivityList(selectedSkill)
  renderActiveActivities()
}

function handleActivityStopped(data) {
  renderActivityList(selectedSkill)
  renderActiveActivities()
}

function handleSkillLevelup(data) {
  renderSkillList()
  renderActivityList(selectedSkill)

  // Show notification
  showNotification(`🎉 ${data.skillId.toUpperCase()} reached level ${data.newLevel}!`)
}

let lastTickRender = 0
function handleGameTick(data) {
  // Update progress bars in active activities panel
  const active = game.activityManager.getActiveActivities()
  if (active.length > 0) {
    renderActiveActivities()

    // Update progress bars in activity list WITHOUT full re-render
    updateActivityProgressBars()

    // Only do full re-render occasionally (every 500ms) to update halted states
    const now = Date.now()
    if (now - lastTickRender > 500) {
      lastTickRender = now
      renderActivityList(selectedSkill)
    }
  }
}

// Update just the progress bars without re-rendering entire activity list
function updateActivityProgressBars() {
  const active = game.activityManager.getActiveActivities()
  active.forEach(state => {
    const activityId = state.activityId
    const progress = game.activityManager.getProgress(activityId)

    // Find the activity element
    const activityElements = document.querySelectorAll(`[data-activity-id="${activityId}"]`)
    activityElements.forEach(el => {
      const progressFill = el.querySelector('.activity-progress-fill')
      const progressStatus = el.querySelector('.activity-status')

      if (progressFill) {
        progressFill.style.width = `${progress * 100}%`
      }
      if (progressStatus) {
        progressStatus.textContent = `${Math.floor(progress * 100)}%`
      }
    })
  })
}

function handleOfflineProgress(data) {
  const timeInSeconds = Math.floor(data.totalTime / 1000)
  const minutes = Math.floor(timeInSeconds / 60)
  const seconds = timeInSeconds % 60

  const timeString = minutes > 0
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`

  const currencyCount = Object.keys(data.currenciesEarned).length
  const activitiesCount = data.activitiesCompleted.reduce((sum, a) => sum + a.completions, 0)

  showNotification(`⏰ Welcome back! While offline (${timeString}): ${activitiesCount} activities completed, ${currencyCount} currencies earned!`)
}

function handleUpgradePurchased(data) {
  renderUpgrades()
  renderCurrencyTicker()
  showNotification(`✨ Purchased: ${data.upgrade.name}!`)
}

function renderUpgrades() {
  const container = document.getElementById('upgradeList')
  container.innerHTML = ''

  // Get upgrades for currently selected skill's activities
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

function renderWorkerPanel() {
  const container = document.getElementById('workerPanel')

  // Show worker summary
  let workerSummaryHTML = '<h3>Workers</h3><div class="worker-summary">'
  let hasWorkers = false

  const workerCounts = []

  game.workerManager.workerTypes.forEach(workerType => {
    const total = game.currencyManager.get(workerType.id) || 0
    const assigned = game.workerManager.getAssignedWorkers(workerType.id)
    const available = total - assigned

    workerCounts.push(`${workerType.id}: ${total}`)

    if (total > 0) {
      hasWorkers = true
      workerSummaryHTML += `
        <div class="worker-summary-item">
          <span class="worker-summary-icon">${currencies[workerType.id].icon}</span>
          <span class="worker-summary-name">${currencies[workerType.id].name}</span>
          <span class="worker-summary-stats">${total} total (${assigned} assigned, ${available} available)</span>
        </div>
      `
    }
  })

  console.log('[Render] Worker panel updated:', workerCounts.join(', '))

  workerSummaryHTML += '</div>'

  if (!hasWorkers) {
    container.innerHTML = '<h3>Workers</h3><div class="no-activities">No workers yet - produce worker currencies to unlock automation!</div>'
    return
  }

  container.innerHTML = workerSummaryHTML
}

function handleWorkerChanged() {
  console.log('[Render] Worker changed event triggered')

  // Only update the worker panel, not the entire activity list
  // The activity list buttons already update their counts immediately
  renderWorkerPanel()

  // Schedule a full re-render after a delay to update automation status and "Remove All" button
  if (handleWorkerChanged.timeout) {
    clearTimeout(handleWorkerChanged.timeout)
  }

  handleWorkerChanged.timeout = setTimeout(() => {
    console.log('[Render] Debounced activity list re-render')
    renderActivityList(selectedSkill)  // Full re-render to update automation indicators
  }, 300)  // Longer delay - only re-render when user is done clicking
}

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
      renderSkillList()
      renderActivityList(selectedSkill)
      renderCurrencyTicker()
      renderActiveActivities()
      renderUpgrades()
      renderWorkerPanel()
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
    renderSkillList()
    renderActivityList(selectedSkill)
    renderCurrencyTicker()
    renderActiveActivities()
    renderUpgrades()
    renderWorkerPanel()
    showNotification('🔄 Game reset!')
  }
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
