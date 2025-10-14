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
let selectedSkill = 'woodcutting'

// Initialize UI
function init() {
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

function renderActivityList(skillId) {
  const container = document.getElementById('activityList')
  const skill = skills.find(s => s.id === skillId)

  if (!skill) return

  const skillActivities = activities.filter(a => a.skillId === skillId)

  container.innerHTML = `<h2>${skill.icon} ${skill.name}</h2>`

  skillActivities.forEach(activity => {
    const unlocked = game.skillManager.isActivityUnlocked(activity.id)
    const canStart = game.activityManager.canStart(activity.id)
    const isRunning = game.activityManager.getActiveActivities().some(a => a.activityId === activity.id)
    const progress = game.activityManager.getProgress(activity.id)
    const activityState = game.activityManager.getActiveActivities().find(a => a.activityId === activity.id)

    const activityDiv = document.createElement('div')
    activityDiv.className = `activity-item ${!unlocked ? 'locked' : ''} ${isRunning ? 'running' : ''}`

    const inputsText = Object.keys(activity.inputs).length === 0
      ? 'FREE'
      : Object.entries(activity.inputs).map(([id, amt]) => `${currencies[id].name} × ${amt}`).join(', ')

    const outputsText = Object.entries(activity.outputs).map(([id, amt]) => `${currencies[id].name} × ${amt}`).join(', ')

    activityDiv.innerHTML = `
      <div class="activity-header">
        <div class="activity-name">${activity.name}</div>
        <div class="activity-level">${unlocked ? '' : `🔒 Level ${activity.levelRequired}`}</div>
      </div>
      <div class="activity-info">
        ${inputsText} → ${outputsText}
      </div>
      <div class="activity-meta">
        ${activity.duration}s | +${activity.xpGained} XP
      </div>
      ${isRunning ? `
        <div class="activity-progress-bar">
          <div class="activity-progress-fill" style="width: ${progress * 100}%"></div>
        </div>
      ` : ''}
      <div class="activity-buttons">
        ${unlocked && !isRunning ? `
          <button class="start-btn" ${!canStart ? 'disabled' : ''} data-activity="${activity.id}">
            ${canStart ? '▶ Start' : '⏸ Cannot Start'}
          </button>
        ` : ''}
        ${isRunning ? `
          <button class="stop-btn" data-activity="${activity.id}">⏹ Stop</button>
          <button class="auto-btn ${activityState.autoMode ? 'active' : ''}" data-activity="${activity.id}">
            ${activityState.autoMode ? '🔁 Auto ON' : '🔁 Auto OFF'}
          </button>
        ` : ''}
      </div>
    `

    // Add event listeners
    const startBtn = activityDiv.querySelector('.start-btn')
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        try {
          game.activityManager.start(activity.id)
          renderActivityList(selectedSkill)
        } catch (e) {
          console.error(e)
        }
      })
    }

    const stopBtn = activityDiv.querySelector('.stop-btn')
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        game.activityManager.stopActivity(activity.id)
        renderActivityList(selectedSkill)
        renderActiveActivities()
      })
    }

    const autoBtn = activityDiv.querySelector('.auto-btn')
    if (autoBtn) {
      autoBtn.addEventListener('click', () => {
        const currentState = game.activityManager.getActiveActivities().find(a => a.activityId === activity.id)
        game.activityManager.setAutoMode(activity.id, !currentState.autoMode)
        renderActivityList(selectedSkill)
      })
    }

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
    container.innerHTML += '<div class="no-activities">No activities running</div>'
    return
  }

  active.forEach(state => {
    const activity = activities.find(a => a.id === state.activityId)
    const progress = game.activityManager.getProgress(state.activityId)

    const div = document.createElement('div')
    div.className = 'active-activity-item'
    div.innerHTML = `
      <div class="active-activity-name">${activity.name}</div>
      <div class="active-activity-progress-bar">
        <div class="active-activity-progress-fill" style="width: ${progress * 100}%"></div>
      </div>
      <div class="active-activity-status">
        ${Math.floor(progress * 100)}% ${state.autoMode ? '🔁' : ''}
      </div>
    `

    container.appendChild(div)
  })
}

function updateCurrencyTicker() {
  renderCurrencyTicker()
  renderWorkerPanel()  // Update hire button if workerUnit changed
}

function handleActivityCompleted(data) {
  renderActivityList(selectedSkill)
  renderCurrencyTicker()
  renderActiveActivities()
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

function handleGameTick(data) {
  // Update progress bars
  const active = game.activityManager.getActiveActivities()
  if (active.length > 0) {
    renderActiveActivities()
    // Update the currently selected skill's activity list to show progress
    renderActivityList(selectedSkill)
  }
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
  const totalWorkers = game.workerManager.totalWorkers
  const availableWorkers = game.workerManager.getAvailableWorkers()
  const workerUnits = game.currencyManager.get('workerUnit') || 0

  // Show hire button if we have workerUnit currency
  let hireButtonHtml = ''
  if (workerUnits > 0) {
    hireButtonHtml = `
      <div class="worker-hire">
        <button class="hire-worker-btn" id="hireWorkerBtn">
          👤 Hire Worker (${workerUnits} available)
        </button>
      </div>
    `
  }

  if (totalWorkers === 0 && workerUnits === 0) {
    container.innerHTML = '<div class="no-activities">No workers yet - produce workerUnit currency!</div>'
    return
  }

  container.innerHTML = `
    ${hireButtonHtml}
    <div class="worker-stats">
      <div class="worker-stat">Total: ${totalWorkers}</div>
      <div class="worker-stat">Available: ${availableWorkers}</div>
    </div>
    <div class="worker-assignments-title">Assignments:</div>
    <div class="worker-assignments"></div>
  `

  // Add hire button event listener
  const hireBtn = container.querySelector('#hireWorkerBtn')
  if (hireBtn) {
    hireBtn.addEventListener('click', () => {
      const units = game.currencyManager.get('workerUnit') || 0
      if (units > 0) {
        game.currencyManager.spend('workerUnit', 1)
        game.workerManager.addWorkers(1)
        showNotification('👤 Hired 1 worker!')
      }
    })
  }

  const assignmentsContainer = container.querySelector('.worker-assignments')

  // Show all unlocked activities for current skill
  const skillActivities = activities.filter(a => a.skillId === selectedSkill)
  const unlockedActivities = skillActivities.filter(a => game.skillManager.isActivityUnlocked(a.id))

  if (unlockedActivities.length === 0) {
    assignmentsContainer.innerHTML = '<div class="no-activities">Unlock activities to assign workers</div>'
    return
  }

  unlockedActivities.forEach(activity => {
    const assigned = game.workerManager.getAssignment(activity.id)
    const isAutomated = game.workerManager.isAutomated(activity.id)

    const assignmentDiv = document.createElement('div')
    assignmentDiv.className = 'worker-assignment-item'
    assignmentDiv.innerHTML = `
      <div class="worker-assignment-name">${activity.name}</div>
      <div class="worker-assignment-controls">
        <button class="worker-btn worker-btn-minus" data-activity="${activity.id}" ${assigned === 0 ? 'disabled' : ''}>-</button>
        <span class="worker-count ${isAutomated ? 'automated' : ''}">${assigned}</span>
        <button class="worker-btn worker-btn-plus" data-activity="${activity.id}" ${availableWorkers === 0 ? 'disabled' : ''}>+</button>
      </div>
      ${isAutomated ? '<div class="worker-automated-label">🤖 Automated (0.5x speed)</div>' : ''}
    `

    // Add event listeners
    const minusBtn = assignmentDiv.querySelector('.worker-btn-minus')
    const plusBtn = assignmentDiv.querySelector('.worker-btn-plus')

    minusBtn.addEventListener('click', () => {
      if (assigned > 0) {
        game.workerManager.assign(activity.id, assigned - 1)
      }
    })

    plusBtn.addEventListener('click', () => {
      if (availableWorkers > 0) {
        game.workerManager.assign(activity.id, assigned + 1)
      }
    })

    assignmentsContainer.appendChild(assignmentDiv)
  })
}

function handleWorkerChanged() {
  renderWorkerPanel()
  renderActivityList(selectedSkill)  // Update to show automated activities
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
