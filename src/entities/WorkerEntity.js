/**
 * WorkerEntity - Individual worker with AI and state machine
 * Workers autonomously harvest resources and return to deposit them
 */
export class WorkerEntity {
  constructor(id, type, homePosition) {
    // Identity
    this.id = id
    this.type = type
    this.homePosition = { ...homePosition }
    this.position = { ...homePosition }

    // State machine
    this.state = 'idle' // idle, walking_to, harvesting, walking_back, depositing
    this.stateTimer = 0
    this.targetNodeId = null
    this.carrying = null

    // Worker stats (defaults, will be overridden by type)
    this.walkSpeed = 150 // pixels per second
    this.carrySpeed = 90  // pixels per second when carrying
    this.harvestSpeedMultiplier = 1.0 // multiplier on harvest time

    // Movement
    this.destination = null
    this.targetNodePosition = null

    // Random offset to prevent stacking
    this.randomOffset = Math.random() * 0.5 // 0-0.5 seconds

    // Stats tracking
    this.totalHarvests = 0
    this.totalDistanceTraveled = 0
  }

  /**
   * Main update loop - called every frame
   * @param {number} deltaTime - Time elapsed in milliseconds
   * @param {Map<string, ResourceNode>} resourceNodes - All resource nodes
   * @param {CurrencyManager} currencyManager - For depositing resources
   */
  update(deltaTime, resourceNodes, currencyManager) {
    this.stateTimer += deltaTime

    switch (this.state) {
      case 'idle':
        this.updateIdle(resourceNodes)
        break
      case 'walking_to':
        this.updateWalkingTo(deltaTime)
        break
      case 'harvesting':
        this.updateHarvesting(deltaTime, resourceNodes)
        break
      case 'walking_back':
        this.updateWalkingBack(deltaTime)
        break
      case 'depositing':
        this.updateDepositing(deltaTime, currencyManager)
        break
    }
  }

  /**
   * State: idle - check if assigned node has resources
   */
  updateIdle(resourceNodes) {
    if (!this.targetNodeId) return

    const node = resourceNodes.get(this.targetNodeId)
    if (node && node.canHarvest()) {
      this.startWalkingTo(node.position)
    }
  }

  /**
   * State: walking_to - move toward resource node
   */
  updateWalkingTo(deltaTime) {
    if (!this.destination) {
      this.state = 'idle'
      return
    }

    const result = this.moveToward(this.destination, this.walkSpeed, deltaTime)

    if (result.arrived) {
      this.startHarvesting()
    }

    this.totalDistanceTraveled += result.distanceMoved
  }

  /**
   * State: harvesting - wait for harvest to complete
   */
  updateHarvesting(deltaTime, resourceNodes) {
    const node = resourceNodes.get(this.targetNodeId)

    if (!node) {
      // Node disappeared
      this.state = 'idle'
      this.stateTimer = 0
      return
    }

    const harvestDuration = (node.harvestTime / this.harvestSpeedMultiplier) * 1000

    if (this.stateTimer >= harvestDuration) {
      // Try to harvest
      if (node.harvest()) {
        this.carrying = { ...node.outputs }
        this.totalHarvests++
        this.startWalkingBack()
      } else {
        // Resource depleted while harvesting
        this.state = 'idle'
        this.stateTimer = 0
      }
    }
  }

  /**
   * State: walking_back - return to home with resource
   */
  updateWalkingBack(deltaTime) {
    const result = this.moveToward(this.homePosition, this.carrySpeed, deltaTime)

    if (result.arrived) {
      this.startDepositing()
    }

    this.totalDistanceTraveled += result.distanceMoved
  }

  /**
   * State: depositing - deliver resource and apply delay
   */
  updateDepositing(deltaTime, currencyManager) {
    // Deposit happens immediately when entering this state
    // Now we just wait for the random offset delay

    const delayDuration = this.randomOffset * 1000

    if (this.stateTimer >= delayDuration) {
      // Deposit complete, add resources to inventory
      if (this.carrying) {
        if (currencyManager) {
          Object.entries(this.carrying).forEach(([currencyId, amount]) => {
            currencyManager.add(currencyId, amount)
          })
        }
        this.carrying = null
      }

      // Regenerate random offset for next cycle
      this.randomOffset = Math.random() * 0.5

      // Back to idle
      this.state = 'idle'
      this.stateTimer = 0
    }
  }

  /**
   * Move toward a target position
   * @returns {{ arrived: boolean, distanceMoved: number }}
   */
  moveToward(target, speed, deltaTime) {
    const dx = target.x - this.position.x
    const dy = target.y - this.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Close enough - arrived
    if (distance < 5) {
      this.position.x = target.x
      this.position.y = target.y
      return { arrived: true, distanceMoved: distance }
    }

    // Calculate movement
    const moveDistance = speed * (deltaTime / 1000)
    const actualMoveDistance = Math.min(moveDistance, distance)
    const ratio = actualMoveDistance / distance

    this.position.x += dx * ratio
    this.position.y += dy * ratio

    return {
      arrived: ratio >= 1,
      distanceMoved: actualMoveDistance
    }
  }

  // ========== State Transitions ==========

  /**
   * Start walking to resource node
   */
  startWalkingTo(nodePosition) {
    this.state = 'walking_to'
    this.destination = { ...nodePosition }
    this.targetNodePosition = { ...nodePosition }
    this.stateTimer = 0
  }

  /**
   * Start harvesting
   */
  startHarvesting() {
    this.state = 'harvesting'
    this.stateTimer = 0
  }

  /**
   * Start walking back to home
   */
  startWalkingBack() {
    this.state = 'walking_back'
    this.destination = null
    this.stateTimer = 0
  }

  /**
   * Start depositing
   */
  startDepositing() {
    this.state = 'depositing'
    this.stateTimer = 0
  }

  // ========== Assignment ==========

  /**
   * Assign worker to a resource node
   */
  assignTo(nodeId) {
    this.targetNodeId = nodeId

    // If currently carrying, finish the deposit first
    if (this.state !== 'walking_back' && this.state !== 'depositing') {
      this.state = 'idle'
      this.stateTimer = 0
    }
  }

  /**
   * Unassign worker from current node
   */
  unassign() {
    this.targetNodeId = null
    this.state = 'idle'
    this.stateTimer = 0
    this.carrying = null
    this.destination = null
  }

  /**
   * Check if worker is assigned to any node
   */
  isAssigned() {
    return this.targetNodeId !== null
  }

  /**
   * Check if worker is idle
   */
  isIdle() {
    return this.state === 'idle' && !this.targetNodeId
  }

  // ========== Rendering & State Info ==========

  /**
   * Get state progress (0-1) for current activity
   */
  getStateProgress() {
    switch (this.state) {
      case 'harvesting':
        // Would need node reference to calculate accurately
        return this.stateTimer / 2000 // Approximate
      case 'depositing':
        return this.stateTimer / (this.randomOffset * 1000)
      case 'walking_to':
      case 'walking_back':
        if (this.destination) {
          const dx = this.destination.x - this.position.x
          const dy = this.destination.y - this.position.y
          const remainingDistance = Math.sqrt(dx * dx + dy * dy)
          // Progress is inverse of remaining distance (closer = more progress)
          return 1 - Math.min(remainingDistance / 700, 1) // Assume ~700px max distance
        }
        return 0
      default:
        return 0
    }
  }

  /**
   * Get render state for drawing
   */
  getRenderState() {
    return {
      id: this.id,
      type: this.type,
      position: { ...this.position },
      state: this.state,
      carrying: this.carrying,
      progress: this.getStateProgress(),
      targetNodeId: this.targetNodeId
    }
  }

  /**
   * Get stats for UI display
   */
  getStats() {
    return {
      totalHarvests: this.totalHarvests,
      totalDistanceTraveled: Math.floor(this.totalDistanceTraveled),
      state: this.state,
      assigned: this.isAssigned()
    }
  }

  /**
   * Get save state
   */
  getSaveState() {
    return {
      id: this.id,
      type: this.type,
      targetNodeId: this.targetNodeId,
      totalHarvests: this.totalHarvests,
      totalDistanceTraveled: this.totalDistanceTraveled
    }
  }

  /**
   * Load from save state
   */
  loadState(state) {
    if (state.targetNodeId !== undefined) {
      this.targetNodeId = state.targetNodeId
    }
    if (state.totalHarvests !== undefined) {
      this.totalHarvests = state.totalHarvests
    }
    if (state.totalDistanceTraveled !== undefined) {
      this.totalDistanceTraveled = state.totalDistanceTraveled
    }

    // Reset to idle state after load
    this.state = 'idle'
    this.stateTimer = 0
    this.position = { ...this.homePosition }
  }
}
