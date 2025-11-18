import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  getWorkerSummaryEntries,
  renderWorkerPanelList,
  renderWorkerSummaryCompact
} from '../../../src/ui/workerSummary.js'

function createGameStub({ totals = {}, assigned = {}, workerTypes = [] } = {}) {
  return {
    workerManager: {
      workerTypes,
      getAssignedWorkers: (id) => assigned[id] ?? 0
    },
    resourceManager: {
      get: (id) => totals[id] ?? 0
    }
  }
}

describe('worker summary helpers', () => {
  let dom

  beforeEach(() => {
    dom = new JSDOM('<!doctype html><html><body></body></html>')
    global.window = dom.window
    global.document = dom.window.document
  })

  afterEach(() => {
    delete global.window
    delete global.document
  })

  it('extracts entries for all worker types with stock', () => {
    const game = createGameStub({
      workerTypes: [{ id: 'basicWorker' }, { id: 'tractorWorker' }],
      totals: { basicWorker: 4, tractorWorker: 1 },
      assigned: { basicWorker: 3, tractorWorker: 0 }
    })

    const entries = getWorkerSummaryEntries(game)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({
      id: 'basicWorker',
      total: 4,
      assigned: 3,
      available: 1,
      allAssigned: false
    })
    expect(entries[1]).toMatchObject({
      id: 'tractorWorker',
      total: 1,
      assigned: 0,
      available: 1,
      allAssigned: false
    })
  })

  it('filters out worker types without inventory', () => {
    const game = createGameStub({
      workerTypes: [{ id: 'basicWorker' }, { id: 'tractorWorker' }],
      totals: { basicWorker: 0, tractorWorker: 2 },
      assigned: { tractorWorker: 1 }
    })

    const entries = getWorkerSummaryEntries(game)
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('tractorWorker')
  })

  it('clamps assigned counts so available never goes negative', () => {
    const game = createGameStub({
      workerTypes: [{ id: 'basicWorker' }],
      totals: { basicWorker: 2 },
      assigned: { basicWorker: 10 }
    })

    const [entry] = getWorkerSummaryEntries(game)
    expect(entry.assigned).toBe(2)
    expect(entry.available).toBe(0)
    expect(entry.allAssigned).toBe(true)
  })

  it('returns empty entries when game managers are missing', () => {
    expect(getWorkerSummaryEntries(null)).toEqual([])
    expect(getWorkerSummaryEntries({ workerManager: null })).toEqual([])
  })

  it('renders compact summary with fallback message when empty', () => {
    const game = createGameStub({ workerTypes: [{ id: 'basicWorker' }] })
    const container = document.createElement('div')

    renderWorkerSummaryCompact(game, container)

    expect(container.querySelector('.worker-summary-title').textContent).toContain('Workers')
    expect(container.querySelector('.worker-summary-none').textContent).toContain('No workers yet')
  })

  it('renders compact rows with availability counts', () => {
    const game = createGameStub({
      workerTypes: [{ id: 'basicWorker' }, { id: 'tractorWorker' }],
      totals: { basicWorker: 4, tractorWorker: 1 },
      assigned: { basicWorker: 3, tractorWorker: 1 }
    })
    const container = document.createElement('div')

    renderWorkerSummaryCompact(game, container)

    const rows = container.querySelectorAll('.worker-summary-line')
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain('1')
    expect(rows[1].classList.contains('worker-all-assigned')).toBe(true)
  })

  it('renders detailed panel with stats per worker type', () => {
    const game = createGameStub({
      workerTypes: [{ id: 'basicWorker' }, { id: 'tractorWorker' }],
      totals: { basicWorker: 5, tractorWorker: 2 },
      assigned: { basicWorker: 2, tractorWorker: 0 }
    })
    const container = document.createElement('div')

    renderWorkerPanelList(game, container)

    const items = container.querySelectorAll('.worker-summary-item')
    expect(items).toHaveLength(2)
    expect(items[0].querySelector('.worker-summary-stats').textContent).toContain('5 total (2 assigned, 3 available)')
  })

  it('renders placeholder when detailed panel has no data', () => {
    const game = createGameStub({ workerTypes: [{ id: 'basicWorker' }] })
    const container = document.createElement('div')

    renderWorkerPanelList(game, container)

    expect(container.querySelector('.no-activities').textContent).toContain('No workers yet')
  })
})
