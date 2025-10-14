import { ParticleSystem } from './ParticleSystem.js'

/**
 * Renderer - Canvas-based visualization for worker simulation
 * Purely visual - reads game state but does not modify it
 */
export class Renderer {
  constructor(canvas, engine) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.engine = engine

    // Canvas dimensions
    this.width = 900
    this.height = 600

    // Set canvas size
    this.canvas.width = this.width
    this.canvas.height = this.height

    // Particle system for visual effects
    this.particleSystem = new ParticleSystem()

    // Track last worker states for event detection
    this.lastWorkerStates = new Map()

    console.log('✅ [Renderer] Initialized (900x600)')
  }

  /**
   * Render a single frame
   */
  render(deltaTime = 16) {
    // Update particle system
    this.particleSystem.update(deltaTime)

    // Detect state changes and trigger effects
    this.detectStateChanges()

    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height)

    // Draw background
    this.drawBackground()

    // Draw home area
    this.drawHome()

    // Draw resource nodes
    this.drawResourceNodes()

    // Draw workers
    this.drawWorkers()

    // Draw particles on top
    this.particleSystem.render(this.ctx)
  }

  /**
   * Detect worker state changes and trigger visual effects
   */
  detectStateChanges() {
    const workers = this.engine.workerEntityManager.getAllWorkers()

    workers.forEach(worker => {
      const currentState = worker.state
      const lastState = this.lastWorkerStates.get(worker.id)

      // Check for state transitions
      if (lastState !== currentState) {
        // Started harvesting
        if (currentState === 'harvesting') {
          this.particleSystem.createBurst(
            worker.position.x,
            worker.position.y,
            8,
            { color: '#90EE90', size: 2, lifetime: 600 }
          )
          this.particleSystem.createSparkle(worker.position.x, worker.position.y)
        }

        // Completed harvest (transitioned from harvesting to walking_back)
        if (lastState === 'harvesting' && currentState === 'walking_back') {
          this.particleSystem.createBurst(
            worker.position.x,
            worker.position.y,
            12,
            { color: '#FFD700', size: 3, lifetime: 800 }
          )
          // Add floating text showing what was harvested
          if (worker.carrying) {
            const resourceType = Object.keys(worker.carrying)[0]
            const resourceIcon = this.getResourceIcon(worker.carrying)
            this.particleSystem.createFloatingText(
              worker.position.x,
              worker.position.y - 20,
              `+${resourceIcon}`,
              { color: '#FFD700', size: 14 }
            )
          }
        }

        // Completed deposit
        if (lastState === 'depositing' && currentState === 'idle') {
          this.particleSystem.createBurst(
            worker.position.x,
            worker.position.y,
            10,
            { color: '#4CAF50', size: 3, lifetime: 700 }
          )
          for (let i = 0; i < 3; i++) {
            setTimeout(() => {
              this.particleSystem.createSparkle(
                worker.position.x + (Math.random() - 0.5) * 30,
                worker.position.y + (Math.random() - 0.5) * 30,
                { color: '#FFFFFF', size: 3 }
              )
            }, i * 100)
          }
        }

        // Update last state
        this.lastWorkerStates.set(worker.id, currentState)
      }

      // Periodic sparkles while harvesting
      if (currentState === 'harvesting' && Math.random() < 0.05) {
        this.particleSystem.createSparkle(
          worker.position.x + (Math.random() - 0.5) * 20,
          worker.position.y + (Math.random() - 0.5) * 20,
          { color: '#90EE90', size: 2 }
        )
      }
    })
  }

  /**
   * Draw background
   */
  drawBackground() {
    // Gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height)
    gradient.addColorStop(0, '#87CEEB') // Sky blue
    gradient.addColorStop(1, '#90EE90') // Light green

    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.width, this.height)
  }

  /**
   * Draw home area (right side)
   */
  drawHome() {
    const homeX = 850
    const homeY = 300

    // Draw home base
    this.ctx.fillStyle = '#8B4513'
    this.ctx.fillRect(homeX - 40, homeY - 40, 80, 80)

    // Draw home icon
    this.ctx.font = '48px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('🏠', homeX, homeY)

    // Draw label
    this.ctx.font = '14px Arial'
    this.ctx.fillStyle = '#000'
    this.ctx.fillText('Home', homeX, homeY + 50)
  }

  /**
   * Draw all resource nodes
   */
  drawResourceNodes() {
    const nodes = this.engine.resourceNodeManager.getAllNodes()

    nodes.forEach(node => {
      const renderState = node.getRenderState()
      this.drawResourceNode(renderState)
    })
  }

  /**
   * Draw a single resource node
   */
  drawResourceNode(state) {
    const { position, icon, name, available, capacity, fullness, color } = state

    // Draw glow effect based on fullness
    if (fullness > 0.5) {
      const glowRadius = 40 + Math.sin(Date.now() / 500) * 5 // Pulsing effect
      const gradient = this.ctx.createRadialGradient(
        position.x, position.y, 20,
        position.x, position.y, glowRadius
      )
      const glowAlpha = fullness * 0.3
      gradient.addColorStop(0, `${color}${Math.floor(glowAlpha * 255).toString(16).padStart(2, '0')}`)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(position.x, position.y, glowRadius, 0, Math.PI * 2)
      this.ctx.fill()
    }

    // Draw node base
    this.ctx.fillStyle = color || '#666'
    this.ctx.globalAlpha = 0.3
    this.ctx.beginPath()
    this.ctx.arc(position.x, position.y, 40, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.globalAlpha = 1.0

    // Draw node icon
    this.ctx.font = '36px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(icon, position.x, position.y)

    // Draw name
    this.ctx.font = '12px Arial'
    this.ctx.fillStyle = '#000'
    this.ctx.fillText(name, position.x, position.y - 50)

    // Draw resource count
    this.ctx.font = '10px Arial'
    this.ctx.fillStyle = '#333'
    this.ctx.fillText(`${Math.floor(available)}/${capacity}`, position.x, position.y + 50)

    // Draw fullness bar
    this.drawProgressBar(
      position.x - 30,
      position.y + 60,
      60,
      6,
      fullness,
      color || '#4CAF50'
    )
  }

  /**
   * Draw all workers
   */
  drawWorkers() {
    const workers = this.engine.workerEntityManager.getAllWorkers()

    workers.forEach(worker => {
      const renderState = worker.getRenderState()
      this.drawWorker(renderState)
    })
  }

  /**
   * Draw a single worker
   */
  drawWorker(state) {
    const { position, type, carrying, progress } = state
    const stats = this.engine.workerEntityManager.workerTypes.get(type)

    if (!stats) return

    // Subtle bobbing animation based on time
    const bobOffset = Math.sin(Date.now() / 300 + position.x) * 2

    // Draw worker shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    this.ctx.beginPath()
    this.ctx.ellipse(position.x, position.y + 20, 12, 6, 0, 0, Math.PI * 2)
    this.ctx.fill()

    // Draw worker icon with bobbing
    this.ctx.font = '24px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(stats.icon, position.x, position.y + bobOffset)

    // Draw carrying resource (also bobbing)
    if (carrying) {
      const resourceIcon = this.getResourceIcon(carrying)
      if (resourceIcon) {
        this.ctx.font = '16px Arial'
        this.ctx.fillText(resourceIcon, position.x + 15, position.y + bobOffset - 15)
      }
    }

    // Draw progress bar for harvesting/depositing
    if (state.state === 'harvesting' || state.state === 'depositing') {
      this.drawProgressBar(
        position.x - 15,
        position.y + 20,
        30,
        4,
        progress,
        '#FFD700'
      )
    }
  }

  /**
   * Get icon for carried resource
   */
  getResourceIcon(carrying) {
    const resourceTypes = {
      wheat: '🌾',
      wood: '🪵',
      stone: '🪨',
      iron: '⚙️',
      coal: '🪨',
      gold: '💰',
      carrot: '🥕',
      crystal: '💎'
    }

    // Get first resource type from carrying object
    const resourceType = Object.keys(carrying)[0]
    return resourceTypes[resourceType] || '📦'
  }

  /**
   * Draw a progress bar
   */
  drawProgressBar(x, y, width, height, progress, color) {
    // Background
    this.ctx.fillStyle = '#333'
    this.ctx.fillRect(x, y, width, height)

    // Progress
    this.ctx.fillStyle = color
    this.ctx.fillRect(x, y, width * Math.min(Math.max(progress, 0), 1), height)

    // Border
    this.ctx.strokeStyle = '#000'
    this.ctx.lineWidth = 1
    this.ctx.strokeRect(x, y, width, height)
  }

  /**
   * Resize canvas
   */
  resize(width, height) {
    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height
  }
}
