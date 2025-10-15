import { ParticleSystem } from '../rendering/ParticleSystem.js'

/**
 * ActivitySimulation - Manages worker simulation for a single activity
 * Shows workers gathering resources and returning to drop-off point
 */
export class ActivitySimulation {
  constructor(canvas, activity, workerManager, resourceManager) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.activity = activity
    this.workerManager = workerManager
    this.resourceManager = resourceManager

    // Canvas dimensions - match CSS display size to prevent stretching
    const rect = this.canvas.getBoundingClientRect()
    this.width = rect.width || 400
    this.height = 80
    this.canvas.width = this.width
    this.canvas.height = this.height

    // Scale positions based on actual width
    const scale = this.width / 400

    // Positions (scaled to canvas size)
    this.resourcePosition = { x: 60 * scale, y: 40 }  // Left side
    this.dropOffPosition = { x: 340 * scale, y: 40 }  // Right side

    // Workers for this activity
    this.workers = []
    this.nextWorkerId = 1

    // Particle system
    this.particleSystem = new ParticleSystem()

    // Track last states for effects
    this.lastWorkerStates = new Map()

    // Track recent mining hits for shake/grow effect
    this.recentHits = []  // Array of { time, workerId }

    // Flying resources (emoji flying from node to worker)
    this.flyingResources = []  // Array of { x, y, targetX, targetY, progress, emoji, workerId }
  }

  /**
   * Spawn workers based on current assignments
   */
  syncWorkers() {
    const assignments = this.workerManager.getActivityAssignments(this.activity.id)
    let targetCount = 0

    // Count total workers assigned
    for (const count of Object.values(assignments)) {
      targetCount += count
    }

    // Check if worker count changed
    const countChanged = this.workers.length !== targetCount

    // Spawn new workers if needed
    while (this.workers.length < targetCount) {
      this.spawnWorker()
    }

    // Despawn excess workers
    while (this.workers.length > targetCount) {
      this.workers.pop()
    }

    // When worker count changes, update all workers' timings to match new speed
    if (countChanged && this.workers.length > 0) {
      this.updateWorkerTimings()
    }
  }

  /**
   * Calculate effective harvest time based on worker speed multiplier
   */
  calculateHarvestTime() {
    const baseDuration = this.activity.duration
    const speedMultiplier = this.workerManager.getSpeedMultiplier(this.activity.id, this.activity.skillId)

    // If no workers or speed is 0, use base duration
    if (speedMultiplier === 0) {
      return baseDuration * 1000
    }

    // Calculate effective duration (speed multiplier makes it faster)
    const effectiveDuration = baseDuration / speedMultiplier
    return effectiveDuration * 1000 // Convert to ms
  }

  /**
   * Spawn a new worker
   */
  spawnWorker() {
    // Calculate pre-determined timing with speed variation
    const harvestTime = this.calculateHarvestTime()
    const baseWalkSpeed = 80 // pixels per second
    const speedVariation = 0.7 + Math.random() * 0.6 // 70% to 130% of base speed
    const walkSpeed = baseWalkSpeed * speedVariation
    const distance = Math.abs(this.dropOffPosition.x - this.resourcePosition.x)
    const walkToTime = (distance / walkSpeed) * 1000
    const walkBackTime = walkToTime * 5 // Much slower when dragging resources
    const totalCycleTime = walkToTime + harvestTime + walkBackTime

    // Random offset to prevent stacking (0-20% of cycle time)
    const randomOffset = Math.random() * (totalCycleTime * 0.2)

    // Random vertical offset to spread workers out more (-20 to +20 pixels)
    const verticalOffset = (Math.random() - 0.5) * 40

    const worker = {
      id: `worker_${this.nextWorkerId++}`,
      position: { ...this.dropOffPosition },
      state: 'idle',
      stateTimer: randomOffset, // Start with random offset
      progress: 0,
      carrying: null,
      verticalOffset,  // Store vertical offset for this worker

      // Pre-calculated timings
      walkToTime,
      harvestTime,
      walkBackTime,
      totalCycleTime,

      // Stats
      walkSpeed
    }

    this.workers.push(worker)
  }

  /**
   * Update all workers' harvest timings when worker count changes
   * This ensures animation speed matches actual activity speed
   */
  updateWorkerTimings() {
    const newHarvestTime = this.calculateHarvestTime()

    this.workers.forEach(worker => {
      // Calculate ratio of old to new harvest time
      const oldHarvestTime = worker.harvestTime
      const ratio = newHarvestTime / oldHarvestTime

      // Update harvest time
      worker.harvestTime = newHarvestTime

      // Update total cycle time
      worker.totalCycleTime = worker.walkToTime + worker.harvestTime + worker.walkBackTime

      // Adjust worker's current progress if they're harvesting
      // This keeps the animation smooth during the transition
      if (worker.state === 'harvesting') {
        // Scale the timer to maintain relative progress
        worker.stateTimer = worker.stateTimer / ratio
      }
    })
  }

  /**
   * Update simulation
   */
  update(deltaTime) {
    // Update particles
    this.particleSystem.update(deltaTime)

    // Clean up old hits (older than 2 seconds)
    const now = Date.now()
    this.recentHits = this.recentHits.filter(hit => now - hit.time < 2000)

    // Update flying resources
    const flySpeed = 0.003 // Progress per ms
    this.flyingResources.forEach(resource => {
      resource.progress += deltaTime * flySpeed

      // Interpolate position with easing
      const t = this.easeOutCubic(Math.min(resource.progress, 1))
      resource.x = resource.x + (resource.targetX - resource.x) * 0.1
      resource.y = resource.y + (resource.targetY - resource.y) * 0.1

      // Check if resource reached worker
      if (resource.progress >= 1) {
        // Find worker and mark resource as received
        const worker = this.workers.find(w => w.id === resource.workerId)
        if (worker) {
          worker.waitingForResource = false
        }
      }
    })

    // Remove completed flying resources
    this.flyingResources = this.flyingResources.filter(r => r.progress < 1)

    // Sync workers with assignments
    this.syncWorkers()

    // Update each worker
    this.workers.forEach(worker => {
      this.updateWorker(worker, deltaTime)
    })
  }

  /**
   * Easing function for flying resources
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3)
  }

  /**
   * Select mining animation based on rarity
   */
  selectMiningAnimation() {
    const rand = Math.random() * 100

    // Animation types with rarities (must sum to 100%)
    if (rand < 2) return 'power_slam'      // Epic 2%
    if (rand < 7) return 'backflip'        // Rare 5%
    if (rand < 15) return 'spin_attack'    // Rare 8%
    if (rand < 30) return 'jump_attack'    // Uncommon 15%
    if (rand < 50) return 'running_start'  // Uncommon 20%
    if (rand < 70) return 'double_swing'   // Uncommon 20%
    return 'normal_swing'                  // Common 30%
  }

  /**
   * Check if activity has enough resources to run
   */
  canAffordActivity() {
    for (const [resourceId, amount] of Object.entries(this.activity.inputs)) {
      const current = this.resourceManager.get(resourceId)
      if (current < amount) {
        return false
      }
    }
    return true
  }

  /**
   * Update a single worker's state machine
   */
  updateWorker(worker, deltaTime) {
    const dt = deltaTime / 1000 // Convert to seconds

    // Track state changes for effects
    const lastState = this.lastWorkerStates.get(worker.id)

    switch (worker.state) {
      case 'idle':
        // Idle is just a brief pause - start walking immediately
        worker.state = 'walking_to'
        worker.stateTimer = 0
        worker.progress = 0
        break

      case 'walking_to':
        // Move towards resource
        worker.stateTimer += deltaTime
        worker.progress = worker.stateTimer / worker.walkToTime

        if (worker.progress >= 1) {
          // Arrived at mining position (30 pixels away from resource)
          const miningDistance = 30
          worker.position = {
            x: this.resourcePosition.x + miningDistance,
            y: this.resourcePosition.y + worker.verticalOffset
          }

          // Check if we have enough resources to work
          if (!this.canAffordActivity()) {
            worker.state = 'blocked'
            worker.stateTimer = 0
            worker.progress = 0
            // Random jump timer (workers will jump randomly while waiting)
            worker.nextJumpTime = Math.random() * 2000 + 1000 // 1-3 seconds
          } else {
            worker.state = 'harvesting'
            worker.stateTimer = 0
            worker.progress = 0

            // Select mining animation type based on rarity
            worker.miningAnimation = this.selectMiningAnimation()

            // Effect: Start harvesting
            if (lastState !== 'harvesting') {
              this.particleSystem.createBurst(
                worker.position.x,
                worker.position.y,
                6,
                { color: '#90EE90', size: 2, lifetime: 600 }
              )
            }
          }
        } else {
          // Interpolate position (stop 30 pixels before resource)
          const t = worker.progress
          const miningDistance = 30
          const targetX = this.resourcePosition.x + miningDistance
          const targetY = this.resourcePosition.y + worker.verticalOffset
          worker.position.x = this.dropOffPosition.x + (targetX - this.dropOffPosition.x) * t
          worker.position.y = this.dropOffPosition.y + (targetY - this.dropOffPosition.y) * t
        }
        break

      case 'blocked':
        // Workers are blocked - waiting for resources
        worker.stateTimer += deltaTime

        // Check periodically if resources are now available
        if (worker.stateTimer % 1000 < deltaTime) { // Check every second
          if (this.canAffordActivity()) {
            // Resources available! Start harvesting
            worker.state = 'harvesting'
            worker.stateTimer = 0
            worker.progress = 0
            worker.miningAnimation = this.selectMiningAnimation()
          }
        }

        // Random jump animation
        if (!worker.nextJumpTime) {
          worker.nextJumpTime = Math.random() * 2000 + 1000
        }
        if (worker.stateTimer >= worker.nextJumpTime) {
          worker.isJumping = true
          worker.jumpStartTime = worker.stateTimer
          worker.nextJumpTime = worker.stateTimer + Math.random() * 2000 + 1000
        }
        break

      case 'harvesting':
        // Mining animation
        worker.stateTimer += deltaTime
        worker.progress = worker.stateTimer / worker.harvestTime

        // Attack animation - periodic hits on the resource node
        const attackCycle = 400 // ms per attack
        const attackPhase = (worker.stateTimer % attackCycle) / attackCycle

        // Record hit at the peak of attack animation
        if (attackPhase > 0.4 && attackPhase < 0.5 && !worker.lastHitRecorded) {
          this.recentHits.push({ time: Date.now(), workerId: worker.id })
          worker.lastHitRecorded = true

          // Impact particles
          this.particleSystem.createBurst(
            this.resourcePosition.x + (Math.random() - 0.5) * 10,
            this.resourcePosition.y + (Math.random() - 0.5) * 10,
            4,
            { color: '#FFD700', size: 2, lifetime: 400 }
          )
        }
        if (attackPhase < 0.4) {
          worker.lastHitRecorded = false
        }

        if (worker.progress >= 1) {
          // Harvest complete - create flying resource
          const resourceIcon = this.getResourceIcon(this.activity.outputs)
          this.flyingResources.push({
            x: this.resourcePosition.x,
            y: this.resourcePosition.y,
            targetX: worker.position.x,
            targetY: worker.position.y,
            progress: 0,
            emoji: resourceIcon,
            workerId: worker.id
          })

          worker.state = 'walking_back'
          worker.stateTimer = 0
          worker.progress = 0
          worker.carrying = this.activity.outputs
          worker.waitingForResource = true  // Wait for resource to arrive

          // Small burst at resource node
          this.particleSystem.createBurst(
            this.resourcePosition.x,
            this.resourcePosition.y,
            6,
            { color: '#FFD700', size: 2, lifetime: 500 }
          )
        }
        break

      case 'walking_back':
        // Move back to drop-off (slower)
        worker.stateTimer += deltaTime
        worker.progress = worker.stateTimer / worker.walkBackTime

        if (worker.progress >= 1) {
          // Arrived at drop-off - grant resources!
          worker.position = { ...this.dropOffPosition }
          worker.state = 'idle'
          worker.stateTimer = 0
          worker.progress = 0

          // Grant resources from the activity outputs
          if (worker.carrying) {
            Object.entries(worker.carrying).forEach(([resourceId, amount]) => {
              this.resourceManager.add(resourceId, amount)
            })
          }

          worker.carrying = null

          // Effect: Deposit complete
          this.particleSystem.createBurst(
            worker.position.x,
            worker.position.y,
            8,
            { color: '#4CAF50', size: 3, lifetime: 700 }
          )
        } else {
          // Interpolate position
          const t = worker.progress
          const miningDistance = 30
          const sourceX = this.resourcePosition.x + miningDistance
          const sourceY = this.resourcePosition.y + worker.verticalOffset
          worker.position.x = sourceX + (this.dropOffPosition.x - sourceX) * t
          worker.position.y = sourceY + (this.dropOffPosition.y - sourceY) * t
        }
        break
    }

    // Update last state
    this.lastWorkerStates.set(worker.id, worker.state)
  }

  /**
   * Render simulation
   */
  render(deltaTime) {
    // Update
    this.update(deltaTime)

    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height)

    // Draw background
    this.ctx.fillStyle = '#1a1a2e'
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Draw resource node (left)
    this.drawResourceNode()

    // Draw roadblocks if any workers are blocked
    const hasBlockedWorkers = this.workers.some(w => w.state === 'blocked')
    if (hasBlockedWorkers) {
      this.drawRoadblocks()
    }

    // Draw drop-off point (right)
    this.drawDropOff()

    // Draw path line
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    this.ctx.lineWidth = 2
    this.ctx.setLineDash([5, 5])
    this.ctx.beginPath()
    this.ctx.moveTo(this.resourcePosition.x, this.resourcePosition.y)
    this.ctx.lineTo(this.dropOffPosition.x, this.dropOffPosition.y)
    this.ctx.stroke()
    this.ctx.setLineDash([])

    // Draw workers
    this.workers.forEach(worker => {
      this.drawWorker(worker)
    })

    // Draw flying resources
    this.drawFlyingResources()

    // Draw particles
    this.particleSystem.render(this.ctx)
  }

  /**
   * Draw resource node
   */
  drawResourceNode() {
    const { x, y } = this.resourcePosition

    // Get resource icon from activity outputs
    const resourceIcon = this.getResourceIcon(this.activity.outputs)

    // Calculate shake and scale based on recent hits
    const now = Date.now()
    let shakeX = 0
    let shakeY = 0
    let scale = 1

    // Find most recent hit within last 200ms for shake
    const recentHit = this.recentHits.find(hit => now - hit.time < 200)
    if (recentHit) {
      const timeSince = now - recentHit.time
      const shakeFactor = 1 - (timeSince / 200) // Decay over 200ms
      shakeX = (Math.random() - 0.5) * 6 * shakeFactor
      shakeY = (Math.random() - 0.5) * 6 * shakeFactor
    }

    // Calculate scale based on all recent hits (within 2s)
    const hitCount = this.recentHits.length
    if (hitCount > 0) {
      // More hits = larger scale, with diminishing returns
      // 1 hit = 1.05, 5 hits = 1.15, 10 hits = 1.2
      scale = 1 + Math.min(0.2, hitCount * 0.03)
    }

    // Draw node base
    this.ctx.fillStyle = '#4a5568'
    this.ctx.globalAlpha = 0.5
    this.ctx.beginPath()
    this.ctx.arc(x + shakeX, y + shakeY, 20 * scale, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.globalAlpha = 1.0

    // Save context and reset transform for emoji
    this.ctx.save()
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)

    // Draw icon with shake and scale
    const fontSize = Math.floor(24 * scale)
    this.ctx.font = `${fontSize}px Arial`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(resourceIcon, x + shakeX, y + shakeY)

    this.ctx.restore()
  }

  /**
   * Draw drop-off point
   */
  drawDropOff() {
    const { x, y } = this.dropOffPosition

    // Draw base
    this.ctx.fillStyle = '#2d3748'
    this.ctx.globalAlpha = 0.5
    this.ctx.beginPath()
    this.ctx.arc(x, y, 20, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.globalAlpha = 1.0

    // Save context and reset transform for emoji
    this.ctx.save()
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)

    // Draw home icon
    this.ctx.font = '24px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('🏠', x, y)

    this.ctx.restore()
  }

  /**
   * Draw roadblock emojis when workers are blocked
   */
  drawRoadblocks() {
    const { x, y } = this.resourcePosition

    // Save context and reset transform for emoji
    this.ctx.save()
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)

    // Draw multiple roadblocks in front of the resource
    const roadblockPositions = [
      { x: x + 15, y: y - 15 },
      { x: x + 25, y: y + 10 }
    ]

    // Blinking effect
    const blinkPhase = (Date.now() % 1000) / 1000
    const opacity = 0.7 + Math.sin(blinkPhase * Math.PI * 2) * 0.3

    this.ctx.globalAlpha = opacity
    this.ctx.font = '20px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'

    roadblockPositions.forEach(pos => {
      this.ctx.fillText('🚧', pos.x, pos.y)
    })

    this.ctx.globalAlpha = 1.0
    this.ctx.restore()
  }

  /**
   * Draw a worker
   */
  drawWorker(worker) {
    const { x, y } = worker.position

    // Animation offsets
    let bobOffset = 0
    let attackOffset = 0
    let verticalOffset = 0
    let rotation = 0
    let scale = 1.3 // Increased base scale for better visibility

    if (worker.state === 'walking_to') {
      bobOffset = Math.sin(Date.now() / 150 + worker.id.charCodeAt(7)) * 3
    } else if (worker.state === 'walking_back') {
      // Slower, more labored bobbing when carrying resources
      bobOffset = Math.sin(Date.now() / 250 + worker.id.charCodeAt(7)) * 2
    } else if (worker.state === 'blocked') {
      // Idle animation with occasional jumps
      bobOffset = Math.sin(Date.now() / 300 + worker.id.charCodeAt(7)) * 1.5

      // Jump animation
      if (worker.isJumping && worker.jumpStartTime !== undefined) {
        const jumpDuration = 600 // ms
        const timeSinceJump = worker.stateTimer - worker.jumpStartTime
        if (timeSinceJump < jumpDuration) {
          const jumpProgress = timeSinceJump / jumpDuration
          // Parabolic jump arc
          verticalOffset = -Math.sin(jumpProgress * Math.PI) * 20
        } else {
          worker.isJumping = false
        }
      }
    } else if (worker.state === 'harvesting') {
      // Different animations based on selected mining type
      const attackCycle = 400 // ms per attack (matches hit timing)
      const attackPhase = (worker.stateTimer % attackCycle) / attackCycle
      const animType = worker.miningAnimation || 'normal_swing'

      switch (animType) {
        case 'normal_swing':
          // Standard swing animation
          if (attackPhase < 0.5) {
            const swingAmount = Math.sin(attackPhase * Math.PI) * 8
            attackOffset = -swingAmount
          } else {
            const recoveryPhase = (attackPhase - 0.5) * 2
            attackOffset = -8 * (1 - recoveryPhase)
          }
          if (attackPhase > 0.4 && attackPhase < 0.6) {
            bobOffset = -3
          }
          break

        case 'running_start':
          // Run towards resource before hitting
          if (attackPhase < 0.3) {
            attackOffset = -attackPhase * 30 // Run forward
            bobOffset = Math.sin(attackPhase * 30) * 4 // Fast bobbing
          } else if (attackPhase < 0.5) {
            attackOffset = -9 - (attackPhase - 0.3) * 10 // Strike
            bobOffset = -5
          } else {
            attackOffset = -19 * (1 - (attackPhase - 0.5) * 2)
          }
          break

        case 'jump_attack':
          // Jump up then slam down
          if (attackPhase < 0.4) {
            verticalOffset = -attackPhase * 50 // Jump up
            attackOffset = -attackPhase * 10
          } else if (attackPhase < 0.5) {
            verticalOffset = -20 + (attackPhase - 0.4) * 200 // Fall down
            attackOffset = -4 - (attackPhase - 0.4) * 20
          } else {
            verticalOffset = 0
            attackOffset = -6 * (1 - (attackPhase - 0.5) * 2)
          }
          break

        case 'backflip':
          // RARE: Backflip attack!
          if (attackPhase < 0.6) {
            rotation = attackPhase * Math.PI * 3.33 // Full backflip rotation
            verticalOffset = Math.sin(attackPhase * Math.PI * 1.67) * -25
            attackOffset = -attackPhase * 15
          } else {
            attackOffset = -9 * (1 - (attackPhase - 0.6) * 2.5)
          }
          break

        case 'spin_attack':
          // RARE: Spin before hitting
          if (attackPhase < 0.5) {
            rotation = attackPhase * Math.PI * 4 // Two full spins
            attackOffset = -attackPhase * 16
          } else {
            attackOffset = -8 * (1 - (attackPhase - 0.5) * 2)
          }
          break

        case 'double_swing':
          // Two quick hits
          if (attackPhase < 0.25) {
            const swing1 = Math.sin(attackPhase * 4 * Math.PI)
            attackOffset = swing1 * -6
            bobOffset = Math.abs(swing1) * -2
          } else if (attackPhase < 0.5) {
            const swing2 = Math.sin((attackPhase - 0.25) * 4 * Math.PI)
            attackOffset = swing2 * -10
            bobOffset = Math.abs(swing2) * -4
          } else {
            attackOffset = -10 * (1 - (attackPhase - 0.5) * 2)
          }
          break

        case 'power_slam':
          // EPIC: Charge up and massive slam
          if (attackPhase < 0.3) {
            // Charge up - pull back and grow
            attackOffset = attackPhase * 15
            verticalOffset = -attackPhase * 10
            scale = 1 + attackPhase * 0.5
          } else if (attackPhase < 0.5) {
            // Massive slam
            attackOffset = 4.5 - (attackPhase - 0.3) * 100
            verticalOffset = -3 + (attackPhase - 0.3) * 50
            scale = 1.15
          } else {
            // Recovery
            attackOffset = -15.5 * (1 - (attackPhase - 0.5) * 2)
            scale = 1.15 - (attackPhase - 0.5) * 0.3
          }
          break
      }
    }

    // Draw shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    this.ctx.beginPath()
    this.ctx.ellipse(x + attackOffset, y + 12, 8 * scale, 4, 0, 0, Math.PI * 2)
    this.ctx.fill()

    // Save context state
    this.ctx.save()

    // Reset transform for emoji rendering to prevent stretching
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)

    // Apply rotation if needed
    if (rotation !== 0) {
      this.ctx.translate(x + attackOffset, y + bobOffset + verticalOffset)
      this.ctx.rotate(rotation)
      this.ctx.translate(-(x + attackOffset), -(y + bobOffset + verticalOffset))
    }

    // Ensure fully opaque
    this.ctx.globalAlpha = 1.0

    // Draw bright background circle behind worker for better visibility
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.beginPath()
    this.ctx.arc(x + attackOffset, y + bobOffset + verticalOffset, 12 * scale, 0, Math.PI * 2)
    this.ctx.fill()

    // Add glow effect to worker
    this.ctx.shadowColor = '#ffffff'
    this.ctx.shadowBlur = 8

    // Draw worker icon with all transformations
    const fontSize = Math.floor(16 * scale)
    this.ctx.font = `${fontSize}px Arial`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('👷', x + attackOffset, y + bobOffset + verticalOffset)

    // Reset shadow for other elements
    this.ctx.shadowBlur = 0

    // Draw carrying indicator (hide while flying resource is in progress)
    if (worker.carrying && !worker.waitingForResource) {
      const resourceIcon = this.getResourceIcon(worker.carrying)
      this.ctx.font = '12px Arial'
      this.ctx.fillText(resourceIcon, x + attackOffset + 10, y + bobOffset + verticalOffset - 10)
    }

    // Restore context state
    this.ctx.restore()
  }

  /**
   * Draw flying resources
   */
  drawFlyingResources() {
    this.ctx.save()
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)

    this.flyingResources.forEach(resource => {
      // Scale grows as it flies (starts small, grows to normal size)
      const scale = 0.5 + resource.progress * 0.5

      // Add a slight arc to the flight path
      const arcHeight = 15
      const arc = Math.sin(resource.progress * Math.PI) * arcHeight

      this.ctx.font = `${Math.floor(12 * scale)}px Arial`
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'

      // Add glow effect
      this.ctx.shadowColor = '#FFD700'
      this.ctx.shadowBlur = 10 * scale

      this.ctx.fillText(resource.emoji, resource.x, resource.y - arc)

      // Reset shadow
      this.ctx.shadowBlur = 0
    })

    this.ctx.restore()
  }

  /**
   * Get icon for resource
   */
  getResourceIcon(outputs) {
    const resourceTypes = {
      wheat: '🌾',
      wood: '🪵',
      stone: '🪨',
      iron: '⚙️',
      coal: '🪨',
      gold: '💰',
      water: '💧',
      flour: '🍞',
      bread: '🥖',
      basicWorker: '👷',
      plank: '🪵',
      // Add more as needed
    }

    // Get first output
    const resourceType = Object.keys(outputs)[0]
    return resourceTypes[resourceType] || '📦'
  }

  /**
   * Cleanup
   */
  destroy() {
    this.workers = []
    this.particleSystem.clear()
  }
}
