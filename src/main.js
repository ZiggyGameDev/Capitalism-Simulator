import { GameEngine } from './core/GameEngine.js'
import { skills } from './data/skills.js'
import { activities } from './data/activities.js'
import { currencies } from './data/currencies.js'

// Initialize game
const game = new GameEngine(skills, activities)

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

  // Subscribe to game events
  game.on('activity:completed', handleActivityCompleted)
  game.on('activity:started', handleActivityStarted)
  game.on('activity:stopped', handleActivityStopped)
  game.on('skill:levelup', handleSkillLevelup)
  game.on('currency:changed', updateCurrencyTicker)
  game.on('game:tick', handleGameTick)

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
    showNotification('🔄 Game reset!')
  }
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
