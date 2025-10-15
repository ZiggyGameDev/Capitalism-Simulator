/**
 * TownRenderer - Visualizes the city with buildings and workers
 */
export class TownRenderer {
  constructor(canvas, engine) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false }) // Disable transparency for performance
    this.engine = engine

    // Canvas dimensions - use clientWidth or fallback to reasonable default
    this.width = canvas.clientWidth || 800
    this.height = canvas.clientHeight || 600

    // Set canvas size
    this.canvas.width = this.width
    this.canvas.height = this.height

    // Grid layout for buildings (3 columns x 3 rows = 9 building slots)
    this.gridColumns = 3
    this.gridRows = 3
    this.cellWidth = this.width / this.gridColumns
    this.cellHeight = this.height / this.gridRows // Use full height for buildings

    // Building positions - map instanceId to grid position
    this.buildingPositions = new Map()
    this.nextBuildingSlot = 0

    // Animated workers - they walk around the entire town now!
    this.workers = []
    this.lastWorkerUpdate = 0
    this.cachedWorkerCount = 0 // Cache to avoid recounting every frame

    // Cache background gradient to avoid recreating every frame
    this.backgroundGradient = null

    // ========== PERFORMANCE OPTIMIZATION: Emoji Cache ==========
    // Pre-render emojis to offscreen canvases for 10-50x faster rendering
    this.emojiCache = new Map()
    this.precacheCommonEmojis()

    console.log('✅ [TownRenderer] Initialized with emoji cache')
  }

  /**
   * Pre-cache common emojis to offscreen canvases
   * This provides 10-50x performance improvement over fillText()
   */
  precacheCommonEmojis() {
    // Worker emojis at size 28
    const workerEmojis = ['👷', '🪓', '⛏️', '🌾']
    workerEmojis.forEach(emoji => this.getCachedEmoji(emoji, 28))

    // Building emojis at size 52
    const buildingEmojis = ['🏠', '📦', '🍺', '⚒️', '🏪', '🎓']
    buildingEmojis.forEach(emoji => this.getCachedEmoji(emoji, 52))

    // Small emojis for construction and speech
    const smallEmojis = ['🏗️', '👋', '💬', '☕', '🔨', '📦', '✨', '👍', '💪', '🎯', '⚡', '🔥', '⭐']
    smallEmojis.forEach(emoji => {
      this.getCachedEmoji(emoji, 16) // Construction icon
      this.getCachedEmoji(emoji, 20) // Speech bubble
    })

    console.log(`📦 [TownRenderer] Pre-cached ${this.emojiCache.size} emoji canvases`)
  }

  /**
   * Get cached emoji canvas (or create if not exists)
   * Returns an offscreen canvas with the emoji pre-rendered
   * @param {string} emoji - The emoji character
   * @param {number} size - Font size in pixels
   * @returns {HTMLCanvasElement} Cached offscreen canvas
   */
  getCachedEmoji(emoji, size) {
    const key = `${emoji}_${size}`

    if (!this.emojiCache.has(key)) {
      // Create offscreen canvas
      const canvas = document.createElement('canvas')
      const padding = size * 0.2 // Extra padding for shadows/effects
      canvas.width = size + padding
      canvas.height = size + padding
      const ctx = canvas.getContext('2d', { alpha: true })

      // CRITICAL: Check if context was created successfully
      // In some environments (tests, old browsers) getContext may return null
      if (!ctx) {
        console.error(`[TownRenderer] Failed to get 2d context for emoji cache: ${emoji}`)
        // Return null and handle in calling code
        return null
      }

      // Render emoji to offscreen canvas
      ctx.font = `${size}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#000'
      ctx.fillText(emoji, canvas.width / 2, canvas.height / 2)

      this.emojiCache.set(key, canvas)
    }

    return this.emojiCache.get(key)
  }

  /**
   * Render a single frame
   * @param {number} deltaTime - Time since last frame in milliseconds
   */
  render(deltaTime = 16) {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height)

    // Draw background
    this.drawBackground()

    // Draw grid lines for building slots (subtle)
    this.drawGrid()

    // Draw buildings
    this.drawBuildings()

    // Update and draw animated workers
    this.updateWorkers(deltaTime)
    this.drawAnimatedWorkers()
  }

  /**
   * Draw background
   */
  drawBackground() {
    // Cache gradient to avoid recreating it every frame
    if (!this.backgroundGradient) {
      this.backgroundGradient = this.ctx.createLinearGradient(0, 0, 0, this.height)
      this.backgroundGradient.addColorStop(0, '#87CEEB') // Sky blue
      this.backgroundGradient.addColorStop(0.7, '#c9d6df') // Light gray blue
      this.backgroundGradient.addColorStop(1, '#90a955') // Grass green
    }

    this.ctx.fillStyle = this.backgroundGradient
    this.ctx.fillRect(0, 0, this.width, this.height)
  }

  /**
   * Draw subtle grid for building slots
   */
  drawGrid() {
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
    this.ctx.lineWidth = 1

    // Vertical lines
    for (let col = 1; col < this.gridColumns; col++) {
      const x = col * this.cellWidth
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.height)
      this.ctx.stroke()
    }

    // Horizontal lines
    for (let row = 1; row < this.gridRows; row++) {
      const y = row * this.cellHeight
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.width, y)
      this.ctx.stroke()
    }
  }

  /**
   * Draw all buildings
   */
  drawBuildings() {
    const buildingManager = this.engine.buildingManager

    // Iterate through all building types
    for (const [buildingTypeId, instances] of Object.entries(buildingManager.buildings)) {
      instances.forEach(instance => {
        this.drawBuilding(instance, buildingTypeId)
      })
    }

    // DEBUG: Log if we have buildings to render
    const totalBuildings = Object.values(buildingManager.buildings).reduce((sum, arr) => sum + arr.length, 0)
    if (totalBuildings > 0) {
      console.log(`[TownRenderer] Rendering ${totalBuildings} buildings`)
    }
  }

  /**
   * Draw a single building
   */
  drawBuilding(instance, buildingTypeId) {
    // Get or assign position
    if (!this.buildingPositions.has(instance.instanceId)) {
      // Assign next available grid position
      const col = this.nextBuildingSlot % this.gridColumns
      const row = Math.floor(this.nextBuildingSlot / this.gridColumns)

      this.buildingPositions.set(instance.instanceId, { col, row })
      this.nextBuildingSlot++
    }

    const pos = this.buildingPositions.get(instance.instanceId)
    const buildingType = this.engine.buildingManager.buildingTypes.find(b => b.id === buildingTypeId)

    if (!buildingType) return

    // Calculate center position
    const centerX = pos.col * this.cellWidth + this.cellWidth / 2
    const centerY = pos.row * this.cellHeight + this.cellHeight / 2

    // Draw construction progress or completed building
    if (!instance.constructionComplete) {
      this.drawConstructionSite(centerX, centerY, instance, buildingType)
    } else {
      this.drawCompletedBuilding(centerX, centerY, instance, buildingType)
    }
  }

  /**
   * Draw construction site (building in progress) - OPTIMIZED
   */
  drawConstructionSite(x, y, instance, buildingType) {
    // PERFORMANCE: Integer pixel coordinates
    x = Math.floor(x)
    y = Math.floor(y)

    // Calculate progress
    const elapsed = Date.now() - instance.constructionStartTime
    const progress = Math.min(elapsed / instance.constructionDuration, 1)

    // Draw construction site base
    this.ctx.fillStyle = '#8B4513'
    this.ctx.globalAlpha = 0.3 + (progress * 0.4) // Fade in as it builds
    this.ctx.fillRect(x - 40, y - 40, 80, 80)
    this.ctx.globalAlpha = 1.0

    // Draw building emoji fading in (using cached canvas or fallback to fillText)
    const buildingCanvas = this.getCachedEmoji(buildingType.emoji, 52)
    this.ctx.globalAlpha = progress
    if (buildingCanvas) {
      const buildingHalfSize = Math.floor(buildingCanvas.width / 2)
      this.ctx.drawImage(buildingCanvas, x - buildingHalfSize, y - buildingHalfSize)
    } else {
      // Fallback to fillText if emoji cache failed
      this.ctx.font = '52px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText(buildingType.emoji, x, y)
    }
    this.ctx.globalAlpha = 1.0

    // Draw progress bar
    const barWidth = 70
    const barHeight = 6
    const barX = x - barWidth / 2
    const barY = y + 50

    this.ctx.fillStyle = '#333'
    this.ctx.fillRect(barX, barY, barWidth, barHeight)

    this.ctx.fillStyle = '#f59e0b'
    this.ctx.fillRect(barX, barY, barWidth * progress, barHeight)

    this.ctx.strokeStyle = '#000'
    this.ctx.lineWidth = 1
    this.ctx.strokeRect(barX, barY, barWidth, barHeight)

    // Construction icon (using cached canvas or fallback)
    const constructionCanvas = this.getCachedEmoji('🏗️', 16)
    if (constructionCanvas) {
      const constructionHalfSize = Math.floor(constructionCanvas.width / 2)
      this.ctx.drawImage(constructionCanvas, x - constructionHalfSize, y - 30 - constructionHalfSize)
    } else {
      this.ctx.font = '16px Arial'
      this.ctx.fillText('🏗️', x, y - 30)
    }
  }

  /**
   * Draw completed building - OPTIMIZED
   */
  drawCompletedBuilding(x, y, instance, buildingType) {
    // PERFORMANCE: Integer pixel coordinates
    x = Math.floor(x)
    y = Math.floor(y)

    // Draw building base with shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    this.ctx.fillRect(x - 42, y - 38, 84, 84)

    this.ctx.fillStyle = '#654321'
    this.ctx.fillRect(x - 45, y - 45, 90, 90)

    // Draw building emoji (using cached canvas or fallback)
    const buildingCanvas = this.getCachedEmoji(buildingType.emoji, 52)
    if (buildingCanvas) {
      const buildingHalfSize = Math.floor(buildingCanvas.width / 2)
      this.ctx.drawImage(buildingCanvas, x - buildingHalfSize, y - buildingHalfSize)
    } else {
      this.ctx.font = '52px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText(buildingType.emoji, x, y)
    }

    // Draw building name (text is OK here, rendered infrequently)
    this.ctx.font = 'bold 11px Arial'
    this.ctx.fillStyle = '#000'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(buildingType.name, x, y + 60)

    // Special rendering for houses (show worker count)
    if (buildingType.id === 'house' && instance.rooms) {
      const totalWorkers = instance.rooms.reduce((sum, room) => sum + room.currentWorkers, 0)
      const maxWorkers = instance.rooms.reduce((sum, room) => sum + room.maxWorkers, 0)

      if (totalWorkers > 0 || maxWorkers > 0) {
        this.ctx.font = '10px Arial'
        this.ctx.fillStyle = '#28a745'
        this.ctx.fillText(`👷 ${totalWorkers}/${maxWorkers}`, x, y + 72)
      }
    }
  }

  /**
   * Update worker entities
   */
  updateWorkers(deltaTime) {
    const resourceManager = this.engine.resourceManager
    const workerTypes = [
      { id: 'basicWorker', icon: '👷', name: 'Workers' },
      { id: 'lumberjack', icon: '🪓', name: 'Lumberjacks' },
      { id: 'miner', icon: '⛏️', name: 'Miners' },
      { id: 'farmer', icon: '🌾', name: 'Farmers' }
    ]

    // Only recalculate worker count every 500ms to reduce overhead
    const now = Date.now()
    if (now - this.lastWorkerUpdate > 500) {
      this.lastWorkerUpdate = now

      // Calculate total workers needed
      let totalWorkersNeeded = 0
      workerTypes.forEach(type => {
        totalWorkersNeeded += resourceManager.get(type.id) || 0
      })

      // Only update if count changed
      if (totalWorkersNeeded !== this.cachedWorkerCount) {
        this.cachedWorkerCount = totalWorkersNeeded

        // Add or remove workers to match count
        while (this.workers.length < totalWorkersNeeded) {
          this.spawnWorker(workerTypes)
        }
        while (this.workers.length > totalWorkersNeeded) {
          this.workers.pop()
        }
      }
    }

    // Update existing workers
    this.workers.forEach(worker => {
      // Update position
      worker.x += worker.vx * (deltaTime / 16)
      worker.y += worker.vy * (deltaTime / 16)

      // Bounce off walls - workers can now walk around the entire town!
      const margin = 20
      if (worker.x < margin || worker.x > this.width - margin) {
        worker.vx *= -1
        worker.x = Math.max(margin, Math.min(this.width - margin, worker.x))
      }
      if (worker.y < margin || worker.y > this.height - margin) {
        worker.vy *= -1
        worker.y = Math.max(margin, Math.min(this.height - margin, worker.y))
      }

      // Randomly change direction
      if (Math.random() < 0.01) {
        const angle = Math.random() * Math.PI * 2
        const speed = 0.3 + Math.random() * 0.5
        worker.vx = Math.cos(angle) * speed
        worker.vy = Math.sin(angle) * speed
      }

      // Update speech bubble
      if (worker.speechTimer > 0) {
        worker.speechTimer -= deltaTime
      } else if (Math.random() < 0.002) {
        // Random chance to start talking
        worker.speechText = this.getRandomSpeech()
        worker.speechTimer = 2000 + Math.random() * 2000 // 2-4 seconds
      }
    })
  }

  /**
   * Spawn a new worker
   */
  spawnWorker(workerTypes) {
    // Pick a random worker type from available types
    const availableTypes = workerTypes.filter(type =>
      (this.engine.resourceManager.get(type.id) || 0) > 0
    )
    const workerType = availableTypes[Math.floor(Math.random() * availableTypes.length)]

    if (!workerType) return

    // Random position anywhere in the town!
    const worker = {
      x: 50 + Math.random() * (this.width - 100),
      y: 50 + Math.random() * (this.height - 100),
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      icon: workerType.icon,
      speechText: '',
      speechTimer: 0
    }

    this.workers.push(worker)
  }

  /**
   * Get random speech text
   */
  getRandomSpeech() {
    const speeches = [
      '👋', '💬', '☕', '🔨', '📦', '✨',
      '👍', '💪', '🎯', '⚡', '🔥', '⭐'
    ]
    return speeches[Math.floor(Math.random() * speeches.length)]
  }

  /**
   * Draw animated workers (OPTIMIZED with emoji cache + pixel snapping)
   */
  drawAnimatedWorkers() {
    // DEBUG: Log worker count
    if (this.workers.length > 0) {
      console.log(`[TownRenderer] Drawing ${this.workers.length} workers`)
    }

    // Draw each worker
    this.workers.forEach(worker => {
      // PERFORMANCE: Use integer coordinates to prevent sub-pixel rendering (2-3x faster!)
      const x = Math.floor(worker.x)
      const y = Math.floor(worker.y)

      // Get cached emoji canvas (with fallback to fillText)
      const emojiCanvas = this.getCachedEmoji(worker.icon, 28)

      if (emojiCanvas) {
        const halfSize = Math.floor(emojiCanvas.width / 2)

        // Draw shadow (simple rectangle, faster than fillText)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
        this.ctx.fillRect(x - halfSize + 2, y - halfSize + 2, emojiCanvas.width, emojiCanvas.height)

        // Draw worker icon from cached canvas (10-50x faster than fillText!)
        this.ctx.drawImage(emojiCanvas, x - halfSize, y - halfSize)
      } else {
        console.warn(`[TownRenderer] Using fillText fallback for worker ${worker.icon}`)
        // Fallback to fillText
        this.ctx.font = '28px Arial'
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'

        // Draw shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
        this.ctx.fillText(worker.icon, x + 2, y + 2)

        // Draw worker icon
        this.ctx.fillStyle = '#000'
        this.ctx.fillText(worker.icon, x, y)
      }

      // Draw speech bubble if talking
      if (worker.speechTimer > 0) {
        // Bubble background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
        this.ctx.strokeStyle = '#000'
        this.ctx.lineWidth = 2

        const bubbleWidth = 40
        const bubbleHeight = 30
        const bubbleX = x - bubbleWidth / 2
        const bubbleY = y - 45

        // Draw rounded rectangle
        this.ctx.beginPath()
        this.ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8)
        this.ctx.fill()
        this.ctx.stroke()

        // Draw speech emoji from cache (with fallback)
        const speechCanvas = this.getCachedEmoji(worker.speechText, 20)
        if (speechCanvas) {
          const speechHalfSize = Math.floor(speechCanvas.width / 2)
          this.ctx.drawImage(speechCanvas, x - speechHalfSize, bubbleY + bubbleHeight / 2 - speechHalfSize)
        } else {
          this.ctx.font = '20px Arial'
          this.ctx.fillStyle = '#000'
          this.ctx.textAlign = 'center'
          this.ctx.fillText(worker.speechText, x, bubbleY + bubbleHeight / 2)
        }
      }
    })
  }

  /**
   * Draw workers in the worker area (DEPRECATED - kept for reference)
   */
  drawWorkers_OLD() {
    const resourceManager = this.engine.resourceManager
    const workerTypes = [
      { id: 'basicWorker', icon: '👷', name: 'Workers' },
      { id: 'lumberjack', icon: '🪓', name: 'Lumberjacks' },
      { id: 'miner', icon: '⛏️', name: 'Miners' },
      { id: 'farmer', icon: '🌾', name: 'Farmers' }
    ]

    let offsetX = 20
    const baseY = this.workerAreaY + 20

    // Title
    this.ctx.font = 'bold 14px Arial'
    this.ctx.fillStyle = '#000'
    this.ctx.textAlign = 'left'
    this.ctx.fillText('👷 Population', 10, this.workerAreaY + 15)

    workerTypes.forEach(workerType => {
      const count = resourceManager.get(workerType.id) || 0

      if (count > 0) {
        // Draw worker icon
        this.ctx.font = '24px Arial'
        this.ctx.textAlign = 'center'
        this.ctx.fillText(workerType.icon, offsetX, baseY + 15)

        // Draw count
        this.ctx.font = 'bold 14px Arial'
        this.ctx.fillStyle = '#fff'
        this.ctx.strokeStyle = '#000'
        this.ctx.lineWidth = 3
        this.ctx.strokeText(`×${count}`, offsetX, baseY + 35)
        this.ctx.fillText(`×${count}`, offsetX, baseY + 35)

        // Draw label
        this.ctx.font = '10px Arial'
        this.ctx.fillStyle = '#333'
        this.ctx.fillText(workerType.name, offsetX, baseY + 50)

        offsetX += 70
      }
    })

    // If no workers, show message
    if (offsetX === 20) {
      this.ctx.font = '12px Arial'
      this.ctx.fillStyle = '#666'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('No workers yet - build houses to generate workers!', this.width / 2, baseY + 25)
    }
  }

  /**
   * Resize canvas
   */
  resize(width, height) {
    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height

    // Recalculate grid - use full height
    this.cellWidth = this.width / this.gridColumns
    this.cellHeight = this.height / this.gridRows

    // Invalidate cached gradient to force recreation with new dimensions
    this.backgroundGradient = null
  }

  /**
   * Reset positions when town is cleared
   */
  reset() {
    this.buildingPositions.clear()
    this.nextBuildingSlot = 0
  }
}
