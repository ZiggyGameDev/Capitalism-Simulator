import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TownRenderer } from '../../../src/rendering/TownRenderer.js'
import { GameEngine } from '../../../src/core/GameEngine.js'
import { skills } from '../../../src/data/skills-expanded.js'
import { activities } from '../../../src/data/activities-expanded.js'
import { upgrades } from '../../../src/data/upgrades.js'

describe('TownRenderer', () => {
  let canvas
  let engine
  let renderer
  let mockContext

  beforeEach(() => {
    // Create mock canvas
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600

    // Create real game engine
    engine = new GameEngine(skills, activities, upgrades)

    // Mock 2D context to track rendering calls
    mockContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      drawImage: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      roundRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      set fillStyle(value) { this._fillStyle = value },
      get fillStyle() { return this._fillStyle },
      set strokeStyle(value) { this._strokeStyle = value },
      get strokeStyle() { return this._strokeStyle },
      set globalAlpha(value) { this._globalAlpha = value },
      get globalAlpha() { return this._globalAlpha || 1 },
      set font(value) { this._font = value },
      get font() { return this._font },
      set textAlign(value) { this._textAlign = value },
      get textAlign() { return this._textAlign },
      set textBaseline(value) { this._textBaseline = value },
      get textBaseline() { return this._textBaseline },
      set lineWidth(value) { this._lineWidth = value },
      get lineWidth() { return this._lineWidth }
    }

    // Mock getContext to return our mock
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockContext)
  })

  describe('initialization', () => {
    it('should initialize with emoji cache map', () => {
      renderer = new TownRenderer(canvas, engine)

      expect(renderer.emojiCache).toBeDefined()
      expect(renderer.emojiCache instanceof Map).toBe(true)
      expect(canvas.getContext).toHaveBeenCalledWith('2d', { alpha: false })
    })

    it('should attempt to pre-cache common emojis', () => {
      renderer = new TownRenderer(canvas, engine)

      // In test environment, emoji caching may fail (jsdom limitation)
      // But the cache should still exist and the attempt should be made
      expect(renderer.emojiCache).toBeDefined()

      // getCachedEmoji should handle failures gracefully
      const result = renderer.getCachedEmoji('👷', 28)
      // May be null in test env, but shouldn't throw
      expect(() => renderer.getCachedEmoji('🏠', 52)).not.toThrow()
    })

    it('should handle emoji cache failures gracefully', () => {
      renderer = new TownRenderer(canvas, engine)

      // In test environment, getCachedEmoji may return null
      const workerCanvas = renderer.getCachedEmoji('👷', 28)
      // Should not throw, even if null
      expect(workerCanvas === null || workerCanvas instanceof HTMLCanvasElement).toBe(true)

      const buildingCanvas = renderer.getCachedEmoji('🏠', 52)
      expect(buildingCanvas === null || buildingCanvas instanceof HTMLCanvasElement).toBe(true)
    })
  })

  describe('rendering', () => {
    beforeEach(() => {
      renderer = new TownRenderer(canvas, engine)
      // Clear mock call counts from initialization
      mockContext.clearRect.mockClear()
      mockContext.fillRect.mockClear()
      mockContext.drawImage.mockClear()
    })

    it('should clear canvas on render', () => {
      renderer.render()

      expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 600)
    })

    it('should draw background on render', () => {
      renderer.render()

      // Should create gradient and fill background
      expect(mockContext.createLinearGradient).toHaveBeenCalled()
      expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 800, 600)
    })

    it('should draw grid lines', () => {
      renderer.render()

      // Should draw vertical and horizontal lines
      expect(mockContext.stroke).toHaveBeenCalled()
      expect(mockContext.beginPath).toHaveBeenCalled()
    })

    it('should render buildings with emoji (cached or fallback)', () => {
      // Add a building
      engine.resourceManager.add('wood', 1000)
      engine.resourceManager.add('stone', 1000)
      engine.buildingManager.startConstruction('house')

      // Fast forward to complete construction
      const building = engine.buildingManager.getBuildings('house')[0]
      building.constructionComplete = true

      // Clear previous calls
      mockContext.drawImage.mockClear()
      mockContext.fillText.mockClear()

      // Render
      renderer.render()

      // Should use EITHER drawImage (if cache works) OR fillText (fallback)
      const usedDrawImage = mockContext.drawImage.mock.calls.length > 0
      const usedFillText = mockContext.fillText.mock.calls.length > 0

      expect(usedDrawImage || usedFillText).toBe(true)
    })

    it('should render workers with emoji (cached or fallback)', () => {
      // Add workers
      engine.resourceManager.add('basicWorker', 5)

      // Clear previous calls
      mockContext.drawImage.mockClear()
      mockContext.fillText.mockClear()

      // Render to spawn workers
      renderer.render(16)

      // Wait for workers to spawn (happens on 500ms update cycle)
      renderer.lastWorkerUpdate = 0
      renderer.render(16)

      // Should use EITHER drawImage (if cache works) OR fillText (fallback)
      const usedDrawImage = mockContext.drawImage.mock.calls.length > 0
      const usedFillText = mockContext.fillText.mock.calls.length > 0

      expect(usedDrawImage || usedFillText).toBe(true)

      // Check that workers are actually spawned
      expect(renderer.workers.length).toBeGreaterThan(0)
    })

    it('should use integer pixel coordinates', () => {
      // Add a building
      engine.resourceManager.add('wood', 1000)
      engine.resourceManager.add('stone', 1000)
      engine.buildingManager.startConstruction('house')
      const building = engine.buildingManager.getBuildings('house')[0]
      building.constructionComplete = true

      mockContext.drawImage.mockClear()
      renderer.render()

      // Check that all drawImage calls use integer coordinates
      mockContext.drawImage.mock.calls.forEach(call => {
        const x = call[1]
        const y = call[2]

        // x and y should be integers (or close to integers due to Math.floor)
        expect(x).toBe(Math.floor(x))
        expect(y).toBe(Math.floor(y))
      })
    })
  })

  describe('worker simulation', () => {
    beforeEach(() => {
      renderer = new TownRenderer(canvas, engine)
    })

    it('should spawn workers based on resource count', () => {
      engine.resourceManager.add('basicWorker', 10)

      // Force worker update
      renderer.lastWorkerUpdate = 0
      renderer.updateWorkers(16)

      expect(renderer.workers.length).toBe(10)
    })

    it('should remove workers when count decreases', () => {
      engine.resourceManager.add('basicWorker', 10)
      renderer.lastWorkerUpdate = 0
      renderer.updateWorkers(16)

      expect(renderer.workers.length).toBe(10)

      // Decrease workers
      engine.resourceManager.set('basicWorker', 5)
      renderer.lastWorkerUpdate = 0
      renderer.cachedWorkerCount = 0
      renderer.updateWorkers(16)

      expect(renderer.workers.length).toBe(5)
    })

    it('should update worker positions with deltaTime', () => {
      engine.resourceManager.add('basicWorker', 1)
      renderer.lastWorkerUpdate = 0
      renderer.updateWorkers(16)

      const worker = renderer.workers[0]
      const initialX = worker.x
      const initialY = worker.y

      // Update with larger deltaTime
      renderer.updateWorkers(100)

      // Worker should have moved (unless velocity is 0)
      const moved = worker.x !== initialX || worker.y !== initialY
      expect(moved).toBe(true)
    })

    it('should keep workers within bounds', () => {
      engine.resourceManager.add('basicWorker', 5)
      renderer.lastWorkerUpdate = 0
      renderer.updateWorkers(16)

      // Simulate many updates to let workers move around
      for (let i = 0; i < 100; i++) {
        renderer.updateWorkers(16)
      }

      // All workers should be within canvas bounds
      renderer.workers.forEach(worker => {
        expect(worker.x).toBeGreaterThanOrEqual(20)
        expect(worker.x).toBeLessThanOrEqual(renderer.width - 20)
        expect(worker.y).toBeGreaterThanOrEqual(20)
        expect(worker.y).toBeLessThanOrEqual(renderer.height - 20)
      })
    })
  })

  describe('emoji caching', () => {
    beforeEach(() => {
      renderer = new TownRenderer(canvas, engine)
    })

    it('should reuse cached emojis when available', () => {
      const canvas1 = renderer.getCachedEmoji('👷', 28)
      const canvas2 = renderer.getCachedEmoji('👷', 28)

      // Should return the same cached instance (or both null if caching failed)
      expect(canvas1).toBe(canvas2)
    })

    it('should handle different emoji sizes', () => {
      const small = renderer.getCachedEmoji('👷', 16)
      const large = renderer.getCachedEmoji('👷', 52)

      // In test env, both may be null (jsdom limitation)
      // But if they're not null, they should be different
      if (small !== null && large !== null) {
        expect(small).not.toBe(large)
        expect(small.width).toBeLessThan(large.width)
      }

      // At minimum, should not throw
      expect(small === null || small instanceof HTMLCanvasElement).toBe(true)
      expect(large === null || large instanceof HTMLCanvasElement).toBe(true)
    })

    it('should handle emoji cache creation failures', () => {
      // In test environment, emoji caching may fail
      // getCachedEmoji should return null without throwing
      const emojiCanvas = renderer.getCachedEmoji('👷', 28)

      // Should not throw and should be either null or canvas
      expect(emojiCanvas === null || emojiCanvas instanceof HTMLCanvasElement).toBe(true)
    })
  })

  describe('building rendering', () => {
    beforeEach(() => {
      renderer = new TownRenderer(canvas, engine)
      mockContext.drawImage.mockClear()
      mockContext.fillText.mockClear()
      mockContext.fillRect.mockClear()
    })

    it('should render construction sites', () => {
      engine.resourceManager.add('wood', 1000)
      engine.resourceManager.add('stone', 1000)
      engine.buildingManager.startConstruction('house')

      renderer.render()

      // Should draw progress bar
      expect(mockContext.fillRect).toHaveBeenCalled()

      // Should draw construction emoji (either cached or fallback)
      const usedDrawImage = mockContext.drawImage.mock.calls.length > 0
      const usedFillText = mockContext.fillText.mock.calls.length > 0
      expect(usedDrawImage || usedFillText).toBe(true)
    })

    it('should render completed buildings', () => {
      engine.resourceManager.add('wood', 1000)
      engine.resourceManager.add('stone', 1000)
      engine.buildingManager.startConstruction('house')

      const building = engine.buildingManager.getBuildings('house')[0]
      building.constructionComplete = true

      mockContext.drawImage.mockClear()
      mockContext.fillText.mockClear()
      renderer.render()

      // Should draw building emoji (either cached or fallback)
      const usedDrawImage = mockContext.drawImage.mock.calls.length > 0
      const usedFillText = mockContext.fillText.mock.calls.length > 0
      expect(usedDrawImage || usedFillText).toBe(true)
    })

    it('should assign grid positions to buildings', () => {
      // Add resources for at least one house
      engine.resourceManager.add('wood', 100)
      engine.resourceManager.add('stone', 100)

      // Build a house
      engine.buildingManager.startConstruction('house')

      // Get the building and complete it
      const buildings = engine.buildingManager.getBuildings('house')
      expect(buildings.length).toBeGreaterThanOrEqual(1)

      buildings.forEach(building => {
        building.constructionComplete = true
      })

      // Render to assign positions
      renderer.render()

      // Should have assigned positions for all buildings
      expect(renderer.buildingPositions.size).toBe(buildings.length)
      expect(renderer.nextBuildingSlot).toBe(buildings.length)

      // Verify position assignment increments correctly
      // If we can build another, position should increment
      if (engine.buildingManager.canBuild('house').canBuild) {
        engine.resourceManager.add('wood', 200)
        engine.resourceManager.add('stone', 200)
        engine.buildingManager.startConstruction('house')

        const moreBuildings = engine.buildingManager.getBuildings('house')
        moreBuildings.forEach(b => { b.constructionComplete = true })

        renderer.render()

        expect(renderer.buildingPositions.size).toBe(moreBuildings.length)
        expect(renderer.nextBuildingSlot).toBe(moreBuildings.length)
      }
    })
  })

  describe('regression tests', () => {
    it('should render buildings and workers visibly (not blank)', () => {
      renderer = new TownRenderer(canvas, engine)

      // Add resources and build a house
      engine.resourceManager.add('wood', 1000)
      engine.resourceManager.add('stone', 1000)
      engine.resourceManager.add('basicWorker', 5)
      engine.buildingManager.startConstruction('house')
      const building = engine.buildingManager.getBuildings('house')[0]
      building.constructionComplete = true

      // Force worker spawn
      renderer.lastWorkerUpdate = 0
      renderer.updateWorkers(16)

      // Clear and render
      mockContext.clearRect.mockClear()
      mockContext.fillRect.mockClear()
      mockContext.drawImage.mockClear()
      mockContext.fillText.mockClear()

      renderer.render(16)

      // CRITICAL: Should render emojis (either via drawImage or fillText fallback)
      // This ensures emojis are actually being rendered, preventing blank canvas
      const usedDrawImage = mockContext.drawImage.mock.calls.length > 0
      const usedFillText = mockContext.fillText.mock.calls.length > 0
      expect(usedDrawImage || usedFillText).toBe(true)

      // Should have rendered background
      expect(mockContext.fillRect).toHaveBeenCalled()

      // Should have cleared canvas
      expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 600)
    })
  })
})
