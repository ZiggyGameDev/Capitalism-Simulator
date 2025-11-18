import { resources } from '../data/resources-expanded.js'

function getWorkerTypes(game) {
  return game?.workerManager?.workerTypes || []
}

function clampToNonNegative(value) {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.floor(value))
}

export function getWorkerSummaryEntries(game) {
  if (!game || !game.resourceManager || !game.workerManager) {
    return []
  }

  const entries = []

  getWorkerTypes(game).forEach(workerType => {
    const total = clampToNonNegative(game.resourceManager.get?.(workerType.id) ?? 0)
    if (total <= 0) {
      return
    }

    const assignedRaw = game.workerManager.getAssignedWorkers?.(workerType.id) ?? 0
    const assigned = Math.min(total, clampToNonNegative(assignedRaw))
    const available = total - assigned
    const resourceMeta = resources[workerType.id] || {
      icon: '👤',
      name: workerType.name || workerType.id
    }

    entries.push({
      id: workerType.id,
      icon: resourceMeta.icon,
      name: resourceMeta.name,
      total,
      assigned,
      available,
      allAssigned: available === 0
    })
  })

  return entries
}

export function renderWorkerSummaryCompact(game, container) {
  if (!container) return

  container.innerHTML = '<div class="worker-summary-title">👷 Workers</div>'
  const entries = getWorkerSummaryEntries(game)

  if (entries.length === 0) {
    container.innerHTML += '<div class="worker-summary-none">No workers yet</div>'
    return
  }

  entries.forEach(entry => {
    const classes = ['worker-summary-line']
    if (entry.allAssigned) {
      classes.push('worker-all-assigned')
    }

    container.innerHTML += `
      <div class="${classes.join(' ')}">
        ${entry.icon} <span class="worker-available">${entry.available}</span>/<span class="worker-total">${entry.total}</span>
      </div>
    `
  })
}

export function renderWorkerPanelList(game, container) {
  if (!container) return

  const entries = getWorkerSummaryEntries(game)

  if (entries.length === 0) {
    container.innerHTML = '<div class="no-activities">No workers yet - produce worker currencies to unlock automation!</div>'
    return
  }

  container.innerHTML = entries.map(entry => `
    <div class="worker-summary-item">
      <span class="worker-summary-icon">${entry.icon}</span>
      <span class="worker-summary-name">${entry.name}</span>
      <span class="worker-summary-stats">${entry.total} total (${entry.assigned} assigned, ${entry.available} available)</span>
    </div>
  `).join('')
}
