import { describe, it, expect } from 'vitest'
import { resources } from '../../../src/data/resources-expanded.js'

describe('resource data', () => {
  it('includes specialist worker resources', () => {
    expect(resources.lumberjack).toBeDefined()
    expect(resources.miner).toBeDefined()
    expect(resources.farmer).toBeDefined()
  })

  it('keeps worker metadata consistent', () => {
    const workerKeys = ['basicWorker', 'lumberjack', 'miner', 'farmer', 'tractorWorker', 'droneWorker']
    workerKeys.forEach(key => {
      expect(resources[key].icon).toBeTruthy()
      expect(resources[key].name.length).toBeGreaterThan(0)
    })
  })
})
