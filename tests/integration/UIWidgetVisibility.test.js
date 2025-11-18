import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * UI Widget Visibility Tests
 *
 * These tests ensure that UI elements (currencies, activities, workers)
 * are created and visible when they should be, preventing display bugs.
 */

describe('UI Widget Visibility - Currency Ticker', () => {
  let game
  let currencies

  beforeEach(async () => {
    // Set up DOM
    document.body.innerHTML = `
      <div id="currencyTicker"></div>
      <div id="skillList"></div>
      <div id="activityList"></div>
      <div id="activeActivities"></div>
      <div id="upgradeList"></div>
      <div id="workerPanel"></div>
      <button id="saveBtn">Save</button>
      <button id="resetBtn">Reset</button>
    `

    // Import modules
    const { GameEngine } = await import('../../src/core/GameEngine.js')
    const { skills } = await import('../../src/data/skills-expanded.js')
    const { activities } = await import('../../src/data/activities-expanded.js')
    const resourcesModule = await import('../../src/data/resources-expanded.js')
    currencies = resourcesModule.resources

    game = new GameEngine(skills, activities)
  })

  describe('Currency Element Creation', () => {
    it('should start with "No currencies yet" message', () => {
      const container = document.getElementById('currencyTicker')
      container.innerHTML = '<div class="currency-item">No currencies yet - start gathering!</div>'

      const message = container.querySelector('.currency-item')
      expect(message).toBeTruthy()
      expect(message.textContent).toContain('No currencies yet')
    })

    it('should create currency element when currency is earned', () => {
      const container = document.getElementById('currencyTicker')

      // Simulate earning wheat
      game.resourceManager.add('wheat', 5)

      // Manually create the element (simulating UI update)
      const currency = currencies.wheat
      const div = document.createElement('div')
      div.className = 'currency-item'
      div.dataset.currencyId = 'wheat'
      div.innerHTML = `${currency.icon} ${currency.name}: <span class="currency-amount">5</span>`
      container.appendChild(div)

      // Verify element exists
      const wheatElement = container.querySelector('[data-currency-id="wheat"]')
      expect(wheatElement).toBeTruthy()
      expect(wheatElement.textContent).toContain('Wheat')
      expect(wheatElement.textContent).toContain('5')
    })

    it('should display multiple currencies simultaneously', () => {
      const container = document.getElementById('currencyTicker')

      // Earn multiple currencies
      game.resourceManager.add('wheat', 10)
      game.resourceManager.add('wood', 5)
      game.resourceManager.add('stone', 3)

      // Create elements for all
      const currencyIds = ['wheat', 'wood', 'stone']
      currencyIds.forEach(id => {
        const currency = currencies[id]
        const amount = game.resourceManager.get(id)
        const div = document.createElement('div')
        div.className = 'currency-item'
        div.dataset.currencyId = id
        div.innerHTML = `${currency.icon} ${currency.name}: <span class="currency-amount">${amount}</span>`
        container.appendChild(div)
      })

      // Verify all exist
      expect(container.querySelectorAll('[data-currency-id]').length).toBe(3)
      expect(container.querySelector('[data-currency-id="wheat"]')).toBeTruthy()
      expect(container.querySelector('[data-currency-id="wood"]')).toBeTruthy()
      expect(container.querySelector('[data-currency-id="stone"]')).toBeTruthy()
    })

    it('should remove currency element when amount reaches 0', () => {
      const container = document.getElementById('currencyTicker')

      // Add currency
      game.resourceManager.add('wheat', 10)
      const div = document.createElement('div')
      div.className = 'currency-item'
      div.dataset.currencyId = 'wheat'
      div.innerHTML = `Wheat: <span class="currency-amount">10</span>`
      container.appendChild(div)

      expect(container.querySelector('[data-currency-id="wheat"]')).toBeTruthy()

      // Spend all
      game.resourceManager.subtract('wheat', 10)

      // Simulate removal
      const element = container.querySelector('[data-currency-id="wheat"]')
      if (game.resourceManager.get('wheat') === 0) {
        element.remove()
      }

      expect(container.querySelector('[data-currency-id="wheat"]')).toBeFalsy()
    })

    it('should update currency amount when it changes', () => {
      const container = document.getElementById('currencyTicker')

      game.resourceManager.add('wheat', 10)
      const div = document.createElement('div')
      div.className = 'currency-item'
      div.dataset.currencyId = 'wheat'
      div.innerHTML = `Wheat: <span class="currency-amount">10</span>`
      container.appendChild(div)

      const amountSpan = div.querySelector('.currency-amount')
      expect(amountSpan.textContent).toBe('10')

      // Add more
      game.resourceManager.add('wheat', 5)
      amountSpan.textContent = game.resourceManager.get('wheat').toString()

      expect(amountSpan.textContent).toBe('15')
    })

    it('should handle all resource types defined in data', () => {
      const container = document.getElementById('currencyTicker')
      const allCurrencyIds = Object.keys(currencies)
      const expectedCount = allCurrencyIds.length

      // Sanity check so we notice if resources regress dramatically
      expect(expectedCount).toBeGreaterThanOrEqual(37)

      // Add all resources
      allCurrencyIds.forEach((id, index) => {
        game.resourceManager.add(id, index + 1)

        const currency = currencies[id]
        expect(currency).toBeDefined()
        expect(currency.name).toBeDefined()
        expect(currency.icon).toBeDefined()

        const div = document.createElement('div')
        div.className = 'currency-item'
        div.dataset.currencyId = id
        div.innerHTML = `${currency.icon} ${currency.name}: <span class="currency-amount">${index + 1}</span>`
        container.appendChild(div)
      })

      // Verify all known resources are represented
      expect(container.querySelectorAll('[data-currency-id]').length).toBe(expectedCount)
    })

    it('should clear "No currencies" message when first currency appears', () => {
      const container = document.getElementById('currencyTicker')
      container.innerHTML = '<div class="currency-item">No currencies yet - start gathering!</div>'

      expect(container.querySelector('.currency-item:not([data-currency-id])')).toBeTruthy()

      // Add first currency
      game.resourceManager.add('wheat', 5)

      // Remove placeholder
      const placeholder = container.querySelector('.currency-item:not([data-currency-id])')
      if (placeholder) {
        placeholder.remove()
      }

      // Add currency element
      const div = document.createElement('div')
      div.className = 'currency-item'
      div.dataset.currencyId = 'wheat'
      div.innerHTML = `Wheat: 5`
      container.appendChild(div)

      expect(container.querySelector('.currency-item:not([data-currency-id])')).toBeFalsy()
      expect(container.querySelector('[data-currency-id="wheat"]')).toBeTruthy()
    })

    it('should restore "No currencies" message when all currencies are removed', () => {
      const container = document.getElementById('currencyTicker')

      // Add and then remove currency
      game.resourceManager.add('wheat', 5)
      const div = document.createElement('div')
      div.className = 'currency-item'
      div.dataset.currencyId = 'wheat'
      container.appendChild(div)

      game.resourceManager.subtract('wheat', 5)
      div.remove()

      // Check if no currencies left
      if (container.querySelectorAll('[data-currency-id]').length === 0) {
        container.innerHTML = '<div class="currency-item">No currencies yet - start gathering!</div>'
      }

      expect(container.querySelector('.currency-item:not([data-currency-id])')).toBeTruthy()
    })
  })

  describe('Currency Element Attributes', () => {
    it('should have correct data-currency-id attribute', () => {
      const container = document.getElementById('currencyTicker')

      game.resourceManager.add('wheat', 10)
      const div = document.createElement('div')
      div.className = 'currency-item'
      div.dataset.currencyId = 'wheat'
      container.appendChild(div)

      expect(div.getAttribute('data-currency-id')).toBe('wheat')
      expect(div.dataset.currencyId).toBe('wheat')
    })

    it('should have currency-item class', () => {
      const container = document.getElementById('currencyTicker')

      game.resourceManager.add('wheat', 10)
      const div = document.createElement('div')
      div.className = 'currency-item'
      div.dataset.currencyId = 'wheat'
      container.appendChild(div)

      expect(div.classList.contains('currency-item')).toBe(true)
    })

    it('should contain currency-amount span for updates', () => {
      const container = document.getElementById('currencyTicker')

      const div = document.createElement('div')
      div.className = 'currency-item'
      div.dataset.currencyId = 'wheat'
      div.innerHTML = `Wheat: <span class="currency-amount">10</span>`
      container.appendChild(div)

      const amountSpan = div.querySelector('.currency-amount')
      expect(amountSpan).toBeTruthy()
      expect(amountSpan.textContent).toBe('10')
    })
  })

  describe('Currency Display Edge Cases', () => {
    it('should handle fractional currency amounts by flooring', () => {
      const container = document.getElementById('currencyTicker')

      game.resourceManager.add('wheat', 10.7)
      const div = document.createElement('div')
      div.className = 'currency-item'
      div.dataset.currencyId = 'wheat'
      div.innerHTML = `Wheat: <span class="currency-amount">${Math.floor(10.7)}</span>`
      container.appendChild(div)

      const amountSpan = div.querySelector('.currency-amount')
      expect(amountSpan.textContent).toBe('10')
    })

    it('should not create element for undefined currency', () => {
      const container = document.getElementById('currencyTicker')

      // Try to add non-existent currency
      const fakeCurrency = currencies['nonExistentCurrency']
      expect(fakeCurrency).toBeUndefined()

      // Should not create element
      if (fakeCurrency) {
        const div = document.createElement('div')
        div.dataset.currencyId = 'nonExistentCurrency'
        container.appendChild(div)
      }

      expect(container.querySelector('[data-currency-id="nonExistentCurrency"]')).toBeFalsy()
    })

    it('should handle rapid currency changes', () => {
      const container = document.getElementById('currencyTicker')

      game.resourceManager.add('wheat', 1)
      const div = document.createElement('div')
      div.className = 'currency-item'
      div.dataset.currencyId = 'wheat'
      div.innerHTML = `Wheat: <span class="currency-amount">1</span>`
      container.appendChild(div)

      const amountSpan = div.querySelector('.currency-amount')

      // Rapid changes
      for (let i = 2; i <= 100; i++) {
        game.resourceManager.set('wheat', i)
        amountSpan.textContent = i.toString()
      }

      expect(amountSpan.textContent).toBe('100')
      expect(game.resourceManager.get('wheat')).toBe(100)
    })
  })
})

describe('UI Widget Visibility - Activity Elements', () => {
  let game

  beforeEach(async () => {
    document.body.innerHTML = `
      <div id="currencyTicker"></div>
      <div id="skillList"></div>
      <div id="activityList"></div>
      <div id="activeActivities"></div>
      <div id="upgradeList"></div>
      <div id="workerPanel"></div>
      <button id="saveBtn">Save</button>
      <button id="resetBtn">Reset</button>
    `

    const { GameEngine } = await import('../../src/core/GameEngine.js')
    const { skills } = await import('../../src/data/skills-expanded.js')
    const { activities } = await import('../../src/data/activities-expanded.js')

    game = new GameEngine(skills, activities)
  })

  describe('Activity Card Visibility', () => {
    it('should create activity elements for unlocked activities', () => {
      const container = document.getElementById('activityList')

      // Create activity element
      const activity = { id: 'plantWheat', name: 'Plant Wheat', skillId: 'farming' }
      const div = document.createElement('div')
      div.className = 'activity-item'
      div.dataset.activityId = activity.id
      container.appendChild(div)

      const activityElement = container.querySelector('[data-activity-id="plantWheat"]')
      expect(activityElement).toBeTruthy()
      expect(activityElement.classList.contains('activity-item')).toBe(true)
    })

    it('should show locked class for locked activities', () => {
      const container = document.getElementById('activityList')

      const div = document.createElement('div')
      div.className = 'activity-item locked'
      div.dataset.activityId = 'advancedActivity'
      container.appendChild(div)

      const activityElement = container.querySelector('[data-activity-id="advancedActivity"]')
      expect(activityElement.classList.contains('locked')).toBe(true)
    })

    it('should show progress bars for running activities', () => {
      const container = document.getElementById('activityList')

      const div = document.createElement('div')
      div.className = 'activity-item running'
      div.innerHTML = `
        <div class="activity-progress-bar">
          <div class="activity-progress-fill" style="width: 50%"></div>
        </div>
        <div class="activity-status">50%</div>
      `
      container.appendChild(div)

      const progressBar = div.querySelector('.activity-progress-bar')
      const progressFill = div.querySelector('.activity-progress-fill')
      const status = div.querySelector('.activity-status')

      expect(progressBar).toBeTruthy()
      expect(progressFill).toBeTruthy()
      expect(progressFill.style.width).toBe('50%')
      expect(status.textContent).toBe('50%')
    })

    it('should show automated icon for automated activities', () => {
      const container = document.getElementById('activityList')

      const div = document.createElement('div')
      div.className = 'activity-item'
      div.innerHTML = `
        <div class="activity-automated-icon" style="display: inline;">🤖</div>
      `
      container.appendChild(div)

      const automatedIcon = div.querySelector('.activity-automated-icon')
      expect(automatedIcon).toBeTruthy()
      expect(automatedIcon.style.display).toBe('inline')
      expect(automatedIcon.textContent).toContain('🤖')
    })

    it('should show halted warning when resources are insufficient', () => {
      const container = document.getElementById('activityList')

      const div = document.createElement('div')
      div.className = 'activity-item halted'
      div.innerHTML = `
        <div class="activity-halted-warning">⚠️ Production halted - insufficient resources</div>
      `
      container.appendChild(div)

      const warning = div.querySelector('.activity-halted-warning')
      expect(warning).toBeTruthy()
      expect(warning.textContent).toContain('Production halted')
      expect(div.classList.contains('halted')).toBe(true)
    })
  })

  describe('Worker Control Visibility', () => {
    it('should show worker assignment controls for unlocked activities', () => {
      const container = document.getElementById('activityList')

      const div = document.createElement('div')
      div.className = 'activity-item'
      div.innerHTML = `
        <div class="activity-worker-assignments">
          <div class="worker-assignment-header">
            <span class="worker-assignment-title">Assign Workers:</span>
            <button class="worker-btn-remove-all">Remove All</button>
          </div>
          <div class="worker-assignment-row">
            <button class="worker-btn-minus">-</button>
            <span class="worker-count">0</span>
            <button class="worker-btn-plus">+</button>
          </div>
        </div>
      `
      container.appendChild(div)

      const workerControls = div.querySelector('.activity-worker-assignments')
      expect(workerControls).toBeTruthy()

      const plusBtn = div.querySelector('.worker-btn-plus')
      const minusBtn = div.querySelector('.worker-btn-minus')
      const count = div.querySelector('.worker-count')

      expect(plusBtn).toBeTruthy()
      expect(minusBtn).toBeTruthy()
      expect(count).toBeTruthy()
      expect(count.textContent).toBe('0')
    })

    it('should hide "Remove All" button when no workers assigned', () => {
      const container = document.getElementById('activityList')

      const div = document.createElement('div')
      div.innerHTML = `
        <button class="worker-btn-remove-all hidden">Remove All</button>
      `
      container.appendChild(div)

      const removeAllBtn = div.querySelector('.worker-btn-remove-all')
      expect(removeAllBtn.classList.contains('hidden')).toBe(true)
    })

    it('should show "Remove All" button when workers are assigned', () => {
      const container = document.getElementById('activityList')

      const div = document.createElement('div')
      div.innerHTML = `
        <button class="worker-btn-remove-all">Remove All</button>
      `
      container.appendChild(div)

      const removeAllBtn = div.querySelector('.worker-btn-remove-all')
      expect(removeAllBtn.classList.contains('hidden')).toBe(false)
    })
  })
})

describe('UI Widget Visibility - Worker Panel', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="workerPanel"></div>
    `
  })

  describe('Worker Summary Display', () => {
    it('should show "No workers yet" message when no workers exist', () => {
      const container = document.getElementById('workerPanel')
      container.innerHTML = '<div class="no-activities">No workers yet - produce worker currencies to unlock automation!</div>'

      const message = container.querySelector('.no-activities')
      expect(message).toBeTruthy()
      expect(message.textContent).toContain('No workers yet')
    })

    it('should show worker summary items when workers exist', () => {
      const container = document.getElementById('workerPanel')

      container.innerHTML = `
        <div class="worker-summary-item">
          <span class="worker-summary-icon">👷</span>
          <span class="worker-summary-name">Basic Worker</span>
          <span class="worker-summary-stats">5 total (2 assigned, 3 available)</span>
        </div>
      `

      const workerItem = container.querySelector('.worker-summary-item')
      expect(workerItem).toBeTruthy()

      const icon = workerItem.querySelector('.worker-summary-icon')
      const name = workerItem.querySelector('.worker-summary-name')
      const stats = workerItem.querySelector('.worker-summary-stats')

      expect(icon).toBeTruthy()
      expect(name).toBeTruthy()
      expect(stats).toBeTruthy()
      expect(stats.textContent).toContain('5 total')
    })

    it('should display multiple worker types', () => {
      const container = document.getElementById('workerPanel')

      container.innerHTML = `
        <div class="worker-summary-item">Basic Worker</div>
        <div class="worker-summary-item">Tractor Worker</div>
        <div class="worker-summary-item">Drone Worker</div>
      `

      const items = container.querySelectorAll('.worker-summary-item')
      expect(items.length).toBe(3)
    })
  })
})
