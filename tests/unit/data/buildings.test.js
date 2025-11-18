import { describe, it, expect } from 'vitest'
import { buildingTypes } from '../../../src/data/buildings.js'

const getTrainingHall = () => buildingTypes.find(b => b.id === 'trainingHall')

describe('building data', () => {
  it('defines unique building ids', () => {
    const ids = buildingTypes.map(b => b.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('exposes expanded training programs', () => {
    const hall = getTrainingHall()
    expect(hall).toBeTruthy()

    const programIds = hall.trainingPrograms.map(p => p.id)
    expect(programIds).toEqual(expect.arrayContaining([
      'train_lumberjack',
      'train_miner',
      'train_farmer',
      'train_tractor',
      'train_drone'
    ]))
  })

  it('ensures every training program has costs and timings', () => {
    const hall = getTrainingHall()
    hall.trainingPrograms.forEach(program => {
      expect(program.inputWorker).toBeDefined()
      expect(program.outputWorker).toBeDefined()
      expect(program.trainingTime).toBeGreaterThan(0)
      expect(Object.keys(program.cost || {})).not.toHaveLength(0)
    })
  })
})
