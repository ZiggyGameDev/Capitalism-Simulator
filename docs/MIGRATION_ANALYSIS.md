# Migration Analysis - Current to Visual Worker System

## Current Architecture Analysis

### Files to REMOVE Completely
```
src/managers/ActivityManager.js     # Replace with ResourceNodeManager
src/managers/WorkerManager.js       # Replace with WorkerEntityManager
tests/unit/managers/ActivityManager.test.js
tests/unit/managers/WorkerManager.test.js
tests/automation-game.spec.js       # Old E2E tests for automation
```

### Files to HEAVILY REFACTOR
```
src/core/GameEngine.js              # Replace managers, add simulation loop
src/main.js                         # Complete UI rewrite for canvas
src/data/activities-expanded.js     # Convert to resource nodes
src/data/skills-expanded.js         # Update unlock conditions
index.html                          # Add canvas, remove old UI elements
style.css                           # New styles for canvas overlay
```

### Files to KEEP (Minor Updates)
```
src/managers/CurrencyManager.js     # Keep for inventory
src/managers/SkillManager.js        # Keep for progression
src/managers/UpgradeManager.js      # Update for node upgrades
src/core/EventBus.js                # Keep event system
src/utils/calculations.js           # Add movement calculations
tests/unit/managers/CurrencyManager.test.js
tests/unit/managers/SkillManager.test.js
```

---

## Detailed Removal Plan

### Step 1: Identify All ActivityManager Usage
**Current dependencies:**
```javascript
// GameEngine.js
this.activityManager = new ActivityManager(...)
this.activityManager.update(deltaTime)
this.activityManager.canRun(activityId)
this.activityManager.getActiveActivities()
this.activityManager.getProgress(activityId)
this.activityManager.getEffectiveDuration(activityId)

// main.js UI
handleActivityCompleted()
handleActivityStarted()
handleActivityStopped()
updateActivityState()
updateActivityProgress()
buildActivityList()
createActivityElement()
updateActiveActivitiesPanel()
```

**Actions:**
- [ ] List all methods called on ActivityManager
- [ ] Map each to new ResourceNodeManager equivalent
- [ ] Create compatibility layer during transition

### Step 2: Identify All WorkerManager Usage
**Current dependencies:**
```javascript
// GameEngine.js
this.workerManager = new WorkerManager(...)
this.workerManager.assign(activityId, workerType, count)
this.workerManager.getAssignment(activityId, workerType)
this.workerManager.getAvailableWorkers(workerType)
this.workerManager.isAutomated(activityId)

// main.js UI
handleWorkerChanged()
updateWorkerSummary()
updateWorkerPanel()
createWorkerControlsHTML()
```

**Actions:**
- [ ] List all methods called on WorkerManager
- [ ] Design new worker assignment API
- [ ] Plan worker entity spawning system

### Step 3: Identify All UI Dependencies
**Current UI elements to remove:**
```html
<!-- Activity cards -->
.activity-item
.activity-header
.activity-progress-bar
.activity-status
.activity-worker-assignments

<!-- Active activities panel -->
#activeActivities
#activeActivitiesList
.active-activity-item

<!-- Worker controls -->
.worker-btn-plus
.worker-btn-minus
.worker-btn-remove-all
```

**Actions:**
- [ ] Remove all activity card rendering code
- [ ] Remove all progress bar code
- [ ] Remove worker button handlers
- [ ] Keep only: currency ticker, skills, upgrades

---

## New Architecture Components

### Component 1: ResourceNode Entity
```javascript
// src/entities/ResourceNode.js
export class ResourceNode {
  constructor(definition) {
    this.id = definition.id
    this.type = definition.type
    this.name = definition.name
    this.position = definition.position

    // Resource properties
    this.available = definition.startingAmount || 0
    this.capacity = definition.baseCapacity || 20
    this.spawnRate = definition.baseSpawnRate || 0.5

    // Harvesting properties
    this.harvestTime = definition.harvestTime || 2
    this.outputs = definition.outputs
    this.requiredSkillLevel = definition.requiredSkillLevel || 1

    // Upgrade state
    this.capacityUpgrades = 0
    this.spawnRateUpgrades = 0

    // Visual properties
    this.icon = definition.icon
    this.color = definition.color
  }

  // Calculate current capacity with upgrades
  getCurrentCapacity() {
    return this.capacity * (1 + this.capacityUpgrades * 0.5)
  }

  // Calculate current spawn rate with upgrades
  getCurrentSpawnRate() {
    return this.spawnRate * (1 + this.spawnRateUpgrades * 0.3)
  }

  // Regenerate resources
  regenerate(deltaTime) {
    const maxCapacity = this.getCurrentCapacity()
    if (this.available < maxCapacity) {
      const regen = this.getCurrentSpawnRate() * (deltaTime / 1000)
      this.available = Math.min(this.available + regen, maxCapacity)
    }
  }

  // Try to harvest (returns success)
  canHarvest() {
    return this.available >= 1
  }

  // Harvest one unit
  harvest() {
    if (this.canHarvest()) {
      this.available -= 1
      return true
    }
    return false
  }

  // Get state for rendering
  getRenderState() {
    return {
      position: this.position,
      available: Math.floor(this.available),
      capacity: this.getCurrentCapacity(),
      fullness: this.available / this.getCurrentCapacity(),
      icon: this.icon,
      name: this.name
    }
  }
}
```

### Component 2: WorkerEntity with AI
```javascript
// src/entities/WorkerEntity.js
export class WorkerEntity {
  constructor(id, type, homePosition) {
    this.id = id
    this.type = type
    this.homePosition = homePosition
    this.position = { ...homePosition }

    // State machine
    this.state = 'idle' // idle, walking_to, harvesting, walking_back, depositing
    this.stateTimer = 0
    this.targetNode = null
    this.carrying = null

    // Worker stats (based on type)
    this.walkSpeed = 150 // pixels per second
    this.carrySpeed = 90  // pixels per second when carrying
    this.harvestSpeed = 1.0 // multiplier

    // Movement
    this.velocity = { x: 0, y: 0 }
    this.destination = null

    // Random offset to prevent stacking
    this.randomOffset = Math.random() * 0.5
  }

  // Main update loop
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
        this.updateDepositing(currencyManager)
        break
    }
  }

  // State: idle - check if assigned node has resources
  updateIdle(resourceNodes) {
    if (!this.targetNode) return

    const node = resourceNodes.get(this.targetNode)
    if (node && node.canHarvest()) {
      this.startWalkingTo(node.position)
    }
  }

  // State: walking_to - move toward resource node
  updateWalkingTo(deltaTime) {
    if (!this.destination) return

    const moved = this.moveToward(this.destination, this.walkSpeed, deltaTime)

    if (moved.arrived) {
      this.startHarvesting()
    }
  }

  // State: harvesting - play animation and wait
  updateHarvesting(deltaTime, resourceNodes) {
    const node = resourceNodes.get(this.targetNode)
    if (!node) {
      this.state = 'idle'
      return
    }

    const harvestDuration = (node.harvestTime / this.harvestSpeed) * 1000

    if (this.stateTimer >= harvestDuration) {
      // Try to harvest
      if (node.harvest()) {
        this.carrying = node.outputs
        this.startWalkingBack()
      } else {
        // Resource depleted while harvesting
        this.state = 'idle'
        this.stateTimer = 0
      }
    }
  }

  // State: walking_back - return to home with resource
  updateWalkingBack(deltaTime) {
    const moved = this.moveToward(this.homePosition, this.carrySpeed, deltaTime)

    if (moved.arrived) {
      this.startDepositing()
    }
  }

  // State: depositing - deliver resource
  updateDepositing(currencyManager) {
    if (this.carrying) {
      // Add resources to inventory
      Object.entries(this.carrying).forEach(([currencyId, amount]) => {
        currencyManager.add(currencyId, amount)
      })
      this.carrying = null
    }

    // Apply random offset before next cycle
    if (this.stateTimer >= this.randomOffset * 1000) {
      this.state = 'idle'
      this.stateTimer = 0
    }
  }

  // Movement helper
  moveToward(target, speed, deltaTime) {
    const dx = target.x - this.position.x
    const dy = target.y - this.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < 5) {
      this.position.x = target.x
      this.position.y = target.y
      return { arrived: true, distance: 0 }
    }

    const moveDistance = speed * (deltaTime / 1000)
    const ratio = Math.min(moveDistance / distance, 1)

    this.position.x += dx * ratio
    this.position.y += dy * ratio

    return { arrived: ratio >= 1, distance }
  }

  // State transitions
  startWalkingTo(destination) {
    this.state = 'walking_to'
    this.destination = destination
    this.stateTimer = 0
  }

  startHarvesting() {
    this.state = 'harvesting'
    this.stateTimer = 0
  }

  startWalkingBack() {
    this.state = 'walking_back'
    this.destination = null
    this.stateTimer = 0
  }

  startDepositing() {
    this.state = 'depositing'
    this.stateTimer = 0
  }

  // Assign to a resource node
  assignTo(nodeId) {
    this.targetNode = nodeId
    this.state = 'idle'
    this.stateTimer = 0
  }

  // Unassign from node
  unassign() {
    this.targetNode = null
    this.state = 'idle'
    this.carrying = null
  }

  // Get render info
  getRenderState() {
    return {
      id: this.id,
      type: this.type,
      position: this.position,
      state: this.state,
      carrying: this.carrying,
      progress: this.getStateProgress()
    }
  }

  getStateProgress() {
    switch (this.state) {
      case 'harvesting':
        return this.stateTimer / (2000 / this.harvestSpeed)
      case 'depositing':
        return this.stateTimer / (this.randomOffset * 1000)
      default:
        return 0
    }
  }
}
```

### Component 3: ResourceNodeManager
```javascript
// src/managers/ResourceNodeManager.js
import { ResourceNode } from '../entities/ResourceNode.js'

export class ResourceNodeManager {
  constructor(nodeDefinitions, eventBus) {
    this.nodes = new Map()
    this.eventBus = eventBus

    // Create resource nodes
    nodeDefinitions.forEach(def => {
      this.nodes.set(def.id, new ResourceNode(def))
    })
  }

  // Update all nodes (regeneration)
  update(deltaTime) {
    this.nodes.forEach(node => {
      const beforeRegen = node.available
      node.regenerate(deltaTime)

      // Emit event if regenerated
      if (node.available > beforeRegen) {
        this.eventBus.emit('resource:regenerated', {
          nodeId: node.id,
          amount: node.available - beforeRegen,
          current: node.available
        })
      }
    })
  }

  // Get a node
  getNode(nodeId) {
    return this.nodes.get(nodeId)
  }

  // Get all nodes
  getAllNodes() {
    return Array.from(this.nodes.values())
  }

  // Check if node is available
  canHarvest(nodeId) {
    const node = this.nodes.get(nodeId)
    return node ? node.canHarvest() : false
  }

  // Harvest from node
  harvest(nodeId) {
    const node = this.nodes.get(nodeId)
    if (node && node.harvest()) {
      this.eventBus.emit('resource:harvested', {
        nodeId,
        remaining: node.available
      })
      return true
    }
    return false
  }

  // Upgrade node capacity
  upgradeCapacity(nodeId) {
    const node = this.nodes.get(nodeId)
    if (node) {
      node.capacityUpgrades++
      this.eventBus.emit('node:upgraded', { nodeId, type: 'capacity' })
    }
  }

  // Upgrade spawn rate
  upgradeSpawnRate(nodeId) {
    const node = this.nodes.get(nodeId)
    if (node) {
      node.spawnRateUpgrades++
      this.eventBus.emit('node:upgraded', { nodeId, type: 'spawnRate' })
    }
  }
}
```

### Component 4: WorkerEntityManager
```javascript
// src/managers/WorkerEntityManager.js
import { WorkerEntity } from '../entities/WorkerEntity.js'

export class WorkerEntityManager {
  constructor(eventBus, currencyManager) {
    this.workers = new Map()
    this.eventBus = eventBus
    this.currencyManager = currencyManager

    this.homePosition = { x: 850, y: 300 }
    this.nextWorkerId = 1

    // Worker type definitions
    this.workerTypes = new Map([
      ['basicWorker', { walkSpeed: 150, carrySpeed: 90, harvestSpeed: 1.0 }],
      ['tractorWorker', { walkSpeed: 200, carrySpeed: 150, harvestSpeed: 1.5 }],
      ['droneWorker', { walkSpeed: 300, carrySpeed: 280, harvestSpeed: 2.0 }]
    ])
  }

  // Update all workers
  update(deltaTime, resourceNodes) {
    this.workers.forEach(worker => {
      worker.update(deltaTime, resourceNodes, this.currencyManager)
    })
  }

  // Spawn a new worker
  spawnWorker(workerType) {
    const id = `worker_${this.nextWorkerId++}`
    const worker = new WorkerEntity(id, workerType, this.homePosition)

    // Apply worker type stats
    const stats = this.workerTypes.get(workerType)
    if (stats) {
      worker.walkSpeed = stats.walkSpeed
      worker.carrySpeed = stats.carrySpeed
      worker.harvestSpeed = stats.harvestSpeed
    }

    this.workers.set(id, worker)
    this.eventBus.emit('worker:spawned', { workerId: id, type: workerType })

    return id
  }

  // Remove a worker
  despawnWorker(workerId) {
    if (this.workers.delete(workerId)) {
      this.eventBus.emit('worker:despawned', { workerId })
    }
  }

  // Assign worker to resource node
  assignWorker(workerId, nodeId) {
    const worker = this.workers.get(workerId)
    if (worker) {
      worker.assignTo(nodeId)
      this.eventBus.emit('worker:assigned', { workerId, nodeId })
    }
  }

  // Unassign worker
  unassignWorker(workerId) {
    const worker = this.workers.get(workerId)
    if (worker) {
      worker.unassign()
      this.eventBus.emit('worker:unassigned', { workerId })
    }
  }

  // Get all workers for a node
  getWorkersForNode(nodeId) {
    return Array.from(this.workers.values()).filter(
      w => w.targetNode === nodeId
    )
  }

  // Get idle workers
  getIdleWorkers() {
    return Array.from(this.workers.values()).filter(
      w => w.targetNode === null
    )
  }

  // Get all workers
  getAllWorkers() {
    return Array.from(this.workers.values())
  }

  // Sync workers with currency (spawn/despawn based on inventory)
  syncWithCurrency() {
    this.workerTypes.forEach((stats, workerType) => {
      const owned = this.currencyManager.get(workerType) || 0
      const existing = Array.from(this.workers.values()).filter(
        w => w.type === workerType
      ).length

      // Spawn missing workers
      while (existing + spawned < owned) {
        this.spawnWorker(workerType)
        spawned++
      }

      // Despawn extra workers
      while (existing - despawned > owned) {
        const toRemove = Array.from(this.workers.values())
          .find(w => w.type === workerType)
        if (toRemove) {
          this.despawnWorker(toRemove.id)
          despawned++
        }
      }
    })
  }
}
```

### Component 5: Renderer
```javascript
// src/core/Renderer.js
export class Renderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext('2d')

    // Set canvas size
    this.width = 1000
    this.height = 600
    this.canvas.width = this.width
    this.canvas.height = this.height

    // Rendering settings
    this.backgroundColor = '#2c3e50'
    this.gridColor = '#34495e'
  }

  // Clear canvas
  clear() {
    this.ctx.fillStyle = this.backgroundColor
    this.ctx.fillRect(0, 0, this.width, this.height)
  }

  // Draw grid
  drawGrid() {
    this.ctx.strokeStyle = this.gridColor
    this.ctx.lineWidth = 1

    // Vertical lines
    for (let x = 0; x < this.width; x += 50) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.height)
      this.ctx.stroke()
    }

    // Horizontal lines
    for (let y = 0; y < this.height; y += 50) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.width, y)
      this.ctx.stroke()
    }
  }

  // Draw resource node
  drawResourceNode(node) {
    const state = node.getRenderState()

    // Draw node circle
    this.ctx.fillStyle = this.getResourceColor(state.fullness)
    this.ctx.beginPath()
    this.ctx.arc(state.position.x, state.position.y, 30, 0, Math.PI * 2)
    this.ctx.fill()

    // Draw icon
    this.ctx.font = '24px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(state.icon, state.position.x, state.position.y)

    // Draw available count
    this.ctx.font = '14px Arial'
    this.ctx.fillStyle = '#fff'
    this.ctx.fillText(
      `${state.available}/${Math.floor(state.capacity)}`,
      state.position.x,
      state.position.y + 45
    )
  }

  // Draw worker
  drawWorker(worker) {
    const state = worker.getRenderState()

    // Draw worker icon
    this.ctx.font = '20px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'

    // Choose icon based on state
    let icon = '👷'
    if (state.carrying) {
      icon = '👷📦' // Carrying something
    }

    this.ctx.fillText(icon, state.position.x, state.position.y)

    // Draw state debug info (optional)
    if (this.debug) {
      this.ctx.font = '10px Arial'
      this.ctx.fillStyle = '#ffff00'
      this.ctx.fillText(state.state, state.position.x, state.position.y - 20)
    }
  }

  // Helper: Get color based on resource fullness
  getResourceColor(fullness) {
    if (fullness > 0.7) return '#27ae60' // Green
    if (fullness > 0.3) return '#f39c12' // Orange
    return '#e74c3c' // Red
  }

  // Main render loop
  render(resourceNodes, workers) {
    this.clear()
    this.drawGrid()

    // Draw resource nodes
    resourceNodes.forEach(node => {
      this.drawResourceNode(node)
    })

    // Draw workers
    workers.forEach(worker => {
      this.drawWorker(worker)
    })
  }
}
```

---

## Implementation Order

### Week 1: Foundation
1. Create ResourceNode entity
2. Create ResourceNodeManager
3. Create WorkerEntity entity
4. Create WorkerEntityManager
5. Write unit tests for all above

### Week 2: Integration
6. Create Renderer class
7. Update GameEngine to use new managers
8. Add canvas to HTML
9. Wire up rendering loop
10. Test basic worker movement

### Week 3: Migration
11. Remove ActivityManager
12. Remove old WorkerManager
13. Update UI to remove activity cards
14. Convert activity data to resource nodes
15. Update/remove tests

### Week 4: Polish
16. Add upgrade system for nodes
17. Add visual polish (animations, particles)
18. Performance optimization
19. Full E2E testing
20. Documentation

---

## Decision Points

Before proceeding, need to decide:

1. **Graphics style**: Emoji (simple) vs Sprites (complex)?
2. **Canvas size**: Fixed or responsive?
3. **Worker limit**: Cap at 50? 100? 200?
4. **Save compatibility**: Migrate or fresh start?
5. **Feature flag**: Allow toggling old/new system?
6. **Skill integration**: Do skills affect spawn rates? Worker speed?
7. **Multi-node**: Can workers switch between nodes automatically?

---

## Risk Assessment

**HIGH RISK:**
- Breaking all existing tests
- Save file incompatibility
- Performance with many workers
- Complex state management

**MEDIUM RISK:**
- UI/UX confusion for existing players
- Animation performance on low-end devices
- Balance (resources might be too scarce/abundant)

**LOW RISK:**
- Visual polish
- Sound effects
- Additional features

---

## Next Action

✅ **This document is complete**

**Awaiting user approval to proceed with:**
1. Answer decision point questions
2. Begin Phase 1.1: ResourceNode implementation
3. Set up testing framework for new system

**Estimated total time: 80-100 hours**
